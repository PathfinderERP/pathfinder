import mongoose from "mongoose";


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
  examName: { type: String, required: true },
  class: { type: String, required: true },
  examStatus: { type: String, required: true },
  markAgregate: { type: String, required: true },
  scienceMathParcent: { type: String, required: true },
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
  dateOfBirth: { type: String, required: true },
  gender: { type: String, required: true },
  centre: { type: String, required: true },
  board: { type: String, required: true },
  state: { type: String, required: true },
  studentEmail: { type: String, required: true },
  mobileNum: { type: String, required: true, match: /^[0-9]{10}$/ },
  whatsappNumber: { type: String, required: true, match: /^[0-9]{10}$/ },
  schoolName: { type: String, required: true },
  pincode: { type: String, required: true },
  source: { type: String },
  address: { type: String, required: true },

  guardians: { type: [GuardianSchema] },
  examSchema: { type: [ExamSchema] },
});

const StudentSchema = new mongoose.Schema({
  studentsDetails: { type: [StudentsDetailsSchema], required: true },
  guardians: { type: [GuardianSchema] },
  examSchema: { type: [ExamSchema], required: true },
  section: { type: [SectionSchema], required: false },
  sessionExamCourse: { type: [SessionExamCourseSchema] },
  batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  isEnrolled: { type: Boolean, default: false },
  carryForwardBalance: { type: Number, default: 0 },
  markedForCarryForward: { type: Boolean, default: false }
}, { timestamps: true });

const Student = mongoose.model("Student", StudentSchema);

export default Student;
