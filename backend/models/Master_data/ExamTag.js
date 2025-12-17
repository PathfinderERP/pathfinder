import mongoose from "mongoose";

const examTagSchema = new mongoose.Schema({
    name: {
        type: String,
    },
});

const ExamTag = mongoose.model("ExamTag", examTagSchema);
export default ExamTag;