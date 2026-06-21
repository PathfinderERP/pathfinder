import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "../models/Students.js";
import LeadManagement from "../models/LeadManagement.js";

dotenv.config();

const runMigration = async () => {
    try {
        const uri = process.env.MONGO_URL || process.env.MONGO_URI;
        if (!uri) {
            console.error("No Mongo URI found in process.env");
            process.exit(1);
        }
        await mongoose.connect(uri);

        console.log("Fetching student phone numbers...");
        const registeredPhones = await Student.distinct("studentsDetails.mobileNum");
        const cleanPhones = registeredPhones.filter(p => p && p !== '-');
        console.log(`Found ${cleanPhones.length} clean student phone numbers.`);

        console.log("Updating matching leads to isCounseled: true...");
        const result = await LeadManagement.updateMany(
            {
                isCounseled: { $ne: true },
                $or: [
                    { phoneNumber: { $in: cleanPhones } },
                    { secondPhoneNumber: { $in: cleanPhones } }
                ]
            },
            { $set: { isCounseled: true } }
        );

        console.log(`Migration completed successfully! Modified ${result.modifiedCount} leads.`);
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

runMigration();
