import mongoose from 'mongoose';
import Admission from './models/Admission/Admission.js';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';
import Payment from './models/Payment/Payment.js';
import dotenv from 'dotenv';

dotenv.config();

const checkStudent = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const admissionNumber = 'PATH26002565';
        
        let adm = await Admission.findOne({ admissionNumber }).populate('student').lean();
        if (!adm) {
            adm = await BoardCourseAdmission.findOne({ admissionNumber }).lean();
            if (adm) console.log('Found in BoardCourseAdmission');
        } else {
            console.log('Found in Admission (Normal)');
        }

        if (!adm) {
            console.log('Admission not found');
            process.exit(0);
        }

        console.log('Admission Details:', JSON.stringify({
            admissionNumber: adm.admissionNumber,
            admissionType: adm.admissionType || 'BOARD',
            totalFees: adm.totalFees || adm.totalExpectedAmount,
            totalPaidAmount: adm.totalPaidAmount,
            paymentStatus: adm.paymentStatus || adm.status,
            admissionFee: adm.admissionFee,
            examFee: adm.examFee,
            examFeePaid: adm.examFeePaid,
            additionalThingsAmount: adm.additionalThingsAmount,
            additionalThingsPaid: adm.additionalThingsPaid,
            installments: adm.installments?.map(i => ({
                month: i.monthNumber,
                status: i.status,
                payableAmount: i.payableAmount,
                paidAmount: i.paidAmount,
                txns: i.paymentTransactions?.map(pt => ({
                    billId: pt.billId || 'MISSING',
                    amount: pt.amount,
                    method: pt.paymentMethod,
                    date: pt.date
                }))
            }))
        }, null, 2));

        const payments = await Payment.find({ $or: [{ admission: adm._id }, { student: adm.studentId }] }).populate('recordedBy', 'name').lean();
        console.log('Payment Records:', JSON.stringify(payments.map(p => ({
            billId: p.billId,
            paidAmount: p.paidAmount,
            receivedDate: p.receivedDate,
            paymentMethod: p.paymentMethod,
            status: p.status,
            installmentNumber: p.installmentNumber,
            billingMonth: p.billingMonth,
            recordedBy: p.recordedBy?.name
        })), null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkStudent();
