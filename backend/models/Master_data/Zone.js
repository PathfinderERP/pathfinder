import mongoose from "mongoose";

const zoneSchema = new mongoose.model({
    slNo:{
        type:Number,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true
    },
    phNo:{
        type:String,
        required:true,
    },
    zoneHead:{
        type:String,
        required:true,
    },
    salesPassword:{
        type:Boolean,
        default:true,
    },

});

const ZoneSchema = new mongoose.model("ZoneSchema",zoneSchema);
export default ZoneSchema;