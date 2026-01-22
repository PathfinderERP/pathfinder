import mongoose from "mongoose";
import "dotenv/config";
import Employee from "../models/HR/Employee.js";

async function countZeroSalaries() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const employees = await Employee.find({});
        const zeroSalary = employees.filter(e => !e.currentSalary || e.currentSalary === 0);
        console.log(`Total Employees: ${employees.length}`);
        console.log(`Employees with null/zero currentSalary: ${zeroSalary.length}`);

        if (zeroSalary.length > 0) {
            console.log("Samples:");
            zeroSalary.slice(0, 10).forEach(e => console.log(`- ${e.name} (${e.employeeId})` || "N/A"));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

countZeroSalaries();
