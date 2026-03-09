import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/HR/Employee.js';
import User from './models/User.js';
import { getNextEmployeeId } from './utils/hrUtils.js';
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function verifySync() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to database");

        const nextId = await getNextEmployeeId();
        console.log("\nNext Predicted Employee ID:", nextId);

        const db = mongoose.connection.db;
        const prefix = nextId.slice(0, 5); // EMP26
        
        const lastEmp = await db.collection('employees').find({ employeeId: { $regex: new RegExp(`^${prefix}`) } }).sort({ employeeId: -1 }).limit(1).toArray();
        const lastUser = await db.collection('users').find({ employeeId: { $regex: new RegExp(`^${prefix}`) } }).sort({ employeeId: -1 }).limit(1).toArray();

        console.log("Last Employee ID in DB:", lastEmp.length ? lastEmp[0].employeeId : "None");
        console.log("Last User ID in DB:", lastUser.length ? lastUser[0].employeeId : "None");

        const nextSeq = parseInt(nextId.slice(5), 10);
        const empSeq = lastEmp.length ? parseInt(lastEmp[0].employeeId.slice(5), 10) : 0;
        const userSeq = lastUser.length ? parseInt(lastUser[0].employeeId.slice(5), 10) : 0;

        if (nextSeq > empSeq && nextSeq > userSeq) {
            console.log("\n✅ SUCCESS: Next ID is greater than existing IDs in both collections.");
        } else {
            console.log("\n❌ FAILURE: ID collision detected or logic error.");
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

verifySync();
