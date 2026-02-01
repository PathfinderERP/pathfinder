import "dotenv/config";
import mongoose from "mongoose";
import XLSX from "xlsx";
import path from "path";
import Employee from "../models/HR/Employee.js";
import connectDB from "../db/connect.js";

const filePath = "c:\\Users\\USER\\erp_1\\uploads\\Birthday.xlsx";

const excelSerialToDate = (serial) => {
    const epoch = new Date(1899, 11, 30);
    return new Date(epoch.getTime() + serial * 24 * 60 * 60 * 1000);
};

const updateBirthdays = async () => {
    try {
        await connectDB();
        console.log("Reading Excel file...");
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        console.log(`Found ${data.length} records in Excel.`);

        let updatedCount = 0;
        let notFoundCount = 0;
        let errorCount = 0;

        for (const row of data) {
            const name = row["Name"]?.trim();
            const dobSerial = row["Date of birth "];

            if (!name || dobSerial === undefined) {
                console.warn(`Skipping row with missing info: Name="${name}", DOB="${dobSerial}"`);
                continue;
            }

            const birthday = excelSerialToDate(dobSerial);

            // Case-insensitive match using regex
            const employee = await Employee.findOne({
                name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
            });

            if (employee) {
                employee.dateOfBirth = birthday;
                await employee.save();
                console.log(`✅ Updated: ${name} -> ${birthday.toDateString()}`);
                updatedCount++;
            } else {
                console.error(`❌ Not Found in DB: ${name}`);
                notFoundCount++;
            }
        }

        console.log("\n--- Update Summary ---");
        console.log(`Total Records: ${updatedCount + notFoundCount + errorCount}`);
        console.log(`Updated Success: ${updatedCount}`);
        console.log(`Not Found: ${notFoundCount}`);
        console.log(`Errors: ${errorCount}`);

        process.exit(0);
    } catch (error) {
        console.error("Critical Error during update:", error);
        process.exit(1);
    }
};

updateBirthdays();
