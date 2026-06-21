import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "../models/Students.js";

dotenv.config();

const check = async () => {
    try {
        const uri = process.env.MONGO_URL || process.env.MONGO_URI;
        if (!uri) {
            console.error("No Mongo URI found in process.env");
            process.exit(1);
        }
        await mongoose.connect(uri);
        const count = await Student.countDocuments();
        console.log("Total students:", count);
        const phones = await Student.distinct("studentsDetails.mobileNum");
        console.log("Unique student phones:", phones.length);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
