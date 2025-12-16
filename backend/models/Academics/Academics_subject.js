import mongoose from "mongoose";

const academicsSubjectSchema = new mongoose.Schema({
    subjectName: {
        type: String,
        required: true,
        trim: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicsClass',
        required: true
    }
}, { timestamps: true });

export default mongoose.model("AcademicsSubject", academicsSubjectSchema);
