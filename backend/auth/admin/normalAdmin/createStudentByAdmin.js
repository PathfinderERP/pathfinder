import Student from "../../../models/Students.js";  // Make sure file name matches exactly

export const createStudentByAdmin = async (req, res) => {
  try {
    const {
      studentsDetails,
      guardians,
      examSchema,
      section,
      sessionExamCourse,
      studentStatus,
    } = req.body;

    if (
      !studentsDetails ||
      !Array.isArray(studentsDetails) ||
      studentsDetails.length === 0 ||
      !guardians ||
      !Array.isArray(guardians) ||
      guardians.length === 0 ||
      !examSchema ||
      !Array.isArray(examSchema) ||
      examSchema.length === 0 ||
      !sessionExamCourse ||
      !Array.isArray(sessionExamCourse) ||
      sessionExamCourse.length === 0 ||
      !studentStatus ||
      !Array.isArray(studentStatus) ||
      studentStatus.length === 0
    ) {
      return res.status(400).json({
        message:
          "studentsDetails, guardians, examSchema, and sessionExamCourse are required and must be arrays",
      });
    }

    // Create new student document
    const newStudent = new Student({
      studentsDetails,
      guardians,
      examSchema,
      section: section || [],
      sessionExamCourse,
      studentStatus,
    });

    await newStudent.save();

    return res.status(201).json({
      message: "Student added successfully",
      student: newStudent,
    });
  } catch (error) {
    console.error("Error creating student:", error);
    return res.status(500).json({
      message: "Internal server error while adding student",
    });
  }
};
