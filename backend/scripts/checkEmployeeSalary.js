import mongoose from "mongoose";
import "dotenv/config";
import Employee from "../models/HR/Employee.js";

async function checkEmployeeSalary() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const employee = await Employee.findOne({ name: /ROHAN SINGH/i });
        if (!employee) {
            console.log("Employee not found");
            return;
        }

        console.log(`Employee: ${employee.name} (${employee.employeeId})`);
        console.log("Salary Structure count:", employee.salaryStructure?.length || 0);

        if (employee.salaryStructure && employee.salaryStructure.length > 0) {
            console.log("Latest Salary Structure:", JSON.stringify(employee.salaryStructure[employee.salaryStructure.length - 1], null, 2));
        } else {
            console.log("No salary structure defined.");
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkEmployeeSalary();
