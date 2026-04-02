import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Admission from "../models/Admission/Admission.js";
import Student from "../models/Students.js"
// import Student from "../models/Student.js";
import Course from "../models/User.js"
import Department from "../models/Master_data/Department.js"
import Examtag from "../models/Master_data/ExamTag.js";
// import Examtag from "../models/Master_data/ExamTag.js";
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function connectDB() {
    try {
        await mongoose.connect("mongodb+srv://pathtex:pathtex@pathtex.ariihtc.mongodb.net/PATHFINDER_NEW");
        console.log("connected to mongodb");
    } catch (error) {
        console.log("error to connect the mongodb", error);
        process.exit(1);
    }
}



connectDB();


const user = await Admission.find().populate("student").populate("department").populate("createdBy").populate("course").limit(1);
console.log(user);