import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        const db = mongoose.connection.db;

        const superAdmins = await db.collection('users').find({ role: 'superAdmin' }).toArray();
        console.log(`Found ${superAdmins.length} superAdmins:`);
        for (const u of superAdmins) {
            const emp = await db.collection('employees').findOne({ user: u._id });
            console.log(`\nUser: ${u.name} (Email: ${u.email}, ID: ${u.employeeId})`);
            if (emp) {
                console.log(`Linked Employee Record:`);
                console.log(`  - Employee ID: ${emp.employeeId}`);
                console.log(`  - Department ID: ${emp.department}`);
                console.log(`  - Designation ID: ${emp.designation}`);
                console.log(`  - Primary Centre: ${emp.primaryCentre}`);
            } else {
                console.log(`  - No linked Employee record`);
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
