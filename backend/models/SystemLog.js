import mongoose from "mongoose";

const systemLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userRole: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true
    },
    module: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    method: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    ip: {
        type: String
    },
    statusCode: {
        type: Number
    },
    device: {
        type: String
    }
}, { timestamps: true });

const SystemLog = mongoose.model("SystemLog", systemLogSchema);
export default SystemLog;
