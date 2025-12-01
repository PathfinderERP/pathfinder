import mongoose from "mongoose";
import Student from "../Students.js";
import CentreSchema from "../Master_data/Centre.js";

const feeDueList = new mongoose.Schema({
    studentName:{
        type:mongoose.Schema.Types.ObjectId,
        ref:Student
    },
    email:{
        type:String,
    },
    phoneNumber:{
        type:String,
    },
    centre:{
        type:mongoose.Schema.Types.ObjectId,
        ref:CentreSchema,
    },
    amount:{
        type:String,
        required:true,
    },
    dueDate:{
        type:String,
        required:true,
    },
},{timestamps:true},
);

const FeeDueList = new mongoose.model("FeeDueList",feeDueList);
export default FeeDueList;