import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function inspectInstallments() {
    await mongoose.connect(process.env.MONGO_URL);
    const db = mongoose.connection.db;
    const bAdm = await db.collection('boardcourseadmissions').findOne({ admissionNumber: 'PATH26002111' });
    console.log('Student Name:', bAdm.studentName);
    console.log('Total Expected:', bAdm.totalExpectedAmount);
    console.log('Total Paid:', bAdm.totalPaidAmount);
    console.log('Installments:');
    bAdm.installments.forEach((inst, idx) => {
        console.log(`[${idx}] Month: ${inst.monthNumber}, Due: ${inst.dueDate}, Payable: ${inst.payableAmount}, Paid: ${inst.paidAmount}, Status: ${inst.status}, Txns: ${inst.paymentTransactions?.length || 0}`);
        if (inst.paymentTransactions && inst.paymentTransactions.length > 0) {
            console.log('   Txns:', JSON.stringify(inst.paymentTransactions, null, 2));
        }
    });
    await mongoose.disconnect();
}
inspectInstallments();
