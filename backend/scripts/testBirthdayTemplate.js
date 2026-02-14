import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { default: emailService } = await import("../utils/emailService.js");

async function sendTestEmails() {
    const testEmails = ["malay@pathfinder.edu.in"];

    console.log("🚀 Sending test birthday emails...");

    for (const email of testEmails) {
        const dummyEmployee = {
            name: "Test User",
            email: email
        };

        try {
            await emailService.sendBirthdayWish(dummyEmployee);
            console.log(`✅ Birthday template sent to: ${email}`);
        } catch (error) {
            console.error(`❌ Failed to send to ${email}:`, error.message);
        }
    }
}

sendTestEmails();
