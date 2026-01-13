import mongoose from "mongoose";

const employeeAttendanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    centreId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    checkIn: {
        time: { type: Date },
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String }
    },
    checkOut: {
        time: { type: Date },
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String }
    },
    status: {
        type: String,
        enum: ["Present", "Absent", "Late", "Half Day", "Holiday", "Week Off", "Early Leave", "Overtime", "Forgot to Checkout"],
        default: "Present"
    },
    isHoliday: {
        type: Boolean,
        default: false
    },
    holidayName: {
        type: String
    },
    workingHours: {
        type: Number,
        default: 0
    },
    remarks: {
        type: String
    }
}, {
    timestamps: true
});

// Index for faster searching by date and user
employeeAttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

const EmployeeAttendance = mongoose.model("EmployeeAttendance", employeeAttendanceSchema);

export default EmployeeAttendance;
