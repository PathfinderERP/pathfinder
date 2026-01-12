import mongoose from "mongoose";

const centreSchema = mongoose.Schema({
    centreName: {
        type: String, required: false
    },
    enterCode: {
        type: String,
        required: false,
    },
    state: {
        type: String,
        required: false,
    },
    email: {
        type: String,
        required: false,
    },
    phoneNumber: {
        type: String,
        required: false,
    },
    salesPassword: {
        type: String,
        required: false,
    },
    location: {
        type: String,
    },
    address: {
        type: String,
    },
    locationPreview: {
        type: String,
    },
    enterGstNo: {
        type: String,
    },
    enterCorporateOfficeAddress: {
        type: String,
    },
    enterCorporateOfficePhoneNumber: {
        type: String
    },
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
    },
    accountNumber: {
        type: String,
    },
    // New fields from CSV to ensure exact match if needed
    corporateOfficeAddr: { type: String },
    corporateOfficePhoneNo: { type: String },
    gstNo: { type: String },
    locationAddress: { type: String }
});

const CentreSchema = mongoose.model("CentreSchema", centreSchema);
export default CentreSchema;