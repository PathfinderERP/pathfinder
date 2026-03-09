import mongoose from "mongoose";
import "dotenv/config";

const mongoUrl = process.env.MONGO_URL;

async function searchUser() {
    try {
        await mongoose.connect(mongoUrl);
        console.log("Connected to MongoDB");

        // Define schemas to avoid MissingSchemaError
        const userSchema = new mongoose.Schema({}, { strict: false });
        const User = mongoose.model("User", userSchema, "users");

        const employeeSchema = new mongoose.Schema({}, { strict: false });
        const Employee = mongoose.model("Employee", employeeSchema, "employees");

        const name = "MADHUMITA CHAKRABORTY";
        const email = "madhumitac440@gmail.com";
        const empId = "EMP26000473";

        console.log(`Searching for: Name="${name}", Email="${email}", EmpID="${empId}"`);

        const usersByName = await User.find({ name: new RegExp(name, 'i') });
        console.log(`Users found by name: ${usersByName.length}`);
        usersByName.forEach(u => console.log(` - ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, EmpID: ${u.employeeId}`));

        const usersByEmail = await User.find({ email: email });
        console.log(`Users found by email: ${usersByEmail.length}`);

        const employeesByEmpId = await Employee.find({ employeeId: empId });
        console.log(`Employees found by EmpID: ${employeesByEmpId.length}`);
        employeesByEmpId.forEach(e => console.log(` - ID: ${e._id}, Name: ${e.name}, EmpID: ${e.employeeId}`));

        const employeesByName = await Employee.find({ name: new RegExp(name, 'i') });
        console.log(`Employees found by name: ${employeesByName.length}`);

        // Also check leads to see who she was
        const leadSchema = new mongoose.Schema({}, { strict: false });
        const Lead = mongoose.model("Lead", leadSchema, "leads");
        const leadsByResponsibility = await Lead.findOne({ leadResponsibility: name });
        if (leadsByResponsibility) {
            console.log("Found lead assigned to her. Example Lead ID:", leadsByResponsibility._id);
        }

    } catch (error) {
        console.error("Error searching database:", error);
    } finally {
        await mongoose.connection.close();
    }
}

searchUser();
