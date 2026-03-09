import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function checkId() {
    try {
        await mongoose.connect(MONGO_URL);
        const db = mongoose.connection.db;
        
        const id = "EMP26000439";
        
        const emp = await db.collection('employees').findOne({ employeeId: id });
        console.log(`Employee with ${id}:`, emp ? emp.name : "NOT FOUND");
        
        const user = await db.collection('users').findOne({ employeeId: id });
        console.log(`User with ${id}:`, user ? user.name : "NOT FOUND");

        const userByEmail = await db.collection('users').findOne({ email: "baruipur@pathfinder.edu.in" });
        console.log(`User with email baruipur@pathfinder.edu.in:`, userByEmail ? userByEmail.name : "NOT FOUND");

        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
}

checkId();
