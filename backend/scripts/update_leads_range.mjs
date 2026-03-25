import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import LeadManagement from "../models/LeadManagement.js";
import Class from "../models/Master_data/Class.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to database");

        // 1. Find the target "9" class ID
        const targetClassName = "9";
        let classDoc = await Class.findOne({ name: targetClassName });
        
        if (!classDoc) {
             // Fallback: check if it's "Class 9" or similar
             classDoc = await Class.findOne({ name: new RegExp('^' + targetClassName + '$', 'i') });
        }
        
        if (!classDoc) {
            console.error(`Class "${targetClassName}" not found in database.`);
            const allClasses = await Class.find({});
            console.log("Available classes:", allClasses.map(c => c.name));
            process.exit(1);
        }

        console.log(`Found Class ID for "${targetClassName}": ${classDoc._id}`);

        // 2. Identify the leads to update
        // We look for leads where leadResponsibility is "JOYJIT BATABYAL"
        // and we need to handle the "serial number" 492 to 982.
        // Since there is no explicit serial number field, we might need to fetch them sorted by createdAt or use the index in an array.
        // OR the user might mean a specific field. Let's inspect ONE lead to see if there's a hidden field.
        
        const testLead = await LeadManagement.findOne({ leadResponsibility: /JOYJIT BATABYAL/i });
        if (!testLead) {
            console.error("No leads found for JOYJIT BATABYAL");
            process.exit(1);
        }
        console.log("Sample Lead for JOYJIT BATABYAL:", JSON.stringify(testLead, null, 2));

        // Let's assume the user means the order of creation if no 'serialNumber' field exists.
        // However, usually "serial number" in such requests refers to an Excel import or a row number.
        // I will check if there is any field like 'slNo', 'serialNumber', etc.
        
        // The UI shows 983 records. The user says "from the serial number of 492 to 982".
        // In the screenshot, the list is likely sorted by createdAt DESC (most recent first).
        // Serial number 981, 982, 983 are at the bottom.
        // So serial number 492 to 982 corresponds to indexes in a list sorted by createdAt DESC.
        
        const query = {
            leadResponsibility: { $regex: /JOYJIT BATABYAL/i }
        };

        // UI usually sorts by most recent first
        const leads = await LeadManagement.find(query).sort({ createdAt: -1 });
        console.log(`Total leads for JOYJIT BATABYAL: ${leads.length}`);

        // If the user says 492 to 982 in a list of 983:
        // Index = (Serial Number - 1)
        const startIndex = 491; // 492nd lead
        const endIndex = 981;   // 982nd lead

        const leadsToUpdate = leads.slice(startIndex, endIndex + 1);
        console.log(`Leads in range 492-982: ${leadsToUpdate.length}`);

        if (leadsToUpdate.length === 0) {
            console.log("No leads found in that range.");
        } else {
            const ids = leadsToUpdate.map(l => l._id);
            const result = await LeadManagement.updateMany(
                { _id: { $in: ids } },
                { $set: { className: classDoc._id } }
            );
            console.log(`Successfully updated ${result.modifiedCount} leads to Class 9`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
