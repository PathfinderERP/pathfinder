import "dotenv/config";
import mongoose from "mongoose";
import Employee from "../models/HR/Employee.js";
import User from "../models/User.js";
import Department from "../models/Master_data/Department.js";
import Centre from "../models/Master_data/Centre.js";

async function test() {
    try {
        console.log("Connecting to:", process.env.MONGO_URL);
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const centerId = "all";
        const query = { status: "Active" };
        if (centerId && centerId !== "all") {
            query.primaryCentre = centerId;
        }

        const employees = await Employee.find(query)
        .populate({
            path: 'user',
            select: 'name email role isActive mobNum employeeId'
        })
        .populate('department', 'departmentName')
        .populate('primaryCentre', 'centreName');

        console.log(`Found ${employees.length} employees`);

        const activeEmployees = employees.filter(emp => emp.user && emp.user.isActive);
        console.log(`Active employees: ${activeEmployees.length}`);

        const enriched = activeEmployees.map(emp => {
            const userObj = emp.user.toObject();
            return {
                _id: userObj._id,
                employeeId: emp.employeeId || userObj.employeeId || "—",
                name: emp.name || userObj.name,
                email: emp.email || userObj.email,
                mobNum: emp.phoneNumber || userObj.mobNum || "—",
                role: userObj.role,
                departmentName: emp.department?.departmentName || "Other Department",
                currentSalary: emp.currentSalary || 0,
                centreId: emp.primaryCentre?._id || null,
                centreName: emp.primaryCentre?.centreName || "Other Centre"
            };
        });

        console.log("Successfully enriched data!");
    } catch (error) {
        console.error("Error occurred:", error);
    } finally {
        await mongoose.disconnect();
    }
}

test();
