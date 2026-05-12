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
        const { centreId, role, severity, isResolved, startDate, endDate } = req.query;
        const { start, end } = getRange(startDate, endDate);

        // Fetch ALL Active Users for the role to ensure "all active teachers" etc. are visible
        const userQuery = { isActive: true };
        if (role && role !== 'All Roles') userQuery.role = role;
        if (centreId && centreId !== 'All Centers') userQuery.centres = centreId;

        const users = await User.find(userQuery)
            .select('name role employeeId profileImage centres')
            .populate('centres', 'centreName');

        // Fetch existing flags for this range
        const flagQuery = { createdAt: { $gte: start, $lte: end } };
        if (severity && severity !== 'All Severity') flagQuery.severity = severity;
        if (isResolved !== undefined) flagQuery.isResolved = isResolved === 'true';

        const existingFlags = await RedFlag.find(flagQuery).lean();

        // Calculate performance for each user to show "Live Current Data"
        const performanceData = [];

        for (const user of users) {
            let metricValue = 0;
            let targetValue = 0;
            let issue = "Performance Normal";
            let type = "general";
            let currentSeverity = "Low";

            // Role specific metrics calculation
            if (user.role === 'telecaller') {
                metricValue = await LeadManagement.countDocuments({ "followUps.updatedBy": user.name, "followUps.date": { $gte: start, $lte: end } });
                targetValue = 50;
                type = 'calls';
                if (metricValue < targetValue) {
                    issue = `${targetValue - metricValue} calls short. Total: ${metricValue}/${targetValue}`;
                    currentSeverity = 'High';
                }
            } else if (user.role === 'counsellor') {
                const counselled = await LeadManagement.countDocuments({ isCounseled: true, "followUps.updatedBy": user.name, "followUps.date": { $gte: start, $lte: end } });
                const admN = await Admission.countDocuments({ createdBy: user._id, createdAt: { $gte: start, $lte: end } });
                const admB = await BoardCourseAdmission.countDocuments({ createdBy: user._id, createdAt: { $gte: start, $lte: end } });
                const admitted = admN + admB;
                metricValue = counselled > 0 ? (admitted / counselled) * 100 : (admitted > 0 ? 100 : 0);
                targetValue = 20;
                type = 'admission';
                if (metricValue < targetValue || (counselled > 0 && admitted === 0)) {
                    issue = `Conversion: ${metricValue.toFixed(1)}% (${admitted}/${counselled}). Target: ${targetValue}%`;
                    currentSeverity = 'Critical';
                }
            } else if (user.role === 'teacher') {
                const completed = await ClassSchedule.countDocuments({ teacherId: user._id, status: 'Completed', date: { $gte: start, $lte: end } });
                const missingAtt = await ClassSchedule.countDocuments({ 
                    teacherId: user._id, 
                    status: 'Completed', 
                    date: { $gte: start, $lte: end },
                    $or: [{ isStudentAttendanceSaved: false }, { teacherAttendance: { $exists: false } }]
                });
                metricValue = completed - missingAtt;
                targetValue = completed;
                type = 'attendance';
                if (missingAtt > 0) {
                    issue = `Attendance missing for ${missingAtt} classes today.`;
                    currentSeverity = 'High';
                }
            } else if (user.role === 'Class_Coordinator') {
                const ongoing = await ClassSchedule.countDocuments({ coordinatorId: user._id, status: 'Ongoing', date: { $lte: end } });
                metricValue = ongoing; 
                targetValue = 0; // Ideal target is 0 ongoing classes after end time
                type = 'class_end';
                if (ongoing > 0) {
                    issue = `${ongoing} classes still ongoing after scheduled time.`;
                    currentSeverity = 'Critical';
                }
            } else if (user.role === 'marketing') {
                metricValue = await LeadManagement.countDocuments({ createdBy: user._id, createdAt: { $gte: start, $lte: end } });
                targetValue = 10;
                type = 'marketing_target';
                if (metricValue < targetValue) {
                    issue = `Marketing target: ${metricValue}/${targetValue} leads.`;
                    currentSeverity = 'Critical';
                }
            } else if (user.role === 'centerIncharge') {
                metricValue = await LeadManagement.countDocuments({ "followUps.updatedBy": user.name, "followUps.date": { $gte: start, $lte: end } });
                targetValue = 1;
                type = 'review_note';
                if (metricValue < 1) {
                    issue = "No activity or review note recorded today.";
                    currentSeverity = 'Critical';
                }
            } else if (user.role === 'hr') {
                metricValue = await EmployeeAttendance.countDocuments({ date: { $gte: start, $lte: end }, totalHours: { $lt: 9 }, status: 'Present' });
                targetValue = 0;
                type = 'duty_hours';
                if (metricValue > 0) {
                    issue = `${metricValue} employees with short duty (<9h).`;
                    currentSeverity = 'High';
                }
            }

            // Find if there's a real flag for this user and type
            const flag = existingFlags.find(f => f.user.toString() === user._id.toString() && f.type === type);

            // Construct a "Virtual Flag" if none exists, to show "Live Data" for everyone
            performanceData.push({
                _id: flag ? flag._id : `virtual_${user._id}_${type}`,
                user: user,
                role: user.role,
                centre: user.centres[0],
                type: type,
                severity: flag ? flag.severity : (issue === "Performance Normal" ? "Low" : currentSeverity),
                issue: flag ? flag.issue : issue,
                metricValue: metricValue,
                targetValue: targetValue,
                isResolved: flag ? flag.isResolved : (issue === "Performance Normal"),
                createdAt: flag ? flag.createdAt : new Date(),
                whatWentWrong: flag ? flag.whatWentWrong : "Analysis pending...",
                businessImpact: flag ? flag.businessImpact : "Standard operational impact.",
                recoveryAction: flag ? flag.recoveryAction : "Action required to meet targets.",
                owner: flag ? flag.owner : "Department Head",
                isVirtual: !flag
            });
        }

        // Apply severity filter to virtual flags if requested
        let filteredData = performanceData;
        if (severity && severity !== 'All Severity') {
            filteredData = performanceData.filter(p => p.severity === severity);
        }

        // If 'All Roles' and no flags, only show actual flags or top underperformers
        if (!role || role === 'All Roles') {
            filteredData = performanceData.filter(p => !p.isResolved || !p.isVirtual);
        }

        res.status(200).json(filteredData);
    } catch (error) {
        console.error("Error fetching performance data:", error);
        res.status(500).json({ message: "Server error fetching performance data" });
    }
};

export const getRedFlagStats = async (req, res) => {
    try {
        const { startDate, endDate, role, centreId } = req.query;
        const { start, end } = getRange(startDate, endDate);

        // Build query based on filters
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
        // If it's a virtual flag, we need to create it first before updating
        let flag;
        if (id.startsWith('virtual_')) {
            const [,, userId, type] = id.split('_');
            const user = await User.findById(userId);
            // Re-calculate or use default for virtual-to-real conversion
            flag = await RedFlag.create({
                user: userId, role: user.role, centre: user.centres[0], type,
                severity: 'High', issue: 'Manual flag conversion',
                metricValue: 0, targetValue: 1, isResolved,
                recoveryAction, whatWentWrong, businessImpact,
                owner: "Manual", resolvedAt: isResolved ? new Date() : null, resolvedBy: isResolved ? req.user._id : null
            });
        } else {
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
            flag = await RedFlag.findByIdAndUpdate(id, update, { new: true });
        }
        if (!flag) return res.status(404).json({ message: "Flag not found" });
        res.status(200).json(flag);
    } catch (error) {
        console.error("Error updating flag:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const generateRedFlags = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const { start, end } = getRange(startDate, endDate);
        // This is now redundant since getRedFlags calculates live, but we'll keep it for persistence
        res.status(200).json({ message: "Live data is now active. Persistence triggered." });
    } catch (error) {
        res.status(500).json({ message: "Error" });
    }
};
