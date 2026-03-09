import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function checkConflict() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to database");

        const db = mongoose.connection.db;
        const employeeId = "EMP26000439";
        const email = "baruipur@pathfinder.edu.in";
        const phoneNumber = "9051548819";

        console.log(`\nSearching for Employee ID: ${employeeId}, Email: ${email}, Phone: ${phoneNumber}`);

        const users = await db.collection('users').find({
            $or: [
                { employeeId: employeeId },
                { email: email.toLowerCase() },
                { mobNum: phoneNumber }
            ]
        }).toArray();

        console.log(`\nUsers found: ${users.length}`);
        users.forEach(user => {
            console.log(`- Name: ${user.name}, Email: ${user.email}, Phone: ${user.mobNum}, EmployeeID: ${user.employeeId}, Role: ${user.role}, _id: ${user._id}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

checkConflict();
