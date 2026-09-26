import mongoose from "mongoose";
import User from "../models/User.js";
import CentreSchema from "../models/Master_data/Centre.js";

/**
 * Safely parses date inputs in ISO (YYYY-MM-DD), DD-MM-YYYY, or DD/MM/YYYY formats
 */
export const parseFlexibleDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
    const str = String(dateStr).trim();
    if (!str) return null;

    // Check YYYY-MM-DD or YYYY/MM/DD format
    const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymdMatch) {
        const [_, year, month, day] = ymdMatch;
        const parsed = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Check DD-MM-YYYY or DD/MM/YYYY format
    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
        const [_, day, month, year] = dmyMatch;
        const parsed = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
};

/**
 * Normalizes filter values that might be strings, IDs, or objects from CustomMultiSelect
 */
const normalizeValue = (val) => {
    if (!val) return val;
    if (Array.isArray(val)) return val.map(v => normalizeValue(v));
    if (typeof val === 'object' && val.value !== undefined) val = val.value;
    
    if (typeof val === 'string' && mongoose.Types.ObjectId.isValid(val)) {
        return new mongoose.Types.ObjectId(val);
    }
    return val;
};

/**
 * Safely escapes regex special characters
 */
export const escapeRegex = (str) => {
    return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Splits comma-separated strings without breaking commas located inside parentheses
 * (e.g. "Priyanka Das (DUMDUM, SHYAMBAZAR)" is kept intact, whereas "A, B" is split)
 */
export const splitCommasOutsideParens = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
        return val.flatMap(v => splitCommasOutsideParens(v));
    }
    if (typeof val === 'object' && val.value !== undefined) {
        val = val.value;
    }
    if (typeof val !== 'string') return [val];

    const result = [];
    let current = '';
    let depth = 0;
    for (let i = 0; i < val.length; i++) {
        const char = val[i];
        if (char === '(') depth++;
        else if (char === ')') depth = Math.max(0, depth - 1);

        if (char === ',' && depth === 0) {
            if (current.trim()) result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) result.push(current.trim());
    return result;
};

/**
 * Resolves an agent identifier (which could be an ObjectId, a string like "Name (Centre Name)", or just a name string)
 * into matching conditions for LeadManagement queries.
 */
export const resolveAgentIdentifier = async (val, currentUser = null) => {
    if (!val) return null;
    if (typeof val === 'object' && val.value !== undefined) {
        val = val.value;
    }
    if (!val) return null;

    let user = null;
    const strVal = String(val).trim();

    // 1. Check if ObjectId
    if (val instanceof mongoose.Types.ObjectId || (/^[0-9a-fA-F]{24}$/.test(strVal) && mongoose.Types.ObjectId.isValid(strVal))) {
        user = await User.findById(val).populate('centres');
    }

    // 2. Check if "Name (Centre Name(s))" format
    if (!user && typeof strVal === 'string') {
        const match = strVal.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
            const userName = match[1].trim();
            const centrePart = match[2].trim();
            const centreTokens = centrePart.split(/[,/]/).map(s => s.trim().toLowerCase().replace(/\s+/g, '')).filter(Boolean);

            const candidates = await User.find({
                name: { $regex: new RegExp(`^${escapeRegex(userName)}$`, "i") },
                isActive: true
            }).populate('centres');

            if (candidates.length === 1) {
                user = candidates[0];
            } else if (candidates.length > 1) {
                const matchedCandidate = candidates.find(cand => {
                    const candCentres = (cand.centres || []).map(c => (c.centreName || c.name || "").trim().toLowerCase().replace(/\s+/g, ''));
                    return candCentres.some(cName =>
                        centreTokens.some(tok => cName.includes(tok) || tok.includes(cName))
                    );
                });
                user = matchedCandidate || candidates[0];
            }
        }
    }

    // 3. Fallback: Treat as plain name string
    if (!user && typeof strVal === 'string') {
        let currentDbUser = null;
        if (currentUser) {
            if (typeof currentUser.populate === 'function') {
                currentDbUser = currentUser;
            } else {
                currentDbUser = await User.findById(currentUser.id || currentUser._id).populate('centres');
            }
        }

        if (currentDbUser && currentDbUser.name && currentDbUser.name.toLowerCase().trim() === strVal.toLowerCase().trim()) {
            user = currentDbUser;
            if (user && typeof user.populate === 'function' && (!user.populated || !user.populated('centres'))) {
                await user.populate('centres');
            }
        } else {
            const matchingUsers = await User.find({
                name: { $regex: new RegExp(`^${escapeRegex(strVal)}$`, "i") },
                isActive: true
            }).populate('centres');

            if (matchingUsers.length > 0) {
                if (matchingUsers.length === 1) {
                    user = matchingUsers[0];
                } else if (currentUser) {
                    const currentUserCentreIds = (currentUser.centres || []).map(c => (c._id || c).toString());
                    const sharedCenterUser = matchingUsers.find(u =>
                        (u.centres || []).some(c => currentUserCentreIds.includes((c._id || c).toString()))
                    );
                    user = sharedCenterUser || matchingUsers[0];
                } else {
                    user = matchingUsers[0];
                }
            }
        }
    }

    if (user) {
        const escapedName = escapeRegex(user.name);
        const centreIds = (user.centres || []).map(c => c._id || c);

        // Check if there are other active users with this name
        const duplicateUsers = await User.find({
            name: { $regex: new RegExp(`^${escapedName}$`, "i") },
            isActive: true
        });

        const isDuplicateName = duplicateUsers.length > 1;
        const nameRegex = new RegExp(`^${escapedName}(?:\\s*\\(.*\\))?$`, "i");

        const validCentreObjectIds = centreIds.map(c => {
            const rawId = (c && c._id ? c._id : c)?.toString();
            try {
                if (mongoose.Types.ObjectId.isValid(rawId)) {
                    return new mongoose.Types.ObjectId(rawId);
                }
            } catch (e) { }
            return null;
        }).filter(Boolean);
        const allCentreIn = validCentreObjectIds;

        const leadMatch = {
            leadResponsibility: { $regex: nameRegex }
        };

        const followUpMatch = {
            "followUps.updatedBy": { $regex: nameRegex }
        };

        const createdMatch = {
            createdBy: user._id
        };

        if (isDuplicateName && allCentreIn.length > 0) {
            leadMatch.centre = { $in: allCentreIn };
            followUpMatch.centre = { $in: allCentreIn };
        }

        return {
            user,
            name: user.name,
            centreIds,
            isDuplicateName,
            leadMatch,
            followUpMatch,
            createdMatch
        };
    }

    // If not found in User collection (e.g. legacy/unknown data), return direct name match regex
    const escapedVal = escapeRegex(strVal);
    const nameRegex = new RegExp(`^${escapedVal}(?:\\s*\\(.*\\))?$`, "i");
    return {
        name: strVal,
        centreIds: [],
        isDuplicateName: false,
        leadMatch: {
            leadResponsibility: { $regex: nameRegex }
        },
        followUpMatch: {
            "followUps.updatedBy": { $regex: nameRegex }
        }
    };
};


export const buildLeadQuery = async (queryParams, user) => {
    const { 
        search, leadType, source, centre, course, leadResponsibility, 
        board, className, fromDate, toDate, feedback, scheduledDate, followUpStatus,
        schoolName, followUpFromDate, followUpToDate, showDuplicates, includeInvalid, zone,
        uploadedBy
    } = queryParams;

    const query = {};

    // Duplicate Phone Numbers filter
    if (showDuplicates === "true" || showDuplicates === true) {
        const duplicatePhones = await mongoose.model("LeadManagement").aggregate([
            { $match: { phoneNumber: { $exists: true, $ne: null, $not: { $regex: /^\s*$/ } } } },
            { $group: { _id: "$phoneNumber", count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]);
        const phoneNumbers = duplicatePhones.map(d => d._id);
        query.phoneNumber = { $in: phoneNumbers };
    } else if (showDuplicates === "false" || showDuplicates === false) {
        const duplicatePhones = await mongoose.model("LeadManagement").aggregate([
            { $match: { phoneNumber: { $exists: true, $ne: null, $not: { $regex: /^\s*$/ } } } },
            { $group: { _id: "$phoneNumber", count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]);
        const phoneNumbers = duplicatePhones.map(d => d._id);
        query.phoneNumber = { $nin: phoneNumbers };
    }

    // Feedback filter
    if (feedback && (!Array.isArray(feedback) || feedback.length > 0)) {
        const rawFeedback = Array.isArray(feedback) ? feedback : [feedback];
        const flatFeedback = rawFeedback.flatMap(f => Array.isArray(f) ? f : [f]).filter(Boolean);
        const cleanFeedback = flatFeedback.map(f => (f && typeof f === 'object' && 'value' in f) ? f.value : f).filter(Boolean);

        if (cleanFeedback.length > 0) {
            const hasNotContacted = cleanFeedback.some(f => /not\s*contacted/i.test(String(f)));
            const textFeedbacks = cleanFeedback.filter(f => !/not\s*contacted/i.test(String(f)));

            const feedbackOr = [];
            if (textFeedbacks.length > 0) {
                const regexes = textFeedbacks.map(f => new RegExp(`^${escapeRegex(String(f).trim())}$`, "i"));
                feedbackOr.push({ followUps: { $elemMatch: { feedback: { $in: regexes } } } });
            }
            if (hasNotContacted) {
                feedbackOr.push({
                    $or: [
                        { followUps: { $size: 0 } },
                        { followUps: { $exists: false } }
                    ]
                });
            }

            if (feedbackOr.length > 0) {
                query.$and = query.$and || [];
                query.$and.push({ $or: feedbackOr });
            }
        }
    }

    // Date range filter (matches assignedAt or createdAt to align with table's Assigned At column)
    if (fromDate || toDate) {
        const start = parseFlexibleDate(fromDate);
        const end = parseFlexibleDate(toDate);
        if (start || end) {
            const createCond = {};
            const assignCond = {};
            if (start) {
                start.setHours(0, 0, 0, 0);
                createCond.$gte = start;
                assignCond.$gte = start;
            }
            if (end) {
                end.setHours(23, 59, 59, 999);
                createCond.$lte = end;
                assignCond.$lte = end;
            }

            query.$and = query.$and || [];
            query.$and.push({
                $or: [
                    { assignedAt: assignCond },
                    { createdAt: createCond }
                ]
            });
        }
    }

    // Follow-up Date range filter (Next Follow Up)
    if (followUpFromDate || followUpToDate) {
        const start = parseFlexibleDate(followUpFromDate);
        const end = parseFlexibleDate(followUpToDate);
        if (start || end) {
            query.nextFollowUpDate = {};
            if (start) {
                start.setHours(0, 0, 0, 0);
                query.nextFollowUpDate.$gte = start;
            }
            if (end) {
                end.setHours(23, 59, 59, 999);
                query.nextFollowUpDate.$lte = end;
            }
        }
    }

    // Scheduled Date filter (Next Follow Up)
    if (scheduledDate) {
        const start = parseFlexibleDate(scheduledDate);
        if (start) {
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setHours(23, 59, 59, 999);
            query.nextFollowUpDate = { $gte: start, $lte: end };
        }
    }

    // Multi-select fields: leadType
    if (leadType && (!Array.isArray(leadType) || leadType.length > 0)) {
        const rawTypes = Array.isArray(leadType) ? leadType : [leadType];
        const flatTypes = rawTypes.flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean);
        const cleanTypes = flatTypes.map(v => (v && typeof v === 'object' && 'value' in v) ? v.value : v).filter(Boolean);
        if (cleanTypes.length > 0) {
            query.leadType = { $in: cleanTypes.map(v => new RegExp(`^${escapeRegex(String(v).trim())}$`, "i")) };
        }
    }

    // source
    if (source && (!Array.isArray(source) || source.length > 0)) {
        const rawSources = Array.isArray(source) ? source : [source];
        const flatSources = rawSources.flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean);
        const cleanSources = flatSources.map(v => (v && typeof v === 'object' && 'value' in v) ? v.value : v).filter(Boolean);
        if (cleanSources.length > 0) {
            query.source = { $in: cleanSources.map(v => new RegExp(`^${escapeRegex(String(v).trim())}$`, "i")) };
        }
    }

    // course (matches both course ObjectId and courseText string)
    if (course && (!Array.isArray(course) || course.length > 0)) {
        const rawCourses = Array.isArray(course) ? course : [course];
        const flatCourses = rawCourses.flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean);
        const normalizedCourses = flatCourses.map(v => (v && typeof v === 'object' && 'value' in v) ? v.value : v).filter(Boolean);

        if (normalizedCourses.length > 0) {
            const courseObjectIds = [];
            const courseTextNames = [];

            for (const val of normalizedCourses) {
                const strVal = String(val).trim();
                if (mongoose.Types.ObjectId.isValid(strVal)) {
                    courseObjectIds.push(new mongoose.Types.ObjectId(strVal));
                } else {
                    courseTextNames.push(strVal);
                }
            }

            if (courseObjectIds.length > 0) {
                try {
                    const CourseModel = mongoose.model("Course");
                    const foundCourses = await CourseModel.find({ _id: { $in: courseObjectIds } }).select("courseName");
                    foundCourses.forEach(c => {
                        if (c.courseName) courseTextNames.push(c.courseName.trim());
                    });
                } catch (e) {
                    console.error("Error fetching course names for filter:", e);
                }
            }

            const courseOrConditions = [];
            if (courseObjectIds.length > 0) {
                courseOrConditions.push({ course: { $in: courseObjectIds } });
            }
            if (courseTextNames.length > 0) {
                const textRegexes = courseTextNames.map(name => new RegExp(`^${escapeRegex(name)}$`, "i"));
                courseOrConditions.push({ courseText: { $in: textRegexes } });
            }

            if (courseOrConditions.length > 0) {
                query.$and = query.$and || [];
                query.$and.push({ $or: courseOrConditions });
            }
        }
    }

    // board
    if (board && (!Array.isArray(board) || board.length > 0)) {
        const rawBoards = Array.isArray(board) ? board : [board];
        const flatBoards = rawBoards.flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean);
        const cleanBoards = flatBoards.map(v => (v && typeof v === 'object' && 'value' in v) ? v.value : v).filter(Boolean);
        const boardObjectIds = cleanBoards.filter(v => mongoose.Types.ObjectId.isValid(v)).map(v => new mongoose.Types.ObjectId(v));
        if (boardObjectIds.length > 0) {
            query.board = { $in: boardObjectIds };
        }
    }

    // className
    if (className && (!Array.isArray(className) || className.length > 0)) {
        const rawClasses = Array.isArray(className) ? className : [className];
        const flatClasses = rawClasses.flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean);
        const cleanClasses = flatClasses.map(v => (v && typeof v === 'object' && 'value' in v) ? v.value : v).filter(Boolean);
        const classObjectIds = cleanClasses.filter(v => mongoose.Types.ObjectId.isValid(v)).map(v => new mongoose.Types.ObjectId(v));
        if (classObjectIds.length > 0) {
            query.className = { $in: classObjectIds };
        }
    }

    // zone
    let zoneQueryCentres = [];
    if (zone && (!Array.isArray(zone) || zone.length > 0)) {
        const rawZones = Array.isArray(zone) ? zone : [zone];
        const flatZones = rawZones.flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean);
        const normalizedZones = flatZones.map(v => (v && typeof v === 'object' && 'value' in v) ? v.value : v).filter(Boolean);

        if (normalizedZones.length > 0) {
            try {
                const Zone = mongoose.model("Zone");
                const zoneDocs = await Zone.find({
                    _id: { $in: normalizedZones.filter(z => mongoose.Types.ObjectId.isValid(z)).map(z => new mongoose.Types.ObjectId(z)) }
                }).select("centres");

                const taggedCentreIds = zoneDocs.flatMap(z => z.centres || []);
                if (taggedCentreIds.length > 0) {
                    zoneQueryCentres = taggedCentreIds;
                } else {
                    zoneQueryCentres = [new mongoose.Types.ObjectId()];
                }
            } catch (err) {
                console.error("Error resolving zone centres in buildLeadQuery:", err);
            }
        }
    }

    // centre
    let centreFilterIds = [];
    if (centre && (!Array.isArray(centre) || centre.length > 0)) {
        const rawCentres = Array.isArray(centre) ? centre : (typeof centre === 'string' && centre.includes(',') ? centre.split(',') : [centre]);
        const flatCentres = rawCentres.flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean);
        centreFilterIds = flatCentres
            .map(c => (c && typeof c === 'object' && 'value' in c) ? c.value : c)
            .filter(c => c && mongoose.Types.ObjectId.isValid(c))
            .map(c => new mongoose.Types.ObjectId(c));
    }

    if (zoneQueryCentres.length > 0) {
        if (centreFilterIds.length > 0) {
            const stringifiedZoneCentres = zoneQueryCentres.map(c => c.toString());
            const intersectedCentres = centreFilterIds.filter(c => stringifiedZoneCentres.includes(c.toString()));
            if (intersectedCentres.length > 0) {
                query.centre = { $in: intersectedCentres };
            } else {
                query.centre = { $in: [new mongoose.Types.ObjectId()] };
            }
        } else {
            query.centre = { $in: zoneQueryCentres };
        }
    } else if (centreFilterIds.length > 0) {
        query.centre = { $in: centreFilterIds };
    }

    // marketingBy
    if (queryParams.marketingBy && (!Array.isArray(queryParams.marketingBy) || queryParams.marketingBy.length > 0)) {
        const raw = Array.isArray(queryParams.marketingBy) ? queryParams.marketingBy : [queryParams.marketingBy];
        const flat = raw.flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean);
        const cleanValues = flat.map(v => (v && typeof v === 'object' && 'value' in v) ? v.value : v).filter(Boolean);
        if (cleanValues.length > 0) {
            query.marketingBy = { $in: cleanValues.map(v => new RegExp(`^${escapeRegex(String(v).trim())}$`, "i")) };
        }
    }

    // uploadedBy
    if (uploadedBy && (!Array.isArray(uploadedBy) || uploadedBy.length > 0)) {
        const raw = Array.isArray(uploadedBy) ? uploadedBy : [uploadedBy];
        const flat = raw.flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean);
        const cleanValues = flat.map(v => (v && typeof v === 'object' && 'value' in v) ? v.value : v).filter(Boolean);
        const validIds = cleanValues.filter(v => mongoose.Types.ObjectId.isValid(v)).map(v => new mongoose.Types.ObjectId(v));
        if (validIds.length > 0) {
            query.createdBy = { $in: validIds };
        }
    }

    // schoolName
    if (schoolName && (!Array.isArray(schoolName) || schoolName.length > 0)) {
        const raw = Array.isArray(schoolName) ? schoolName : [schoolName];
        const flat = raw.flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean);
        const cleanValues = flat.map(v => (v && typeof v === 'object' && 'value' in v) ? v.value : v).filter(Boolean);
        if (cleanValues.length > 0) {
            query.schoolName = { $in: cleanValues.map(v => new RegExp(`^${escapeRegex(String(v).trim())}$`, "i")) };
        }
    }

    // campaign (matches both campaign ObjectId and campaignFrom string)
    if (queryParams.campaign && (!Array.isArray(queryParams.campaign) || queryParams.campaign.length > 0)) {
        const rawCampaigns = Array.isArray(queryParams.campaign) ? queryParams.campaign : [queryParams.campaign];
        const flatCampaigns = rawCampaigns.flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean);
        const normalizedCampaigns = flatCampaigns.map(v => (v && typeof v === 'object' && 'value' in v) ? v.value : v).filter(Boolean);

        if (normalizedCampaigns.length > 0) {
            const campaignObjectIds = [];
            const campaignNames = [];

            for (const cVal of normalizedCampaigns) {
                const strVal = String(cVal).trim();
                if (mongoose.Types.ObjectId.isValid(strVal)) {
                    campaignObjectIds.push(new mongoose.Types.ObjectId(strVal));
                } else {
                    campaignNames.push(strVal);
                }
            }

            if (campaignObjectIds.length > 0) {
                try {
                    const CampaignModel = mongoose.model("Campaign");
                    const foundCampaigns = await CampaignModel.find({ _id: { $in: campaignObjectIds } }).select("adName name");
                    foundCampaigns.forEach(c => {
                        if (c.adName) campaignNames.push(c.adName.trim());
                        if (c.name) campaignNames.push(c.name.trim());
                    });
                } catch (e) {
                    console.error("Error resolving campaign names:", e);
                }
            }

            const campaignOrConditions = [];
            if (campaignObjectIds.length > 0) {
                campaignOrConditions.push({ campaign: { $in: campaignObjectIds } });
            }
            if (campaignNames.length > 0) {
                const nameRegexes = campaignNames.map(cn => new RegExp(`^${escapeRegex(cn)}$`, "i"));
                campaignOrConditions.push({ campaignFrom: { $in: nameRegexes } });
            }

            if (campaignOrConditions.length > 0) {
                query.$and = query.$and || [];
                query.$and.push({ $or: campaignOrConditions });
            }
        }
    }

    if (queryParams.isPriority !== undefined && queryParams.isPriority !== '') {
        if (queryParams.isPriority === 'true' || queryParams.isPriority === true) {
            query.isPriority = true;
        } else if (queryParams.isPriority === 'false' || queryParams.isPriority === false) {
            query.isPriority = { $ne: true };
        }
    }

    // Responsibility filter (Telecaller names / IDs / unique display names)
    if (leadResponsibility && (!Array.isArray(leadResponsibility) || leadResponsibility.length > 0)) {
        const raw = splitCommasOutsideParens(leadResponsibility);
        const values = raw.map(v => normalizeValue(v)).filter(Boolean);
        const cleanValues = values.filter(v => v);
        if (cleanValues.length > 0) {
            const orConditions = [];
            for (const val of cleanValues) {
                const resolved = await resolveAgentIdentifier(val, user);
                if (resolved) {
                    if (resolved.leadMatch) {
                        orConditions.push(resolved.leadMatch);
                    }
                    if (resolved.followUpMatch) {
                        orConditions.push(resolved.followUpMatch);
                    }
                    if (resolved.createdMatch) {
                        orConditions.push(resolved.createdMatch);
                    }
                }
            }
            if (orConditions.length > 0) {
                if (query.$and) {
                    query.$and.push({ $or: orConditions });
                } else if (query.$or) {
                    query.$and = [{ $or: query.$or }, { $or: orConditions }];
                    delete query.$or;
                } else {
                    query.$or = orConditions;
                }
            }
        }
    }

    // Follow-up status (supports multi-selection of contacted, remaining, walkin)
    if (followUpStatus && (!Array.isArray(followUpStatus) || followUpStatus.length > 0)) {
        const rawStatus = Array.isArray(followUpStatus) ? followUpStatus : [followUpStatus];
        const flatStatus = rawStatus.flatMap(s => Array.isArray(s) ? s : [s]).filter(Boolean);
        const statusVals = flatStatus.map(v => (v && typeof v === 'object' && 'value' in v) ? v.value : v).filter(Boolean);

        const statusOr = [];
        if (statusVals.includes('contacted')) {
            statusOr.push({ followUps: { $exists: true, $not: { $size: 0 } } });
        }
        if (statusVals.includes('remaining')) {
            statusOr.push({
                $or: [
                    { followUps: { $size: 0 } },
                    { followUps: { $exists: false } }
                ]
            });
        }
        if (statusVals.includes('walkin')) {
            statusOr.push({
                $or: [
                    { isWalkIn: true },
                    { source: { $regex: /^walk[- ]?in$/i } }
                ]
            });
        }

        if (statusOr.length > 0) {
            query.$and = query.$and || [];
            query.$and.push({ $or: statusOr });
        }
    }

    // Exclude counseled leads
    query.isCounseled = { $ne: true };

    // Access Control Logic
    const userRole = (user?.role || "").toLowerCase().replace(/\s+/g, "");
    const privilegedRoles = ['superadmin', 'super admin', 'admin', 'centerincharge', 'zonalmanager', 'hr', 'class_coordinator', 'coordinator', 'rm', 'hod', 'assistantzonalmanager', 'assistantcenterincharge', 'digital'];
    const isPrivileged = privilegedRoles.includes(userRole);
    const isSuperAdmin = ['superadmin', 'super admin', 'digital'].includes(userRole);

    if (!isSuperAdmin) {
        const userDoc = await User.findById(user?.id || user?._id).select('centres role name');
        if (!userDoc) throw new Error("User not found during query building");

        const userCentreIds = userDoc.centres || [];
        const escapedName = escapeRegex(userDoc.name);

        // Check if there are other active users with the same name
        const duplicateUsers = await User.find({
            name: { $regex: new RegExp(`^${escapedName}$`, "i") },
            isActive: true
        });
        const isDuplicateName = duplicateUsers.length > 1;

        const stringUserCentreIds = userCentreIds.map(c => c.toString());
        const objectUserCentreIds = userCentreIds.map(c => {
            try { return new mongoose.Types.ObjectId(c); } catch (e) { return null; }
        }).filter(Boolean);
        const allUserCentreIn = [...new Set([...stringUserCentreIds, ...objectUserCentreIds])];

        let leadRespCondition = {
            leadResponsibility: { $regex: new RegExp(`^${escapedName}(?:\\s*\\(.*\\))?$`, "i") }
        };
        let followUpCondition = {
            "followUps.updatedBy": { $regex: new RegExp(`^${escapedName}(?:\\s*\\(.*\\))?$`, "i") }
        };
        let createdCondition = {
            createdBy: userDoc._id
        };

        if (isDuplicateName && allUserCentreIn.length > 0) {
            leadRespCondition.centre = { $in: allUserCentreIn };
            followUpCondition.centre = { $in: allUserCentreIn };
        }

        const orConditions = [
            createdCondition,
            leadRespCondition,
            followUpCondition
        ];

        if (isPrivileged && allUserCentreIn.length > 0) {
            orConditions.push({ centre: { $in: allUserCentreIn } });
        }

        // Check if user already has an agent filter applied
        const hasAgentFilter = Boolean(leadResponsibility && (!Array.isArray(leadResponsibility) || leadResponsibility.length > 0));

        if (!hasAgentFilter) {
            query.$and = query.$and || [];
            query.$and.push({ $or: orConditions });
        }

        // Centre restriction: if the user has assigned centres, they can see data for those centres OR leads they personally created / are assigned to
        if (allUserCentreIn.length > 0) {
            if (query.centre) {
                const currentIn = query.centre.$in || [];
                const restrictedIn = currentIn.filter(id => 
                    allUserCentreIn.some(allowedId => allowedId.toString() === id.toString())
                );
                delete query.centre;
                query.$and = query.$and || [];
                query.$and.push({
                    $or: [
                        { centre: { $in: restrictedIn.length > 0 ? restrictedIn : [new mongoose.Types.ObjectId()] } },
                        createdCondition,
                        leadRespCondition
                    ]
                });
            } else if (!hasAgentFilter) {
                query.$and = query.$and || [];
                query.$and.push({
                    $or: [
                        { centre: { $in: allUserCentreIn } },
                        createdCondition,
                        leadRespCondition
                    ]
                });
            }
        }
    }

    // Search logic
    if (search && String(search).trim()) {
        const escapedSearch = escapeRegex(String(search).trim());
        const searchOr = [
            { name: { $regex: escapedSearch, $options: "i" } },
            { email: { $regex: escapedSearch, $options: "i" } },
            { phoneNumber: { $regex: escapedSearch, $options: "i" } },
            { secondPhoneNumber: { $regex: escapedSearch, $options: "i" } },
            { schoolName: { $regex: escapedSearch, $options: "i" } },
            { leadResponsibility: { $regex: escapedSearch, $options: "i" } }
        ];

        if (query.$and) {
            query.$and.push({ $or: searchOr });
        } else if (query.$or) {
            query.$and = [{ $or: query.$or }, { $or: searchOr }];
            delete query.$or;
        } else {
            query.$or = searchOr;
        }
    }

    if (query.$and && query.$and.length === 0) {
        delete query.$and;
    }
    if (query.$or && query.$or.length === 0) {
        delete query.$or;
    }

    return query;
};

