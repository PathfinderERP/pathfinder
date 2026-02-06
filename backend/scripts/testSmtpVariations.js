import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const user = "hrpathfinder3@gmail.com";
const host = "smtp.gmail.com";
const port = 587;

const variations = [
    "ldkothafwlzgqktd",
    "ldko thaf wlzg qktd",
    "ldko thaf wlzg qktd erpsmtp",
    "ldkothafwlzgqktderpsmtp"
];

async function testVariations() {
    for (const pass of variations) {
        console.log(`\nTesting password: "${pass}"`);
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: false,
            auth: { user, pass }
        });

        try {
            await transporter.verify();
            console.log(`✅ SUCCESS with password: "${pass}"`);
            process.exit(0);
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
        }
    }
    console.log("\nAll variations failed.");
    process.exit(1);
}

testVariations();
