import connectDB from '../db/connect.js';
import mongoose from 'mongoose';

async function main() {
    await connectDB();
    const db = mongoose.connection.db;

    const user = await db.collection('users').findOne({ employeeId: 'EMP26000430' });
    if (!user) {
        console.error('User SWARNALI BERA PAUL (EMP26000430) not found in users collection!');
        process.exit(1);
    }

    const existingEmp = await db.collection('employees').findOne({ user: user._id });
    if (existingEmp) {
        console.log('Employee profile already exists:', existingEmp);
        process.exit(0);
    }

    const employeeDoc = {
        employeeId: 'EMP26000430',
        user: user._id,
        name: 'SWARNALI BERA PAUL',
        spouseName: '',
        dateOfBirth: null,
        gender: 'Female',
        bloodGroup: '',
        email: 'swarnali.bera.paul@gmail.com',
        phoneNumber: '9932116556',
        whatsappNumber: '9932116556',
        dateOfJoining: user.createdAt,
        primaryCentre: user.centres && user.centres.length > 0 ? user.centres[0] : null,
        centres: user.centres || [],
        centerArray: [''],
        grade: '',
        state: '',
        city: '',
        pinCode: '',
        address: '',
        aadharNumber: '',
        panNumber: '',
        typeOfEmployment: 'Full-time',
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
        workingDaysList: [''],
        probationPeriod: false,
        currentSalary: 0,
        specialAllowance: 0,
        bankName: '',
        branchName: '',
        accountNumber: '',
        ifscCode: '',
        status: 'Active',
        createdBy: user.updatedBy || null,
        updatedBy: user.updatedBy || null,
        children: [],
        salaryStructure: [],
        letters: [],
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const result = await db.collection('employees').insertOne(employeeDoc);
    console.log('Inserted Employee profile successfully! ID:', result.insertedId);

    process.exit(0);
}

main();
