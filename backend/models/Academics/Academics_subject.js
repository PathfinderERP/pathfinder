import mongoose from "mongoose";

const academicsSubjectSchema = new mongoose.Schema({
    masterSubjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicsClass',
        required: true
    }
}, { timestamps: true });

export default mongoose.model("AcademicsSubject", academicsSubjectSchema);
