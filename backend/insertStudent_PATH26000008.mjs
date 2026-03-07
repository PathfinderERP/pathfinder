import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// ─── Inline Schemas (to avoid import chain issues) ───────────────────────────

const GuardianSchema = new mongoose.Schema({
  guardianName: { type: String },
  qualification: { type: String },
  guardianEmail: { type: String },
  guardianMobile: { type: String },
  occupation: { type: String },
  annualIncome: { type: String },
  organizationName: { type: String },
  designation: { type: String },
  officeAddress: { type: String },
});

const ExamSchema = new mongoose.Schema({
  examName: { type: String },
  class: { type: String },
  examStatus: { type: String },
  markAgregate: { type: String },
  scienceMathParcent: { type: String },
});

const SectionSchema = new mongoose.Schema({
  type: { type: String, required: true },
});

const SessionExamCourseSchema = new mongoose.Schema({
  session: { type: String },
  examTag: { type: String },
  targetExams: { type: String },
});

const StudentsDetailsSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  dateOfBirth: { type: String },
  gender: { type: String },
  centre: { type: String, required: true },
  board: { type: String },
  state: { type: String },
  studentEmail: { type: String },
  mobileNum: { type: String, required: true },
  whatsappNumber: { type: String, required: true },
  schoolName: { type: String },
  pincode: { type: String },
  source: { type: String },
  address: { type: String },
  programme: { type: String },
  guardians: { type: [GuardianSchema] },
  examSchema: { type: [ExamSchema] },
});

const StudentSchema = new mongoose.Schema({
  studentsDetails: { type: [StudentsDetailsSchema], required: true },
  guardians: { type: [GuardianSchema] },
  examSchema: { type: [ExamSchema] },
  section: { type: [SectionSchema] },
  sessionExamCourse: { type: [SessionExamCourseSchema] },
  batches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Batch" }],
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  isEnrolled: { type: Boolean, default: false },
  status: { type: String, enum: ["Active", "Deactivated"], default: "Active" },
  deactivationDate: { type: Date },
  carryForwardBalance: { type: Number, default: 0 },
  markedForCarryForward: { type: Boolean, default: false },
  counselledBy: { type: String },
  allocatedItems: [
    {
      itemName: String,
      quantity: { type: Number, default: 1 },
      allocationDate: { type: Date, default: Date.now },
      allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  ],
}, { timestamps: true });

// ─── Admission Schema (shortened for admissionNumber generation) ──────────────

const paymentBreakdownSchema = new mongoose.Schema({
  installmentNumber: { type: Number },
  dueDate: { type: Date },
  amount: { type: Number },
  status: { type: String, default: "PENDING" },
  paidDate: { type: Date },
  receivedDate: { type: Date },
  paidAmount: { type: Number, default: 0 },
  paymentMethod: { type: String },
  transactionId: { type: String },
  accountHolderName: { type: String },
  chequeDate: { type: Date },
  remarks: { type: String },
});

const admissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  admissionType: { type: String, default: "NORMAL" },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  class: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
  examTag: { type: mongoose.Schema.Types.ObjectId, ref: "ExamTag" },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  centre: { type: String, required: true },
  board: { type: mongoose.Schema.Types.ObjectId, ref: "Boards" },
  selectedSubjects: [{ subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" }, name: String, price: Number }],
  billingMonth: { type: String },
  monthlySubjectHistory: [mongoose.Schema.Types.Mixed],
  courseDurationMonths: { type: Number },
  boardCourseName: { type: String },
  admissionDate: { type: Date, default: Date.now },
  admissionNumber: { type: String },
  academicSession: { type: String, required: true },
  studentImage: { type: String, default: null },
  previousBalance: { type: Number, default: 0 },
  baseFees: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  cgstAmount: { type: Number, required: true, default: 0 },
  sgstAmount: { type: Number, required: true, default: 0 },
  totalFees: { type: Number, required: true },
  downPayment: { type: Number, required: true },
  downPaymentStatus: { type: String, default: "PAID" },
  downPaymentReceivedDate: { type: Date },
  downPaymentMethod: { type: String, default: "CASH" },
  downPaymentTransactionId: { type: String },
  downPaymentAccountHolderName: { type: String },
  downPaymentChequeDate: { type: Date },
  remainingAmount: { type: Number, required: true },
  numberOfInstallments: { type: Number, required: true },
  installmentAmount: { type: Number, required: true },
  paymentBreakdown: [paymentBreakdownSchema],
  feeStructureSnapshot: [{ feesType: String, value: Number, discount: String }],
  paymentStatus: { type: String, default: "PENDING" },
  totalPaidAmount: { type: Number, default: 0 },
  admissionStatus: { type: String, default: "ACTIVE" },
  remarks: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  sectionAllotment: {
    examSection: { type: String, default: null },
    studySection: { type: String, default: null },
    omrCode: { type: String, default: null },
    rm: { type: String, default: null },
  },
}, { timestamps: true });

// ─── Main Script ──────────────────────────────────────────────────────────────

const run = async () => {
  try {
    const mongoUri = process.env.MONGO_URL;
    if (!mongoUri) {
      console.error("❌ MONGO_URL not found in .env");
      process.exit(1);
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    console.log("✅ Connected to MongoDB");

    const Student = mongoose.model("Student", StudentSchema);
    const Admission = mongoose.model("Admission", admissionSchema);

    // ── Step 1: Check if student already exists ────────────────────────────
    const existing = await Admission.findOne({ admissionNumber: "PATH26000008" });
    if (existing) {
      console.log("⚠️  Admission PATH26000008 already exists. Aborting to prevent duplicates.");
      const s = await Student.findById(existing.student);
      if (s) {
        console.log("   Student:", s.studentsDetails[0]?.studentName, "| ID:", s._id);
      }
      await mongoose.connection.close();
      process.exit(0);
    }

    // ── Step 2: Look up the Course "Foundation Class X (Outstation) 2026-2027" ──
    const courseCollection = mongoose.connection.collection("courses");
    const course = await courseCollection.findOne({
      courseName: { $regex: /Foundation Class X.*Outstation/i }
    });

    if (course) {
      console.log("✅ Found course:", course.courseName, "| ID:", course._id);
    } else {
      console.log("⚠️  Course 'Foundation Class X (Outstation)' not found. Will insert student without course link.");
    }

    // ── Step 3: Create Student record ─────────────────────────────────────
    const studentData = {
      studentsDetails: [{
        studentName: "ABHIK SAMANTA",
        centre: "Outstation",
        mobileNum: "7407493112",
        whatsappNumber: "7407493112",
      }],
      isEnrolled: false,
      status: "Active",
      carryForwardBalance: 0,
      markedForCarryForward: false,
      sessionExamCourse: [{
        session: "2026-2027",
        examTag: "",
        targetExams: "Foundation Class X",
      }],
    };

    if (course) {
      studentData.course = course._id;
    }

    const student = new Student(studentData);
    await student.save();
    console.log("✅ Student created:", student._id);

    // ── Step 4: Create Admission record with forced admissionNumber ────────
    const admissionData = {
      student: student._id,
      admissionType: "NORMAL",
      centre: "Outstation",
      academicSession: "2026-2027",
      admissionNumber: "PATH26000008",
      baseFees: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      totalFees: 0,
      downPayment: 0,
      remainingAmount: 0,
      numberOfInstallments: 0,
      installmentAmount: 0,
      paymentStatus: "PENDING",
      totalPaidAmount: 0,
      admissionStatus: "ACTIVE",
      remarks: "Manually inserted — Foundation Class X (Outstation) 2026-2027",
    };

    if (course) {
      admissionData.course = course._id;
    }

    const admission = new Admission(admissionData);
    await admission.save();
    console.log("✅ Admission created:", admission._id);
    console.log("   Admission Number:", admission.admissionNumber);

    // ── Step 5: Mark student as enrolled ──────────────────────────────────
    await Student.findByIdAndUpdate(student._id, { isEnrolled: true });
    console.log("✅ Student marked as enrolled");

    console.log("\n🎉 Done! Summary:");
    console.log("   Student Name    : ABHIK SAMANTA");
    console.log("   Mobile          : 7407493112");
    console.log("   Centre          : Outstation");
    console.log("   Session         : 2026-2027");
    console.log("   Admission No.   : PATH26000008");
    console.log("   Student DB ID   :", student._id.toString());
    console.log("   Admission DB ID :", admission._id.toString());

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Connection closed.");
    process.exit(0);
  }
};

run();
