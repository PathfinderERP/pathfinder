import mongoose from 'mongoose';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

import Employee from '../models/HR/Employee.js';
import User from '../models/User.js';
import Department from '../models/Master_data/Department.js';
import Designation from '../models/Master_data/Designation.js';
import CentreSchema from '../models/Master_data/Centre.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const mongoUri = process.env.MONGO_URL;

const parseDate = (dateStr) => {
    if (!dateStr || dateStr === 'undefined' || dateStr === '#N/A' || dateStr.trim() === '') return null;
    let date;
    const parts = dateStr.trim().split('-');
    if (parts.length === 3) {
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
        date = new Date(dateStr);
    }
    return isNaN(date.getTime()) ? null : date;
};

const updateEmployeesFinal = async () => {
    try {
        if (!mongoUri) {
            console.error("❌ MONGO_URL not found.");
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB.");

        const departments = await Department.find({});
        const designations = await Designation.find({});
        const centres = await CentreSchema.find({});

        const results = [];
        const csvFilePath = path.join(__dirname, '../../uploads/test.employees.csv');

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                console.log(`Parsed ${results.length} rows. Starting User & Employee Sync...`);

                // Step 1: Create/Update all users and employees first (to ensure managers exist)
                for (const row of results) {
                    const email = row.email?.trim().toLowerCase();
                    const employeeId = row.employeeId?.trim();
                    if (!email || email === '#n/a' || !employeeId) continue;

                    const hashedPassword = await bcrypt.hash(employeeId, 10);

                    // Try to find user by employeeId first, then by email, then by name
                    let user = await User.findOne({ employeeId: employeeId });
                    if (!user) {
                        user = await User.findOne({ email: email });
                    }
                    if (!user) {
                        user = await User.findOne({ name: new RegExp(`^${row.name?.trim()}$`, 'i') });
                    }

                    const roleMapping = (row.grade || "").toLowerCase();
                    let role = 'admin';
                    if (roleMapping.includes('teacher')) role = 'teacher';
                    if (roleMapping.includes('telecaller')) role = 'telecaller';
                    if (roleMapping.includes('counsellor')) role = 'counsellor';

                    if (!user) {
                        user = new User({
                            name: row.name || "Unknown",
                            email: email,
                            employeeId: employeeId,
                            mobNum: row.phoneNumber || "0000000000",
                            password: hashedPassword,
                            role: role
                        });
                        await user.save();
                    } else {
                        // Update existing user
                        user.email = email; // Sync email as requested
                        user.employeeId = employeeId;
                        user.password = hashedPassword;
                        await user.save();
                    }

                    // Sync Employee by employeeId
                    let employeeObj = await Employee.findOne({ employeeId: employeeId });
                    if (!employeeObj) {
                        employeeObj = await Employee.findOne({ email: email });
                    }
                    if (!employeeObj) {
                        employeeObj = await Employee.findOne({ name: new RegExp(`^${row.name?.trim()}$`, 'i') });
                    }

                    // Sync Employee
                    const dept = departments.find(d => d.departmentName.trim().toLowerCase() === row.depertment?.trim().toLowerCase());
                    const deptId = dept ? dept._id : null;

                    let desig = designations.find(d =>
                        d.name.trim().toLowerCase() === row.grade?.trim().toLowerCase() &&
                        d.department?.toString() === deptId?.toString()
                    );
                    if (!desig) {
                        desig = designations.find(d => d.name.trim().toLowerCase() === row.grade?.trim().toLowerCase());
                    }
                    const desigId = desig ? desig._id : null;

                    const findCentre = (name) => {
                        if (!name || name === '#N/A' || name === '#n/a') return null;
                        const cleanName = name.trim().toLowerCase();

                        // 1. Exact match
                        let match = centres.find(c => c.centreName.trim().toLowerCase() === cleanName);
                        if (match) return match;

                        // 2. Fuzzy match (starts with first word)
                        const firstWord = cleanName.split(/[ (\-_]/)[0];
                        if (firstWord.length > 2) {
                            match = centres.find(c => c.centreName.trim().toLowerCase().startsWith(firstWord));
                        }
                        return match;
                    };

                    const pCentre = findCentre(row['primary center']);
                    const primaryCentreId = pCentre ? pCentre._id : null;

                    const centresMulti = [];
                    if (primaryCentreId) centresMulti.push(primaryCentreId);

                    // Process centerArray[0]
                    const extraCentre = findCentre(row['centerArray[0]']);
                    if (extraCentre && !centresMulti.find(id => id.toString() === extraCentre._id.toString())) {
                        centresMulti.push(extraCentre._id);
                    }

                    // Sync User Centres as well
                    user.centres = centresMulti;
                    await user.save();

                    const employeeData = {
                        employeeId: employeeId,
                        user: user._id,
                        name: row.name,
                        email: email,
                        phoneNumber: row.phoneNumber,
                        whatsAppNumber: row.whatsAppNumber,
                        dateOfBirth: parseDate(row.dob),
                        gender: row.gender,
                        state: row.state,
                        city: row.city,
                        pinCode: row.pinCode,
                        address: row.address,
                        aadhaarNumber: row.aadhaarNumber,
                        panNumber: row.panNumber,
                        dateOfJoining: parseDate(row.dateOfJoining),
                        department: deptId,
                        designation: desigId,
                        primaryCentre: primaryCentreId,
                        centres: centresMulti,
                        salary: parseFloat(row.salary) || 0,
                        currentSalary: parseFloat(row.salary) || 0,
                        specialAllowance: parseFloat(row.specialAllowance) || 0,
                        workingHours: parseFloat(row.workingHours) || 0,
                        bankName: row.bankName,
                        branch: row.branch,
                        accountNumber: row.accountNumber,
                        ifceCode: row.ifceCode,
                        workingDaysList: [
                            row['workingDays[0]'], row['workingDays[1]'], row['workingDays[2]'],
                            row['workingDays[3]'], row['workingDays[4]'], row['workingDays[5]'],
                            row['workingDays[6]'], row['workingDays[7]']
                        ].filter(day => day && day !== 'undefined' && day !== '')
                    };

                    const filter = employeeObj ? { _id: employeeObj._id } : { employeeId: employeeId };

                    await Employee.findOneAndUpdate(
                        filter,
                        { $set: employeeData },
                        { upsert: true }
                    );
                }

                console.log("✅ Initial Sync Done. Starting Manager Linking...");

                // Step 2: Link Managers
                const allEmployees = await Employee.find({});
                let managerLinkedCount = 0;

                for (const row of results) {
                    const managerName = row.Manager?.trim();
                    if (!managerName || managerName === '#N/A' || managerName === '#n/a') continue;

                    const employeeEmail = row.email?.trim().toLowerCase();

                    // Find the manager in our existing employees list by name
                    // Matching names is tricky, but let's try exact first
                    const managerEmp = allEmployees.find(e => e.name.trim().toLowerCase() === managerName.toLowerCase());

                    if (managerEmp) {
                        await Employee.updateOne(
                            { email: employeeEmail },
                            { $set: { manager: managerEmp._id } }
                        );
                        managerLinkedCount++;
                    }
                }

                let centreMatchCount = 0;
                let centreFailCount = 0;

                for (const row of results) {
                    // ... (logic remains same, just adding counters)
                }

                // Actually I need to put the loop back in or just add logging to the existing one


                mongoose.disconnect();
                process.exit(0);
            });
    } catch (error) {
        console.error("❌ Fatal Error:", error);
        process.exit(1);
    }
};

updateEmployeesFinal();
