import EmployeeAttendance from "../../models/Attendance/EmployeeAttendance.js";
import Employee from "../../models/HR/Employee.js";
import Centre from "../../models/Master_data/Centre.js";
import Holiday from "../../models/Attendance/Holiday.js";
import { startOfDay, endOfDay, format, eachDayOfInterval, startOfYear, endOfYear, isToday, isSameDay } from "date-fns";

// Helper function to calculate distance between two coordinates in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

// Mark Attendance (Check-in/Check-out)
export const markAttendance = async (req, res) => {
    try {
        const { latitude, longitude, type } = req.body; // type: 'checkIn' or 'checkOut'
        const userId = req.user.id;
        const today = startOfDay(new Date());

        // 1. Get Employee Details
        const employee = await Employee.findOne({ user: userId }).populate("primaryCentre");
        if (!employee) return res.status(404).json({ message: "Employee profile not found" });

        const centre = employee.primaryCentre;
        if (!centre || !centre.latitude || !centre.longitude) {
            return res.status(400).json({ message: "Assigned centre location is not configured. Please contact admin." });
        }

        // 2. Geolocation Check (10-meter radius)
        const distance = calculateDistance(latitude, longitude, centre.latitude, centre.longitude);
        if (distance > 10) {
            return res.status(403).json({
                message: `You are outside the required range. Distance: ${Math.round(distance)}m. You must be within 10m of the centre.`
            });
        }

        // 3. Find or Create today's attendance record
        let attendance = await EmployeeAttendance.findOne({ user: userId, date: today });

        if (!attendance) {
            if (type === 'checkOut') return res.status(400).json({ message: "Please check-in first before checking out." });

            attendance = new EmployeeAttendance({
                user: userId,
                employeeId: employee._id,
                centreId: centre._id,
                date: today,
                checkIn: {
                    time: new Date(),
                    latitude,
                    longitude
                },
                status: "Present"
            });
        } else {
            if (type === 'checkIn') return res.status(400).json({ message: "You have already checked in for today." });
            if (attendance.checkOut?.time) return res.status(400).json({ message: "You have already checked out for today." });

            attendance.checkOut = {
                time: new Date(),
                latitude,
                longitude
            };

            // Calculate working hours
            const diffMs = attendance.checkOut.time - attendance.checkIn.time;
            attendance.workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
        }

        await attendance.save();
        res.status(200).json({ message: `Successfully ${type === 'checkIn' ? 'checked in' : 'checked out'}.`, attendance });

    } catch (error) {
        console.error("Mark Attendance Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get Employee's Attendance History (Full Year)
export const getMyAttendance = async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        const userId = req.user.id;

        const start = startOfYear(new Date(year, 0, 1));
        const end = endOfYear(new Date(year, 0, 1));

        const attendances = await EmployeeAttendance.find({
            user: userId,
            date: { $gte: start, $lte: end }
        }).sort({ date: 1 });

        const holidays = await Holiday.find({
            date: { $gte: start, $lte: end }
        });

        const employee = await Employee.findOne({ user: userId });

        res.status(200).json({ attendances, holidays, workingDays: employee.workingDays });
    } catch (error) {
        console.error("Get My Attendance Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// HR: Get All Employees Attendance with filters
export const getAllAttendance = async (req, res) => {
    try {
        const { date, month, year, department, designation, role, centreId, category } = req.query;

        let query = {};

        // Date Filtering
        if (date) {
            const dayStart = startOfDay(new Date(date));
            const dayEnd = endOfDay(new Date(date));
            query.date = { $gte: dayStart, $lte: dayEnd };
        } else if (month && year) {
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = endOfDay(new Date(year, month, 0));
            query.date = { $gte: monthStart, $lte: monthEnd };
        } else if (year) {
            const yearStart = startOfYear(new Date(year, 0, 1));
            const yearEnd = endOfYear(new Date(year, 0, 1));
            query.date = { $gte: yearStart, $lte: yearEnd };
        }

        // Filter by Centre
        if (centreId) query.centreId = centreId;

        // Perform main query
        let attendances = await EmployeeAttendance.find(query)
            .populate({
                path: "employeeId",
                populate: ["department", "designation", "primaryCentre"]
            })
            .populate("user", "role")
            .sort({ date: -1 });

        // Post-query filtering for Employee details (department, designation, role)
        if (department || designation || role) {
            attendances = attendances.filter(att => {
                const emp = att.employeeId;
                const usr = att.user;

                let matches = true;
                if (department && emp.department?.toString() !== department) matches = false;
                if (designation && emp.designation?.toString() !== designation) matches = false;
                if (role && usr.role !== role) matches = false;

                return matches;
            });
        }

        res.status(200).json(attendances);
    } catch (error) {
        console.error("Get All Attendance Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get Dashboard Analysis (Late check-ins, average hours, etc.)
export const getAttendanceAnalysis = async (req, res) => {
    try {
        const { userId, month, year } = req.query;
        const targetUserId = userId || req.user.id;

        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = endOfDay(new Date(year, month, 0));

        const attendances = await EmployeeAttendance.find({
            user: targetUserId,
            date: { $gte: monthStart, $lte: monthEnd }
        });

        // Simple aggregation logic
        const totalDays = attendances.length;
        const totalHours = attendances.reduce((acc, curr) => acc + (curr.workingHours || 0), 0);
        const presentDays = attendances.filter(a => a.status === "Present").length;

        res.status(200).json({
            summary: {
                totalDays,
                presentDays,
                absentDays: 0, // Logic for absence handled by frontend calendar usually
                totalHours: totalHours.toFixed(2),
                averageHours: totalDays ? (totalHours / totalDays).toFixed(2) : 0
            },
            dailyData: attendances.map(a => ({
                day: format(a.date, 'dd'),
                hours: a.workingHours || 0
            }))
        });

    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
