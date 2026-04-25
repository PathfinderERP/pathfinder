
import mongoose from 'mongoose';
import Student from './backend/models/Students.js';
import BoardCourseAdmission from './backend/models/Admission/BoardCourseAdmission.js';
import Payment from './backend/models/Payment/Payment.js';

const MONGO_URI = 'mongodb://localhost:27017/pathfinder'; // Adjust if needed

async function checkStudents() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const targetIds = ["PATH26002639", "PATH26002638", "PATH26002636"];
        
        // Find students
        // Note: In this system, enrollment number might be in studentsDetails.studentId or similar
        // Let's search by studentsDetails.uid or studentsDetails.enrollmentNo if they exist
        // Or just search all students and filter by regex if needed
        
        const students = await Student.find({
            $or: [
                { "studentsDetails.studentId": { $in: targetIds } },
                { "studentsDetails.enrollmentNo": { $in: targetIds } },
                { "studentId": { $in: targetIds } } // Some models use studentId as a string field
            ]
        }).lean();

        console.log(`Found ${students.length} students.`);

        for (const student of students) {
            console.log(`--- Student: ${student.studentsDetails?.[0]?.studentName} (${targetIds.find(id => JSON.stringify(student).includes(id))}) ---`);
            
            // Check Board Admissions
            const admissions = await BoardCourseAdmission.find({ studentId: student._id }).lean();
            console.log(`  Admissions found: ${admissions.length}`);

            for (const adm of admissions) {
                console.log(`    Admission ID: ${adm._id}, Programme: ${adm.programme}, Total Expected: ${adm.totalExpectedAmount}`);
                
                // Check Payments
                const payments = await Payment.find({ 
                    $or: [
                        { admissionId: adm._id },
                        { studentId: student._id }
                    ]
                }).sort({ createdAt: 1 }).lean();
                
                console.log(`    Payments found: ${payments.length}`);
                for (const p of payments) {
                    console.log(`      Payment ID: ${p._id}, Bill ID: ${p.billId || 'MISSING'}, Amount: ${p.amount}, Type: ${p.paymentType}`);
                }
            }
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkStudents();
