import RedFlag from "../models/RedFlag.js";
import User from "../models/User.js";
import LeadManagement from "../models/LeadManagement.js";
import Admission from "../models/Admission/Admission.js";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";
import ClassSchedule from "../models/Academics/ClassSchedule.js";
import EmployeeAttendance from "../models/Attendance/EmployeeAttendance.js";
import MarketingPlanner from "../models/MarketingPlanner.js";
import TomorrowPlanner from "../models/TomorrowPlanner.js";

const getRange = (startDate, endDate) => {
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

export const getRedFlags = async (req, res) => {
    try {
        const { centreId, role, severity, startDate, endDate } = req.query;
        const { start, end } = getRange(startDate, endDate);
        const daysDiff = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

        // 1. Fetch all active users for matching role(s)
        const userQuery = { isActive: true };
        if (role && role !== 'All Roles') {
            userQuery.role = role;
        } else {
            userQuery.role = { 
                $in: ['telecaller', 'counsellor', 'marketing', 'centerIncharge', 'zonalManager', 'HOD', 'teacher', 'Class_Coordinator', 'coordinator', 'hr', 'assistantZonalManager', 'assistantCenterIncharge', 'supportStaff'] 
            };
        }
        if (centreId && centreId !== 'All Centers') userQuery.centres = { $in: [centreId] };
        
        const users = await User.find(userQuery).populate('centres', 'centreName').lean();

        // 2. Fetch existing persistent flags for this range to merge status
        const pfQuery = { createdAt: { $gte: start, $lte: end } };
        if (role && role !== 'All Roles') pfQuery.role = role;
        if (centreId && centreId !== 'All Centers') pfQuery.centre = centreId;

        const persistentFlags = await RedFlag.find(pfQuery)
            .populate('centre', 'centreName')
            .lean();

        // 3. Optimized Bulk Aggregations to avoid N+1 queries
        const userNames = users.map(u => u.name).filter(Boolean);
        const userIds = users.map(u => u._id);

        // A. Call Stats
        const callStats = await LeadManagement.aggregate([
            { $unwind: "$followUps" },
            { 
                $match: { 
                    "followUps.updatedBy": { $in: userNames },
                    "followUps.date": { $gte: start, $lte: end }
                } 
            },
            { $group: { _id: { leadId: "$_id", updatedBy: "$followUps.updatedBy" } } },
            { $group: { _id: "$_id.updatedBy", totalCalls: { $sum: 1 } } }
        ]);
        const callMap = new Map(callStats.map(item => [item._id, item.totalCalls]));

        // B. Counselling Stats
        const counselledStats = await LeadManagement.aggregate([
            { $unwind: "$followUps" },
            {
                $match: {
                    "followUps.updatedBy": { $in: userNames },
                    "followUps.date": { $gte: start, $lte: end },
                    isCounseled: true
                }
            },
            { $group: { _id: { leadId: "$_id", updatedBy: "$followUps.updatedBy" } } },
            { $group: { _id: "$_id.updatedBy", total: { $sum: 1 } } }
        ]);
        const counselMap = new Map(counselledStats.map(item => [item._id, item.total]));

        // C. Admissions
        const [admNormalStats, admBoardStats] = await Promise.all([
            Admission.aggregate([
                { $match: { createdBy: { $in: userIds }, createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: "$createdBy", count: { $sum: 1 } } }
            ]),
            BoardCourseAdmission.aggregate([
                { $match: { createdBy: { $in: userIds }, createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: "$createdBy", count: { $sum: 1 } } }
            ])
        ]);
        const admNormalMap = new Map(admNormalStats.map(item => [item._id.toString(), item.count]));
        const admBoardMap = new Map(admBoardStats.map(item => [item._id.toString(), item.count]));

        // D. Walk-ins
        const walkInStats = await LeadManagement.aggregate([
            {
                $match: {
                    walkInBy: { $in: userIds },
                    isWalkIn: true,
                    walkInDate: { $gte: start, $lte: end }
                }
            },
            { $group: { _id: "$walkInBy", count: { $sum: 1 } } }
        ]);
        const walkInMap = new Map(walkInStats.map(item => [item._id.toString(), item.count]));

        // D2. Manual Add Leads (Created via + Add Lead button)
        const manualLeadStats = await LeadManagement.aggregate([
            {
                $match: {
                    createdBy: { $in: userIds },
                    createdAt: { $gte: start, $lte: end },
                    $or: [
                        { isBulkUpload: false },
                        { isBulkUpload: { $exists: false } }
                    ]
                }
            },
            { $group: { _id: "$createdBy", count: { $sum: 1 } } }
        ]);
        const manualLeadMap = new Map(manualLeadStats.map(item => [item._id.toString(), item.count]));

        // D3. Marketing Command Centre Lead Uploads
        const marketingLeadStats = await LeadManagement.aggregate([
            {
                $match: {
                    $or: [
                        { createdBy: { $in: userIds } },
                        { marketingBy: { $in: userNames } }
                    ],
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $facet: {
                    byId: [
                        { $match: { createdBy: { $in: userIds } } },
                        { $group: { _id: "$createdBy", count: { $sum: 1 } } }
                    ],
                    byName: [
                        { $match: { marketingBy: { $in: userNames } } },
                        { $group: { _id: "$marketingBy", count: { $sum: 1 } } }
                    ]
                }
            }
        ]);

        const marketingLeadByIdMap = new Map();
        const marketingLeadByNameMap = new Map();
        if (marketingLeadStats[0]) {
            (marketingLeadStats[0].byId || []).forEach(item => {
                if (item._id) marketingLeadByIdMap.set(item._id.toString(), item.count);
            });
            (marketingLeadStats[0].byName || []).forEach(item => {
                if (item._id) marketingLeadByNameMap.set(item._id, item.count);
            });
        }

        // D4. Marketing Activities from MarketingPlanner & TomorrowPlanner
        const [mpStats, tpStats] = await Promise.all([
            MarketingPlanner.aggregate([
                {
                    $match: {
                        user: { $in: userIds },
                        createdAt: { $gte: start, $lte: end }
                    }
                },
                { $group: { _id: "$user", count: { $sum: 1 } } }
            ]),
            TomorrowPlanner.aggregate([
                {
                    $match: {
                        user: { $in: userIds },
                        planDate: { $gte: start, $lte: end }
                    }
                },
                { $unwind: "$tasks" },
                { $group: { _id: "$user", count: { $sum: 1 } } }
            ])
        ]);

        const marketingActivityMap = new Map();
        (mpStats || []).forEach(item => {
            if (item._id) {
                const id = item._id.toString();
                marketingActivityMap.set(id, (marketingActivityMap.get(id) || 0) + item.count);
            }
        });
        (tpStats || []).forEach(item => {
            if (item._id) {
                const id = item._id.toString();
                marketingActivityMap.set(id, (marketingActivityMap.get(id) || 0) + item.count);
            }
        });

        // E. Teacher Attendance
        const teacherStats = await ClassSchedule.aggregate([
            {
                $match: {
                    teacherId: { $in: userIds },
                    status: 'Completed',
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: "$teacherId",
                    total: { $sum: 1 },
                    saved: {
                        $sum: {
                            $cond: [
                                { $and: [ { $eq: ["$isStudentAttendanceSaved", true] }, { $eq: ["$teacherAttendance", true] } ] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);
        const teacherMap = new Map(teacherStats.map(item => [item._id.toString(), { total: item.total, saved: item.saved }]));

        // F. Class Coordinator (Ongoing classes)
        const coordinatorStats = await ClassSchedule.aggregate([
            {
                $project: {
                    allCoordinatorIds: {
                        $cond: {
                            if: { $isArray: "$coordinatorIds" },
                            then: { $setUnion: ["$coordinatorIds", { $cond: [ { $ifNull: ["$coordinatorId", null] }, ["$coordinatorId"], [] ] }] },
                            else: { $cond: [ { $ifNull: ["$coordinatorId", null] }, ["$coordinatorId"], [] ] }
                        }
                    },
                    status: 1,
                    date: 1
                }
            },
            {
                $match: {
                    allCoordinatorIds: { $in: userIds },
                    status: 'Ongoing',
                    date: { $lte: end }
                }
            },
            { $unwind: "$allCoordinatorIds" },
            {
                $match: {
                    allCoordinatorIds: { $in: userIds }
                }
            },
            { $group: { _id: "$allCoordinatorIds", count: { $sum: 1 } } }
        ]);
        const coordinatorMap = new Map(coordinatorStats.map(item => [item._id.toString(), item.count]));

        // G. Class Commencement Stats (For Center Incharge, Coordinator)
        const periodClasses = await ClassSchedule.find({
            date: { $gte: start, $lte: end }
        }).select('_id date startTime status centreIds centreId coordinatorId coordinatorIds').lean();

        const now = new Date();
        const centerClassStats = new Map();
        const centerDateStats = new Map(); // Map<centreId, Map<dateStr, { total: 0, started: 0, ended: 0, ongoing: 0 }>>
        const coordinatorDateStats = new Map(); // Map<coordinatorId, Map<dateStr, { total: 0, started: 0, ended: 0, ongoing: 0 }>>
        
        periodClasses.forEach(cls => {
            if (!cls.startTime) return;
            const [hours, minutes] = cls.startTime.split(':').map(Number);
            const schedTime = new Date(cls.date);
            schedTime.setHours(hours, minutes, 0, 0);
            if (schedTime >= now) return; // Ignore future classes

            const cIds = [];
            if (Array.isArray(cls.centreIds)) {
                cls.centreIds.forEach(id => {
                    if (id) cIds.push(id.toString());
                });
            }
            if (cls.centreId) {
                cIds.push(cls.centreId.toString());
            }
            const uniqueCIds = [...new Set(cIds)];

            // Filter class by selected center only if centreId is specified
            if (centreId && centreId !== 'All Centers') {
                const hasMatchingCenter = uniqueCIds.includes(centreId.toString());
                if (!hasMatchingCenter) return; // Skip class if not for selected center
            }

            const isCompleted = cls.status === 'Completed';
            const isOngoing = cls.status === 'Ongoing';
            const isStarted = isCompleted || isOngoing;
            const dateStr = cls.date.toISOString().split('T')[0];

            uniqueCIds.forEach(cId => {
                // 1. Overall stats
                if (!centerClassStats.has(cId)) {
                    centerClassStats.set(cId, { total: 0, completed: 0 });
                }
                const stats = centerClassStats.get(cId);
                stats.total++;
                if (isCompleted) {
                    stats.completed++;
                }

                // 2. Date-wise stats (For center wide metrics)
                if (!centerDateStats.has(cId)) {
                    centerDateStats.set(cId, new Map());
                }
                const dateMap = centerDateStats.get(cId);
                if (!dateMap.has(dateStr)) {
                    dateMap.set(dateStr, { total: 0, started: 0, ended: 0, ongoing: 0 });
                }
                const dStats = dateMap.get(dateStr);
                dStats.total++;
                if (isStarted) dStats.started++;
                if (isCompleted) dStats.ended++;
                if (isOngoing) dStats.ongoing++;
            });

            // 3. Coordinator-specific stats mapping
            const coordIds = [];
            if (cls.coordinatorId) {
                coordIds.push(cls.coordinatorId.toString());
            }
            if (Array.isArray(cls.coordinatorIds)) {
                cls.coordinatorIds.forEach(id => {
                    if (id) coordIds.push(id.toString());
                });
            }
            const uniqueCoordIds = [...new Set(coordIds)];

            uniqueCoordIds.forEach(coId => {
                if (!coordinatorDateStats.has(coId)) {
                    coordinatorDateStats.set(coId, new Map());
                }
                const dateMap = coordinatorDateStats.get(coId);
                if (!dateMap.has(dateStr)) {
                    dateMap.set(dateStr, { total: 0, started: 0, ended: 0, ongoing: 0 });
                }
                const dStats = dateMap.get(dateStr);
                dStats.total++;
                if (isStarted) dStats.started++;
                if (isCompleted) dStats.ended++;
                if (isOngoing) dStats.ongoing++;
            });
        });

        const performanceData = [];

        // 4. Scan ERP data for each user based on their specific role
        for (const user of users) {
            const userRole = user.role;
            if (!userRole) continue;

            const evaluateAndPush = (metricType, targetValue, metricValue, severityLogic, issueLogic, extraFields = {}) => {
                let currentSeverity = "Low";
                let issue = "Operating normally";

                if (metricValue < targetValue) {
                    currentSeverity = severityLogic(metricValue, targetValue);
                    issue = issueLogic(metricValue, targetValue);
                }

                const dbFlag = persistentFlags.find(f => f.user.toString() === user._id.toString() && f.type === metricType);

                performanceData.push({
                    _id: dbFlag?._id || `virtual_${user._id}_${metricType}`,
                    user: {
                        _id: user._id,
                        name: user.name,
                        employeeId: user.employeeId,
                        profileImage: user.profileImage
                    },
                    role: user.role,
                    centre: dbFlag?.centre || user.centres?.[0] || { centreName: "N/A" },
                    type: metricType,
                    severity: dbFlag?.severity || currentSeverity,
                    issue: dbFlag?.issue || issue,
                    metricValue: dbFlag?.metricValue || metricValue,
                    targetValue: dbFlag?.targetValue || targetValue,
                    isResolved: dbFlag?.isResolved || (currentSeverity === "Low"),
                    isVirtual: !dbFlag,
                    createdAt: dbFlag?.createdAt || new Date(),
                    repeatCount: dbFlag?.repeatCount || 0,
                    ...extraFields
                });
            };

            // 1. TELECALLER ROLE
            if (userRole === 'telecaller') {
                // Minimum 40 calls
                const callMetricValue = callMap.get(user.name) || 0;
                const callTargetValue = 40 * daysDiff;
                evaluateAndPush(
                    'calls',
                    callTargetValue,
                    callMetricValue,
                    (m) => {
                        if (m < 20 * daysDiff) return "Critical";
                        if (m < 30 * daysDiff) return "High";
                        if (m < 40 * daysDiff) return "Medium";
                        return "Low";
                    },
                    (m, t) => `${t - m} calls short for this period. Total: ${m}/${t}`
                );

                // Minimum 10 walk-ins
                const walkInCount = walkInMap.get(user._id.toString()) || 0;
                const walkInTargetValue = 10 * daysDiff;
                evaluateAndPush(
                    'walkin',
                    walkInTargetValue,
                    walkInCount,
                    (m) => {
                        if (m < 3 * daysDiff) return "Critical";
                        if (m < 6 * daysDiff) return "High";
                        if (m < 10 * daysDiff) return "Medium";
                        return "Low";
                    },
                    (m, t) => `${t - m} walk-ins short for this period. Total: ${m}/${t}`
                );

                // Manual Leads (5/day)
                const manualLeadCount = manualLeadMap.get(user._id.toString()) || 0;
                const manualLeadTarget = 5 * daysDiff;
                evaluateAndPush(
                    'manual_lead',
                    manualLeadTarget,
                    manualLeadCount,
                    (m) => {
                        if (m < 1 * daysDiff) return "Critical";
                        if (m < 3 * daysDiff) return "High";
                        if (m < 5 * daysDiff) return "Medium";
                        return "Low";
                    },
                    (m, t) => `${t - m} manual leads short for this period. Total: ${m}/${t}`
                );
            }

            // 2. COUNSELLOR ROLE
            else if (userRole === 'counsellor') {
                // Minimum 25 calls
                const callMetricValue = callMap.get(user.name) || 0;
                const callTargetValue = 25 * daysDiff;
                evaluateAndPush(
                    'calls',
                    callTargetValue,
                    callMetricValue,
                    (m) => {
                        if (m < 10 * daysDiff) return "Critical";
                        if (m < 18 * daysDiff) return "High";
                        if (m < 25 * daysDiff) return "Medium";
                        return "Low";
                    },
                    (m, t) => `${t - m} calls short for this period. Total: ${m}/${t}`
                );

                // Minimum 10 walk-ins
                const walkInCount = walkInMap.get(user._id.toString()) || 0;
                const walkInTargetValue = 10 * daysDiff;
                evaluateAndPush(
                    'walkin',
                    walkInTargetValue,
                    walkInCount,
                    (m) => {
                        if (m < 3 * daysDiff) return "Critical";
                        if (m < 6 * daysDiff) return "High";
                        if (m < 10 * daysDiff) return "Medium";
                        return "Low";
                    },
                    (m, t) => `${t - m} walk-ins short for this period. Total: ${m}/${t}`
                );

                // Minimum 10 counsellings (same as walk-in minimum)
                const counselMetricValue = counselMap.get(user.name) || 0;
                const counselTargetValue = 10 * daysDiff;
                evaluateAndPush(
                    'counselling',
                    counselTargetValue,
                    counselMetricValue,
                    (m) => {
                        if (m < 3 * daysDiff) return "Critical";
                        if (m < 6 * daysDiff) return "High";
                        if (m < 10 * daysDiff) return "Medium";
                        return "Low";
                    },
                    (m, t) => `${t - m} counsellings short for this period. Total: ${m}/${t}`
                );

                // Minimum 10 admissions (same as walk-in minimum)
                const admissionMetric = (admNormalMap.get(user._id.toString()) || 0) + (admBoardMap.get(user._id.toString()) || 0);
                const admissionTarget = 10 * daysDiff;
                evaluateAndPush(
                    'admission',
                    admissionTarget,
                    admissionMetric,
                    (m) => {
                        if (m < 3 * daysDiff) return "Critical";
                        if (m < 6 * daysDiff) return "High";
                        if (m < 10 * daysDiff) return "Medium";
                        return "Low";
                    },
                    (m, t) => `${t - m} admissions short for this period. Total: ${m}/${t}`
                );

                // Manual Leads (5/day)
                const manualLeadCount = manualLeadMap.get(user._id.toString()) || 0;
                const manualLeadTarget = 5 * daysDiff;
                evaluateAndPush(
                    'manual_lead',
                    manualLeadTarget,
                    manualLeadCount,
                    (m) => {
                        if (m < 1 * daysDiff) return "Critical";
                        if (m < 3 * daysDiff) return "High";
                        if (m < 5 * daysDiff) return "Medium";
                        return "Low";
                    },
                    (m, t) => `${t - m} manual leads short for this period. Total: ${m}/${t}`
                );
            }

            // 3. MARKETING ROLE
            else if (userRole === 'marketing') {
                // Command Centre Lead Uploads
                const uploadCount = Math.max(
                    marketingLeadByIdMap.get(user._id.toString()) || 0,
                    marketingLeadByNameMap.get(user.name) || 0
                );
                evaluateAndPush(
                    'command_centre_leads',
                    1,
                    uploadCount,
                    (m) => m > 0 ? "Low" : "Critical",
                    (m) => m > 0 
                        ? `Leads Uploaded: Yes (${m} ${m === 1 ? 'lead' : 'leads'} uploaded into Marketing CRM)`
                        : `Lead Not Uploaded into Marketing CRM`
                );

                // Marketing Activity
                const activityCount = marketingActivityMap.get(user._id.toString()) || 0;
                evaluateAndPush(
                    'marketing_activity',
                    1,
                    activityCount,
                    (m) => m > 0 ? "Low" : "Critical",
                    (m) => m > 0 
                        ? `Marketing Activity Done: Yes (${m} ${m === 1 ? 'activity' : 'activities'} done)`
                        : `Marketing Activity Not Done`
                );
            }

            // 4. MANAGEMENT ROLES (Center Incharge, Zonal Manager, Assistants)
            else if (['centerIncharge', 'zonalManager', 'assistantCenterIncharge', 'assistantZonalManager'].includes(userRole)) {
                const callMetricValue = callMap.get(user.name) || 0;
                const callTargetValue = 50 * daysDiff;
                evaluateAndPush(
                    'calls',
                    callTargetValue,
                    callMetricValue,
                    (m) => {
                        if (m < 30 * daysDiff) return "Critical";
                        if (m < 35 * daysDiff) return "High";
                        if (m < 45 * daysDiff) return "Medium";
                        return "Low";
                    },
                    (m, t) => `${t - m} calls short for this period. Total: ${m}/${t}`
                );

                const counselMetricValue = counselMap.get(user.name) || 0;
                const counselTargetValue = 5 * daysDiff;
                evaluateAndPush(
                    'counselling',
                    counselTargetValue,
                    counselMetricValue,
                    (m) => {
                        if (m < 1 * daysDiff) return "Critical";
                        if (m < 3 * daysDiff) return "High";
                        if (m < 5 * daysDiff) return "Medium";
                        return "Low";
                    },
                    (m, t) => `${t - m} counsellings short for this period. Total: ${m}/${t}`
                );

                const admissionMetric = (admNormalMap.get(user._id.toString()) || 0) + (admBoardMap.get(user._id.toString()) || 0);
                const admissionTarget = 10 * daysDiff;
                evaluateAndPush(
                    'admission',
                    admissionTarget,
                    admissionMetric,
                    (m) => {
                        if (m < 1 * daysDiff) return "Critical";
                        if (m < 4 * daysDiff) return "High";
                        if (m < 8 * daysDiff) return "Medium";
                        return "Low";
                    },
                    (m, t) => `${t - m} admissions short for this period. Total: ${m}/${t}`
                );

                const manualLeadCount = manualLeadMap.get(user._id.toString()) || 0;
                const manualLeadTarget = 5 * daysDiff;
                evaluateAndPush(
                    'manual_lead',
                    manualLeadTarget,
                    manualLeadCount,
                    (m) => {
                        if (m < 1 * daysDiff) return "Critical";
                        if (m < 3 * daysDiff) return "High";
                        if (m < 5 * daysDiff) return "Medium";
                        return "Low";
                    },
                    (m, t) => `${t - m} manual leads short for this period. Total: ${m}/${t}`
                );

                if (['centerIncharge', 'assistantCenterIncharge'].includes(userRole)) {
                    const userCentreIds = (user.centres || []).map(c => (c._id || c).toString());
                    let totalClasses = 0;
                    let completedClasses = 0;
                    const classBreakdown = {};

                    userCentreIds.forEach(cId => {
                        const stats = centerClassStats.get(cId) || { total: 0, completed: 0 };
                        totalClasses += stats.total;
                        completedClasses += stats.completed;

                        const dateMap = centerDateStats.get(cId);
                        if (dateMap) {
                            for (const [dateStr, stats] of dateMap.entries()) {
                                if (!classBreakdown[dateStr]) {
                                    classBreakdown[dateStr] = { total: 0, started: 0, ended: 0, ongoing: 0 };
                                }
                                classBreakdown[dateStr].total += stats.total;
                                classBreakdown[dateStr].started += stats.started;
                                classBreakdown[dateStr].ended += stats.ended;
                                classBreakdown[dateStr].ongoing += stats.ongoing;
                            }
                        }
                    });

                    if (totalClasses > 0) {
                        evaluateAndPush(
                            'class_commencement',
                            totalClasses,
                            completedClasses,
                            (m, t) => {
                                const diff = t - m;
                                if (diff >= 3) return "Critical";
                                if (diff >= 2) return "High";
                                return "Medium";
                            },
                            (m, t) => `Failed to start/end ${t - m} scheduled classes timely. Total: ${m}/${t}`,
                            { classBreakdown }
                        );
                    }
                }
            }

            // 5. TEACHER ROLE
            else if (userRole === 'teacher') {
                const tData = teacherMap.get(user._id.toString()) || { total: 0, saved: 0 };
                const teacherTarget = tData.total;
                const teacherMetric = tData.saved;

                evaluateAndPush(
                    'attendance',
                    teacherTarget,
                    teacherMetric,
                    () => "High",
                    (m, t) => `Missing attendance for ${t - m} classes in this period.`
                );
            }

            // 6. COORDINATOR ROLE
            else if (userRole === 'Class_Coordinator' || userRole === 'coordinator') {
                const ongoing = coordinatorMap.get(user._id.toString()) || 0;
                
                const classBreakdown = {};
                const dateMap = coordinatorDateStats.get(user._id.toString());
                if (dateMap) {
                    for (const [dateStr, stats] of dateMap.entries()) {
                        classBreakdown[dateStr] = { ...stats };
                    }
                }

                evaluateAndPush(
                    'class_end',
                    1,
                    ongoing > 0 ? 0 : 1,
                    () => "Critical",
                    (m, t) => `${ongoing} classes pending closure in ERP.`,
                    { classBreakdown }
                );

                let totalClasses = 0;
                let completedClasses = 0;
                if (dateMap) {
                    for (const [dateStr, stats] of dateMap.entries()) {
                        totalClasses += stats.total;
                        completedClasses += stats.ended;
                    }
                }

                if (totalClasses > 0) {
                    evaluateAndPush(
                        'class_commencement',
                        totalClasses,
                        completedClasses,
                        (m, t) => {
                            const diff = t - m;
                            if (diff >= 3) return "Critical";
                            if (diff >= 2) return "High";
                            return "Medium";
                        },
                        (m, t) => `Failed to start/end ${t - m} scheduled classes timely. Total: ${m}/${t}`,
                        { classBreakdown }
                    );
                }
            }
        }

        let filteredData = performanceData;
        if (severity && severity !== 'All Severity') {
            filteredData = performanceData.filter(d => d.severity === severity);
        }

        res.status(200).json(filteredData);
    } catch (error) {
        console.error("Error in getRedFlags:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getRedFlagStats = async (req, res) => {
    try {
        const { startDate, endDate, role, centreId } = req.query;
        const { start, end } = getRange(startDate, endDate);
        
        const query = { createdAt: { $gte: start, $lte: end } };
        if (role && role !== 'All Roles') query.role = role;
        if (centreId && centreId !== 'All Centers') query.centre = centreId;

        const total = await RedFlag.countDocuments({ ...query, isResolved: false });
        const critical = await RedFlag.countDocuments({ ...query, isResolved: false, severity: 'Critical' });
        const high = await RedFlag.countDocuments({ ...query, isResolved: false, severity: 'High' });
        const repeat = await RedFlag.countDocuments({ ...query, isResolved: false, repeatCount: { $gt: 1 } });
        const recoveredToday = await RedFlag.countDocuments({ 
            ...query,
            isResolved: true, 
            resolvedAt: { $gte: start, $lte: end } 
        });

        res.status(200).json({ total, critical, high, repeat, recoveredToday });
    } catch (error) {
        console.error("Error fetching stats:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateRedFlag = async (req, res) => {
    try {
        const { id } = req.params;
        const { isResolved, recoveryAction, whatWentWrong, businessImpact } = req.body;

        let flagId = id;
        if (id.startsWith('virtual_')) {
            const [_, userId, type] = id.split('_');
            const user = await User.findById(userId);
            const newFlag = await RedFlag.create({
                user: userId,
                role: user.role,
                type,
                centre: user.centres?.[0],
                severity: 'High',
                issue: "Manually escalated from performance report.",
                metricValue: 0,
                targetValue: 0
            });
            flagId = newFlag._id;
        }

        const update = {};
        if (isResolved !== undefined) {
            update.isResolved = isResolved;
            if (isResolved) {
                update.resolvedAt = new Date();
                update.resolvedBy = req.user._id;
            }
        }
        if (recoveryAction) update.recoveryAction = recoveryAction;
        if (whatWentWrong) update.whatWentWrong = whatWentWrong;
        if (businessImpact) update.businessImpact = businessImpact;

        const flag = await RedFlag.findByIdAndUpdate(flagId, update, { new: true });
        if (!flag) return res.status(404).json({ message: "Flag not found" });
        res.status(200).json(flag);
    } catch (error) {
        console.error("Error updating red flag:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const generateRedFlags = async (req, res) => {
    try {
        res.status(200).json({ message: "Trigger received" });
    } catch (error) {
        res.status(500).json({ message: "Error" });
    }
};
