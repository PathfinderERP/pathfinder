import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './backend/models/User.js';
import Employee from './backend/models/HR/Employee.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        // Let's print first 5 employees with their primaryCentre and user
        const emps = await Employee.find({}).populate('primaryCentre').limit(5);
        console.log('Sample Employees:');
        emps.forEach(emp => {
            console.log(`EmpName: ${emp.name}, user: ${emp.user}, primaryCentre: ${emp.primaryCentre?.centreName} (${emp.primaryCentre?._id})`);
        });

        // Let's list some centers to test with
        const centers = await mongoose.model('CentreSchema').find({ status: 'active' }).limit(5);
        console.log('\nSample Centers:');
        centers.forEach(c => {
            console.log(`Center: ${c.centreName} | ID: ${c._id}`);
        });

        if (centers.length > 0) {
            const targetCenterId = centers[0]._id.toString();
            console.log(`\nTesting filter for primaryCentre ID: ${targetCenterId} (${centers[0].centreName})`);

            // Find employees with this primaryCentre
            const matchedEmps = await Employee.find({ primaryCentre: targetCenterId });
            console.log(`Matched Employees count: ${matchedEmps.length}`);
            matchedEmps.forEach(emp => {
                console.log(`- ${emp.name} | user ID: ${emp.user}`);
            });

            // Find users
            const matchedUserIds = matchedEmps.map(emp => emp.user).filter(Boolean);
            console.log(`Matched User IDs:`, matchedUserIds);

            const users = await User.find({ _id: { $in: matchedUserIds } });
            console.log(`Matched Users count: ${users.length}`);
            users.forEach(u => {
                console.log(`- ${u.name} | role: ${u.role}`);
            });
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

run();
