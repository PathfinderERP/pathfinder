import mongoose from 'mongoose';

const mongoUrl = "mongodb+srv://pathtex:pathtex@pathtex.ariihtc.mongodb.net/PATHFINDER_NEW";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUrl);
  console.log("Connected successfully!");

  const AdmissionSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    admissionNumber: String,
    admissionStatus: String
  });

  const StudentSchema = new mongoose.Schema({
    studentsDetails: [{
      studentName: String,
      studentEmail: String,
      mobileNum: String
    }],
    status: String
  });

  const Admission = mongoose.model('Admission', AdmissionSchema);
  const Student = mongoose.model('Student', StudentSchema);

  const admissions = await Admission.find().limit(30);
  console.log(`Found ${admissions.length} admissions (showing up to 30):`);
  
  for (const adm of admissions) {
    const student = await Student.findById(adm.student);
    if (student && student.studentsDetails && student.studentsDetails[0]) {
      console.log(`Admission Number: ${adm.admissionNumber}, Email: ${student.studentsDetails[0].studentEmail}, Name: ${student.studentsDetails[0].studentName}`);
    } else {
      console.log(`Admission Number: ${adm.admissionNumber}, Student Details not found`);
    }
  }

  mongoose.connection.close();
}

run().catch(console.error);
