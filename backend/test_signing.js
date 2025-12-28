import { getSignedFileUrl } from './controllers/HR/employeeController.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function test() {
    const brokenUrl = "undefined/employees/profileImage/1766752773863_WhatsApp_Image_2025-12-24_at_4.48.07_PM.jpeg";
    const signed = await getSignedFileUrl(brokenUrl);
    console.log("Original:", brokenUrl);
    console.log("Signed:", signed);
    process.exit(0);
}

test();
