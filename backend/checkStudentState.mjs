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

    const admissionsCollection = mongoose.connection.collection("admissions");

    // Find latest admission number for 2026
    const latest = await admissionsCollection
      .find({ admissionNumber: { $regex: /^PATH26/ } })
      .sort({ admissionNumber: -1 })
      .limit(5)
      .toArray();

    console.log("\n📋 Latest PATH26 admission numbers:");
    latest.forEach(a => {
      console.log(`   ${a.admissionNumber}`);
    });

    // Also check students with name ABHIK SAMANTA
    const studentsCollection = mongoose.connection.collection("students");
    const existing = await studentsCollection.find({
      "studentsDetails.studentName": { $regex: /ABHIK SAMANTA/i }
    }).toArray();

    console.log("\n🔍 Existing students named ABHIK SAMANTA:", existing.length);
    existing.forEach(s => {
      console.log(`   ID: ${s._id} | Name: ${s.studentsDetails[0]?.studentName} | Mobile: ${s.studentsDetails[0]?.mobileNum}`);
    });

    // Check by phone number
    const byPhone = await studentsCollection.find({
      "studentsDetails.mobileNum": "7407493112"
    }).toArray();

    console.log("\n🔍 Students with mobile 7407493112:", byPhone.length);
    byPhone.forEach(s => {
      console.log(`   ID: ${s._id} | Name: ${s.studentsDetails[0]?.studentName} | Mobile: ${s.studentsDetails[0]?.mobileNum}`);
    });

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Connection closed.");
    process.exit(0);
  }
};

run();
