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
            let metricValue = 0;
            let targetValue = 1;
            let issue = "Operating normally";
            let currentSeverity = "Low";
            let type = "general";

            if (role === 'telecaller') {
                type = 'calls';
                targetValue = 50;
                
                // Use Aggregation to count individual follow-up entries in the date range
                const callStats = await LeadManagement.aggregate([
                    { $unwind: "$followUps" },
                    { 
                        $match: { 
                            "followUps.updatedBy": user.name,
                            "followUps.date": { $gte: start, $lte: end }
                        } 
                    },
                    { $count: "totalCalls" }
                ]);
                
                metricValue = callStats.length > 0 ? callStats[0].totalCalls : 0;

                if (metricValue < targetValue) {
                    currentSeverity = (metricValue < (targetValue * 0.5)) ? "Critical" : "High";
                    issue = `${targetValue - metricValue} calls short for this period. Total: ${metricValue}/${targetValue}`;
                }
            } else if (role === 'counsellor') {
                type = 'admission';
                
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
                const counselledCount = counselled.length > 0 ? counselled[0].total : 0;

                const admNormal = await Admission.countDocuments({ createdBy: user._id, createdAt: { $gte: start, $lte: end } });
                const admBoard = await BoardCourseAdmission.countDocuments({ createdBy: user._id, createdAt: { $gte: start, $lte: end } });
                const admittedCount = admNormal + admBoard;
                
                metricValue = counselledCount > 0 ? Math.round((admittedCount / counselledCount) * 100) : 0;
                targetValue = 20; 
                
                if (metricValue < targetValue) {
                    currentSeverity = admittedCount === 0 && counselledCount > 0 ? "Critical" : (metricValue < targetValue ? "High" : "Low");
                    issue = `Conversion rate at ${metricValue}% (${admittedCount}/${counselledCount} leads)`;
                }
            } else if (role === 'teacher') {
                type = 'attendance';
                const classes = await ClassSchedule.find({ 
                    teacherId: user._id, 
                    status: 'Completed',
                    date: { $gte: start, $lte: end }
                });
                targetValue = classes.length;
                metricValue = classes.filter(c => c.isStudentAttendanceSaved && c.teacherAttendance).length;
                if (metricValue < targetValue) {
                    currentSeverity = "High";
                    issue = `Missing attendance for ${targetValue - metricValue} classes in this period.`;
                } else {
                    issue = "Attendance perfectly submitted for all classes.";
                }
            } else if (role === 'marketing') {
                type = 'marketing_target';
                targetValue = 10;
                metricValue = await LeadManagement.countDocuments({ 
                    createdBy: user._id, 
                    createdAt: { $gte: start, $lte: end } 
                });
                if (metricValue < targetValue) {
                    currentSeverity = "Critical";
                    issue = `Only ${metricValue}/${targetValue} leads generated in this period.`;
                }
            } else if (role === 'Class_Coordinator') {
                type = 'class_end';
                const ongoing = await ClassSchedule.countDocuments({ 
                    coordinatorId: user._id, 
                    status: 'Ongoing',
                    date: { $lte: end }
                });
                metricValue = ongoing > 0 ? 0 : 1; 
                targetValue = 1;
                if (ongoing > 0) {
                    currentSeverity = "Critical";
                    issue = `${ongoing} classes pending closure in ERP.`;
                }
            } else if (role === 'centerIncharge') {
                type = 'review_note';
                const activity = await LeadManagement.aggregate([
                    { $unwind: "$followUps" },
                    { 
                        $match: { 
                            "followUps.updatedBy": user.name, 
                            "followUps.date": { $gte: start, $lte: end } 
                        } 
                    },
                    { $count: "total" }
                ]);
                metricValue = activity.length > 0 ? activity[0].total : 0;
                targetValue = 5;
                if (metricValue < targetValue) {
                    currentSeverity = "Critical";
                    issue = "Insufficient center review and follow-up activity.";
                }
            }

            const dbFlag = persistentFlags.find(f => f.user.toString() === user._id.toString() && f.type === type);

            performanceData.push({
                _id: dbFlag?._id || `virtual_${user._id}_${type}`,
                user: {
                    _id: user._id,
                    name: user.name,
                    employeeId: user.employeeId,
                    profileImage: user.profileImage
                },
                role: user.role,
                centre: user.centres?.[0] || { centreName: "N/A" },
                type,
                severity: dbFlag?.severity || currentSeverity,
                issue: dbFlag?.issue || issue,
                metricValue: dbFlag?.metricValue || metricValue,
                targetValue: dbFlag?.targetValue || targetValue,
                isResolved: dbFlag?.isResolved || (currentSeverity === "Low"),
                isVirtual: !dbFlag,
                createdAt: dbFlag?.createdAt || new Date(),
                repeatCount: dbFlag?.repeatCount || 0
            });
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
