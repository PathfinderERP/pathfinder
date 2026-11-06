import mongoose from "mongoose";
import TomorrowPlanner from "../../models/TomorrowPlanner.js";
import MarketingPlanner from "../../models/MarketingPlanner.js";
import AssignedTask from "../../models/AssignedTask.js";
import User from "../../models/User.js";
import Centre from "../../models/Master_data/Centre.js";
import Zone from "../../models/Zone.js";
import { getSignedFileUrl } from "../../utils/r2Upload.js";

// Helper: Format Date to YYYY-MM-DD in IST
const getISTDateString = (dateObj = new Date()) => {
    return dateObj.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

// Helper: Resolve date range preset to { startDate, endDate, label }
const resolveDateRange = (rangeType, rawStart, rawEnd) => {
    const todayStr = getISTDateString(new Date());

    if (rangeType === "tomorrow") {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const tomorrowStr = getISTDateString(d);
        return { startDate: tomorrowStr, endDate: tomorrowStr, label: "Tomorrow" };
    }

    if (rangeType === "yesterday") {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const yestStr = getISTDateString(d);
        return { startDate: yestStr, endDate: yestStr, label: "Yesterday" };
    }

    if (rangeType === "this_week") {
        const curr = new Date();
        const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1); // Monday
        const monday = new Date(curr.setDate(first));
        const sunday = new Date(curr.setDate(first + 6));
        return {
            startDate: getISTDateString(monday),
            endDate: getISTDateString(sunday),
            label: "This Week"
        };
    }

    if (rangeType === "this_month") {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
            startDate: getISTDateString(firstDay),
            endDate: getISTDateString(lastDay),
            label: "This Month"
        };
    }

    if (rangeType === "previous_month" || rangeType === "last_month") {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
            startDate: getISTDateString(firstDay),
            endDate: getISTDateString(lastDay),
            label: "Previous Month"
        };
    }

    if (rangeType === "all") {
        return {
            startDate: "2024-01-01",
            endDate: "2030-12-31",
            label: "All"
        };
    }

    if (rangeType === "custom") {
        const s = rawStart && /^\d{4}-\d{2}-\d{2}$/.test(rawStart) ? rawStart : todayStr;
        const e = rawEnd && /^\d{4}-\d{2}-\d{2}$/.test(rawEnd) ? rawEnd : s;
        return {
            startDate: s <= e ? s : e,
            endDate: s <= e ? e : s,
            label: "Custom Range"
        };
    }

    // Default to "today"
    return { startDate: todayStr, endDate: todayStr, label: "Today" };
};

export const getMarketingAnalysis = async (req, res) => {
    try {
        const {
            dateRange = "today",
            startDate: rawStart,
            endDate: rawEnd,
            userIds,
            centreIds,
            zoneIds,
            roles,
            activityTypes,
            activityPurposes,
            status,
            search
        } = req.query;

        // 1. Resolve effective date range
        const { startDate, endDate, label: rangeLabel } = resolveDateRange(dateRange, rawStart, rawEnd);

        const startObj = new Date(`${startDate}T00:00:00.000Z`);
        const endObj = new Date(`${endDate}T23:59:59.999Z`);
        const startBuffer = new Date(startObj.getTime() - 12 * 60 * 60 * 1000);
        const endBuffer = new Date(endObj.getTime() + 12 * 60 * 60 * 1000);

        // 2. Fetch master data: Centres, Zones, Users
        const [masterCentres, masterZones, allUsers] = await Promise.all([
            Centre.find({ status: { $ne: "deactive" } }).select("centreName enterCode status").lean(),
            Zone.find({ isActive: { $ne: false } }).select("name centres").lean(),
            User.find({ isActive: true })
                .select("name role employeeId email centres primaryCentre")
                .populate("centres", "centreName enterCode")
                .populate("primaryCentre", "centreName enterCode")
                .lean()
        ]);

        const centreZoneMap = {};
        masterZones.forEach(z => {
            const zId = z._id.toString();
            const zName = z.name;
            (z.centres || []).forEach(c => {
                const cId = (c._id || c).toString();
                centreZoneMap[cId] = { id: zId, name: zName };
            });
        });

        // 3. User Permission Scope: if not superAdmin, restrict to allowed centres or self
        const userRoleLower = (req.user.role || "").toLowerCase().replace(/\s+/g, "");
        const isSuperAdmin = userRoleLower === "superadmin" || userRoleLower === "super admin";
        let allowedUserIds = null;

        if (!isSuperAdmin) {
            const userCentreIds = (req.user.centres || []).map(c => (c._id || c).toString());
            if (userCentreIds.length > 0) {
                // Allowed to view staff in the same centres
                allowedUserIds = allUsers
                    .filter(u => {
                        const uCentres = (u.centres || []).map(c => (c._id || c).toString());
                        return uCentres.some(cid => userCentreIds.includes(cid)) || u._id.toString() === req.user._id.toString();
                    })
                    .map(u => u._id.toString());
            } else {
                allowedUserIds = [req.user._id.toString()];
            }
        }

        // 4. Query TomorrowPlanner, MarketingPlanner, and AssignedTask in date range
        const plannerQuery = {
            $or: [
                { planDate: { $gte: startBuffer, $lte: endBuffer } },
                { plantDate: { $gte: startBuffer, $lte: endBuffer } }
            ]
        };

        const mpQuery = {
            date: { $gte: startDate, $lte: endDate }
        };

        const assignedTaskQuery = {
            planDate: { $gte: startBuffer, $lte: endBuffer },
            status: { $ne: "Cancelled" }
        };

        const [planners, marketingActivities, assignedTasks] = await Promise.all([
            TomorrowPlanner.find(plannerQuery)
                .populate({
                    path: "tasks.schoolRef",
                    select: "schoolName centerName tier status"
                })
                .lean(),
            MarketingPlanner.find(mpQuery)
                .populate({
                    path: "schoolRef",
                    select: "schoolName centerName tier status"
                })
                .lean(),
            AssignedTask.find(assignedTaskQuery).lean()
        ]);

        // Pre-sign all Cloudflare R2 photos in parallel so browsers can render them directly
        const uniquePhotoUrls = new Set();
        marketingActivities.forEach(act => {
            if (act.photo && typeof act.photo === "string" && !act.photo.startsWith("data:image")) {
                uniquePhotoUrls.add(act.photo);
            }
            if (Array.isArray(act.photos)) {
                act.photos.forEach(p => {
                    if (p && typeof p === "string" && !p.startsWith("data:image")) {
                        uniquePhotoUrls.add(p);
                    }
                });
            }
        });

        const signedPhotoMap = {};
        await Promise.all(
            Array.from(uniquePhotoUrls).map(async (rawUrl) => {
                try {
                    const signed = await getSignedFileUrl(rawUrl);
                    if (signed) signedPhotoMap[rawUrl] = signed;
                } catch (e) {
                    signedPhotoMap[rawUrl] = rawUrl;
                }
            })
        );

        const resolveSignedPhoto = (url) => {
            if (!url) return null;
            return signedPhotoMap[url] || url;
        };

        // 5. Build user dictionary & active user list
        const userMap = {};
        allUsers.forEach(u => {
            const uCentres = u.centres || [];
            const centreNames = uCentres.map(c => c.centreName).filter(Boolean);
            const primaryName = u.primaryCentre?.centreName;
            if (primaryName && !centreNames.includes(primaryName)) {
                centreNames.unshift(primaryName);
            }

            const rawCentres = uCentres.map(c => c._id?.toString() || c.toString());
            if (u.primaryCentre?._id) {
                const pId = u.primaryCentre._id.toString();
                if (!rawCentres.includes(pId)) rawCentres.unshift(pId);
            }

            const userZoneIds = new Set();
            const userZoneNames = new Set();
            rawCentres.forEach(cid => {
                if (centreZoneMap[cid]) {
                    userZoneIds.add(centreZoneMap[cid].id);
                    userZoneNames.add(centreZoneMap[cid].name);
                }
            });

            const zoneName = userZoneNames.size > 0 ? Array.from(userZoneNames).join(", ") : "General Zone";

            userMap[u._id.toString()] = {
                _id: u._id.toString(),
                name: u.name,
                employeeId: u.employeeId || "",
                email: u.email || "",
                role: u.role || "marketing",
                centres: centreNames,
                zone: zoneName,
                zoneIds: Array.from(userZoneIds),
                rawCentres
            };
        });

        // Collect all users who have either a plan or an executed activity in this range
        const activeUserIdSet = new Set();
        planners.forEach(p => p.user && activeUserIdSet.add(p.user.toString()));
        marketingActivities.forEach(m => m.user && activeUserIdSet.add(m.user.toString()));
        assignedTasks.forEach(at => at.assignedTo && activeUserIdSet.add(at.assignedTo.toString()));

        // Also include all target marketing roles
        const MKT_ROLES = ['marketing', 'centerincharge', 'centreincharge', 'zonalmanager', 'areamanager', 'assistantzonalmanager', 'assistantcenterincharge', 'digital'];
        allUsers.forEach(u => {
            const r = (u.role || '').toLowerCase().replace(/\s+/g, '');
            if (MKT_ROLES.includes(r)) {
                activeUserIdSet.add(u._id.toString());
            }
        });

        // Filter by user permissions if applicable
        if (allowedUserIds !== null) {
            const allowedSet = new Set(allowedUserIds);
            for (const uid of activeUserIdSet) {
                if (!allowedSet.has(uid)) activeUserIdSet.delete(uid);
            }
        }

        // Multi-select query filters
        const filterUserIds = userIds ? (typeof userIds === "string" ? userIds.split(",") : userIds).filter(Boolean) : null;
        const filterRoles = roles ? (typeof roles === "string" ? roles.split(",") : roles).map(r => r.trim().toLowerCase()).filter(Boolean) : null;
        const filterZoneIds = zoneIds ? (typeof zoneIds === "string" ? zoneIds.split(",") : zoneIds).map(z => z.trim().toLowerCase()).filter(Boolean) : null;
        const filterCentreIds = centreIds ? (typeof centreIds === "string" ? centreIds.split(",") : centreIds).map(c => c.trim().toLowerCase()).filter(Boolean) : null;
        const filterTypes = activityTypes ? (typeof activityTypes === "string" ? activityTypes.split(",") : activityTypes).map(t => t.trim().toLowerCase()).filter(Boolean) : null;
        const filterPurposes = activityPurposes ? (typeof activityPurposes === "string" ? activityPurposes.split(",") : activityPurposes).map(p => p.trim().toLowerCase()).filter(Boolean) : null;
        const filterStatus = status && status !== "all" ? status.toLowerCase() : null;
        const filterSearch = search ? search.trim().toLowerCase() : null;

        // Group planners, activities, and assigned tasks by user ID
        const plannersByUser = {};
        planners.forEach(p => {
            const uid = p.user?.toString();
            if (uid) {
                if (!plannersByUser[uid]) plannersByUser[uid] = [];
                plannersByUser[uid].push(p);
            }
        });

        const activitiesByUser = {};
        marketingActivities.forEach(m => {
            const uid = m.user?.toString();
            if (uid) {
                if (!activitiesByUser[uid]) activitiesByUser[uid] = [];
                activitiesByUser[uid].push(m);
            }
        });

        const assignedByUser = {};
        assignedTasks.forEach(at => {
            const uid = at.assignedTo?.toString();
            if (uid) {
                if (!assignedByUser[uid]) assignedByUser[uid] = [];
                assignedByUser[uid].push(at);
            }
        });

        // 6. Build User-Wise Analysis and Detailed Tasks list
        const userSummaryList = [];
        const allDetailedTasks = [];

        for (const uid of activeUserIdSet) {
            const userMeta = userMap[uid] || {
                _id: uid,
                name: "Unknown Staff",
                employeeId: "",
                role: "marketing",
                centres: [],
                zone: "General Zone",
                zoneIds: [],
                rawCentres: []
            };

            // User-level Filter 1: User ID
            if (filterUserIds && filterUserIds.length > 0 && !filterUserIds.includes(uid)) {
                continue;
            }

            // User-level Filter 2: Role
            if (filterRoles && filterRoles.length > 0) {
                const uRole = (userMeta.role || "").toLowerCase().replace(/\s+/g, "");
                const matchesRole = filterRoles.some(fr => {
                    const cleanFr = fr.replace(/\s+/g, "");
                    return uRole === cleanFr || uRole.includes(cleanFr) || cleanFr.includes(uRole);
                });
                if (!matchesRole) continue;
            }

            // User-level Filter 3: Zone
            if (filterZoneIds && filterZoneIds.length > 0) {
                const uZoneIds = (userMeta.zoneIds || []).map(z => z.toLowerCase());
                const uZoneName = (userMeta.zone || "").toLowerCase();
                const matchesZone = filterZoneIds.some(fz => uZoneIds.includes(fz) || uZoneName.includes(fz));
                if (!matchesZone) continue;
            }

            // User-level Filter 4: Centre
            if (filterCentreIds && filterCentreIds.length > 0) {
                const uCentres = (userMeta.rawCentres || []).map(c => c.toLowerCase());
                const cNames = (userMeta.centres || []).map(c => c.toLowerCase());
                const matchesCentre = filterCentreIds.some(fc => uCentres.includes(fc) || cNames.some(cn => cn.includes(fc)));
                if (!matchesCentre) continue;
            }

            const userPlanners = plannersByUser[uid] || [];
            const userActivities = activitiesByUser[uid] || [];
            const userAssigned = assignedByUser[uid] || [];

            // Mark tracking for activities
            const matchedActivityIds = new Set();
            const userTaskRows = [];

            // 6A. Process Planned Tasks from TomorrowPlanner
            userPlanners.forEach(p => {
                const pDate = p.planDate || p.plantDate;
                const pDateStr = pDate ? getISTDateString(new Date(pDate)) : startDate;

                (p.tasks || []).forEach(t => {
                    const taskPlace = (t.place || t.schoolRef?.schoolName || "").trim();
                    const taskType = (t.activityType || "").trim();
                    const taskPurpose = (t.activityPurpose || "").trim();

                    // Find corresponding execution in MarketingPlanner
                    const match = userActivities.find(act => {
                        if (matchedActivityIds.has(act._id.toString())) return false;
                        if (act.date !== pDateStr) return false;

                        // Check schoolRef match
                        if (t.schoolRef && act.schoolRef) {
                            const ref1 = t.schoolRef._id?.toString() || t.schoolRef.toString();
                            const ref2 = act.schoolRef._id?.toString() || act.schoolRef.toString();
                            if (ref1 === ref2) return true;
                        }

                        // Check place name match
                        const actPlace = (act.institution || act.place || act.schoolRef?.schoolName || "").trim().toLowerCase();
                        if (taskPlace && actPlace && (actPlace === taskPlace.toLowerCase() || actPlace.includes(taskPlace.toLowerCase()) || taskPlace.toLowerCase().includes(actPlace))) {
                            return true;
                        }

                        return false;
                    });

                    let isCompleted = false;
                    let executionStatus = "Pending";
                    let actualTime = "";
                    let submittedAt = "";
                    let leads = "0";
                    let photos = [];
                    let photo = null;
                    let geoTagged = false;
                    let latitude = null;
                    let longitude = null;
                    let locationName = "";
                    let activityStatus = t.activityStatus || "Neutral";
                    let approvalStatus = "Pending";
                    let remarks = "";
                    let approvedBy = "";
                    let executionRecordId = null;

                    if (match) {
                        matchedActivityIds.add(match._id.toString());
                        isCompleted = true;
                        executionStatus = "Completed";
                        actualTime = match.actual || match.submittedAt || match.plan || "";
                        submittedAt = match.submittedAt || (match.createdAt ? new Date(match.createdAt).toLocaleString('en-IN') : "");
                        leads = String(match.leads || "0");
                        photos = (match.photos || (match.photo ? [match.photo] : [])).map(resolveSignedPhoto);
                        photo = resolveSignedPhoto(match.photos?.[0] || match.photo || null);
                        geoTagged = !!(match.latitude && match.longitude);
                        latitude = match.latitude || null;
                        longitude = match.longitude || null;
                        locationName = match.locationName || "";
                        activityStatus = match.activityStatus || t.activityStatus || "Success";
                        approvalStatus = match.status || "Pending";
                        remarks = match.remarks || "";
                        approvedBy = match.approvedBy || "";
                        executionRecordId = match._id.toString();
                    } else if (t.status === "Completed") {
                        isCompleted = true;
                        executionStatus = "Completed";
                        activityStatus = t.activityStatus || "Success";
                    } else if (t.status === "Skipped") {
                        executionStatus = "Skipped";
                        activityStatus = "Failed";
                    }

                    userTaskRows.push({
                        _id: t._id ? t._id.toString() : `${uid}-${pDateStr}-${userTaskRows.length}`,
                        plannerId: p._id.toString(),
                        executionRecordId,
                        userId: uid,
                        userName: userMeta.name,
                        userRole: userMeta.role,
                        centres: userMeta.centres.join(", ") || "Main Location",
                        zone: userMeta.zone,
                        zoneIds: userMeta.zoneIds,
                        date: pDateStr,
                        isPlanned: true,
                        isAdHoc: false,
                        activityType: taskType || "General Activity",
                        activityPurpose: taskPurpose || "SCHOOL VISIT",
                        place: taskPlace || "—",
                        schoolRef: t.schoolRef || null,
                        schoolStatus: t.schoolStatus || "",
                        time: t.time || "—",
                        estimatedDuration: t.estimatedDuration || "",
                        notes: t.notes || "",
                        priority: t.priority || "Medium",
                        status: executionStatus, // "Completed" | "Pending" | "Skipped"
                        isCompleted,
                        actualTime: actualTime || "—",
                        submittedAt: submittedAt || "—",
                        leads,
                        activityStatus,
                        photos,
                        photo,
                        geoTagged,
                        latitude,
                        longitude,
                        locationName: locationName || (geoTagged ? `${latitude}, ${longitude}` : "No Geo-Tag"),
                        approvalStatus,
                        remarks,
                        approvedBy,
                        isAssigned: t.isAssigned || false,
                        assignedByName: t.assignedByName || ""
                    });
                });
            });

            // 6B. Process direct MarketingPlanner activities done today
            userActivities.forEach(act => {
                if (matchedActivityIds.has(act._id.toString())) return;

                const actPlace = (act.institution || act.place || act.schoolRef?.schoolName || "").trim();
                const actType = (act.type || "").trim();
                const actPurpose = (act.activityPurpose || "").trim();

                userTaskRows.push({
                    _id: act._id.toString(),
                    plannerId: null,
                    executionRecordId: act._id.toString(),
                    userId: uid,
                    userName: userMeta.name,
                    userRole: userMeta.role,
                    centres: userMeta.centres.join(", ") || "Main Location",
                    zone: userMeta.zone,
                    zoneIds: userMeta.zoneIds,
                    date: act.date || startDate,
                    isPlanned: false,
                    isAdHoc: true,
                    activityType: actType || "Direct Activity",
                    activityPurpose: actPurpose || "SCHOOL VISIT",
                    place: actPlace || "—",
                    schoolRef: act.schoolRef || null,
                    schoolStatus: act.schoolStatus || "",
                    time: act.plan || "—",
                    estimatedDuration: act.estimatedDuration || "",
                    notes: act.notes || "",
                    priority: act.priority || "Medium",
                    status: "Completed (Direct Visit)",
                    isCompleted: true,
                    actualTime: act.actual || act.submittedAt || "—",
                    submittedAt: act.submittedAt || (act.createdAt ? new Date(act.createdAt).toLocaleString('en-IN') : "—"),
                    leads: String(act.leads || "0"),
                    activityStatus: act.activityStatus || "Success",
                    photos: (act.photos || (act.photo ? [act.photo] : [])).map(resolveSignedPhoto),
                    photo: resolveSignedPhoto(act.photos?.[0] || act.photo || null),
                    geoTagged: !!(act.latitude && act.longitude),
                    latitude: act.latitude || null,
                    longitude: act.longitude || null,
                    locationName: act.locationName || (act.latitude && act.longitude ? `${act.latitude}, ${act.longitude}` : "No Geo-Tag"),
                    approvalStatus: act.status || "Pending",
                    remarks: act.remarks || "",
                    approvedBy: act.approvedBy || "",
                    isAssigned: act.isAssigned || false,
                    assignedByName: act.assignedByName || ""
                });
            });

            // 6C. Task-level Filtering (Activity Types, Activity Purposes, Execution Status, Search)
            const isTaskMatching = (t) => {
                // Activity Type filter
                if (filterTypes && filterTypes.length > 0) {
                    const tType = (t.activityType || "").toLowerCase();
                    if (!filterTypes.some(ft => tType.includes(ft))) return false;
                }

                // Activity Purpose filter
                if (filterPurposes && filterPurposes.length > 0) {
                    const tPurpose = (t.activityPurpose || "").toLowerCase();
                    if (!filterPurposes.some(fp => tPurpose.includes(fp))) return false;
                }

                // Execution Status filter
                if (filterStatus) {
                    if (filterStatus === "completed") {
                        if (!t.isCompleted) return false;
                    } else if (filterStatus === "pending") {
                        if (t.isCompleted || t.status === "Skipped") return false;
                    } else if (filterStatus === "skipped") {
                        if (t.status !== "Skipped") return false;
                    }
                }

                // Search query filter
                if (filterSearch) {
                    const matchesUser = userMeta.name.toLowerCase().includes(filterSearch) ||
                        userMeta.centres.some(c => c.toLowerCase().includes(filterSearch)) ||
                        userMeta.role.toLowerCase().includes(filterSearch) ||
                        userMeta.zone.toLowerCase().includes(filterSearch);

                    const matchesTask = (t.place || "").toLowerCase().includes(filterSearch) ||
                        (t.activityType || "").toLowerCase().includes(filterSearch) ||
                        (t.activityPurpose || "").toLowerCase().includes(filterSearch) ||
                        (t.notes || "").toLowerCase().includes(filterSearch) ||
                        (t.centres || "").toLowerCase().includes(filterSearch);

                    if (!matchesUser && !matchesTask) return false;
                }

                return true;
            };

            const matchingTasks = userTaskRows.filter(isTaskMatching);

            // If task-level filters are active (status, types, purposes):
            // Only include users who have at least 1 matching task
            const hasTaskLevelFilter = Boolean(filterStatus || (filterTypes && filterTypes.length > 0) || (filterPurposes && filterPurposes.length > 0));
            if (hasTaskLevelFilter && matchingTasks.length === 0) {
                continue;
            }

            if (filterSearch) {
                const matchesUser = userMeta.name.toLowerCase().includes(filterSearch) ||
                    userMeta.centres.some(c => c.toLowerCase().includes(filterSearch)) ||
                    userMeta.role.toLowerCase().includes(filterSearch) ||
                    userMeta.zone.toLowerCase().includes(filterSearch);
                if (!matchesUser && matchingTasks.length === 0) {
                    continue;
                }
            }

            // 6D. Compute User Aggregates
            const plannedTasksCount = userTaskRows.filter(t => t.isPlanned).length;
            const completedPlanned = userTaskRows.filter(t => t.isPlanned && t.isCompleted).length;
            const pendingTasksCount = userTaskRows.filter(t => t.isPlanned && !t.isCompleted && t.status !== "Skipped").length;
            const skippedTasksCount = userTaskRows.filter(t => t.status === "Skipped").length;
            const adHocCompleted = userTaskRows.filter(t => t.isAdHoc && t.isCompleted).length;
            const totalExecuted = completedPlanned + adHocCompleted;

            // Plan completion rate applies only if tasks were planned in Tomorrow Planner
            const completionRate = plannedTasksCount > 0
                ? Number(((completedPlanned / plannedTasksCount) * 100).toFixed(1))
                : null; // null represents "No Tomorrow Plan Filled"

            let userLeads = 0;
            let geoCount = 0;
            let proofCount = 0;
            const actTypesMap = {};
            const actPurposesMap = {};
            const approvalsMap = { Approved: 0, Pending: 0, Rejected: 0 };

            const tasksToAggregate = hasTaskLevelFilter ? matchingTasks : userTaskRows;
            tasksToAggregate.forEach(t => {
                if (t.isCompleted) {
                    userLeads += Number(t.leads) || 0;
                    if (t.geoTagged) geoCount++;
                    if (t.photo || (t.photos && t.photos.length > 0)) proofCount++;
                    approvalsMap[t.approvalStatus] = (approvalsMap[t.approvalStatus] || 0) + 1;
                }
                const tKey = t.activityType || "General";
                actTypesMap[tKey] = (actTypesMap[tKey] || 0) + 1;
                const pKey = t.activityPurpose || "General";
                actPurposesMap[pKey] = (actPurposesMap[pKey] || 0) + 1;
            });

            userSummaryList.push({
                user: userMeta,
                plannedTasksCount,
                completedPlanned,
                pendingTasksCount,
                skippedTasksCount,
                adHocCompleted,
                totalExecuted,
                completionRate,
                totalLeads: userLeads,
                geoCount,
                proofCount,
                activityTypes: actTypesMap,
                activityPurposes: actPurposesMap,
                approvals: approvalsMap,
                hasActivity: userTaskRows.length > 0,
                tasks: matchingTasks
            });

            allDetailedTasks.push(...matchingTasks);
        }

        // Sort summaries: staff with most activities/planned first, then alphabetically
        userSummaryList.sort((a, b) => {
            if (b.totalExecuted !== a.totalExecuted) return b.totalExecuted - a.totalExecuted;
            if (b.plannedTasksCount !== a.plannedTasksCount) return b.plannedTasksCount - a.plannedTasksCount;
            return a.user.name.localeCompare(b.user.name);
        });

        // Sort detailed tasks: latest date and time first
        allDetailedTasks.sort((a, b) => {
            if (b.date !== a.date) return b.date.localeCompare(a.date);
            return a.userName.localeCompare(b.userName);
        });

        // 7. Overall KPI calculations
        const totalStaff = userSummaryList.length;
        const activeStaff = userSummaryList.filter(s => s.hasActivity).length;
        const totalPlanned = userSummaryList.reduce((acc, s) => acc + s.plannedTasksCount, 0);
        const totalCompleted = userSummaryList.reduce((acc, s) => acc + s.completedPlanned, 0);
        const totalPending = userSummaryList.reduce((acc, s) => acc + s.pendingTasksCount, 0);
        const totalSkipped = userSummaryList.reduce((acc, s) => acc + s.skippedTasksCount, 0);
        const totalAdHoc = userSummaryList.reduce((acc, s) => acc + s.adHocCompleted, 0);
        const totalExecutedAll = totalCompleted + totalAdHoc;
        const overallCompletionRate = totalPlanned > 0
            ? Number(((totalCompleted / totalPlanned) * 100).toFixed(1))
            : null;
        const totalLeads = userSummaryList.reduce((acc, s) => acc + s.totalLeads, 0);
        const totalGeoTagged = userSummaryList.reduce((acc, s) => acc + s.geoCount, 0);
        const totalProofs = userSummaryList.reduce((acc, s) => acc + s.proofCount, 0);

        // 8. Dynamic Filter Options for Frontend Multi-Selects
        const formatRoleLabel = (r) => {
            if (!r) return "";
            return r
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, str => str.toUpperCase())
                .trim();
        };

        const distinctRoles = Array.from(new Set(allUsers.map(u => u.role).filter(Boolean))).sort();
        const roleOptions = distinctRoles.map(r => ({ value: r, label: formatRoleLabel(r) }));

        // Distinct activity types & purposes across all records
        const allLoadedActivities = [
            ...marketingActivities,
            ...planners.flatMap(p => p.tasks || [])
        ];
        const allTypes = Array.from(new Set(allLoadedActivities.map(t => t.activityType || t.type).filter(Boolean))).sort();
        const allPurposes = Array.from(new Set(allLoadedActivities.map(t => t.activityPurpose).filter(Boolean))).sort();

        const filterOptions = {
            users: allUsers
                .filter(u => activeUserIdSet.has(u._id.toString()))
                .map(u => ({ value: u._id.toString(), label: u.name, role: formatRoleLabel(u.role) }))
                .sort((a, b) => a.label.localeCompare(b.label)),
            roles: roleOptions,
            zones: masterZones.map(z => ({ value: z._id.toString(), label: z.name })).sort((a, b) => a.label.localeCompare(b.label)),
            centres: masterCentres.map(c => ({ value: c._id.toString(), label: c.centreName })).sort((a, b) => a.label.localeCompare(b.label)),
            activityTypes: allTypes,
            activityPurposes: allPurposes
        };

        res.status(200).json({
            dateRangeInfo: {
                preset: dateRange,
                label: rangeLabel,
                startDate,
                endDate
            },
            overallStats: {
                totalStaff,
                activeStaff,
                totalPlanned,
                totalCompleted,
                totalPending,
                totalSkipped,
                totalAdHoc,
                totalExecutedAll,
                overallCompletionRate,
                totalLeads,
                totalGeoTagged,
                totalProofs
            },
            userSummary: userSummaryList,
            detailedTasks: allDetailedTasks,
            filterOptions
        });
    } catch (error) {
        console.error("Error in getMarketingAnalysis:", error);
        res.status(500).json({ message: "Server error fetching marketing analysis", error: error.message });
    }
};

