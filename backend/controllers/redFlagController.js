import RedFlag from "../models/RedFlag.js";
import User from "../models/User.js";
import LeadManagement from "../models/LeadManagement.js";
import Admission from "../models/Admission/Admission.js";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";
import ClassSchedule from "../models/Academics/ClassSchedule.js";
import EmployeeAttendance from "../models/Attendance/EmployeeAttendance.js";

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

        if (!role || role === 'All Roles') {
            return res.status(200).json([]);
        }

        // 1. Fetch all active users for this role
        const userQuery = { role, isActive: true };
        if (centreId && centreId !== 'All Centers') userQuery.centres = { $in: [centreId] };
        
        const users = await User.find(userQuery).populate('centres', 'centreName').lean();

        // 2. Fetch existing persistent flags for this range to merge status
        const persistentFlags = await RedFlag.find({
            role,
            createdAt: { $gte: start, $lte: end }
        }).lean();

        const performanceData = [];

        // 3. Scan ERP data for each user based on role
        for (const user of users) {
            const evaluateAndPush = async (metricType, targetValue, metricValue, severityLogic, issueLogic) => {
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
                    centre: user.centres?.[0] || { centreName: "N/A" },
                    type: metricType,
                    severity: dbFlag?.severity || currentSeverity,
                    issue: dbFlag?.issue || issue,
                    metricValue: dbFlag?.metricValue || metricValue,
                    targetValue: dbFlag?.targetValue || targetValue,
                    isResolved: dbFlag?.isResolved || (currentSeverity === "Low"),
                    isVirtual: !dbFlag,
                    createdAt: dbFlag?.createdAt || new Date(),
                    repeatCount: dbFlag?.repeatCount || 0
                });
            };

            const hasCalls = ['telecaller', 'counsellor', 'centerIncharge', 'zonalManager', 'marketing'].includes(role);
            const hasCounsellings = ['counsellor', 'centerIncharge', 'zonalManager'].includes(role);
            const hasAdmissions = ['counsellor', 'centerIncharge', 'zonalManager'].includes(role);
            const hasWalkIns = ['telecaller', 'counsellor'].includes(role);

            if (hasCalls) {
                // Call Volume Check - only counting unique contacted leads (connected calls)
                const callStats = await LeadManagement.aggregate([
                    { $unwind: "$followUps" },
                    { 
                        $match: { 
                            "followUps.updatedBy": user.name,
                            "followUps.date": { $gte: start, $lte: end }
                        } 
                    },
                    { $group: { _id: "$_id" } },
                    { $count: "totalCalls" }
                ]);
                
                const callMetricValue = callStats.length > 0 ? callStats[0].totalCalls : 0;
                const callTargetValue = (role === 'counsellor' ? 30 : 50) * daysDiff;

                await evaluateAndPush(
                    'calls',
                    callTargetValue,
                    callMetricValue,
                    (m) => {
                        if (role === 'counsellor') {
                            if (m < 30 * daysDiff) return "Critical";
                            return "Low";
                        }
                        if (m < 30 * daysDiff) return "Critical";
                        if (m < 35 * daysDiff) return "High";
                        if (m < 45 * daysDiff) return "Medium";
                        return "Low";
                    },
                    (m, t) => `${t - m} calls short for this period. Total: ${m}/${t}`
                );
            }

            if (hasCounsellings) {
                // Counselling Volume Check
                const counselled = await LeadManagement.aggregate([
                    { $unwind: "$followUps" },
                    {
                        $match: {
                            "followUps.updatedBy": user.name,
                            "followUps.date": { $gte: start, $lte: end },
                            isCounseled: true
                        }
                    },
                    { $group: { _id: "$_id" } }, // Unique leads counselled
                    { $count: "total" }
                ]);
                
                const counselMetricValue = counselled.length > 0 ? counselled[0].total : 0;
                const counselTargetValue = 5 * daysDiff;

                await evaluateAndPush(
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
            }

            if (hasAdmissions) {
                // Admission Volume Check
                const admNormal = await Admission.countDocuments({ createdBy: user._id, createdAt: { $gte: start, $lte: end } });
                const admBoard = await BoardCourseAdmission.countDocuments({ createdBy: user._id, createdAt: { $gte: start, $lte: end } });
                const admissionMetric = admNormal + admBoard;
                const admissionTarget = 10 * daysDiff;
                
                await evaluateAndPush(
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
            }

            if (hasWalkIns) {
                // Walk-in Volume Check
                const walkInCount = await LeadManagement.countDocuments({
                    walkInBy: user._id,
                    isWalkIn: true,
                    walkInDate: { $gte: start, $lte: end }
                });

                const walkInTargetValue = 5 * daysDiff;

                await evaluateAndPush(
                    'walkin',
                    walkInTargetValue,
                    walkInCount,
                    (m) => {
                        if (m < 1 * daysDiff) return "Critical";
                        if (m < 3 * daysDiff) return "High";
                        if (m < 5 * daysDiff) return "Medium";
                        return "Low";
                    },
                    (m, t) => `${t - m} walk-ins short for this period. Total: ${m}/${t}`
                );
            }

            if (role === 'teacher') {
                const classes = await ClassSchedule.find({ 
                    teacherId: user._id, 
                    status: 'Completed',
                    date: { $gte: start, $lte: end }
                });
                const teacherTarget = classes.length;
                const teacherMetric = classes.filter(c => c.isStudentAttendanceSaved && c.teacherAttendance).length;
                
                await evaluateAndPush(
                    'attendance',
                    teacherTarget,
                    teacherMetric,
                    () => "High",
                    (m, t) => `Missing attendance for ${t - m} classes in this period.`
                );
            }
            

            
            if (role === 'Class_Coordinator' || role === 'coordinator') {
                const ongoing = await ClassSchedule.countDocuments({ 
                    coordinatorId: user._id, 
                    status: 'Ongoing',
                    date: { $lte: end }
                });
                
                await evaluateAndPush(
                    'class_end',
                    1,
                    ongoing > 0 ? 0 : 1,
                    () => "Critical",
                    (m, t) => `${ongoing} classes pending closure in ERP.`
                );
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
