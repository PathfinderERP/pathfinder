import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
    departmentName:{
        type:String,
        required:true,
    },
    description:{
        type:String,
    }
});

const Department = new mongoose.model("Department",departmentSchema);
export default Department;
