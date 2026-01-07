import mongoose from 'mongoose';
import 'dotenv/config';
import Employee from '../models/HR/Employee.js';

const debugEmployees = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const employees = await Employee.find({}, 'name typeOfEmployment status').lean();

        console.log("--- All Employees ---");
        employees.forEach(emp => {
            console.log(`Name: ${emp.name}, Type: '${emp.typeOfEmployment}', Status: '${emp.status}'`);
        });

        const partTime = await Employee.find({
            typeOfEmployment: "Part-time",
            status: "Active"
        });
        console.log(`\nMatched by current query: ${partTime.length}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debugEmployees();
