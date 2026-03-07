import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
  try {
    const mongoUri = process.env.MONGO_URL;
    if (!mongoUri) {
      console.error("❌ MONGO_URL not found in .env");
      process.exit(1);
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection;

    // ── Safety: check if student already exists ─────────────────────────────
    const existingByPhone = await db.collection("students").findOne({
      "studentsDetails.mobileNum": "7407493112"
    });
    if (existingByPhone) {
      console.log("⚠️  Student with mobile 7407493112 already exists:", existingByPhone._id);
      await mongoose.connection.close();
      process.exit(0);
    }

    // ── Find course ──────────────────────────────────────────────────────────
    const course = await db.collection("courses").findOne({
      courseName: { $regex: /Foundation.*Class.*X.*Outstation/i }
    });

    let courseId = null;
    if (course) {
      courseId = course._id;
      console.log("✅ Found course:", course.courseName, "| _id:", courseId);
    } else {
      // Try broader search
      const allCourses = await db.collection("courses")
        .find({ courseName: { $regex: /Foundation/i } })
        .toArray();
      console.log("\n📋 Available Foundation courses:");
      allCourses.forEach(c => console.log("  -", c.courseName, "|", c._id));
    }

    // ── Insert Student ───────────────────────────────────────────────────────
    const studentDoc = {
      studentsDetails: [{
        studentName: "ABHIK SAMANTA",
        centre: "Outstation",
        mobileNum: "7407493112",
        whatsappNumber: "7407493112",
      }],
      guardians: [],
      examSchema: [],
      section: [],
      sessionExamCourse: [{
        session: "2026-2027",
        examTag: "",
        targetExams: "Foundation Class X",
      }],
      batches: [],
      course: courseId,           // null if not found
      isEnrolled: false,
      status: "Active",
      carryForwardBalance: 0,
      markedForCarryForward: false,
      counselledBy: "",
      allocatedItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("students").insertOne(studentDoc);
    console.log("\n✅ Student inserted!");
    console.log("   MongoDB _id :", result.insertedId.toString());
    console.log("   Name        : ABHIK SAMANTA");
    console.log("   Mobile      : 7407493112");
    console.log("   Centre      : Outstation");
    console.log("   Session     : 2026-2027");
    console.log("   Ref No.     : PATH26000008 (user-provided reference)");
    console.log("   Course link :", courseId ? courseId.toString() : "Not linked (course not found)");

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Connection closed.");
    process.exit(0);
  }
};

run();
