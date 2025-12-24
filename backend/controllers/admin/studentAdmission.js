import Student from "../../models/Students.js";

export const getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
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
