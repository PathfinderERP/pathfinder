import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

// Load backend env config
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    if (!MONGO_URL) {
        console.error("MONGO_URL not found in environment variables");
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB successfully!");

        // Update all users who have financeFees permissions
        const result = await User.updateMany(
            { "granularPermissions.financeFees": { $exists: true } },
            { 
                $set: { 
                    "granularPermissions.financeFees.chequeDepositEntry": { 
                        create: true, 
                        edit: true, 
                        delete: true 
                    } 
                } 
            }
        );

        console.log(`Successfully updated ${result.modifiedCount} users with 'chequeDepositEntry' permission.`);
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

run();
