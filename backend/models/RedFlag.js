import mongoose from "mongoose";

const redFlagSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    role: { 
        type: String, 
        required: true 
    },
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CentreSchema'
    },
    type: { 
        type: String, 
        required: true 
    }, // 'calls', 'admission', 'review_note', 'intervention', 'class_end', 'attendance', 'duty_hours'
    severity: { 
        type: String, 
        enum: ['Critical', 'High', 'Medium', 'Low'], 
        default: 'High' 
    },
    issue: { 
        type: String, 
        required: true 
    },
    whatWentWrong: { 
        type: String 
    },
    businessImpact: { 
        type: String 
    },
    recoveryAction: { 
        type: String 
    },
    owner: { 
        type: String 
    },
    escalation: { 
        type: String 
    },
    repeatCount: { 
        type: Number, 
        default: 1 
    },
    dueDate: { 
        type: Date 
    },
    isResolved: { 
        type: Boolean, 
        default: false 
    },
    resolvedAt: { 
        type: Date 
    },
    resolvedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    metricValue: {
        type: Number
    },
    targetValue: {
        type: Number
    }
}, { timestamps: true });

const RedFlag = mongoose.model("RedFlag", redFlagSchema);
export default RedFlag;
