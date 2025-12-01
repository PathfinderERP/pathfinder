import mongoose from "mongoose";
import CourseSchema from "../Courses.js";
import CentreSchema from "../Master_data/Centre";

const transactionSchema = new mongoose.Schema({
    date:{
        type:String,
        default:Date.now,
    },
    enrollmentNo:{
        type:String,
        required:true,
    },
    receiptNo:{
        type:String,
        required:true,
    },
    studentName:{
        type:String,
        required:true,
    },
    courseName:{
        type:mongoose.Schema.Types.ObjectId,
        ref:CourseSchema,
    },
    transactionType:{
        type:String,
    },
    paymentMethod:{
        type:String,
        required:true,
    },
    centre:{
        type:mongoose.Schema.Types.ObjectId,
        ref:CentreSchema,
    },
    paymentMode:{
        type:String,
        required:true,
    },
    amount:{
        type:String,
        required:true,
    },
    status:{
        type:String,
        required:true,
    },
});

module.exports = new mongoose.model("TransactionSchema",transactionSchema);
