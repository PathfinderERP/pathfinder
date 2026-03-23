import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Payment from './models/Payment/Payment.js';
import BoardCourseAdmission from './models/Admission/BoardCourseAdmission.js';

dotenv.config();

const mongoUri = process.env.MONGO_URL;

async function runTest() {
    try {
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");

        const boardAdm = await BoardCourseAdmission.findOne().sort({ createdAt: -1 });
        if (!boardAdm) {
            console.log("No Board Admissions found");
            process.exit(0);
        }
        console.log("Found Board Admission:", boardAdm._id, boardAdm.studentName);

        const pendingCheque = await Payment.findOne({ 
            admission: boardAdm._id, 
            paymentMethod: 'CHEQUE',
            status: 'PENDING_CLEARANCE'
        }).sort({ createdAt: -1 });

        if (!pendingCheque) {
            console.log("No pending cheques found for this admission. Searching for ANY pending board cheque...");
            const anyBoardCheque = await Payment.findOne({
                paymentMethod: 'CHEQUE',
                status: 'PENDING_CLEARANCE'
            }).sort({ createdAt: -1 });
            
            if (anyBoardCheque) {
                console.log("Found pending cheque:", anyBoardCheque._id, "for admission:", anyBoardCheque.admission);
            } else {
                console.log("No pending board cheques found anywhere.");
            }
        } else {
            console.log("Found pending cheque for this admission:", pendingCheque._id);
        }

        process.exit(0);
    } catch (err) {
        console.error("Test Error:", err);
        process.exit(1);
    }
}

runTest();
