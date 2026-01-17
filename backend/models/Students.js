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
  dateOfBirth: { type: String, required: false },
  gender: { type: String, required: false },
  centre: { type: String, required: true },
  board: { type: String, required: true },
  state: { type: String, required: true },
  studentEmail: { type: String, required: false },
  mobileNum: { type: String, required: true, match: /^[0-9]{10}$/ },
  whatsappNumber: { type: String, required: true, match: /^[0-9]{10}$/ },
  schoolName: { type: String, required: false },
  pincode: { type: String },
  source: { type: String },
  address: { type: String },
  programme: { type: String, enum: ['CRP', 'NCRP'] },

  guardians: { type: [GuardianSchema] },
  examSchema: { type: [ExamSchema] },
});

const StudentSchema = new mongoose.Schema({
  studentsDetails: { type: [StudentsDetailsSchema], required: true },
  guardians: { type: [GuardianSchema] },
  examSchema: { type: [ExamSchema] },
  section: { type: [SectionSchema], required: false },
  sessionExamCourse: { type: [SessionExamCourseSchema] },
  batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  isEnrolled: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Deactivated'], default: 'Active' },
  deactivationDate: { type: Date },
  carryForwardBalance: { type: Number, default: 0 },
  markedForCarryForward: { type: Boolean, default: false },
  counselledBy: { type: String }
}, { timestamps: true });

const Student = mongoose.model("Student", StudentSchema);

export default Student;
