import mongoose from "mongoose";

const academicsTopicSchema = new mongoose.Schema({
    topicName: {
        type: String,
        required: true,
        trim: true
    },
    chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicsChapter",
        required: true
    }
}, { timestamps: true });

export default mongoose.model("AcademicsTopic", academicsTopicSchema);
