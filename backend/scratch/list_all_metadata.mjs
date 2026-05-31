import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        const db = mongoose.connection.db;

        const centres = await db.collection('centres').find({}).toArray();
        console.log("All Centres:");
        centres.forEach(c => console.log(`  - ${c.centreName} (ID: ${c._id})`));

        const depts = await db.collection('departments').find({}).toArray();
        console.log("\nAll Departments:");
        depts.forEach(d => console.log(`  - ${d.departmentName} (ID: ${d._id})`));

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
