import mongoose from 'mongoose';
import Admission from './backend/models/Admission/Admission.js';
import BoardCourseAdmission from './backend/models/Admission/BoardCourseAdmission.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const checkStudent = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const admissionNumber = 'PATH26002565';
        
        let adm = await Admission.findOne({ admissionNumber }).populate('student').lean();
        if (!adm) {
            adm = await BoardCourseAdmission.findOne({ admissionNumber }).lean();
            console.log('Found in BoardCourseAdmission');
        } else {
            console.log('Found in Admission (Normal)');
        }

        if (!adm) {
            console.log('Admission not found');
            process.exit(0);
        }

        console.log('Admission Details:', JSON.stringify({
            admissionNumber: adm.admissionNumber,
            totalFees: adm.totalFees,
            totalPaidAmount: adm.totalPaidAmount,
            paymentStatus: adm.paymentStatus,
            paymentBreakdown: adm.paymentBreakdown?.map(p => ({
                inst: p.installmentNumber,
                status: p.status,
                paidAmount: p.paidAmount,
                billId: p.billId,
                transactionId: p.transactionId
            })),
            installments: adm.installments?.map(i => ({
                month: i.monthNumber,
                status: i.status,
                paidAmount: i.paidAmount,
                billId: i.billId // Note: Board might not have billId here
            }))
        }, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkStudent();
