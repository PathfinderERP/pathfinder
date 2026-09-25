import mongoose from "mongoose";

const accountSchema = new mongoose.Schema({
    accno: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    accname: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["Active", "Deactive", "Inactive"],
        default: "Active"
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

accountSchema.index({ status: 1 });
accountSchema.index({ isActive: 1 });

const Account = mongoose.model("Account", accountSchema);
export default Account;
