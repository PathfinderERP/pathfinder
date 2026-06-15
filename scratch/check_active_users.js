import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../backend/models/User.js';
import Centre from '../backend/models/Master_data/Centre.js';

dotenv.config({ path: '../backend/.env' });

async function run() {
    try {
        console.log("URI:", process.env.MONGODB_URI || process.env.MONGO_URL);
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
        console.log("Connected to MongoDB successfully");

        // 1. Let's find any centers with "433" in their name or code or ID
        const centres = await Centre.find({});
        console.log(`Found ${centres.length} total centres.`);
        const matchingCentres = centres.filter(c => 
            c._id.toString().includes('433') || 
            (c.centreCode && c.centreCode.includes('433')) ||
            (c.centreName && c.centreName.includes('433'))
        );
        console.log("Matching centres:", matchingCentres.map(c => ({ id: c._id, name: c.centreName, code: c.centreCode })));

        // 2. Let's look for active users who are associated with any matching centre, 
        // or check if there is an employeeId, name, or something containing "433"
        // Let's also look for users where role or permissions might be related.
        const users = await User.find({ isActive: true });
        console.log(`Found ${users.length} active users.`);

        const usersWith433InId = users.filter(u => u._id.toString().includes('433'));
        console.log(`Active users with '433' in their ID: ${usersWith433InId.length}`);
        usersWith433InId.forEach(u => {
            console.log(`- ID: ${u._id}, Name: ${u.name}, Role: ${u.role}, Email: ${u.email}`);
        });

        // Check if there are users with employeeId or something matching 433
        const usersWith433InEmpId = users.filter(u => u.employeeId && u.employeeId.includes('433'));
        console.log(`Active users with '433' in their Employee ID: ${usersWith433InEmpId.length}`);
        usersWith433InEmpId.forEach(u => {
            console.log(`- ID: ${u._id}, EmpID: ${u.employeeId}, Name: ${u.name}, Role: ${u.role}`);
        });

        // Let's check if there's any centre with name/code matching 433 and who are the users in it
        if (matchingCentres.length > 0) {
            const centreIds = matchingCentres.map(c => c._id);
            const usersInCentres = await User.find({ centres: { $in: centreIds }, isActive: true });
            console.log(`Active users in matching centres: ${usersInCentres.length}`);
            usersInCentres.forEach(u => {
                console.log(`- ID: ${u._id}, Name: ${u.name}, Role: ${u.role}, Centres: ${u.centres}`);
            });
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error("Error running script:", err);
    }
}

run();
