import mongoose from "mongoose";
import "dotenv/config";
import Employee from "../models/HR/Employee.js";

async function inspectEmployee() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const employee = await Employee.findOne({ name: /ROHAN SINGH/i });
        if (!employee) {
            console.log("Employee not found");
            return;
        }

        console.log("Full Employee Object (Salary Related):");
        console.log({
            name: employee.name,
            employeeId: employee.employeeId,
            currentSalary: employee.currentSalary,
            specialAllowance: employee.specialAllowance,
            salaryStructure: employee.salaryStructure,
            typeOfEmployment: employee.typeOfEmployment
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

inspectEmployee();
