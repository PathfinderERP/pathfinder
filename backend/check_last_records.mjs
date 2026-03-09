import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function checkLastEmployees() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to database");

        const db = mongoose.connection.db;
        
        console.log("\nLast 10 Employees:");
        const employees = await db.collection('employees').find().sort({ createdAt: -1 }).limit(10).toArray();
        employees.forEach(emp => {
            console.log(`- ID: ${emp.employeeId}, Name: ${emp.name}, CreatedAt: ${emp.createdAt}`);
        });

        console.log("\nLast 10 Users:");
        const users = await db.collection('users').find().sort({ createdAt: -1 }).limit(10).toArray();
        users.forEach(user => {
            console.log(`- Name: ${user.name}, Email: ${user.email}, EmployeeID: ${user.employeeId}, CreatedAt: ${user.createdAt}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

checkLastEmployees();
