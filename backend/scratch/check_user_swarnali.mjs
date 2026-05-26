import connectDB from '../db/connect.js';
import mongoose from 'mongoose';

async function main() {
    await connectDB();
    const db = mongoose.connection.db;

    const user = await db.collection('users').findOne({ employeeId: 'EMP26000430' });
    console.log('User document found:', JSON.stringify(user, null, 2));

    if (user) {
        const employee = await db.collection('employees').findOne({ user: user._id });
        console.log('Employee document found for user ID:', JSON.stringify(employee, null, 2));

        const employeeById = await db.collection('employees').findOne({ employeeId: 'EMP26000430' });
        console.log('Employee document found by employee ID:', JSON.stringify(employeeById, null, 2));
    } else {
        console.log('No user found with employeeId EMP26000430');
    }

    process.exit(0);
}

main();
