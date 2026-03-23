import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUrl = process.env.MONGO_URL;

const BoardCourseAdmission = mongoose.model('BoardCourseAdmission', new mongoose.Schema({
    studentId: mongoose.Schema.Types.ObjectId,
    boardId: mongoose.Schema.Types.ObjectId
}, { strict: false }));

const BoardCourseCounselling = mongoose.model('BoardCourseCounselling', new mongoose.Schema({
    studentId: mongoose.Schema.Types.ObjectId,
    boardId: mongoose.Schema.Types.ObjectId,
    status: String
}, { strict: false }));

async function syncCounselling() {
    try {
        await mongoose.connect(mongoUrl);
        console.log("Connected to MongoDB");

        // Find all active/completed board admissions
        const admissions = await BoardCourseAdmission.find({});
        console.log(`Found ${admissions.length} board admissions.`);

        let updatedCount = 0;
        for (const admission of admissions) {
            const result = await BoardCourseCounselling.updateMany(
                { 
                    studentId: admission.studentId, 
                    boardId: admission.boardId,
                    status: { $ne: "ENROLLED" }
                },
                { $set: { status: "ENROLLED" } }
            );
            updatedCount += result.modifiedCount;
        }

        console.log(`Successfully updated ${updatedCount} counselling records to ENROLLED.`);

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

syncCounselling();
