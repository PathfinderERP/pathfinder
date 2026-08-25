import mongoose from "mongoose";
import Student from "../../models/Students.js";
import User from "../../models/User.js";

export const getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid student ID format" });
    }

    let student = await Student.findById(studentId).lean();

    if (!student) {
      const [PNTSEStudent, PMOStudent] = await Promise.all([
        import("../../models/PNTSEStudent.js").then(m => m.default),
        import("../../models/PMOStudent.js").then(m => m.default)
      ]);
      const [pntse, pmo] = await Promise.all([
        PNTSEStudent.findById(studentId).populate('centre', 'centreName').populate('class', 'name').lean(),
        PMOStudent.findById(studentId).populate('centre', 'centreName').populate('class', 'name').lean()
      ]);
      const doc = pntse || pmo;
      if (doc) {
        student = {
          _id: doc._id,
          studentsDetails: [{
            studentName: doc.name,
            mobileNum: doc.mobile,
            whatsappNumber: doc.secondaryMobile || doc.mobile,
            studentEmail: doc.email || "",
            centre: doc.centre?.centreName || (typeof doc.centre === 'string' ? doc.centre : ""),
            class: doc.class?.name || (typeof doc.class === 'string' ? doc.class : ""),
            gender: doc.gender || "",
            dob: doc.dob || "",
            address: doc.address || "",
            state: doc.state || "",
            city: doc.city || "",
            pincode: doc.pincode || ""
          }],
          examSchema: [{
            class: doc.class?.name || ""
          }],
          carryForwardBalance: 0
        };
      }
    }

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Resolve counselledBy if it's an ObjectID
    if (student.counselledBy && mongoose.Types.ObjectId.isValid(student.counselledBy)) {
      const user = await User.findById(student.counselledBy).select('name');
      if (user) {
        student.counselledBy = user.name;
      }
    }

    res.status(200).json(student);
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ message: "Server error while fetching student" });
  }
};

export const admitStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { admissionDate, batchName, feeAmount, paymentMode, receiptNumber, remarks } = req.body;

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Update student status to Enrolled
    student.isEnrolled = true;

    // You can add admission details to a separate collection or add to student document
    // For now, we'll just update the enrollment status
    await student.save();

    res.status(200).json({
      message: "Student admitted successfully",
      student
    });
  } catch (error) {
    console.error("Error admitting student:", error);
    res.status(500).json({ message: "Server error while admitting student" });
  }
};
