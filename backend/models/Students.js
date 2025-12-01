import mongoose from "mongoose";


const GuardianSchema = new mongoose.Schema({
  guardianName: { type: String, required: true },
  qualification: { type: String, required: true },
  guardianEmail: { type: String, required: true },
  guardianMobile: { type: String, required: true },
  occupation: { type: String, required: true },
  annualIncome: { type: String, required: true },
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

  guardians: { type: [GuardianSchema], required: true },
  examSchema: { type: [ExamSchema], required: true },
});

const StudentStatusSchema = new mongoose.Schema({
  status:{type:String, enum:["Hot","Cold","Negative"],required:true},
  enrolledStatus:{type:String,enum:["Enrolled","Not Enrolled"],default:"Not Enrolled",required:true},
});

const StudentSchema = new mongoose.Schema({
  studentsDetails: { type: [StudentsDetailsSchema], required: true },
  guardians: { type: [GuardianSchema], required: true },
  examSchema: { type: [ExamSchema], required: true },
  section: { type: [SectionSchema], required: false },
  sessionExamCourse: { type: [SessionExamCourseSchema], required: true },
  studentStatus:{type:[StudentStatusSchema],required:true}
});

const Student = mongoose.model("Student", StudentSchema);

export default Student;
