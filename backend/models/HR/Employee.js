import mongoose from "mongoose";

const salaryStructureSchema = new mongoose.Schema({
    effectiveDate: { type: Date, required: false },
    amount: { type: Number, required: false }, // This will store the Net Salary as per user request
    basic: { type: Number, default: 0 },
    conveyance: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    cca: { type: Number, default: 0 },
    adjustment: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    pTax: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    lossOfPay: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 }
}, { _id: false });

const employeeSchema = new mongoose.Schema({
    // Auto-generated Employee ID
    employeeId: {
        type: String,
        unique: true,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        unique: true
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
        required: false
    },
    gender: {
        type: String,
        required: false
    },
    bloodGroup: {
        type: String,
        trim: true
    },
    children: [{
        name: { type: String },
        age: { type: Number }
    }],
    email: {
        type: String,
        required: false,
        unique: true,
        lowercase: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: false
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
        required: false
    },
    primaryCentre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: false
    },
    centres: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema"
    }],
    centerArray: [{
        type: String
    }],
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: false
    },
    designation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Designation",
        required: false
    },
    grade: {
        type: String,
        trim: true
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
        required: false
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
    workingDaysList: [{
        type: String
    }],
    probationPeriod: {
        type: Boolean,
        default: false
    },
    salaryStructure: [salaryStructureSchema],
    currentSalary: {
        type: Number,
        default: 0
    },
    specialAllowance: {
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

    // Letters History
    letters: [{
        letterType: { type: String, required: true },
        fileName: { type: String, required: true },
        fileUrl: { type: String, required: true },
        generatedAt: { type: Date, default: Date.now }
    }],

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
        try {
            const count = await this.constructor.countDocuments();
            this.employeeId = `EMP${String(count + 1).padStart(7, "0")}`;
        } catch (error) {
            throw error;
        }
    }
});

// Update currentSalary when salary structure changes
employeeSchema.pre("save", async function () {
    if (this.salaryStructure && this.salaryStructure.length > 0) {
        // Sort by effectiveDate descending and get the latest
        const sortedSalaries = [...this.salaryStructure].sort((a, b) =>
            new Date(b.effectiveDate) - new Date(a.effectiveDate)
        );
        this.currentSalary = sortedSalaries[0].amount;
    }
});

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
