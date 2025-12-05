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

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});