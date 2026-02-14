import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Now import other modules
import mongoose from 'mongoose';
import Employee from '../models/HR/Employee.js';
import connectDB from '../db/connect.js';
import { checkAndSendBirthdayGreetings } from '../services/birthdayNotificationService.js';

async function debugBirthdays() {
    try {
        console.log("Environment check:");
        console.log("- SMTP_USER:", process.env.SMTP_USER);
        console.log("- SMTP_PASS Length:", process.env.SMTP_PASS?.length);

        await connectDB();

        // Get current date in IST (UTC+5:30)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);

        const currentMonth = istTime.getUTCMonth() + 1;
        const currentDate = istTime.getUTCDate();

        console.log(`\nTime check:`);
        console.log(`- Server Time (UTC): ${now.toISOString()}`);
        console.log(`- India Time (IST): ${istTime.toISOString()}`);
        console.log(`- Matching for Month: ${currentMonth}, Day: ${currentDate}`);

        // List all active employees and their birthdays for debugging
        const allActive = await Employee.find({ status: "Active" }, 'name email dateOfBirth');
        console.log(`\nTotal Active Employees: ${allActive.length}`);

        console.log("\nMatches found in DB:");
        allActive.forEach(emp => {
            if (emp.dateOfBirth) {
                const dob = new Date(emp.dateOfBirth);
                const month = dob.getUTCMonth() + 1;
                const day = dob.getUTCDate();
                if (month === currentMonth && day === currentDate) {
                    console.log(`⭐️ ${emp.name.padEnd(25)}: DOB=${emp.dateOfBirth.toISOString().split('T')[0]}, Email=${emp.email}`);
                }
            }
        });

        console.log("\n--- Triggering Service ---");
        const results = await checkAndSendBirthdayGreetings();
        console.log("\nResults Summary:", JSON.stringify({
            success: results.success,
            failed: results.failed,
            totalFound: results.details.length
        }, null, 2));

        if (results.details.length > 0) {
            console.log("\nDetails:");
            results.details.forEach(d => console.log(`  ${d.status === 'Success' ? '✅' : '❌'} ${d.name}: ${d.status}${d.message ? ' - ' + d.message : ''}`));
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("Debug failed:", error);
        process.exit(1);
    }
}

debugBirthdays();
