import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function inspect() {
    await mongoose.connect(process.env.MONGO_URL);
    const db = mongoose.connection.db;
    const admissionNo = 'PATH26002111';

    // 1. Admission
    const adm = await db.collection('admissions').findOne({ admissionNumber: admissionNo });
    console.log('ADMISSION found?', !!adm);
    if (adm) {
        console.log('ADMISSION:', JSON.stringify({
            _id: adm._id,
            student: adm.student,
            admissionNumber: adm.admissionNumber,
            academicSession: adm.academicSession,
            paymentStatus: adm.paymentStatus,
            totalPaidAmount: adm.totalPaidAmount,
            totalFees: adm.totalFees,
            paymentBreakdown: adm.paymentBreakdown,
            monthlySubjectHistory: adm.monthlySubjectHistory
        }, null, 2));
    }

    // 2. Board Course Admission
    const bAdm = await db.collection('boardcourseadmissions').findOne({ admissionNumber: admissionNo });
    console.log('BOARD ADMISSION found?', !!bAdm);
    if (bAdm) {
        console.log('BOARD ADMISSION:', JSON.stringify({
            _id: bAdm._id,
            studentId: bAdm.studentId,
            studentName: bAdm.studentName,
            admissionNumber: bAdm.admissionNumber,
            installments: bAdm.installments,
            monthlyHistory: bAdm.monthlyHistory,
            paymentStatus: bAdm.paymentStatus,
            keys: Object.keys(bAdm)
        }, null, 2));
    }

    // 3. Student
    const student = await db.collection('students').findOne({
        $or: [
            { enrollmentNo: admissionNo },
            { admissionNumber: admissionNo },
            ...(adm?.student ? [{ _id: adm.student }] : []),
            ...(bAdm?.studentId ? [{ _id: bAdm.studentId }] : [])
        ]
    });
    console.log('STUDENT found?', !!student);
    if (student) {
        console.log('STUDENT info:', JSON.stringify({
            _id: student._id,
            enrollmentNo: student.enrollmentNo,
            admissionNumber: student.admissionNumber,
            name: student.studentsDetails?.[0]?.studentName,
            phone: student.studentsDetails?.[0]?.mobileNum,
            monthlyHistory: student.monthlyHistory,
            examSchema: student.examSchema,
            keys: Object.keys(student)
        }, null, 2));
    }

    // 4. Any other collections with PATH26002111 or student._id
    const sId = student?._id;
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
        const cname = col.name;
        if (['admissions', 'boardcourseadmissions', 'students', 'leadmanagements'].includes(cname)) continue;
        const count = await db.collection(cname).countDocuments({
            $or: [
                { admissionNumber: admissionNo },
                { enrollmentNo: admissionNo },
                ...(sId ? [{ student: sId }, { studentId: sId }] : [])
            ]
        });
        if (count > 0) {
            console.log(`Found ${count} documents in collection: ${cname}`);
            const docs = await db.collection(cname).find({
                $or: [
                    { admissionNumber: admissionNo },
                    { enrollmentNo: admissionNo },
                    ...(sId ? [{ student: sId }, { studentId: sId }] : [])
                ]
            }).limit(3).toArray();
            console.log(JSON.stringify(docs, null, 2));
        }
    }

    await mongoose.disconnect();
}
inspect();
