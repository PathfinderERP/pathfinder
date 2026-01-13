import EmployeeAttendance from "../../models/Attendance/EmployeeAttendance.js";
import Employee from "../../models/HR/Employee.js";
import Centre from "../../models/Master_data/Centre.js";
import Holiday from "../../models/Attendance/Holiday.js";
import { getSignedFileUrl } from "../HR/employeeController.js";
import { startOfDay, endOfDay, format, eachDayOfInterval, startOfYear, endOfYear, isToday, isSameDay, startOfMonth, endOfMonth } from "date-fns";

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

        // 1. Get Employee Details with all centres populated
        const employee = await Employee.findOne({ user: userId })
            .populate("primaryCentre")
            .populate("centres");

        if (!employee) return res.status(404).json({ message: "Employee profile not found" });

        // Collect all potential centres (primary + additional)
        const allCentres = [];
        if (employee.primaryCentre) allCentres.push(employee.primaryCentre);
        if (employee.centres && Array.isArray(employee.centres)) {
            employee.centres.forEach(c => {
                if (c && !allCentres.find(existing => existing._id.toString() === c._id.toString())) {
                    allCentres.push(c);
                }
            });
        }

        if (allCentres.length === 0) {
            return res.status(400).json({ message: "No centres assigned to your profile. Please contact admin." });
        }

        // 2. Geolocation Check against all assigned centres
        let matchingCentre = null;
        let minDistance = Infinity;
        const radius = 200; // Increased to 200 meters for better GPS reliability & larger facilities

        for (const centre of allCentres) {
            if (centre.latitude && centre.longitude) {
                const dist = calculateDistance(latitude, longitude, centre.latitude, centre.longitude);
                if (dist < minDistance) minDistance = dist;
                if (dist <= radius) {
                    matchingCentre = centre;
                    break;
                }
            }
        }

        if (!matchingCentre && type === 'checkIn') { // Only enforce geofence strictly on Check-In, maybe lenient on Check-Out? Strict for now.
            // Actually, strictly enforce for both to ensure they are at work.
        }

        if (!matchingCentre) {
            return res.status(403).json({
                message: `You are outside the required range. Your nearest assigned centre is ${Math.round(minDistance)}m away. You must be within ${radius}m of an authorized centre.`,
                distance: Math.round(minDistance)
            });
        }

        // 3. Find or Create today's attendance record
        let attendance = await EmployeeAttendance.findOne({ user: userId, date: today });

        if (!attendance) {
            if (type === 'checkOut') return res.status(400).json({ message: "Please check-in first before checking out." });

            attendance = new EmployeeAttendance({
                user: userId,
                employeeId: employee._id,
                centreId: matchingCentre._id,
                date: today,
                checkIn: {
                    time: new Date(),
                    latitude,
                    longitude,
                    address: matchingCentre.centreName // Store the centre name as address/meta
                },
                status: "Present"
            });
        } else {
            if (type === 'checkIn') return res.status(400).json({ message: "You have already checked in for today." });
            if (attendance.checkOut?.time) return res.status(400).json({ message: "You have already checked out for today." });

            // NEW RULE-BASED STATUS ASSIGNMENT
            const checkOutTime = new Date();
            const checkInTime = new Date(attendance.checkIn.time);
            const diffMs = checkOutTime - checkInTime;
            const workedHours = diffMs / (1000 * 60 * 60);
            const targetHours = employee.workingHours || 9; // Default to 9 if not set

            let finalStatus = "Present";

            if (workedHours < 4) {
                finalStatus = "Absent";
            } else if (workedHours < (targetHours / 2)) {
                finalStatus = "Half Day";
            } else if (workedHours < (targetHours - 0.5)) {
                finalStatus = "Early Leave";
            } else if (workedHours >= targetHours + 0.05) { // Small buffer for overtime
                finalStatus = "Overtime";
            }

            attendance.checkOut = {
                time: checkOutTime,
                latitude,
                longitude,
                address: matchingCentre.centreName
            };

            attendance.workingHours = parseFloat(workedHours.toFixed(2));
            attendance.status = finalStatus;
        }

        await attendance.save();
        res.status(200).json({
            message: `Successfully ${type === 'checkIn' ? 'checked in' : 'checked out'} at ${matchingCentre.centreName}. Status: ${attendance.status}`,
            attendance,
            centreName: matchingCentre.centreName
        });

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
        }).populate("centreId", "centreName").sort({ date: 1 });

        const holidays = await Holiday.find({
            date: { $gte: start, $lte: end }
        });

        const employee = await Employee.findOne({ user: userId })
            .populate("primaryCentre", "centreName latitude longitude")
            .populate("centres", "centreName latitude longitude");

        if (!employee) {
            return res.status(404).json({ message: "Employee profile not found" });
        }

        // Normalize Working Days (Handle Legacy List format)
        let normalizedWorkingDays = employee.workingDays;
        const hasWorkingDaysSet = Object.values(employee.workingDays || {}).some(v => v === true);

        if (!hasWorkingDaysSet && employee.workingDaysList && employee.workingDaysList.length > 0) {
            normalizedWorkingDays = {
                sunday: false, monday: false, tuesday: false, wednesday: false,
                thursday: false, friday: false, saturday: false
            };
            employee.workingDaysList.forEach(day => {
                const d = day.toLowerCase();
                if (normalizedWorkingDays.hasOwnProperty(d)) {
                    normalizedWorkingDays[d] = true;
                }
            });
        }

        res.status(200).json({
            dateOfJoining: employee.dateOfJoining,
            employeeDetails: {
                name: employee.name,
                designation: employee.designation?.name || 'Employee',
                profileImage: employee.profileImage,
                employeeId: employee.employeeId
            },
            attendances,
            holidays,
            workingDays: normalizedWorkingDays,
            workingHours: employee.workingHours, // Added specific working hours
            assignedCentres: {
                primary: employee.primaryCentre,
                others: employee.centres || []
            }
        });
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

        // Multi-select Filters (Handle both single string and array)
        if (centreId) {
            const centres = Array.isArray(centreId) ? centreId : centreId.split(',').filter(Boolean);
            if (centres.length > 0) query.centreId = { $in: centres };
        }

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
            const depts = department ? (Array.isArray(department) ? department : department.split(',').filter(Boolean)) : [];
            const desigs = designation ? (Array.isArray(designation) ? designation : designation.split(',').filter(Boolean)) : [];
            const roles = role ? (Array.isArray(role) ? role : role.split(',').filter(Boolean)) : [];

            attendances = attendances.filter(att => {
                const emp = att.employeeId;
                const usr = att.user;

                let matches = true;
                if (depts.length > 0 && !depts.includes(emp.department?._id.toString())) matches = false;
                if (desigs.length > 0 && !desigs.includes(emp.designation?._id.toString())) matches = false;
                if (roles.length > 0 && !roles.includes(usr.role)) matches = false;

                return matches;
            });
        }

        // Sign profile images
        const signedAttendances = await Promise.all(attendances.map(async (att) => {
            const attObj = att.toObject();
            if (attObj.employeeId && attObj.employeeId.profileImage) {
                attObj.employeeId.profileImage = await getSignedFileUrl(attObj.employeeId.profileImage);
            }
            return attObj;
        }));

        res.status(200).json(signedAttendances);
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

        const selectedYear = parseInt(year) || new Date().getFullYear();
        const selectedMonth = parseInt(month) || (new Date().getMonth() + 1);

        const yearStart = startOfYear(new Date(selectedYear, 0, 1));
        const yearEnd = endOfYear(new Date(selectedYear, 0, 1));

        // Fetch ALL records for the year to do monthly summary
        const yearAttendances = await EmployeeAttendance.find({
            user: targetUserId,
            date: { $gte: yearStart, $lte: yearEnd }
        }).sort({ date: 1 });

        // 1. Monthly Breakdown over the year
        const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
            month: format(new Date(selectedYear, i, 1), 'MMM'),
            present: 0,
            absent: 0, // We will calculate this based on working days logic ideally, but for now relative
            avgHours: 0,
            totalHours: 0,
            count: 0
        }));

        yearAttendances.forEach(att => {
            const mIndex = new Date(att.date).getMonth();
            monthlyStats[mIndex].present++;
            monthlyStats[mIndex].totalHours += (att.workingHours || 0);
            monthlyStats[mIndex].count++;
        });

        monthlyStats.forEach(m => {
            m.avgHours = m.count ? parseFloat((m.totalHours / m.count).toFixed(2)) : 0;
            // distinct absent logic requires checking 'expected' days per month, skipping for brevity/speed unless requested
        });

        // 2. Filter for Selected Month for Detailed Daily View
        const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
        const monthEnd = endOfMonth(monthStart);

        const monthAttendances = yearAttendances.filter(a =>
            new Date(a.date) >= monthStart && new Date(a.date) <= monthEnd
        );

        // 3. Calculate Detailed Month Stats
        let totalHours = 0;
        let minHours = Infinity;
        let maxHours = 0;
        let totalCheckInMinutes = 0;
        let totalCheckOutMinutes = 0;
        let checkInCount = 0;
        let checkOutCount = 0;

        const statusDistribution = { Present: 0, Late: 0, 'Half Day': 0, Absent: 0, 'Early Leave': 0, Overtime: 0 };
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        let todayRecord = null;
        const targetHours = 9; // Default target for calculations if unknown

        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const dailyData = daysInMonth.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            // Stop calculations for future dates, but we need the chart to show up to today
            if (day > new Date()) return null;

            const att = monthAttendances.find(a => format(new Date(a.date), 'yyyy-MM-dd') === dayStr);

            if (att) {
                const wh = att.workingHours || 0;
                totalHours += wh;
                if (wh > maxHours) maxHours = wh;
                if (wh < minHours && wh > 0) minHours = wh;

                // Time analysis
                if (att.checkIn?.time) {
                    const d = new Date(att.checkIn.time);
                    totalCheckInMinutes += d.getHours() * 60 + d.getMinutes();
                    checkInCount++;
                }
                if (att.checkOut?.time) {
                    const d = new Date(att.checkOut.time);
                    totalCheckOutMinutes += d.getHours() * 60 + d.getMinutes();
                    checkOutCount++;
                }

                statusDistribution[att.status] = (statusDistribution[att.status] || 0) + 1;

                // Capture today's record specifically
                if (dayStr === todayStr) {
                    todayRecord = {
                        checkIn: att.checkIn?.time,
                        checkOut: att.checkOut?.time,
                        status: att.status,
                        workingHours: att.workingHours
                    };
                }

                return {
                    day: format(day, 'dd'),
                    fullDate: format(day, 'dd MMM'),
                    hours: wh,
                    status: att.status,
                    checkIn: att.checkIn?.time ? format(new Date(att.checkIn.time), 'HH:mm') : '-',
                    checkOut: att.checkOut?.time ? format(new Date(att.checkOut.time), 'HH:mm') : '-'
                };
            } else {
                const isWeekendDay = day.getDay() === 0; // Sunday
                if (!isWeekendDay) statusDistribution.Absent++;

                return {
                    day: format(day, 'dd'),
                    fullDate: format(day, 'dd MMM'),
                    hours: 0,
                    status: 'Absent',
                    checkIn: '-',
                    checkOut: '-'
                };
            }
        }).filter(Boolean);

        if (minHours === Infinity) minHours = 0;

        // Averages
        const avgHours = monthAttendances.length ? (totalHours / monthAttendances.length).toFixed(2) : 0;

        const formatMinutesToTime = (totalMins, count) => {
            if (!count) return '--:--';
            const avgMins = totalMins / count;
            const h = Math.floor(avgMins / 60);
            const m = Math.round(avgMins % 60);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        };

        const avgCheckIn = formatMinutesToTime(totalCheckInMinutes, checkInCount);
        const avgCheckOut = formatMinutesToTime(totalCheckOutMinutes, checkOutCount);

        res.status(200).json({
            summary: {
                totalDays: monthAttendances.length,
                presentDays: statusDistribution.Present + statusDistribution.Late + statusDistribution['Half Day'] + statusDistribution['Early Leave'] + statusDistribution.Overtime,
                absentDays: statusDistribution.Absent,
                totalHours: parseFloat(totalHours.toFixed(2)),
                averageHours: parseFloat(avgHours),
                minHours: parseFloat(minHours.toFixed(2)),
                maxHours: parseFloat(maxHours.toFixed(2)),
                avgCheckIn,
                avgCheckOut,
                todayRecord
            },
            dailyData,
            monthlyStats,
            statusDistribution: [
                { name: 'Present', value: statusDistribution.Present, color: '#10b981' },
                { name: 'Overtime', value: statusDistribution.Overtime, color: '#8b5cf6' },
                { name: 'Early Leave', value: statusDistribution['Early Leave'], color: '#ec4899' },
                { name: 'Half Day', value: statusDistribution['Half Day'], color: '#f59e0b' },
                { name: 'Absent', value: statusDistribution.Absent, color: '#ef4444' },
                { name: 'Late', value: statusDistribution.Late, color: '#6366f1' }
            ].filter(i => i.value > 0)
        });

    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get Attendance Dashboard Stats (Totals, Charts, etc.)
export const getAttendanceDashboardStats = async (req, res) => {
    try {
        const { month, year, centreId, department, designation } = req.query;

        // 1. Build Employee Filter
        const empQuery = { status: "Active" };
        if (centreId) {
            const centres = centreId.split(',').filter(Boolean);
            if (centres.length > 0) empQuery.$or = [{ primaryCentre: { $in: centres } }, { centres: { $in: centres } }];
        }
        if (department) {
            const depts = department.split(',').filter(Boolean);
            if (depts.length > 0) empQuery.department = { $in: depts };
        }
        if (designation) {
            const desigs = designation.split(',').filter(Boolean);
            if (desigs.length > 0) empQuery.designation = { $in: desigs };
        }

        const employees = await Employee.find(empQuery).select('_id workingHours');
        const totalEmployees = employees.length;

        // 2. Build Attendance Filter (Date Range)
        const monthStart = startOfMonth(new Date(year, month - 1, 1));
        const monthEnd = endOfMonth(new Date(year, month - 1, 1));
        const attQuery = {
            date: { $gte: monthStart, $lte: monthEnd },
            employeeId: { $in: employees.map(e => e._id) }
        };

        const attendances = await EmployeeAttendance.find(attQuery).populate('employeeId', 'department designation workingHours');

        // 3. Calculate Stats
        let hoursList = attendances.map(a => a.workingHours || 0).filter(h => h > 0);
        hoursList = hoursList.map(h => parseFloat(h)).filter(h => !isNaN(h));

        const maxHours = hoursList.length ? Math.max(...hoursList).toFixed(2) : 0;
        const minHours = hoursList.length ? Math.min(...hoursList).toFixed(2) : 0;
        const totalActualHours = hoursList.reduce((a, b) => a + b, 0);
        const avgHours = hoursList.length ? (totalActualHours / hoursList.length).toFixed(2) : 0;

        // Efficiency Calculation
        // Target = Average target hours of present employees * Count of present records
        // Or better: Sum of target hours of all employees for the days they worked
        let totalTargetHours = 0;
        attendances.forEach(a => {
            totalTargetHours += (a.employeeId?.workingHours || 9); // Default to 9 if not set
        });

        const efficiency = totalTargetHours > 0
            ? Math.min(100, Math.round((totalActualHours / totalTargetHours) * 100))
            : 0;

        // Status Counts for Dashboard
        const statusSummary = {
            overtime: attendances.filter(a => a.status === 'Overtime').length,
            earlyLeave: attendances.filter(a => a.status === 'Early Leave').length,
            halfDay: attendances.filter(a => a.status === 'Half Day').length,
            shortLeave: attendances.filter(a => a.workingHours >= 8.5 && a.workingHours < 9).length,
            forgotCheckout: attendances.filter(a => a.status === 'Forgot to Checkout').length,
            absent: 0
        };

        // Present logic
        const isCurrentMonth = new Date().getMonth() === (parseInt(month) - 1) && new Date().getFullYear() === parseInt(year);
        let presentCount = 0;
        if (isCurrentMonth) {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            presentCount = attendances.filter(a => format(new Date(a.date), 'yyyy-MM-dd') === todayStr).length;
        } else {
            const daysWithData = new Set(attendances.map(a => format(new Date(a.date), 'yyyy-MM-dd'))).size;
            presentCount = daysWithData ? Math.round(attendances.length / daysWithData) : 0;
        }

        // Daily Trend including Caution Categories
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const dailyTrend = [];
        const dailyCautionsTrend = [];

        daysInMonth.forEach(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            if (day > new Date()) return;

            const dailyAtts = attendances.filter(a => format(new Date(a.date), 'yyyy-MM-dd') === dayStr);

            // Standard Trend
            dailyTrend.push({
                date: format(day, 'dd'),
                fullDate: format(day, 'dd MMM'),
                present: dailyAtts.length,
                total: totalEmployees,
                absent: Math.max(0, totalEmployees - dailyAtts.length)
            });

            // Cautions Trend
            dailyCautionsTrend.push({
                date: format(day, 'dd'),
                fullDate: format(day, 'dd MMM'),
                overtime: dailyAtts.filter(a => a.status === 'Overtime').length,
                earlyLeave: dailyAtts.filter(a => a.status === 'Early Leave').length,
                halfDay: dailyAtts.filter(a => a.status === 'Half Day').length,
                shortLeave: dailyAtts.filter(a => a.workingHours >= 8.5 && a.workingHours < 9).length,
                forgotCheckout: dailyAtts.filter(a => a.status === 'Forgot to Checkout').length
            });
        });

        res.status(200).json({
            totalEmployees,
            presentCount,
            presentLabel: isCurrentMonth ? "Present Today" : "Avg Present",
            maxHours,
            minHours,
            avgHours,
            efficiency: `${efficiency}%`,
            statusSummary,
            dailyTrend,
            dailyCautionsTrend
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
