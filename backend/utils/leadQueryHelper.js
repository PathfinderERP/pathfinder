import mongoose from "mongoose";
import User from "../models/User.js";
import CentreSchema from "../models/Master_data/Centre.js";

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
 * Resolves an agent identifier (which could be an ObjectId, a string like "Name (Centre Name)", or just a name string)
 * into matching conditions for LeadManagement queries.
 */
export const resolveAgentIdentifier = async (val, currentUser = null) => {
    if (!val) return null;
    
    let user = null;
    
    // 1. Check if ObjectId
    if (mongoose.Types.ObjectId.isValid(val)) {
        user = await User.findById(val).populate('centres');
    }
    
    // 2. Check if "Name (Centre Name)" format
    if (!user && typeof val === 'string') {
        const match = val.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
            const userName = match[1].trim();
            const centreName = match[2].trim();
            const centreDoc = await CentreSchema.findOne({ centreName: { $regex: new RegExp(`^${centreName}$`, "i") } });
            if (centreDoc) {
                user = await User.findOne({
                    name: { $regex: new RegExp(`^${userName}$`, "i") },
                    centres: centreDoc._id,
                    isActive: true
                }).populate('centres');
            }
        }
    }
    
    // 3. Fallback: Treat as plain name string
    if (!user && typeof val === 'string') {
        let currentDbUser = null;
        if (currentUser) {
            if (typeof currentUser.populate === 'function') {
                currentDbUser = currentUser;
            } else {
                currentDbUser = await User.findById(currentUser.id || currentUser._id).populate('centres');
            }
        }

        if (currentDbUser && currentDbUser.name && currentDbUser.name.toLowerCase().trim() === val.toLowerCase().trim()) {
            user = currentDbUser;
            if (user && typeof user.populate === 'function' && (!user.populated || !user.populated('centres'))) {
                await user.populate('centres');
            }
        } else {
            const matchingUsers = await User.find({
                name: { $regex: new RegExp(`^${val}$`, "i") },
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
        const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const centreIds = (user.centres || []).map(c => c._id || c);
        
        // Check if there are other active users with this name
        const duplicateUsers = await User.find({
            name: { $regex: new RegExp(`^${escapedName}$`, "i") },
            isActive: true
        });
        
        const isDuplicateName = duplicateUsers.length > 1;
        const nameRegex = new RegExp(`^${escapedName}(?:\\s*\\(.*\\))?$`, "i");
        
        const leadMatch = {
            leadResponsibility: { $regex: nameRegex }
        };
        
        const followUpMatch = {
            "followUps.updatedBy": { $regex: nameRegex }
        };
        
        if (isDuplicateName && centreIds.length > 0) {
            leadMatch.centre = { $in: centreIds };
            followUpMatch.centre = { $in: centreIds }; 
        }
        
        return {
            user,
            name: user.name,
            centreIds,
            isDuplicateName,
            leadMatch,
            followUpMatch
        };
    }
    
    // If not found in User collection (e.g. legacy/unknown data), return direct name match regex
    const escapedVal = String(val).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`^${escapedVal}(?:\\s*\\(.*\\))?$`, "i");
    return {
        name: String(val),
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
        schoolName
    } = queryParams;

    const query = {};

    // Feedback filter
    if (feedback && (!Array.isArray(feedback) || feedback.length > 0)) {
        const feedbackArray = Array.isArray(feedback) ? normalizeValue(feedback) : [normalizeValue(feedback)];
        const normalizedFeedbacks = feedbackArray.filter(f => f);
        if (normalizedFeedbacks.length > 0) {
            query.followUps = {
                $elemMatch: { feedback: { $in: normalizedFeedbacks } }
            };
        }
    }

    // Date range filter (Created At)
    if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) {
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt.$lte = end;
        }
    }

    // Scheduled Date filter (Next Follow Up)
    if (scheduledDate) {
        const start = new Date(scheduledDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(scheduledDate);
        end.setHours(23, 59, 59, 999);
        query.nextFollowUpDate = { $gte: start, $lte: end };
    }

    // Multi-select fields
    if (leadType && (!Array.isArray(leadType) || leadType.length > 0)) {
        const values = Array.isArray(leadType) ? normalizeValue(leadType) : [normalizeValue(leadType)];
        query.leadType = { $in: values };
    }
    if (source && (!Array.isArray(source) || source.length > 0)) {
        const values = Array.isArray(source) ? normalizeValue(source) : [normalizeValue(source)];
        query.source = { $in: values };
    }
    if (course && (!Array.isArray(course) || course.length > 0)) {
        const values = Array.isArray(course) ? normalizeValue(course) : [normalizeValue(course)];
        query.course = { $in: values };
    }
    if (board && (!Array.isArray(board) || board.length > 0)) {
        const values = Array.isArray(board) ? normalizeValue(board) : [normalizeValue(board)];
        query.board = { $in: values };
    }
    if (className && (!Array.isArray(className) || className.length > 0)) {
        const values = Array.isArray(className) ? normalizeValue(className) : [normalizeValue(className)];
        query.className = { $in: values };
    }
    if (centre && (!Array.isArray(centre) || centre.length > 0)) {
        const values = Array.isArray(centre) ? normalizeValue(centre) : [normalizeValue(centre)];
        query.centre = { $in: values };
    }
    if (queryParams.marketingBy && (!Array.isArray(queryParams.marketingBy) || queryParams.marketingBy.length > 0)) {
        const values = Array.isArray(queryParams.marketingBy) ? normalizeValue(queryParams.marketingBy) : [normalizeValue(queryParams.marketingBy)];
        query.marketingBy = { $in: values };
    }
    if (schoolName && (!Array.isArray(schoolName) || schoolName.length > 0)) {
        const values = Array.isArray(schoolName) ? normalizeValue(schoolName) : [normalizeValue(schoolName)];
        query.schoolName = { $in: values };
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
        const values = Array.isArray(leadResponsibility) ? normalizeValue(leadResponsibility) : [normalizeValue(leadResponsibility)];
        const cleanValues = values.filter(v => v);
        if (cleanValues.length > 0) {
            const orConditions = [];
            for (const val of cleanValues) {
                const resolved = await resolveAgentIdentifier(val, user);
                if (resolved && resolved.leadMatch) {
                    orConditions.push(resolved.leadMatch);
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

    // Follow-up status
    if (followUpStatus === 'contacted') {
        query.followUps = { $exists: true, $not: { $size: 0 } };
    } else if (followUpStatus === 'remaining') {
        query.followUps = { $size: 0 };
    } else if (followUpStatus === 'walkin') {
        query.$and = query.$and || [];
        query.$and.push({
            $or: [
                { isWalkIn: true },
                { source: { $regex: /^walk[- ]?in$/i } }
            ]
        });
    }

    // Exclude counseled leads
    query.isCounseled = { $ne: true };

    // Access Control Logic
    const userRole = (user.role || "").toLowerCase().replace(/\s+/g, "");
    const privilegedRoles = ['superadmin', 'super admin', 'admin', 'centerincharge', 'zonalmanager', 'hr', 'class_coordinator', 'rm', 'hod'];
    const isPrivileged = privilegedRoles.includes(userRole);
    const isSuperAdmin = ['superadmin', 'super admin'].includes(userRole);

    if (!isSuperAdmin) {
        const userDoc = await User.findById(user.id).select('centres role name');
        if (!userDoc) throw new Error("User not found during query building");

        const userCentreIds = userDoc.centres || [];
        const escapedName = userDoc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Check if there are other active users with the same name
        const duplicateUsers = await User.find({
            name: { $regex: new RegExp(`^${escapedName}$`, "i") },
            isActive: true
        });
        const isDuplicateName = duplicateUsers.length > 1;

        let leadRespCondition;
        if (isDuplicateName && userCentreIds.length > 0) {
            leadRespCondition = {
                leadResponsibility: { $regex: new RegExp(`^${escapedName}(?:\\s*\\(.*\\))?$`, "i") },
                centre: { $in: userCentreIds }
            };
        } else {
            leadRespCondition = {
                leadResponsibility: { $regex: new RegExp(`^${escapedName}(?:\\s*\\(.*\\))?$`, "i") }
            };
        }

        const orConditions = [
            { createdBy: userDoc._id },
            leadRespCondition
        ];

        if (isPrivileged && userCentreIds.length > 0) {
            orConditions.push({ centre: { $in: userCentreIds } });
        }

        // Handle Telecaller self-filtering logic
        if (query.leadResponsibility && !isPrivileged) {
            const filterNames = Array.isArray(leadResponsibility) ? leadResponsibility : [leadResponsibility];
            const isFilteringSelf = filterNames.some(n => {
                const normalizedFilter = (typeof n === 'object' ? n.value : n)?.toLowerCase()?.trim() || "";
                const normalizedUser = userDoc.name?.toLowerCase()?.trim() || "";
                return normalizedFilter === normalizedUser || normalizedFilter.includes(normalizedUser);
            });
            
            if (isFilteringSelf) {
                delete query.leadResponsibility;
                if (query.$or) {
                    query.$or = query.$or.filter(cond => !cond.leadResponsibility);
                    if (query.$or.length === 0) delete query.$or;
                }
            }
        }

        query.$and = query.$and || [];
        query.$and.push({ $or: orConditions });

        // Centre restriction (Already handled above for multi-select, but ensure intersection if superAdmin also passed centre)
        if (query.centre && userCentreIds.length > 0) {
            // Filter existing query.centre.$in to only include allowed centres
            const currentIn = query.centre.$in || [];
            const restrictedIn = currentIn.filter(id => 
                userCentreIds.some(allowedId => allowedId.toString() === id.toString())
            );
            if (restrictedIn.length > 0) {
                query.centre = { $in: restrictedIn };
            } else {
                // If no requested centres are allowed, restrict to user's centres
                query.centre = { $in: userCentreIds };
            }
        }
    }

    // Search logic
    if (search) {
        const searchOr = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phoneNumber: { $regex: search, $options: "i" } },
            { schoolName: { $regex: search, $options: "i" } },
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

    return query;
};

