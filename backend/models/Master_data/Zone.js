import mongoose from "mongoose";

const zoneSchema = new mongoose.Schema({
    slNo: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true
    },
    phNo: {
        type: String,
        required: true,
    },
    zoneHead: {
        type: String,
        required: true,
    },
    salesPassword: {
        type: Boolean,
        default: true,
    },

});

const ZoneSchema = mongoose.model("ZoneLegacy", zoneSchema);
export default ZoneSchema;