import mongoose from "mongoose";
import dotenv from "dotenv";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const admission = await BoardCourseAdmission.findById("69f30259a77c1c938fae939b");
        console.log(JSON.stringify(admission, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
