import mongoose from "mongoose";

const sourceSchema = new mongoose.Schema({
    sourceName:{
        type:String,
        required:true,
    },
    source:{
        type:String,
        required:true,
    },
    subSource:{
        type:String,
        required:true,
    },
    sourceType:{type:String},
});

const Sources = new mongoose.model("Sources",sourceSchema);
export default Sources;
