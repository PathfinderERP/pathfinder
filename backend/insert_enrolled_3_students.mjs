import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';
import User from './models/User.js';
import Session from './models/Master_data/Session.js';

const STUDENTS_DATA = [
  {
    name: "ANANYA SAHA",
    admissionNumber: "PATH24002575",
    email: "ananyasaha.path24002575@gmail.com",
    mobileNum: "9800242575",
    whatsappNumber: "9800242575",
    courseId: "6985e46bfc0bd6eb8119aeac", // CRP NEET 2Years 2024-2026
    courseSearch: "CRP NEET 2Years 2024-2026",
    centre: "HAZRA H.O",
    session: "2024-2026",
    classId: "6970866aabb4820c05aeca2d", // Class 11
    totalFees: 0
  },
  {
    name: "SPRIHA SAMANTA",
    admissionNumber: "PATH24002583",
    email: "sprihasamanta.path24002583@gmail.com",
    mobileNum: "9800242583",
    whatsappNumber: "9800242583",
    courseId: "6985e46bfc0bd6eb8119aeac", // CRP NEET 2Years 2024-2026
    courseSearch: "CRP NEET 2Years 2024-2026",
    centre: "HAZRA H.O",
    session: "2024-2026",
    classId: "6970866aabb4820c05aeca2d", // Class 11
    totalFees: 0
  },
  {
    name: "ARITRA ROY",
    admissionNumber: "PATH24002600",
    email: "aritraroy.path24002600@gmail.com",
    mobileNum: "9800242600",
    whatsappNumber: "9800242600",
    courseId: "6985e464fc0bd6eb8119add3", // CRP JEE MAINS & ADVANCED+WBJEE 2Years 2024-2026
    courseSearch: "CRP JEE MAINS & ADVANCED+WBJEE 2Years 2024-2026",
    centre: "HAZRA H.O",
    session: "2024-2026",
    classId: "6970866aabb4820c05aeca2d", // Class 11
    totalFees: 0
  }
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB");

    // 1. Ensure 2024-2026 session is globally active so Enrolled Students module fetches and displays it
    const sessionDoc = await Session.findOne({ sessionName: "2024-2026" });
    if (sessionDoc) {
      if (!sessionDoc.isGlobalActive) {
        sessionDoc.isGlobalActive = true;
        await sessionDoc.save();
        console.log("✅ Activated session '2024-2026' (isGlobalActive: true)");
      } else {
        console.log("ℹ️ Session '2024-2026' is already globally active");
      }
    } else {
      console.warn("⚠️ Session '2024-2026' not found in sessions collection");
    }

    // 2. Find admin user for createdBy
    const adminUser = await User.findOne({ role: 'superAdmin' });
    const creatorId = adminUser ? adminUser._id : null;
    console.log("Creator ID:", creatorId, adminUser?.name);

    for (const item of STUDENTS_DATA) {
      console.log(`\n--- Processing ${item.name} (${item.admissionNumber}) ---`);

      // Verify course exists
      let course = await Course.findById(item.courseId);
      if (!course) {
        course = await Course.findOne({ courseName: new RegExp(item.courseSearch, "i") });
      }
      if (!course) {
        throw new Error(`Course not found for: ${item.courseSearch}`);
      }
      console.log(`Found Course: ${course.courseName} (${course._id})`);

      // Clean up previous test/duplicate records with same admissionNumber if any
      const existingAdm = await Admission.findOne({ admissionNumber: item.admissionNumber });
      if (existingAdm) {
        console.log(`Removing existing admission for ${item.admissionNumber}`);
        await Admission.findByIdAndDelete(existingAdm._id);
      }

      // Check student with same email or mobile
      let student = await Student.findOne({
        $or: [
          { "studentsDetails.studentEmail": item.email },
          { "studentsDetails.mobileNum": item.mobileNum }
        ]
      });

      if (!student) {
        student = new Student({
          studentsDetails: [{
            studentName: item.name,
            studentEmail: item.email,
            mobileNum: item.mobileNum,
            whatsappNumber: item.whatsappNumber,
            centre: item.centre,
            programme: course.programme || "CRP"
          }],
          course: course._id,
          department: course.department,
          status: "Active",
          isEnrolled: true
        });
        await student.save();
        console.log(`✅ Created Student: ${student._id}`);
      } else {
        student.studentsDetails[0].studentName = item.name;
        student.studentsDetails[0].studentEmail = item.email;
        student.studentsDetails[0].centre = item.centre;
        student.status = "Active";
        student.isEnrolled = true;
        await student.save();
        console.log(`ℹ️ Updated Student: ${student._id}`);
      }

      // Create Admission
      const now = new Date();
      const admission = new Admission({
        student: student._id,
        admissionType: "NORMAL",
        admissionNumber: item.admissionNumber,
        programme: course.programme || "CRP",
        course: course._id,
        class: course.class || item.classId,
        examTag: course.examTag,
        department: course.department,
        centre: item.centre,
        academicSession: item.session,
        baseFees: 0,
        discountAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        totalFees: 0,
        downPayment: 0,
        downPaymentStatus: "PAID",
        downPaymentMethod: "CASH",
        downPaymentReceivedDate: now,
        remainingAmount: 0,
        numberOfInstallments: 0,
        installmentAmount: 0,
        paymentBreakdown: [],
        paymentStatus: "COMPLETED",
        totalPaidAmount: 0,
        admissionStatus: "ACTIVE",
        admissionDate: now,
        feeStructureSnapshot: course.feesStructure || [],
        remarks: "Enrolled against 0 Rs as requested",
        createdBy: creatorId
      });

      await admission.save();
      console.log(`✅ Created Admission: ${admission.admissionNumber} (_id: ${admission._id})`);
    }

    console.log("\n🎉 All 3 students successfully created and enrolled!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error inserting enrolled students:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

run();
