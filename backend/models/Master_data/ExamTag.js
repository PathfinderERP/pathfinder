import mongoose from "mongoose";

const examTagSchema = new mongoose.Schema({
    name:{
        type:String,
    },
});

const ExamTag = new mongoose.model("ExamTag",examTagSchema);
export default ExamTag;