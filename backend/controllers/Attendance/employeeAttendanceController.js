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

            // VALIDATION: Check Minimum Working Hours
            const checkOutTime = new Date();
            const checkInTime = new Date(attendance.checkIn.time);
            const diffMs = checkOutTime - checkInTime;
            const workedHours = diffMs / (1000 * 60 * 60);

            // Fetch required hours from employee profile (default to 1 if not set to avoid getting stuck)
            // Use a small buffer (e.g., 0.1 hours) if no gathered workingHours to allow testing? 
            // The prompt asks to "Implement logic for minimum working hours".
            // Assuming employee.workingHours is the daily requirement.
            const minHours = employee.workingHours || 0;

            // If minHours is significantly > 0, enforce it.
            // Using a tolerance of 15 minutes (0.25 hours) to be nice? Or strict? "Prevent check-out".
            // Let's be strict but handle 0 case.
            if (minHours > 0 && workedHours < minHours) {
                const remaining = (minHours - workedHours).toFixed(2);
                return res.status(400).json({
                    message: `Early Checkout Restricted. You need to complete ${minHours} hours. Remaining: ${remaining} hours.`
                });
            }

            attendance.checkOut = {
                time: checkOutTime,
                latitude,
                longitude,
                address: matchingCentre.centreName
            };

            // Calculate working hours
            attendance.workingHours = parseFloat(workedHours.toFixed(2));

            // Determine status based on hours (e.g. Half Day) if needed
            // For now, keep as Present, or update if very short duration?
            // If < 4 hours, maybe Half Day? Leaving as Present per current logic unless requested.
        }

        await attendance.save();
        res.status(200).json({
            message: `Successfully ${type === 'checkIn' ? 'checked in' : 'checked out'} at ${matchingCentre.centreName}.`,
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

        const statusDistribution = { Present: 0, Late: 0, 'Half Day': 0, Absent: 0 };
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        let todayRecord = null;

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

        // If today has no record explicitly found yet (maybe not in monthAttendances if filtered oddly), check DB? 
        // Logic above uses yearAttendances filtered by month, so if today is in current month it should be there.

        res.status(200).json({
            summary: {
                totalDays: monthAttendances.length,
                presentDays: statusDistribution.Present + statusDistribution.Late + statusDistribution['Half Day'],
                absentDays: statusDistribution.Absent,
                totalHours: totalHours.toFixed(2),
                averageHours: avgHours,
                minHours: minHours.toFixed(2),
                maxHours: maxHours.toFixed(2),
                avgCheckIn,
                avgCheckOut,
                todayRecord // Include today's live details
            },
            dailyData,
            monthlyStats, // Year-long trend
            statusDistribution: [
                { name: 'Present', value: statusDistribution.Present, color: '#10b981' },
                { name: 'Absent', value: statusDistribution.Absent, color: '#ef4444' },
                { name: 'Late', value: statusDistribution.Late, color: '#f59e0b' },
                { name: 'Half Day', value: statusDistribution['Half Day'], color: '#3b82f6' }
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

        // 1. Build Employee Filter (to get Total Count)
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

        const totalEmployees = await Employee.countDocuments(empQuery);

        // 2. Build Attendance Filter (Date Range)
        const monthStart = startOfMonth(new Date(year, month - 1, 1));
        const monthEnd = endOfMonth(new Date(year, month - 1, 1));
        const attQuery = {
            date: { $gte: monthStart, $lte: monthEnd }
        };

        if (centreId || department || designation) {
            const matchingEmpIds = await Employee.find(empQuery).select('_id');
            attQuery.employeeId = { $in: matchingEmpIds.map(e => e._id) };
        }

        const attendances = await EmployeeAttendance.find(attQuery).populate('employeeId', 'department designation');

        // 3. Calculate Stats
        // A. Max/Min/Avg Hours
        let hoursList = attendances.map(a => a.workingHours || 0).filter(h => h > 0);
        // Handle case where hours might be strings or weird formats, ensure numbers
        hoursList = hoursList.map(h => parseFloat(h)).filter(h => !isNaN(h));

        const maxHours = hoursList.length ? Math.max(...hoursList).toFixed(2) : 0;
        const minHours = hoursList.length ? Math.min(...hoursList).toFixed(2) : 0;
        const totalHours = hoursList.reduce((a, b) => a + b, 0);
        const avgHours = hoursList.length ? (totalHours / hoursList.length).toFixed(2) : 0;

        // B. Total Present logic
        const isCurrentMonth = new Date().getMonth() === (parseInt(month) - 1) && new Date().getFullYear() === parseInt(year);
        let presentCount = 0;
        if (isCurrentMonth) {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            presentCount = attendances.filter(a => format(new Date(a.date), 'yyyy-MM-dd') === todayStr).length;
        } else {
            const daysWithData = new Set(attendances.map(a => format(new Date(a.date), 'yyyy-MM-dd'))).size;
            presentCount = daysWithData ? Math.round(attendances.length / daysWithData) : 0;
        }

        // C. Daily Trend
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const dailyTrend = daysInMonth.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            // Don't show future days if current month
            if (day > new Date()) return null;

            const dailyAtts = attendances.filter(a => format(new Date(a.date), 'yyyy-MM-dd') === dayStr);
            return {
                date: format(day, 'dd'),
                fullDate: format(day, 'dd MMM'),
                present: dailyAtts.length,
                total: totalEmployees,
                absent: Math.max(0, totalEmployees - dailyAtts.length)
            };
        }).filter(Boolean); // Remove nulls for future dates

        res.status(200).json({
            totalEmployees,
            presentCount,
            presentLabel: isCurrentMonth ? "Present Today" : "Avg Present",
            maxHours,
            minHours,
            avgHours,
            dailyTrend
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
