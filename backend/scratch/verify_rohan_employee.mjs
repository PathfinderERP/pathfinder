import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Employee from '../models/HR/Employee.js';
import CentreSchema from '../models/Master_data/Centre.js';
import Department from '../models/Master_data/Department.js';
import Designation from '../models/Master_data/Designation.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to database");

        const query = { status: { $ne: "Deactive" } };
        query.user = { $exists: true, $ne: null };

        let employees = await Employee.find(query)
            .populate("user")
            .populate("primaryCentre", "centreName")
            .populate("centres", "centreName")
            .populate("department", "departmentName")
            .populate("designation", "name")
            .sort({ createdAt: -1 });

        console.log("Total linked employees found in DB:", employees.length);

        // Mimic 'staff' role filter
        const roleFilter = {
            $and: [
                { role: { $nin: ['teacher', 'HOD'] } },
                { isDeptHod: { $ne: true } },
                { isBoardHod: { $ne: true } },
                { isSubjectHod: { $ne: true } }
            ]
        };

        const staffEmployees = employees.filter((emp) => {
            if (!emp.user) return false;

            if (roleFilter.$and[0].role.$nin.includes(emp.user.role)) {
                return false;
            }

            if (
                (roleFilter.$and[1].isDeptHod.$ne === true && emp.user.isDeptHod === true) ||
                (roleFilter.$and[2].isBoardHod.$ne === true && emp.user.isBoardHod === true) ||
                (roleFilter.$and[3].isSubjectHod.$ne === true && emp.user.isSubjectHod === true)
            ) {
                return false;
            }

            return true;
        });

        console.log("Total staff employees:", staffEmployees.length);

        const rohan = staffEmployees.find(e => e.employeeId === 'SA002');
        if (rohan) {
            console.log("\nSUCCESS! Rohan Singh found in Staff List:");
            console.log(JSON.stringify({
                _id: rohan._id,
                name: rohan.name,
                employeeId: rohan.employeeId,
                email: rohan.email,
                role: rohan.user?.role,
                department: rohan.department?.departmentName,
                designation: rohan.designation?.name,
                primaryCentre: rohan.primaryCentre?.centreName
            }, null, 2));
        } else {
            console.log("\nFAILURE: Rohan Singh not found in Staff List.");
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
