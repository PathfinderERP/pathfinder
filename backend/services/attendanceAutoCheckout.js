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

            // If it's today's record, only auto-checkout if it's very late (after 23:50)
            if (isToday) {
                if (now.getHours() < 23 || now.getMinutes() < 50) {
                    continue;
                }
            }

            // Set checkout time to 11:59 PM (23:59)
            const checkoutTime = new Date(attendance.date);
            checkoutTime.setHours(23, 59, 0, 0);

            attendance.checkOut = {
                time: checkoutTime,
                latitude: attendance.checkIn.latitude,
                longitude: attendance.checkIn.longitude,
                address: "System Auto-Checkout"
            };

            const diffMs = attendance.checkOut.time - attendance.checkIn.time;
            attendance.workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
            attendance.status = "Forgot to Checkout";
            attendance.remarks = (attendance.remarks ? attendance.remarks + " | " : "") + "Forgot to checkout - Auto updated";

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
