import EmployeeAttendance from "../models/Attendance/EmployeeAttendance.js";
import { startOfDay, endOfDay } from "date-fns";

export const performAutoCheckout = async () => {
    try {
        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);

        console.log(`🕒 Starting Auto-Checkout process for ${now.toISOString()}`);

        // Find all attendance records for today where checkIn exists but checkOut is missing
        const activeAttendances = await EmployeeAttendance.find({
            date: { $gte: todayStart, $lte: todayEnd },
            "checkIn.time": { $exists: true },
            "checkOut.time": { $exists: false }
        });

        console.log(`Found ${activeAttendances.length} records to auto-checkout.`);

        let count = 0;
        for (const attendance of activeAttendances) {
            // Set checkout time to 9:00 PM (21:00) of the same day
            const checkoutTime = new Date(attendance.date);
            checkoutTime.setHours(21, 0, 0, 0);

            // If checkIn was actually after 9 PM (unlikely but possible), skip or handle
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
