import mongoose from "mongoose";

const salaryStructureSchema = new mongoose.Schema({
    effectiveDate: { type: Date, required: true },
    amount: { type: Number, required: true }
}, { _id: false });

const employeeSchema = new mongoose.Schema({
    // Auto-generated Employee ID
    employeeId: {
        type: String,
        unique: true,
        required: true
    },

    // Personal Details
    name: {
        type: String,
        required: true,
        trim: true
    },
    spouseName: {
        type: String,
        trim: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        required: true
    },
    children: [{
        name: { type: String },
        age: { type: Number }
    }],
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    whatsappNumber: {
        type: String
    },
    alternativeNumber: {
        type: String
    },

    // Official Details
    dateOfJoining: {
        type: Date,
        required: true
    },
    primaryCentre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Centre",
        required: true
    },
    centres: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Centre"
    }],
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: true
    },
    designation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Designation",
        required: true
    },
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee"
    },
    state: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    pinCode: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    aadharNumber: {
        type: String,
        trim: true
    },
    panNumber: {
        type: String,
        trim: true,
        uppercase: true
    },

    // File Uploads (Cloudflare R2 URLs)
    aadharProof: {
        type: String
    },
    panProof: {
        type: String
    },

    // Work Details
    typeOfEmployment: {
        type: String,
        enum: ["Full-time", "Part-time", "Contract", "Intern"],
        required: true
    },
    workingHours: {
        type: Number,
        default: 0
    },
    workingDays: {
        sunday: { type: Boolean, default: false },
        monday: { type: Boolean, default: false },
        tuesday: { type: Boolean, default: false },
        wednesday: { type: Boolean, default: false },
        thursday: { type: Boolean, default: false },
        friday: { type: Boolean, default: false },
        saturday: { type: Boolean, default: false }
    },
    probationPeriod: {
        type: Boolean,
        default: false
    },
    salaryStructure: [salaryStructureSchema],
    currentSalary: {
        type: Number,
        default: 0
    },

    // Bank Details
    bankName: {
        type: String,
        trim: true
    },
    branchName: {
        type: String,
        trim: true
    },
    accountNumber: {
        type: String,
        trim: true
    },
    ifscCode: {
        type: String,
        trim: true,
        uppercase: true
    },
    bankStatement: {
        type: String // Cloudflare R2 URL
    },

    // Educational Qualifications (File Uploads)
    educationalQualification1: {
        type: String // Cloudflare R2 URL
    },
    educationalQualification2: {
        type: String // Cloudflare R2 URL
    },
    educationalQualification3: {
        type: String // Cloudflare R2 URL
    },

    // Other Documents
    form16: {
        type: String // Cloudflare R2 URL
    },
    insuranceDocument: {
        type: String // Cloudflare R2 URL
    },
    tdsCertificate: {
        type: String // Cloudflare R2 URL
    },
    profileImage: {
        type: String // Cloudflare R2 URL
    },

    // Status
    status: {
        type: String,
        enum: ["Active", "Inactive", "Resigned", "Terminated"],
        default: "Active"
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true
});

// Auto-generate Employee ID before validation
employeeSchema.pre("validate", async function () {
    if (!this.employeeId) {
        const count = await mongoose.model("Employee").countDocuments();
        this.employeeId = `EMP${String(count + 1).padStart(7, "0")}`;
    }
});

// Update currentSalary when salary structure changes
employeeSchema.pre("save", function (next) {
    if (this.salaryStructure && this.salaryStructure.length > 0) {
        // Sort by effectiveDate descending and get the latest
        const sortedSalaries = this.salaryStructure.sort((a, b) => b.effectiveDate - a.effectiveDate);
        this.currentSalary = sortedSalaries[0].amount;
    }
    next();
});

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
