import EmployeeAttendance from "../models/Attendance/EmployeeAttendance.js";
import { startOfDay, endOfDay, isSameDay } from "date-fns";

export const performAutoCheckout = async () => {
    try {
        const now = new Date();
        const todayStart = startOfDay(now);

        console.log(`🕒 Starting Auto-Checkout process for ${now.toISOString()}`);

        // Find ALL attendance records where checkOut is missing
        // This includes today's open sessions AND any stale sessions from the past
        const activeAttendances = await EmployeeAttendance.find({
            "checkIn.time": { $exists: true },
            "checkOut.time": { $exists: false }
        });

        console.log(`Found ${activeAttendances.length} open attendance records.`);

        let count = 0;
        for (const attendance of activeAttendances) {
            const recordDate = new Date(attendance.date);
            const isToday = isSameDay(recordDate, now);

            // If it's today's record, only auto-checkout if it's past 9 PM (21:00)
            if (isToday) {
                if (now.getHours() < 21) {
                    // Too early to auto-checkout today's records
                    continue;
                }
            } else if (recordDate > now) {
                // If record date is in the future (unlikely), skip
                continue;
            }

            // Set checkout time to 9:00 PM (21:00) of the SAME DAY as the attendance
            const checkoutTime = new Date(attendance.date);
            checkoutTime.setHours(21, 0, 0, 0);

            // If checkIn was actually after 9 PM, we can't really set checkout to 9 PM.
            if (attendance.checkIn.time > checkoutTime) {
                console.warn(`Record for user ${attendance.user} has checkIn after 9 PM. Skipping auto-checkout.`);
                continue;
            }

            attendance.checkOut = {
                time: checkoutTime,
                latitude: attendance.checkIn.latitude, // Fallback to checkIn location
                longitude: attendance.checkIn.longitude,
                address: "Auto-Checkout (9 PM)"
            };

            // Calculate working hours
            const diffMs = attendance.checkOut.time - attendance.checkIn.time;
            attendance.workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

            attendance.remarks = (attendance.remarks ? attendance.remarks + " | " : "") + "System Auto-Checkout at 9 PM";

            await attendance.save();
            count++;
        }

        console.log(`✅ Auto-Checkout completed. ${count} records updated.`);
        return count;
    } catch (error) {
        console.error("❌ Error in performAutoCheckout:", error);
        throw error;
    }
};
