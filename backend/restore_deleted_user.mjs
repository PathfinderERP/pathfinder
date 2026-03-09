import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import "dotenv/config";

const mongoUrl = process.env.MONGO_URL;

async function restoreUser() {
    try {
        await mongoose.connect(mongoUrl);
        console.log("Connected to MongoDB for restoration");

        // Define schemas exactly as they are in the models to ensure correct hooks/validation
        // However, since I'm doing a manual restoration, I'll just use the basic fields
        const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");
        const Employee = mongoose.model("Employee", new mongoose.Schema({}, { strict: false }), "employees");

        const name = "MADHUMITA CHAKRABORTY";
        const email = "madhumitac440@gmail.com";
        const empId = "EMP26000473";
        const passwordPlain = "Madhumita@BEHALA";

        console.log(`Restoring user: ${name}...`);

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(passwordPlain, salt);

        // 1. Create User
        const userData = {
            name: name,
            employeeId: empId,
            email: email,
            mobNum: "9999999999",
            password: hashedPassword,
            role: "telecaller",
            centres: [new mongoose.Types.ObjectId("697088baabb4820c05aecdb4")], // BEHALA
            isActive: true,
            permissions: ["Dashboard"],
            granularPermissions: {
                leadManagement: {
                    leads: { view: true, create: true, edit: true, delete: true },
                    dashboard: { view: true }
                }
            },
            assignedScript: new mongoose.Types.ObjectId("6970e2d68ec5b04dafc23372")
        };

        const newUser = await User.create(userData);
        console.log(`User created with ID: ${newUser._id}`);

        // 2. Create Employee
        const employeeData = {
            employeeId: empId,
            user: newUser._id,
            name: name,
            email: email,
            phoneNumber: "9999999999",
            primaryCentre: new mongoose.Types.ObjectId("697088baabb4820c05aecdb4"),
            centres: [new mongoose.Types.ObjectId("697088baabb4820c05aecdb4")],
            department: new mongoose.Types.ObjectId("697086a2abb4820c05aeca5b"), // Tele-Calling
            designation: new mongoose.Types.ObjectId("697086dcabb4820c05aecacb"), // Telecaller
            status: "Active",
            workingDays: {
                sunday: false,
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: true
            }
        };

        const newEmployee = await Employee.create(employeeData);
        console.log(`Employee record created with ID: ${newEmployee._id}`);
        console.log("Restoration successful!");
        console.log(`Username: ${email}`);
        console.log(`Password: ${passwordPlain}`);

    } catch (error) {
        console.error("Error during restoration:", error);
    } finally {
        await mongoose.connection.close();
    }
}

restoreUser();
