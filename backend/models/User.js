import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    employeeId:{
        type:String,
        required:true,
    },
    email: {
        type: String,
        required: true,
    },
    mobNum: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['teacher', 'admin', 'superAdmin'],
        default: 'admin', 
        required: true,
    },
    centre:{
        type:String,
        required:true,
    }

},{ timestamps:true });

const User = mongoose.model("User", userSchema);
export default User;
