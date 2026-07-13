import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGO_URL || "mongodb://localhost:27017/pathfinder";

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB");

    const Admission = mongoose.model("Admission", new mongoose.Schema({}, { strict: false }), "admissions");

    // Fetch one admission and check its populated/resolved leadBy
    // Let's log in and query the endpoint directly or query db
    // Let's check getAdmissions logic by running it manually
    const admissions = await Admission.find().populate('student').limit(5).lean();
    
    // Let's simulate the resolution logic in getAdmissions.js
    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");
    const LeadManagement = mongoose.model("LeadManagement", new mongoose.Schema({}, { strict: false }), "leadmanagements");

    const userIds = [];
    admissions.forEach(a => {
        if (a.student) {
            if (a.student.counselledBy && mongoose.Types.ObjectId.isValid(a.student.counselledBy)) {
                userIds.push(a.student.counselledBy);
            }
            if (a.student.leadBy && mongoose.Types.ObjectId.isValid(a.student.leadBy)) {
                userIds.push(a.student.leadBy);
            }
        }
    });

    const users = await User.find({ _id: { $in: userIds } }).select('name role').lean();
    const userMap = {};
    users.forEach(u => {
        userMap[u._id.toString().toLowerCase()] = u;
    });

    for (const admission of admissions) {
        if (!admission.student) continue;

        if (admission.student.counselledBy && mongoose.Types.ObjectId.isValid(admission.student.counselledBy)) {
            const idLower = admission.student.counselledBy.toString().toLowerCase();
            admission.student.counselledBy = userMap[idLower] || admission.student.counselledBy;
        }

        if (admission.student.leadBy && mongoose.Types.ObjectId.isValid(admission.student.leadBy)) {
            const idLower = admission.student.leadBy.toString().toLowerCase();
            admission.student.leadBy = userMap[idLower] || admission.student.leadBy;
        }

        let leadBy = { name: "System", createdAt: admission.createdAt || new Date() };
        let counselledByDetails = {
            name: (admission.student && (admission.student.counselledBy?.name || admission.student.counselledBy)) || "N/A",
            createdAt: (admission.student && admission.student.createdAt) || admission.createdAt || new Date()
        };

        if (admission.student) {
            if (admission.student.leadBy) {
                leadBy = {
                    name: admission.student.leadBy.name || admission.student.leadBy,
                    createdAt: admission.student.createdAt || admission.createdAt
                };
            }
        }

        console.log("Admission ID:", admission._id);
        console.log("Original student.leadBy:", admission.student.leadBy);
        console.log("Resolved leadBy object:", leadBy);
        console.log("Resolved counselledByDetails object:", counselledByDetails);
        console.log("------------------------");
    }

    await mongoose.disconnect();
}

run().catch(console.error);
