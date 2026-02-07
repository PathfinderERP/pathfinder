import mongoose from "mongoose";
import dotenv from "dotenv";
import XLSX from "xlsx";
import path from "path";
import fs from "fs";
import User from "./models/User.js";
import Employee from "./models/HR/Employee.js";
import Designation from "./models/Master_data/Designation.js";
import CentreSchema from "./models/Master_data/Centre.js";

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const EXPORT_DIR = path.join(process.cwd(), "exports_data");

if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR);
}

async function exportData() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");

        // Fetch all employees with their user data
        const employees = await Employee.find({})
            .populate("user")
            .populate("designation");

        const telecallersData = [];
        const ci_zmData = [];

        for (const emp of employees) {
            const userData = emp.user || {};
            const role = userData.role || "";
            const designationName = (emp.designation?.name || "").toLowerCase();
            const centers = emp.centerArray ? emp.centerArray.join(", ") : "";

            const row = {
                "Name": emp.name,
                "Center Name": centers,
                "Email": emp.email,
                "Password (Emp ID)": emp.employeeId,
                "Mobile Number": emp.phoneNumber || userData.mobNum || ""
            };

            // Categorize by Telecallers (Role)
            if (role === "telecaller" || role === "centralizedTelecaller") {
                telecallersData.push(row);
            }
            // Categorize by CI & ZM (Designation)
            else if (designationName.includes("zone manager") || designationName.includes("centre in-charge")) {
                // Ensure we only get the ones recently added if needed, 
                // but usually these designations are specific to the ones we migrated.
                ci_zmData.push(row);
            }
        }

        // Export Telecallers
        if (telecallersData.length > 0) {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(telecallersData);
            XLSX.utils.book_append_sheet(wb, ws, "Telecallers");
            XLSX.writeFile(wb, path.join(EXPORT_DIR, "Telecallers_Migrated.xlsx"));
            console.log(`Exported ${telecallersData.length} telecallers.`);
        }

        // Export CI & ZM
        if (ci_zmData.length > 0) {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(ci_zmData);
            XLSX.utils.book_append_sheet(wb, ws, "CI_ZM_Employees");
            XLSX.writeFile(wb, path.join(EXPORT_DIR, "CI_ZM_Migrated.xlsx"));
            console.log(`Exported ${ci_zmData.length} CI/ZM employees.`);
        }

        console.log(`Files generated in: ${EXPORT_DIR}`);
        process.exit(0);
    } catch (error) {
        console.error("Export failed:", error);
        process.exit(1);
    }
}

exportData();
