import mongoose from "mongoose";
import User from "../models/User.js";

/**
 * Normalizes filter values that might be strings, IDs, or objects from CustomMultiSelect
 */
/**
 * Normalizes filter values and casts to ObjectId if necessary
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

export const buildLeadQuery = async (queryParams, user) => {
    const { 
        search, leadType, source, centre, course, leadResponsibility, 
        board, className, fromDate, toDate, feedback, scheduledDate, followUpStatus 
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

    // Responsibility filter (Telecaller names)
    if (leadResponsibility && (!Array.isArray(leadResponsibility) || leadResponsibility.length > 0)) {
        const names = Array.isArray(leadResponsibility) ? normalizeValue(leadResponsibility) : [normalizeValue(leadResponsibility)];
        const cleanNames = names.filter(n => typeof n === 'string');
        if (cleanNames.length > 0) {
            query.leadResponsibility = {
                $in: cleanNames.map(n => new RegExp(`^${n}$`, "i"))
            };
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
                const normalizedFilter = (typeof n === 'object' ? n.value : n)?.toLowerCase()?.trim() || "";
                const normalizedUser = userDoc.name?.toLowerCase()?.trim() || "";
                return normalizedFilter === normalizedUser || normalizedFilter.includes(normalizedUser);
            });
            
            if (isFilteringSelf) {
                delete query.leadResponsibility;
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
        } else if (userCentreIds.length > 0) {
             // Handled by orConditions but if we want strict centre filtering
             // query.centre = { $in: userCentreIds };
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

