import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Employee from '../models/HR/Employee.js';
import Designation from '../models/Master_data/Designation.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to database");

        // 1. Find Rohan's user record
        const rohanUser = await User.findOne({ email: "rohan@pathfinder.edu.in" });
        if (!rohanUser) {
            console.error("Rohan's User record not found!");
            await mongoose.disconnect();
            return;
        }
        console.log("Found Rohan User:", rohanUser.name, rohanUser._id);

        // 2. Check/Create Designation "Super Admin"
        let superAdminDesig = await Designation.findOne({ name: "Super Admin" });
        if (!superAdminDesig) {
            superAdminDesig = new Designation({
                name: "Super Admin",
                description: "Super Administrator designation",
                department: new mongoose.Types.ObjectId("697086a2abb4820c05aeca53"), // Admin department
                isActive: true
            });
            await superAdminDesig.save();
            console.log("Created designation 'Super Admin':", superAdminDesig._id);
        } else {
            console.log("Found existing designation 'Super Admin':", superAdminDesig._id);
        }

        // 3. Check if Employee record already exists
        let rohanEmployee = await Employee.findOne({ user: rohanUser._id });
        if (rohanEmployee) {
            console.log("Rohan's Employee record already exists:", rohanEmployee);
        } else {
            // Create new Employee record
            rohanEmployee = new Employee({
                employeeId: rohanUser.employeeId,
                user: rohanUser._id,
                name: rohanUser.name,
                email: rohanUser.email,
                phoneNumber: rohanUser.mobNum,
                whatsappNumber: rohanUser.mobNum,
                dateOfJoining: new Date("2026-01-21"),
                primaryCentre: new mongoose.Types.ObjectId("697088baabb4820c05aecdb0"), // HAZRA H.O
                centres: [new mongoose.Types.ObjectId("697088baabb4820c05aecdb0")],
                department: new mongoose.Types.ObjectId("697086a2abb4820c05aeca53"), // Admin department
                designation: superAdminDesig._id,
                status: "Active",
                typeOfEmployment: "Full-time",
                workingHours: 9,
                workingDays: {
                    sunday: false,
                    monday: true,
                    tuesday: true,
                    wednesday: true,
                    thursday: true,
                    friday: true,
                    saturday: true
                },
                workingDaysList: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
                createdBy: new mongoose.Types.ObjectId("6970c4129590082b81674b65"), // Malay Maity
                updatedBy: new mongoose.Types.ObjectId("6970c4129590082b81674b65"), // Malay Maity
                currentSalary: 0,
                isDeductions: false,
                children: []
            });
            await rohanEmployee.save();
            console.log("Created Rohan Employee record:", rohanEmployee._id);
        }

        // 4. Update User record's designation name and centres if necessary
        rohanUser.designation = "Super Admin";
        // Link Hazra H.O centre in User if it is empty
        if (!rohanUser.centres || rohanUser.centres.length === 0) {
            rohanUser.centres = [new mongoose.Types.ObjectId("697088baabb4820c05aecdb0")];
        }
        await rohanUser.save();
        console.log("Updated Rohan's User record designation and centres.");

        await mongoose.disconnect();
        console.log("Done!");
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
