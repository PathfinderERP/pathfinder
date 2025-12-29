import mongoose from "mongoose";
import express from "express";
// Force restart timestamp: 2025-12-29
import dotenv from "dotenv";
import cors from "cors";
import protect from "./middleware/authMiddleware.js"; // Direct import
import connectDB from "./db/connect.js";
import adminRoutes from "./routes/superAdmin/superAdminControllers.routes.js";
import normalAdmin from "./routes/admin/createStudentByAdmin.routes.js";
import studentRoutes from "./routes/admin/students.routes.js";
import courseRoutes from "./routes/course/course.routes.js";
import classRoutes from "./routes/class/class.routes.js";
import examTagRoutes from "./routes/examTag/examTag.routes.js";
import departmentRoutes from "./routes/department/department.routes.js";
import admissionRoutes from "./routes/Admission/admission.routes.js";
import paymentReminderRoutes from "./routes/payment/paymentReminder.routes.js";
import paymentRoutes from "./routes/payment/payment.routes.js";
import centreRoutes from "./routes/centre/centre.routes.js";
import profileRoutes from "./routes/profile/profile.routes.js";
import leadManagementRoutes from "./routes/leadManagement/leadManagement.routes.js";
import sourceRoutes from "./routes/source/source.routes.js";
import batchRoutes from "./routes/batch/batch.routes.js";
import sessionRoutes from "./routes/session/session.routes.js";
import scriptRoutes from "./routes/script/script.routes.js";
import salesRoutes from "./routes/sales/sales.routes.js";
import teacherRoutes from "./routes/Academics/teacher.routes.js";
import academicsClassRoutes from "./routes/Academics/academics_class.routes.js";
import academicsSubjectRoutes from "./routes/Academics/academics_subject.routes.js";
import academicsChapterRoutes from "./routes/Academics/academics_chapter.routes.js";
import academicsTopicRoutes from "./routes/Academics/academics_topic.routes.js";
import classScheduleRoutes from "./routes/Academics/classSchedule.routes.js";
import rmRoutes from "./routes/Academics/rm.routes.js";
import hodRoutes from "./routes/Academics/hod.routes.js";
import employeeRoutes from "./routes/HR/employee.routes.js";
import letterRoutes from "./routes/HR/letter.routes.js";
import designationRoutes from "./routes/designation/designation.routes.js";
import attendanceRoutes from "./routes/Attendance/attendance.routes.js";
import employeeAttendanceRoutes from "./routes/Attendance/employeeAttendance.routes.js";
import trainingRoutes from "./routes/HR/trainingRoutes.js";
import resignationRoutes from "./routes/HR/resignation.routes.js";
import documentRoutes from "./routes/HR/documentRoutes.js";
import birthdayRoutes from "./routes/HR/birthday.routes.js";
import feedbackRoutes from "./routes/HR/feedbackRoutes.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { startPaymentReminderCron } from "./services/cronService.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

connectDB();

// Start automated payment reminder cron jobs
// Start automated payment reminder cron jobs
startPaymentReminderCron();

// --- EMERGENCY DIRECT ROUTES REMOVED ---
// Routes are handled via normal routing middleware below
// -------------------------------

app.get("/", (req, res) => {
    res.send("Backend server is running");
});

// admin routes
app.use("/api/superAdmin", adminRoutes);
app.use("/api/normalAdmin", normalAdmin);
app.use("/api/normalAdmin", studentRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/class", classRoutes);
app.use("/api/examTag", examTagRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/admission", admissionRoutes);
app.use("/api/payment-reminder", paymentReminderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/centre", centreRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/lead-management", leadManagementRoutes);
app.use("/api/source", sourceRoutes);
app.use("/api/batch", batchRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/script", scriptRoutes);
app.use("/api/sales", salesRoutes);

// Academics Routes
app.use("/api/academics/teacher", teacherRoutes);
app.use("/api/academics/class-schedule", classScheduleRoutes);
app.use("/api/academics/class", academicsClassRoutes);
app.use("/api/academics/subject", academicsSubjectRoutes);
app.use("/api/academics/chapter", academicsChapterRoutes);
app.use("/api/academics/topic", academicsTopicRoutes);
app.use("/api/academics/rm", rmRoutes);
app.use("/api/academics/hod", hodRoutes);

// HR Routes
// Moved to top and logged to ensure loading
console.log("Mounting Document Routes...");
app.use("/api/hr/documents", documentRoutes);
app.use("/api/hr/employee", employeeRoutes);
app.use("/api/hr/letters", letterRoutes);
app.use("/api/hr/attendance", attendanceRoutes);
app.use("/api/hr/employee-attendance", employeeAttendanceRoutes);
app.use("/api/hr/training", trainingRoutes);
app.use("/api/hr/resignation", resignationRoutes);
app.use("/api/hr/birthdays", birthdayRoutes);
app.use("/api/hr/feedback", feedbackRoutes);


// Master Data Routes
app.use("/api/designation", designationRoutes);


app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
