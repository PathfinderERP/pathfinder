import mongoose from "mongoose";

const centreSchema = mongoose.Schema({
    centreName: {
        type: String, required: true
    },
    enterCode: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    salesPassword: {
        type: String,
        required: true,
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
    }
});

const CentreSchema = mongoose.model("CentreSchema", centreSchema);
export default CentreSchema;