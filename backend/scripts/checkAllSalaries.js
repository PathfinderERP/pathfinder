import mongoose from "mongoose";
import "dotenv/config";
import Employee from "../models/HR/Employee.js";

async function checkAllSalaries() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const employees = await Employee.find({});
        console.log(`Total Employees: ${employees.length}`);

        const withSalary = employees.filter(e => e.salaryStructure && e.salaryStructure.length > 0);
        console.log(`Employees with Salary Structure: ${withSalary.length}`);

        if (withSalary.length > 0) {
            withSalary.forEach(e => {
                console.log(`- ${e.name} (${e.employeeId}): ${e.salaryStructure.length} structures`);
            });
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkAllSalaries();
