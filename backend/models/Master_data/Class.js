import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
});

const Class = new mongoose.model("Class",classSchema);
export default Class;