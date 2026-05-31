import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to database");

        // Find Rohan's user record
        const rohanUser = await User.findOne({ email: "rohan@pathfinder.edu.in" });
        console.log("Rohan User centres:", rohanUser.centres);

        const db = mongoose.connection.db;

        // Look up the centres
        const centres = await db.collection('centres').find({ _id: { $in: rohanUser.centres } }).toArray();
        console.log("Centres found:", centres.map(c => ({ _id: c._id, centreName: c.centreName })));

        // Look up departments
        const departments = await db.collection('departments').find({
            departmentName: { $regex: /admin|management|hr|director/i }
        }).toArray();
        console.log("\n--- Matching Departments ---");
        console.log(departments.map(d => ({ _id: d._id, departmentName: d.departmentName })));

        // Look up designations
        const designations = await db.collection('designations').find({
            name: { $regex: /super|ceo|director|admin/i }
        }).toArray();
        console.log("\n--- Matching Designations ---");
        console.log(designations.map(d => ({ _id: d._id, name: d.name })));

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
