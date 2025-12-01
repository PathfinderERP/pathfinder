import mongoose from "mongoose";

const boardsSchema = new mongoose.Schema({
    name:{
        type:String,
    },
});

const Boards = new mongoose.model("Boards",boardsSchema);
export default Boards;