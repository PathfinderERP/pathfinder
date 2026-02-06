import Employee from "../models/HR/Employee.js";
import emailService from "../utils/emailService.js";

/**
 * Checks for employees celebrating birthdays today and sends them a greeting email.
 */
export const checkAndSendBirthdayGreetings = async () => {
    console.log("🎂 Checking for birthdays today...");
    try {
        // Get current date in IST (UTC+5:30)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);

        const currentMonth = istTime.getUTCMonth() + 1; // JS months are 0-indexed
        const currentDate = istTime.getUTCDate();

        console.log(`📅 Today (IST): ${istTime.toISOString()} | Month: ${currentMonth}, Day: ${currentDate}`);

        // MongoDB aggregation to match day and month of birthday
        // Note: dateOfBirth is stored in UTC. We match day/month from the stored Date object.
        const birthdayEmployees = await Employee.aggregate([
            {
                $match: {
                    status: "Active",
                    dateOfBirth: { $exists: true, $ne: null }
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    month: { $month: "$dateOfBirth" },
                    day: { $dayOfMonth: "$dateOfBirth" }
                }
            },
            {
                $match: {
                    month: currentMonth,
                    day: currentDate
                }
            }
        ]);

        console.log(`🎉 Found ${birthdayEmployees.length} employee(s) with birthday today.`);

        const results = {
            success: 0,
            failed: 0,
            details: []
        };

        for (const emp of birthdayEmployees) {
            console.log(`🎈 Processing birthday for: ${emp.name}`);
            if (!emp.email) {
                console.warn(`⚠️ Skipping ${emp.name} - No email found.`);
                results.failed++;
                results.details.push({ name: emp.name, status: "No Email" });
                continue;
            }

            try {
                await emailService.sendBirthdayWish(emp);
                console.log(`✅ Sent birthday wish to: ${emp.name} (${emp.email})`);
                results.success++;
                results.details.push({ name: emp.name, status: "Success" });
            } catch (mailError) {
                console.error(`❌ Failed to send email to ${emp.name}:`, mailError.message);
                results.failed++;
                results.details.push({ name: emp.name, status: "Error", message: mailError.message });
            }
        }

        return results;
    } catch (error) {
        console.error("❌ Error in birthday notification service:", error);
        throw error;
    }
};
