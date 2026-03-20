import mongoose from "mongoose";

const boardCourseCounsellingSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },
    studentName: {
        type: String,
        required: true
    },
    mobileNum: {
        type: String,
        required: true
    },
    boardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Boards",
        required: true
    },
    centre: {
        type: String,
        required: true
    },
    programme: {
        type: String,
        enum: ['CRP', 'NCRP']
    },
    lastClass: {
        type: String,
        required: true
    },
    selectedSubjects: [{
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject"
        }
    }],
    remarks: {
        type: String
    },
    status: {
        type: String,
        enum: ["PENDING", "ENROLLED"],
        default: "PENDING"
    },
    counselledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    counselledDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const BoardCourseCounselling = mongoose.model("BoardCourseCounselling", boardCourseCounsellingSchema);
export default BoardCourseCounselling;
