import mongoose from "mongoose";


const feesStructureSchema = new mongoose.Schema({
    feesType: { type: String, required: true },
    value: { type: Number, required: true },
    discount: { type: String, required: true },
});

// Course Schema
const courseSchema = new mongoose.Schema({
    courseName: {
        type: String,
        required: true,
    },
    examTag: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExamTag",
        required: true,
    },
    courseDuration: {
        type: String,
        required: true,
    },
    coursePeriod: {
        type: String,
        enum: ["Yearly", "Monthly"],
        required: true,
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: true,
    },
    courseSession: {
        type: String,
        required: true,
    },
    feesStructure: {
        type: [feesStructureSchema],
        required: true,
    },
    mode: {
        type: String,
        enum: ["ONLINE", "OFFLINE"],
        required: true,
    },
    courseType: {
        type: String,
        enum: ["INSTATION", "OUTSTATION"],
        required: true,
    },
    programme: {
        type: String,
        enum: ["CRP", "NCRP"],
        required: true,
    }
}, { timestamps: true });

const Course = mongoose.model("Course", courseSchema);
export default Course;
