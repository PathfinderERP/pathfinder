import Student from "../../../models/Students.js";  // Make sure file name matches exactly

export const createStudentByAdmin = async (req, res) => {
  try {
    console.log("📥 Received student registration request");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const {
      studentsDetails,
      guardians,
      examSchema,
      section,
      sessionExamCourse,
      course,
      batches,
      department,
      counselledBy
    } = req.body;

    console.log("Validating required fields...");

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
      !batches ||
      !Array.isArray(batches) ||
      batches.length === 0
    ) {
      console.error("❌ Validation failed: Missing required fields");
      return res.status(400).json({
        message:
          "studentsDetails, guardians, examSchema, sessionExamCourse, and batches are required and must be arrays. At least one batch must be selected.",
      });
    }

    console.log("✅ All required fields validated");
    console.log("Creating student document...");

    // Create new student document
    const newStudent = new Student({
      studentsDetails,
      guardians,
      examSchema,
      section: section || [],
      sessionExamCourse,
      course,
      batches,
      department,
      counselledBy
    });

    console.log("Saving student to database...");
    await newStudent.save();

    console.log("✅ Student saved successfully!");
    return res.status(201).json({
      message: "Student added successfully",
      student: newStudent,
    });
  } catch (error) {
    console.error("❌ Error creating student:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Full error:", error);

    if (error.name === 'ValidationError') {
      console.error("Validation errors details:");
      Object.keys(error.errors).forEach(key => {
        console.error(`  - ${key}: ${error.errors[key].message}`);
      });

      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: "Validation error",
        errors: validationErrors,
        details: error.message
      });
    }

    console.error("Stack trace:", error.stack);
    return res.status(500).json({
      message: "Internal server error while adding student",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
