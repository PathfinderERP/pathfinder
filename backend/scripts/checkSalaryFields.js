import mongoose from "mongoose";
import "dotenv/config";
import Employee from "../models/HR/Employee.js";

async function checkSalaryFields() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const employees = await Employee.find({});
        const withCurrentSalary = employees.filter(e => e.currentSalary > 0);
        console.log(`Employees with currentSalary > 0: ${withCurrentSalary.length}`);

        if (withCurrentSalary.length > 0) {
            withCurrentSalary.slice(0, 5).forEach(e => {
                console.log(`- ${e.name}: ${e.currentSalary}`);
            });
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkSalaryFields();
