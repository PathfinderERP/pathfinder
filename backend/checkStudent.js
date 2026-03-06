import "dotenv/config";
import connectDB from "./db/connect.js";
import Admission from "./models/Admission/Admission.js";
import Student from "./models/Students.js";
import Course from "./models/Master_data/Courses.js";

const ENROLL = "PATH26001167";

const run = async () => {
    await connectDB();

    const adm = await Admission.findOne({ admissionNumber: ENROLL });
    if (adm) {
        console.log("Admission found:");
        console.log("  _id:", adm._id);
        console.log("  student:", adm.student);
        console.log("  course:", adm.course);
        console.log("  academicSession:", adm.academicSession);
        console.log("  centre:", adm.centre);
        console.log("  paymentStatus:", adm.paymentStatus);

        const stu = await Student.findById(adm.student);
        if (stu) {
            console.log("Student found:");
            console.log("  isEnrolled:", stu.isEnrolled);
            console.log("  status:", stu.status);
            console.log("  name:", stu.studentsDetails?.[0]?.studentName);
        } else {
            console.log("Student NOT found in DB for ID:", adm.student);
        }
    } else {
        console.log("No admission found for:", ENROLL);
    }

    process.exit(0);
};

run().catch(e => { console.error(e); process.exit(1); });
