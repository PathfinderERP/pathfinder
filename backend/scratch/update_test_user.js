import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        const email = "mimmahamudul6@gmail.com";
        const user = await User.findOne({ email });
        if (!user) {
            console.error(`User with email ${email} not found!`);
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("pass123", salt);

        user.password = hashedPassword;
        // Make sure user is active and has correct permissions
        user.isActive = true;
        if (!user.permissions.includes("Admissions & Sales")) {
            user.permissions.push("Admissions & Sales");
        }
        await user.save();
        console.log(`Successfully updated user ${user.name} (${email}) password to 'pass123'`);

    } catch (err) {
        console.error("Error updating user:", err);
    } finally {
        await mongoose.connection.close();
    }
}

main();
