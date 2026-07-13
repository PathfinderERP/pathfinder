import mongoose from "mongoose";
import dotenv from "dotenv";
import CentreSchema from "../models/Master_data/Centre.js";
import LeadManagement from "../models/LeadManagement.js";
import Admission from "../models/Admission/Admission.js";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";
import User from "../models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017/pathfinder";

const parseDateRangeIST = (fromDateStr, toDateStr) => {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istNow = new Date(utcTime + (3600000 * 5.5));

    let start = new Date(istNow);
    let end = new Date(istNow);

    if (fromDateStr && toDateStr) {
        const [fY, fM, fD] = fromDateStr.split('-').map(Number);
        const [tY, tM, tD] = toDateStr.split('-').map(Number);
        
        start = new Date(Date.UTC(fY, fM - 1, fD, 0, 0, 0, 0) - (5.5 * 3600 * 1000));
        end = new Date(Date.UTC(tY, tM - 1, tD, 23, 59, 59, 999) - (5.5 * 3600 * 1000));
    } else {
        const y = istNow.getFullYear();
        const m = istNow.getMonth();
        const d = istNow.getDate();
        start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - (5.5 * 3600 * 1000));
        end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - (5.5 * 3600 * 1000));
    }
    return { start, end };
};

const buildCallsReportData = async (dateFilter, startDate, endDate, centres, actualCenterIds, isRestrictIndividual, reqUser) => {
    // 1. Fetch aggregated calls
    const matchStage = {
        centre: { $in: actualCenterIds }
    };

    const followUpMatchStage = {
        "followUps.date": dateFilter
    };

    if (isRestrictIndividual && reqUser) {
        followUpMatchStage["followUps.updatedBy"] = reqUser.name;
    }

    const aggregatedCalls = await LeadManagement.aggregate([
        { $match: matchStage },
        { $unwind: "$followUps" },
        { $match: followUpMatchStage },
        {
            $addFields: {
                "followUps.updatedByLower": { $toLower: "$followUps.updatedBy" }
            }
        },
        { $group: {
            _id: {
                centre: "$centre",
                userName: "$followUps.updatedByLower"
            },
            originalUserName: { $first: "$followUps.updatedBy" },
            totalCalls: { $sum: 1 },
            hot: {
                $sum: {
                    $cond: [{ $regexMatch: { input: { $ifNull: ["$followUps.status", "$leadType"] }, regex: /hot/i } }, 1, 0]
                }
            },
            warm: {
                $sum: {
                    $cond: [{ $regexMatch: { input: { $ifNull: ["$followUps.status", "$leadType"] }, regex: /warm/i } }, 1, 0]
                }
            },
            cold: {
                $sum: {
                    $cond: [{ $regexMatch: { input: { $ifNull: ["$followUps.status", "$leadType"] }, regex: /cold/i } }, 1, 0]
                }
            },
            neutral: {
                $sum: {
                    $cond: [{ $regexMatch: { input: { $ifNull: ["$followUps.status", "$leadType"] }, regex: /neutral/i } }, 1, 0]
                }
            },
            invalid: {
                $sum: {
                    $cond: [{ $regexMatch: { input: { $ifNull: ["$followUps.status", "$leadType"] }, regex: /invalid|inactive/i } }, 1, 0]
                }
            }
        } }
    ]);

    // 2. Fetch active users of the selected centres
    const activeUsers = await User.find({
        isActive: true,
        centres: { $in: actualCenterIds },
        role: { $ne: 'teacher' }
    }).select('name role employeeId centres').lean();

    console.log("activeUsers length:", activeUsers.length);
    console.log("Is Keya Chowdhury in activeUsers?", activeUsers.some(u => u.name.match(/Keya/i)));

    // 3. Gather other usernames that had activity
    const allUserNames = new Set(activeUsers.map(u => u.name.toLowerCase().trim()));
    
    // Fetch walk-ins and admissions in the date filter
    const walkInMap = {};
    const walkIns = await LeadManagement.find({
        isWalkIn: true,
        walkInDate: dateFilter,
        walkInBy: { $exists: true, $ne: null }
    }).select('walkInBy centre').lean();

    walkIns.forEach(wi => {
        const uId = wi.walkInBy.toString();
        const cId = wi.centre?.toString();
        if (uId && cId) {
            const key = `${uId}_${cId}`;
            walkInMap[key] = (walkInMap[key] || 0) + 1;
        }
    });

    const centreNameToIdMap = {};
    const centreMap = {};
    centres.forEach(c => {
        centreMap[c._id.toString()] = c.centreName;
        centreNameToIdMap[c.centreName.toLowerCase()] = c._id.toString();
    });

    const admissionMap = {};
    const [admissions, boardAdmissions] = await Promise.all([
        Admission.find({
            createdAt: dateFilter,
            createdBy: { $exists: true, $ne: null }
        }).select('createdBy centre').lean(),
        BoardCourseAdmission.find({
            createdAt: dateFilter,
            createdBy: { $exists: true, $ne: null }
        }).select('createdBy centre').lean()
    ]);

    const addAdmissionToMap = (adm) => {
        const uId = adm.createdBy.toString();
        const cName = adm.centre;
        if (uId && cName) {
            const cId = centreNameToIdMap[cName.toLowerCase()];
            if (cId) {
                const key = `${uId}_${cId}`;
                admissionMap[key] = (admissionMap[key] || 0) + 1;
            }
        }
    };

    admissions.forEach(addAdmissionToMap);
    boardAdmissions.forEach(addAdmissionToMap);

    // Fetch follow ups scheduled for the specific date range
    const todaysFollowUps = await LeadManagement.aggregate([
        {
            $match: {
                centre: { $in: actualCenterIds },
                nextFollowUpDate: dateFilter,
                leadResponsibility: { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: {
                    centre: "$centre",
                    userName: { $toLower: "$leadResponsibility" }
                },
                count: { $sum: 1 }
            }
        }
    ]);

    // Fetch backlog follow ups (nextFollowUpDate < startDate)
    const previousFollowUps = await LeadManagement.aggregate([
        {
            $match: {
                centre: { $in: actualCenterIds },
                nextFollowUpDate: { $lt: startDate },
                leadResponsibility: { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: {
                    centre: "$centre",
                    userName: { $toLower: "$leadResponsibility" }
                },
                count: { $sum: 1 }
            }
        }
    ]);

    const todaysFollowUpMap = {};
    todaysFollowUps.forEach(item => {
        if (item._id && item._id.userName && item._id.centre) {
            const key = `${item._id.userName.trim()}_${item._id.centre.toString()}`;
            todaysFollowUpMap[key] = item.count;
        }
    });

    const previousFollowUpMap = {};
    previousFollowUps.forEach(item => {
        if (item._id && item._id.userName && item._id.centre) {
            const key = `${item._id.userName.trim()}_${item._id.centre.toString()}`;
            previousFollowUpMap[key] = item.count;
        }
    });

    // Populate userNames from other activities
    aggregatedCalls.forEach(item => {
        if (item.originalUserName) allUserNames.add(item.originalUserName.toLowerCase().trim());
    });
    todaysFollowUps.forEach(item => {
        if (item._id && item._id.userName) allUserNames.add(item._id.userName.toLowerCase().trim());
    });
    previousFollowUps.forEach(item => {
        if (item._id && item._id.userName) allUserNames.add(item._id.userName.toLowerCase().trim());
    });

    // Find any other users who had activity but aren't in activeUsers list
    const escapeRegex = (string) => {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    };
    const extraUserNames = Array.from(allUserNames).filter(name => !activeUsers.some(u => u.name.toLowerCase().trim() === name));
    if (extraUserNames.length > 0) {
        const extraUsers = await User.find({
            name: { $in: extraUserNames.map(n => new RegExp(`^${escapeRegex(n)}$`, 'i')) }
        }).select('name role employeeId centres').lean();
        extraUsers.forEach(u => {
            activeUsers.push(u);
        });
    }

    // Map all users by lowercase name
    const userMap = {};
    activeUsers.forEach(u => {
        userMap[u.name.toLowerCase().trim()] = { id: u._id, role: u.role, employeeId: u.employeeId, name: u.name, centres: u.centres };
    });

    const rowsMap = new Map();

    const addRowKey = (uName, cId, uId, uRole, uEmpId) => {
        if (!uName || !cId) return;
        const uNameLower = uName.toLowerCase().trim();
        const key = `${uNameLower}_${cId.toString()}`;
        if (!rowsMap.has(key)) {
            rowsMap.set(key, {
                userNameLower: uNameLower,
                userName: uName,
                centreId: cId.toString(),
                userId: uId || null,
                role: uRole || "N/A",
                employeeId: uEmpId || "N/A"
            });
        } else if (uId) {
            const existing = rowsMap.get(key);
            if (!existing.userId) {
                existing.userId = uId;
                existing.role = uRole || existing.role;
                existing.employeeId = uEmpId || existing.employeeId;
            }
        }
    };

    // Initialize rows for all active users under their assigned centres
    activeUsers.forEach(u => {
        (u.centres || []).forEach(c => {
            const cIdStr = c.toString();
            if (centreMap[cIdStr]) {
                addRowKey(u.name, cIdStr, u._id, u.role, u.employeeId);
            }
        });
    });

    // Add rows from aggregated calls
    aggregatedCalls.forEach(item => {
        const cId = item._id.centre?.toString();
        const uNameLower = (item._id.userName || "").trim();
        const uDetails = userMap[uNameLower] || {};
        const originalName = item.originalUserName || uDetails.name || uNameLower;
        addRowKey(originalName, cId, uDetails.id, uDetails.role, uDetails.employeeId);
    });

    // Add rows from todays follow ups
    todaysFollowUps.forEach(item => {
        if (item._id && item._id.userName && item._id.centre) {
            const cId = item._id.centre.toString();
            const uNameLower = item._id.userName.trim();
            const uDetails = userMap[uNameLower] || {};
            const originalName = uDetails.name || uNameLower;
            addRowKey(originalName, cId, uDetails.id, uDetails.role, uDetails.employeeId);
        }
    });

    // Add rows from previous follow ups
    previousFollowUps.forEach(item => {
        if (item._id && item._id.userName && item._id.centre) {
            const cId = item._id.centre.toString();
            const uNameLower = item._id.userName.trim();
            const uDetails = userMap[uNameLower] || {};
            const originalName = uDetails.name || uNameLower;
            addRowKey(originalName, cId, uDetails.id, uDetails.role, uDetails.employeeId);
        }
    });

    // Add rows from walk-ins
    walkIns.forEach(wi => {
        const uId = wi.walkInBy.toString();
        const cId = wi.centre?.toString();
        if (uId && cId) {
            const uDetails = activeUsers.find(u => u._id.toString() === uId) || {};
            if (uDetails.name) {
                addRowKey(uDetails.name, cId, uDetails._id, uDetails.role, uDetails.employeeId);
            }
        }
    });

    // Add rows from admissions
    const addAdmRow = (adm) => {
        const uId = adm.createdBy.toString();
        const cName = adm.centre;
        if (uId && cName) {
            const cId = centreNameToIdMap[cName.toLowerCase()];
            if (cId) {
                const uDetails = activeUsers.find(u => u._id.toString() === uId) || {};
                if (uDetails.name) {
                    addRowKey(uDetails.name, cId, uDetails._id, uDetails.role, uDetails.employeeId);
                }
            }
        }
    };
    admissions.forEach(addAdmRow);
    boardAdmissions.forEach(addAdmRow);

    const reportData = Array.from(rowsMap.values()).map(row => {
        const cId = row.centreId;
        const cName = centreMap[cId] || "Unknown Centre";
        const uNameLower = row.userNameLower;
        const uName = row.userName;
        const uDetails = userMap[uNameLower] || {};

        const isMatchLoggedInUser = reqUser && uNameLower === reqUser.name.toLowerCase().trim();
        const finalUserId = isMatchLoggedInUser ? reqUser._id : (row.userId || uDetails.id || null);
        const finalRole = isMatchLoggedInUser ? reqUser.role : (row.role || uDetails.role || "N/A");
        const finalEmployeeId = isMatchLoggedInUser ? reqUser.employeeId : (row.employeeId || uDetails.employeeId || "N/A");

        const aggCall = aggregatedCalls.find(ac => ac._id.centre?.toString() === cId && ac._id.userName === uNameLower) || {};
        
        const lookupKey = finalUserId ? `${finalUserId.toString()}_${cId}` : null;
        const walkInCount = lookupKey ? (walkInMap[lookupKey] || 0) : 0;
        const admissionCount = lookupKey ? (admissionMap[lookupKey] || 0) : 0;
        const todaysFollowUpCount = todaysFollowUpMap[`${uNameLower}_${cId}`] || 0;
        const previousFollowUpCount = previousFollowUpMap[`${uNameLower}_${cId}`] || 0;

        return {
            centreId: cId,
            centreName: cName,
            userId: finalUserId,
            userName: uName,
            role: finalRole,
            employeeId: finalEmployeeId,
            totalCalls: aggCall.totalCalls || 0,
            hot: aggCall.hot || 0,
            warm: aggCall.warm || 0,
            cold: aggCall.cold || 0,
            neutral: aggCall.neutral || 0,
            invalid: aggCall.invalid || 0,
            todaysFollowUp: todaysFollowUpCount,
            previousFollowUp: previousFollowUpCount,
            walkInCount,
            admissionCount
        };
    });

    return reportData;
};

async function test() {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB");

    const bagnan = await CentreSchema.findOne({ centreName: /Bagnan/i }).lean();
    console.log("Bagnan Centre:", bagnan);

    const { start, end } = parseDateRangeIST("2026-07-12", "2026-07-12");
    const dateFilter = { $gte: start, $lte: end };

    const reportData = await buildCallsReportData(
        dateFilter,
        start,
        end,
        [bagnan],
        [bagnan._id],
        false,
        null
    );

    console.log("Report data for Bagnan:", reportData);

    await mongoose.disconnect();
}

test().catch(console.error);
