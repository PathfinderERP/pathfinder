import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const ADMIN_ID = "6970c4129590082b81674b65";

async function insertStudent() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        // Models
        const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');
        const Admission = mongoose.model('Admission', new mongoose.Schema({}, { strict: false }), 'admissions');
        const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false }), 'payments');
        const Centre = mongoose.model('CentreSchema', new mongoose.Schema({}, { strict: false }), 'centreschemas');
        const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }), 'courses');
        const Department = mongoose.model('Department', new mongoose.Schema({}, { strict: false }), 'departments');
        const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }), 'sessions');
        const Class = mongoose.model('Class', new mongoose.Schema({}, { strict: false }), 'classes');

        const centre = await Centre.findOne({ centreName: /HAZRA/i });
        if (!centre) throw new Error('Centre Hazra not found');

        const course = await Course.findOne({ courseName: "Madhyamik CRP Class IX Tuition Fee For All 7 Sub. 2026-2027" });
        if (!course) throw new Error('Course not found');

        const session = await Session.findOne({ sessionName: "2026-2027" });
        const cls9 = await Class.findOne({ className: "9" });

        const studentData = {
            studentsDetails: [{
                studentName: "SWARNADEEP MANNA",
                dateOfBirth: "2011-04-29",
                gender: "Male",
                centre: "HAZRA H.O",
                board: "WB",
                studentEmail: "sukamalmanna5788@gmail.com",
                mobileNum: "8509019361",
                whatsappNumber: "7908151494",
                schoolName: "MITRA INST.",
                address: ""
            }],
            guardians: [{
                guardianName: "SUKAMAL MANNA", // Guessed from email
                guardianMobile: "8509019361"
            }],
            status: 'Active',
            isEnrolled: true,
            carryForwardBalance: 0,
            createdBy: ADMIN_ID
        };

        const student = new Student(studentData);
        await student.save();
        console.log('Student created:', student._id);

        const totalFeesExcel = 58800;
        const baseFees = totalFeesExcel / 1.18;
        const gstAmount = totalFeesExcel - baseFees;
        const totalFees = totalFeesExcel;

        const downPayment = 15600;
        const remainingAmount = totalFees - downPayment;
        
        // 4800 X 9 installments
        const paymentBreakdown = [];
        const admDate = new Date();
        for (let i = 0; i < 9; i++) {
            const dueDate = new Date(admDate);
            dueDate.setMonth(dueDate.getMonth() + i + 1);
            paymentBreakdown.push({
                installmentNumber: i + 1,
                dueDate: dueDate,
                amount: 4800,
                status: "PENDING"
            });
        }

        const admission = new Admission({
            student: student._id,
            admissionType: "NORMAL",
            admissionNumber: "PATH25024487",
            course: course._id,
            class: cls9 ? cls9._id : course.class,
            department: course.department,
            centre: "HAZRA H.O",
            academicSession: "2026-2027",
            admissionDate: admDate,
            baseFees: parseFloat(baseFees.toFixed(2)),
            cgstAmount: parseFloat((gstAmount / 2).toFixed(2)),
            sgstAmount: parseFloat((gstAmount / 2).toFixed(2)),
            totalFees: totalFees,
            downPayment: downPayment,
            remainingAmount: remainingAmount,
            numberOfInstallments: 9,
            installmentAmount: 4800,
            paymentBreakdown: paymentBreakdown,
            feeStructureSnapshot: course.feesStructure,
            createdBy: ADMIN_ID,
            totalPaidAmount: downPayment,
            paymentStatus: "PARTIAL",
            downPaymentStatus: "PAID",
            downPaymentReceivedDate: admDate,
            downPaymentMethod: "CASH"
        });

        await admission.save();
        console.log('Admission created:', admission._id);

        // Payment record for down payment
        const payment = new Payment({
            admission: admission._id,
            installmentNumber: 0,
            amount: downPayment,
            paidAmount: downPayment,
            dueDate: admDate,
            paidDate: admDate,
            receivedDate: admDate,
            status: "PAID",
            paymentMethod: "CASH",
            remarks: "Initial Admission Payment (Manual Entry)",
            recordedBy: ADMIN_ID,
            totalAmount: downPayment,
            billId: `PATH/${centre.enterCode || 'HAZRA'}/2026-27/MANUAL_${Date.now()}`
        });

        await payment.save();
        console.log('Payment record created:', payment._id);

        await mongoose.disconnect();
        console.log('Done');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

insertStudent();
