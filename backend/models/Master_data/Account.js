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
    }
}, { timestamps: true });

const Account = mongoose.model("Account", accountSchema);
export default Account;
