import mongoose from "mongoose";
import User from "../models/User.js";

/**
 * Normalizes filter values that might be strings, IDs, or objects from CustomMultiSelect
 */
const normalizeValue = (val) => {
    if (!val) return val;
    if (Array.isArray(val)) return val.map(v => normalizeValue(v));
    if (typeof val === 'object' && val.value !== undefined) return val.value;
    return val;
};

export const buildLeadQuery = async (queryParams, user) => {
    const { 
        search, leadType, source, centre, course, leadResponsibility, 
        board, className, fromDate, toDate, feedback, scheduledDate, followUpStatus 
    } = queryParams;

    const query = {};

    // Feedback filter
    if (feedback && (!Array.isArray(feedback) || feedback.length > 0)) {
        const feedbackArray = Array.isArray(feedback) ? normalizeValue(feedback) : [normalizeValue(feedback)];
        if (feedbackArray.length > 0) {
            query.followUps = {
                $elemMatch: { feedback: { $in: feedbackArray } }
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
        query.leadType = Array.isArray(leadType) ? { $in: normalizeValue(leadType) } : normalizeValue(leadType);
    }
    if (source && (!Array.isArray(source) || source.length > 0)) {
        query.source = Array.isArray(source) ? { $in: normalizeValue(source) } : normalizeValue(source);
    }
    if (course && (!Array.isArray(course) || course.length > 0)) {
        query.course = Array.isArray(course) ? { $in: normalizeValue(course) } : { $in: [normalizeValue(course)] };
    }
    if (board && (!Array.isArray(board) || board.length > 0)) {
        query.board = Array.isArray(board) ? { $in: normalizeValue(board) } : { $in: [normalizeValue(board)] };
    }
    if (className && (!Array.isArray(className) || className.length > 0)) {
        query.className = Array.isArray(className) ? { $in: normalizeValue(className) } : { $in: [normalizeValue(className)] };
    }

    // Responsibility filter (Telecaller names)
    if (leadResponsibility && (!Array.isArray(leadResponsibility) || leadResponsibility.length > 0)) {
        const names = Array.isArray(leadResponsibility) ? normalizeValue(leadResponsibility) : [normalizeValue(leadResponsibility)];
        query.leadResponsibility = {
            $in: names.map(n => new RegExp(`^${n}$`, "i"))
        };
    }

    // Follow-up status
    if (followUpStatus === 'contacted') {
        query.followUps = { $exists: true, $not: { $size: 0 } };
    } else if (followUpStatus === 'remaining') {
        query.followUps = { $size: 0 };
    }

    // Exclude counseled leads
    query.isCounseled = { $ne: true };

    // Access Control Logic
    const userRole = (user.role || "").toLowerCase().replace(/\s+/g, "");
    const privilegedRoles = ['superadmin', 'super admin', 'admin', 'centerincharge', 'zonalmanager', 'zonalhead', 'hr', 'class_coordinator', 'rm', 'hod'];
    const isPrivileged = privilegedRoles.includes(userRole);
    const isSuperAdmin = ['superadmin', 'super admin'].includes(userRole);

    if (!isSuperAdmin) {
        const userDoc = await User.findById(user.id).select('centres role name');
        if (!userDoc) throw new Error("User not found during query building");

        const userCentreIds = userDoc.centres || [];
        const escapedName = userDoc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const orConditions = [
            { createdBy: userDoc._id },
            { leadResponsibility: { $regex: new RegExp(`^${escapedName}$`, "i") } }
        ];

        if (isPrivileged && userCentreIds.length > 0) {
            orConditions.push({ centre: { $in: userCentreIds } });
        }

        // Handle Telecaller self-filtering logic
        if (query.leadResponsibility && !isPrivileged) {
            const filterNames = Array.isArray(leadResponsibility) ? leadResponsibility : [leadResponsibility];
            const isFilteringSelf = filterNames.some(n => {
                const normalizedFilter = n?.toLowerCase()?.trim() || "";
                const normalizedUser = userDoc.name?.toLowerCase()?.trim() || "";
                return normalizedFilter === normalizedUser || normalizedFilter.includes(normalizedUser);
            });
            
            if (isFilteringSelf) {
                delete query.leadResponsibility;
            }
        }

        query.$and = query.$and || [];
        query.$and.push({ $or: orConditions });

        // Centre restriction
        if (centre && (!Array.isArray(centre) || centre.length > 0)) {
            const requestedCentres = Array.isArray(centre) ? normalizeValue(centre) : [normalizeValue(centre)];
            const validRequestedCentres = requestedCentres.filter(reqC =>
                userCentreIds.some(allowedC => allowedC.toString() === reqC.toString())
            );
            if (validRequestedCentres.length > 0) {
                query.centre = { 
                    $in: validRequestedCentres.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) 
                };
            }
        }
    } else {
        if (centre && (!Array.isArray(centre) || centre.length > 0)) {
            const requestedCentres = Array.isArray(centre) ? normalizeValue(centre) : [normalizeValue(centre)];
            if (requestedCentres.length > 0) {
                query.centre = { 
                    $in: requestedCentres.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) 
                };
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
