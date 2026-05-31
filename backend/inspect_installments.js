import mongoose from "mongoose";
import dotenv from "dotenv";
import Admission from "./models/Admission/Admission.js";

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const adm = await Admission.findOne({ admissionNumber: "PATH26001453" }).lean();
        console.log(JSON.stringify(adm, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
