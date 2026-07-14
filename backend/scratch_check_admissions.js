import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGO_URL;
if (!mongoUri) {
    console.error("MONGO_URL not found in environment!");
    process.exit(1);
}

async function run() {
    await mongoose.connect(mongoUri);
    console.log("Connected to DB");

    const Dept = mongoose.model("Department", new mongoose.Schema({}, { strict: false }));
    const depts = await Dept.find({});
    console.log("All departments in DB:");
    depts.forEach(d => {
        console.log(`- ${d.departmentName} (${d._id})`);
    });

    const BoardAdmission = mongoose.model("BoardCourseAdmission", new mongoose.Schema({}, { strict: false }));
    const admissions = await BoardAdmission.find({});
    console.log(`\nTotal Board course admissions: ${admissions.length}`);
    let missingDept = 0;
    for (const adm of admissions) {
        if (!adm.department) {
            missingDept++;
            console.log(`Missing dept on BoardAdmission ID: ${adm._id}, Student: ${adm.studentName}`);
        }
    }
    console.log(`Missing dept total: ${missingDept}`);

    const Student = mongoose.model("Student", new mongoose.Schema({}, { strict: false }));
    const studentsWithMissingDept = await Student.find({ department: { $exists: false } });
    console.log(`Students missing department field: ${studentsWithMissingDept.length}`);

    await mongoose.disconnect();
}

run().catch(console.error);
