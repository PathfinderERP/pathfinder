import "dotenv/config";
import nodemailer from 'nodemailer';

async function verifyConnection() {
    console.log("🔍 Verifying SMTP connection...");
    console.log(`User: ${process.env.SMTP_USER}`);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    try {
        await transporter.verify();
        console.log("✅ SMTP Connection verified successfully!");
    } catch (error) {
        console.error("❌ SMTP Connection failed:", error.message);
        if (error.message.includes("Invalid login")) {
            console.error("TIP: Ensure 'App Passwords' are used if 2FA is enabled on the Gmail account.");
        }
    }
}

verifyConnection();
