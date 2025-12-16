import mongoose from "mongoose";

const academicsChapterSchema = new mongoose.Schema({
    chapterName: {
        type: String,
        required: true,
        trim: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicsSubject",
        required: true
    }
}, { timestamps: true });

export default mongoose.model("AcademicsChapter", academicsChapterSchema);
