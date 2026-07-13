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
    posKey: {
        type: String,
        required: false,
    },
    // New fields from CSV to ensure exact match if needed
    corporateOfficeAddr: { type: String },
    corporateOfficePhoneNo: { type: String },
    gstNo: { type: String },
    locations: [{
        latitude: Number,
        longitude: Number,
        address: String,
        label: String // e.g., "Main Gate", "Back Office"
    }],
    locationAddress: { type: String },
    status: {
        type: String,
        enum: ["active", "deactive"],
        default: "active"
    },
    centreCode: {
        type: String,
        unique: true,
        sparse: true
    }
});

async function getNextCentreCode(model) {
    const centres = await model.find({}, 'centreCode');
    const codes = centres
        .map(c => c.centreCode)
        .filter(code => code && /^\d+$/.test(code))
        .map(code => parseInt(code, 10));
    
    let nextNum = 1;
    if (codes.length > 0) {
        nextNum = Math.max(...codes) + 1;
    }
    
    return nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
}

centreSchema.pre('save', async function () {
    if (!this.centreCode) {
        try {
            this.centreCode = await getNextCentreCode(this.constructor);
        } catch (err) {
            throw err;
        }
    }
});

centreSchema.pre('insertMany', async function (docs) {
    try {
        let nextNum = null;
        for (const doc of docs) {
            if (!doc.centreCode) {
                if (nextNum === null) {
                    const nextCode = await getNextCentreCode(mongoose.model("CentreSchema"));
                    nextNum = parseInt(nextCode, 10);
                } else {
                    nextNum++;
                }
                doc.centreCode = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
            }
        }
    } catch (err) {
        throw err;
    }
});

const CentreSchema = mongoose.model("CentreSchema", centreSchema);
export default CentreSchema;