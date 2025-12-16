import mongoose from "mongoose";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
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
import { startPaymentReminderCron } from "./services/cronService.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

connectDB();

// Start automated payment reminder cron jobs
startPaymentReminderCron();

app.get("/", (req, res) => {
    res.send("Backend server is running");
})

//admin routes
app.use("/api/superAdmin", adminRoutes);
app.use("/api/normalAdmin", normalAdmin);
app.use("/api/normalAdmin", studentRoutes);
app.use("/api/course", courseRoutes);

//class routes
app.use("/api/class", classRoutes);

//exam tag routes
app.use("/api/examTag", examTagRoutes);

//department routes
app.use("/api/department", departmentRoutes);

//admission routes
app.use("/api/admission", admissionRoutes);

//payment reminder routes
app.use("/api/payment-reminder", paymentReminderRoutes);

//payment routes
app.use("/api/payment", paymentRoutes);

//centre routes
app.use("/api/centre", centreRoutes);

//profile routes
app.use("/api/profile", profileRoutes);

//lead management routes
app.use("/api/lead-management", leadManagementRoutes);

//source routes
app.use("/api/source", sourceRoutes);

//sales routes
import salesRoutes from "./routes/sales/sales.routes.js";
app.use("/api/sales", salesRoutes);

// Academics Routes
import teacherRoutes from "./routes/Academics/teacher.routes.js";
import academicsClassRoutes from "./routes/Academics/academics_class.routes.js";
import academicsSubjectRoutes from "./routes/Academics/academics_subject.routes.js";
import academicsChapterRoutes from "./routes/Academics/academics_chapter.routes.js";
import academicsTopicRoutes from "./routes/Academics/academics_topic.routes.js";

app.use("/api/academics/teacher", teacherRoutes);
app.use("/api/academics/class", academicsClassRoutes);
app.use("/api/academics/subject", academicsSubjectRoutes);
app.use("/api/academics/chapter", academicsChapterRoutes);
app.use("/api/academics/topic", academicsTopicRoutes);



app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});