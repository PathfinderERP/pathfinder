import Employee from "../../models/HR/Employee.js";
import Centre from "../../models/Master_data/Centre.js";
import Department from "../../models/Master_data/Department.js";
import Designation from "../../models/Master_data/Designation.js";
import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../../config/r2Config.js";
import multer from "multer";
// import dotenv from "dotenv"; // dotenv loaded in server.js
// dotenv.config();
// Configure multer for file uploads
const storage = multer.memoryStorage();
export const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to upload file to Cloudflare R2
const uploadToR2 = async (file, folder = "employees") => {
    if (!file) return null;

    let publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

    if (!publicUrl) {
        console.warn("WARNING: R2_PUBLIC_URL is missing. Using fallback URL construction.");
        // Fallback to S3API endpoint or a placeholder if available, otherwise relative path
        // This ensures upload succeeds even if display URL is imperfect
        if (process.env.S3API) {
            publicUrl = process.env.S3API.replace(/\/$/, "");
        } else {
            // Absolute fallback to generic R2 dev URL structure or even just empty string 
            // to let frontend handle it (though frontend expects absolute URL mostly)
            publicUrl = "https://pub-3c9d12dd00618b00795184bc5ff0c333.r2.dev";
        }
    }

    const fileName = `${folder}/${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`;
    const uploadParams = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    try {
        console.log(`R2 Upload: Starting upload for ${fileName} to bucket ${process.env.R2_BUCKET_NAME}`);
        await s3Client.send(new PutObjectCommand(uploadParams));
        const finalUrl = `${publicUrl}/${fileName}`;
        console.log(`R2 Upload: Success. URL: ${finalUrl}`);
        return finalUrl;
    } catch (error) {
        console.error("R2 Upload: Error:", error);
        // Don't crash the whole update if one file fails? 
        // Better to throw so user knows, BUT valid file upload failure is different from config error.
        throw new Error("File upload failed: " + error.message);
    }
};

// Helper function to delete file from R2
const deleteFromR2 = async (fileUrl) => {
    if (!fileUrl) return;

    try {
        const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
        let key = "";

        if (publicUrl && fileUrl.startsWith(publicUrl)) {
            key = fileUrl.replace(`${publicUrl}/`, "");
        } else if (fileUrl.startsWith("undefined/")) {
            key = fileUrl.replace("undefined/", "");
        } else {
            const index = fileUrl.indexOf("employees/");
            if (index !== -1) {
                key = fileUrl.substring(index);
            } else {
                return; // Not our file
            }
        }

        const deleteParams = {
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        };
        await s3Client.send(new DeleteObjectCommand(deleteParams));
    } catch (error) {
        console.error("Error deleting from R2:", error);
    }
};

// Helper function to get signed URL for a file
export const getSignedFileUrl = async (fileUrl) => {
    if (!fileUrl) return null;

    // Safety check: if credentials key is missing, we cannot sign.
    // Return original URL to avoid crashing or generating invalid signatures.
    // This allows public URLs to still work if they are public.
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
        console.warn("getSignedFileUrl: Missing R2 credentials, returning original URL");
        return fileUrl;
    }

    try {
        const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
        let key = "";

        if (publicUrl && fileUrl.startsWith(publicUrl)) {
            key = fileUrl.replace(`${publicUrl}/`, "");
        } else if (fileUrl.startsWith("undefined/")) {
            key = fileUrl.replace("undefined/", "");
        } else {
            // Fallback: search for 'employees/' or 'letters/' in the string to find the key
            const empIndex = fileUrl.indexOf("employees/");
            const letterIndex = fileUrl.indexOf("letters/");

            if (empIndex !== -1) {
                key = fileUrl.substring(empIndex);
            } else if (letterIndex !== -1) {
                key = fileUrl.substring(letterIndex);
            } else {
                return fileUrl; // Probably not our R2 file
            }
        }

        // Remove any query parameters from the key if they exist
        key = key.split('?')[0];

        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });

        // Sign for 1 hour (3600 seconds)
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        console.log(`Signed URL generated for key ${key}: ${signedUrl.substring(0, 50)}...`);
        return signedUrl;
    } catch (error) {
        console.error("Error signing URL:", error, "for URL:", fileUrl);
        return fileUrl;
    }
};

// Helper function to sign all file fields in an employee object
export const signEmployeeFiles = async (employee) => {
    if (!employee) return employee;

    const fileFields = [
        "aadharProof", "panProof", "bankStatement",
        "educationalQualification1", "educationalQualification2", "educationalQualification3",
        "form16", "insuranceDocument", "tdsCertificate", "profileImage"
    ];

    const signedEmployee = employee.toObject ? employee.toObject() : { ...employee };

    for (const field of fileFields) {
        if (signedEmployee[field]) {
            signedEmployee[field] = await getSignedFileUrl(signedEmployee[field]);
        }
    }

    // Sign URLs in the letters history
    if (signedEmployee.letters && Array.isArray(signedEmployee.letters)) {
        for (let i = 0; i < signedEmployee.letters.length; i++) {
            if (signedEmployee.letters[i].fileUrl) {
                signedEmployee.letters[i].fileUrl = await getSignedFileUrl(signedEmployee.letters[i].fileUrl);
            }
        }
    }

    return signedEmployee;
};

// Create Employee
export const createEmployee = async (req, res) => {
    try {
        const employeeData = { ...req.body };

        // Parse JSON fields
        const jsonFields = ["children", "centres", "workingDays", "salaryStructure"];
        jsonFields.forEach(field => {
            if (typeof employeeData[field] === "string") {
                try {
                    employeeData[field] = JSON.parse(employeeData[field]);
                } catch (e) {
                    employeeData[field] = field === "workingDays" ? {} : [];
                }
            }
        });

        // Handle file uploads
        if (req.files) {
            const fileFields = [
                "aadharProof", "panProof", "bankStatement",
                "educationalQualification1", "educationalQualification2", "educationalQualification3",
                "form16", "insuranceDocument", "tdsCertificate", "profileImage"
            ];

            for (const field of fileFields) {
                if (req.files[field] && req.files[field][0]) {
                    employeeData[field] = await uploadToR2(req.files[field][0], `employees/${field}`);
                }
            }
        }

        // Set created by
        employeeData.createdBy = req.user.id;
        employeeData.updatedBy = req.user.id;

        // Clean up empty strings for ObjectId fields
        const objectIdFields = ["manager", "department", "designation", "primaryCentre"];
        objectIdFields.forEach(field => {
            if (employeeData[field] === "") {
                delete employeeData[field];
            }
        });

        // ---------------------------------------------------------
        // 1. Manually Generate Unique Employee ID (Fixing collision issue)
        // ---------------------------------------------------------
        const lastEmpById = await Employee.findOne({ employeeId: { $regex: /^EMP/ } }).sort({ employeeId: -1 });
        let newCount = 1;
        if (lastEmpById && lastEmpById.employeeId) {
            const num = parseInt(lastEmpById.employeeId.replace("EMP", ""), 10);
            if (!isNaN(num)) newCount = num + 1;
        }
        employeeData.employeeId = `EMP${String(newCount).padStart(7, "0")}`;

        // ---------------------------------------------------------
        // 2. Create User Account (Auto-generate if not exists)
        // ---------------------------------------------------------
        // Check if user with this email already exists
        let user = await User.findOne({ email: employeeData.email });

        if (!user) {
            // Create new user
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(employeeData.employeeId, salt); // Password = Employee ID

            user = new User({
                name: employeeData.name,
                email: employeeData.email,
                employeeId: employeeData.employeeId,
                mobNum: employeeData.phoneNumber || "0000000000",
                password: hashedPassword,
                role: 'admin', // Default generic role
                centres: employeeData.primaryCentre ? [employeeData.primaryCentre] : [],
                permissions: [],
                granularPermissions: {}
            });
            await user.save();
        } else {
            // If user exists, we verify if we can link (optional, for now just link)
            console.log(`Linking existing user ${user._id} to new employee`);
        }

        // Link User to Employee
        employeeData.user = user._id;

        // ---------------------------------------------------------
        // 3. Save Employee
        // ---------------------------------------------------------
        const employee = new Employee(employeeData);
        await employee.save();

        // Populate references
        await employee.populate([
            { path: "primaryCentre", select: "centreName" },
            { path: "centres", select: "centreName" },
            { path: "department", select: "departmentName" },
            { path: "designation", select: "name" },
            { path: "manager", select: "name employeeId" }
        ]);

        const signedEmployee = await signEmployeeFiles(employee);

        res.status(201).json({
            message: "Employee created successfully and linked to User account",
            employee: signedEmployee
        });
    } catch (error) {
        console.error("Error creating employee:", error);
        if (error.code === 11000) {
            // Check keys to give better error message
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                message: `An entry with this ${field} already exists.`,
                error: "Duplicate key error"
            });
        }
        res.status(500).json({
            message: "Error creating employee",
            error: error.message
        });
    }
};

// Get all employees with filters and pagination
export const getEmployees = async (req, res) => {
    try {
        const {
            search,
            department,
            designation,
            centre,
            status,
            page = 1,
            limit = 10
        } = req.query;

        const query = {};

        // Search by name, email, or employee ID
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { employeeId: { $regex: search, $options: "i" } }
            ];
        }

        if (department) query.department = department;
        if (designation) query.designation = designation;
        if (centre) {
            query.$or = [
                { primaryCentre: centre },
                { centres: centre }
            ];
        }
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const employees = await Employee.find(query)
            .populate("primaryCentre", "centreName")
            .populate("centres", "centreName")
            .populate("department", "departmentName")
            .populate("designation", "name")
            .populate("manager", "name employeeId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Employee.countDocuments(query);

        // Sign URLs for each employee
        const signedEmployees = await Promise.all(employees.map(emp => signEmployeeFiles(emp)));

        res.status(200).json({
            employees: signedEmployees,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalEmployees: total
        });
    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({
            message: "Error fetching employees",
            error: error.message
        });
    }
};

// Get single employee by ID
export const getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id)
            .populate("primaryCentre", "centreName")
            .populate("centres", "centreName")
            .populate("department", "departmentName")
            .populate("designation", "name")
            .populate("manager", "name employeeId");

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const signedEmployee = await signEmployeeFiles(employee);

        // Normalize Working Days (Handle Legacy List format) for the View
        const hasWorkingDaysSet = Object.values(signedEmployee.workingDays || {}).some(v => v === true);
        if (!hasWorkingDaysSet && signedEmployee.workingDaysList && signedEmployee.workingDaysList.length > 0) {
            signedEmployee.workingDays = {
                sunday: false, monday: false, tuesday: false, wednesday: false,
                thursday: false, friday: false, saturday: false
            };
            signedEmployee.workingDaysList.forEach(day => {
                const d = day.toLowerCase();
                if (signedEmployee.workingDays.hasOwnProperty(d)) {
                    signedEmployee.workingDays[d] = true;
                }
            });
        }

        res.status(200).json(signedEmployee);
    } catch (error) {
        console.error("Error fetching employee:", error);
        res.status(500).json({
            message: "Error fetching employee",
            error: error.message
        });
    }
};

// Update employee
export const updateEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const updateData = { ...req.body };

        // Parse arrays if they're strings
        if (typeof updateData.children === "string") {
            try {
                updateData.children = JSON.parse(updateData.children);
            } catch (e) {
                delete updateData.children;
            }
        }

        if (typeof updateData.centres === "string") {
            try {
                updateData.centres = JSON.parse(updateData.centres);
            } catch (e) {
                delete updateData.centres;
            }
        }

        if (typeof updateData.workingDays === "string") {
            try {
                updateData.workingDays = JSON.parse(updateData.workingDays);
            } catch (e) {
                delete updateData.workingDays;
            }
        }

        if (typeof updateData.salaryStructure === "string") {
            try {
                updateData.salaryStructure = JSON.parse(updateData.salaryStructure);
            } catch (e) {
                delete updateData.salaryStructure;
            }
        }

        if (typeof updateData.letters === "string") {
            try {
                const parsed = JSON.parse(updateData.letters);
                if (Array.isArray(parsed)) {
                    updateData.letters = parsed;
                } else {
                    delete updateData.letters;
                }
            } catch (e) {
                delete updateData.letters;
            }
        }

        // Handle file uploads and delete old files
        if (req.files) {
            const fileFields = [
                "aadharProof", "panProof", "bankStatement",
                "educationalQualification1", "educationalQualification2", "educationalQualification3",
                "form16", "insuranceDocument", "tdsCertificate", "profileImage"
            ];

            for (const field of fileFields) {
                if (req.files[field] && req.files[field][0]) {
                    // Delete old file
                    if (employee[field]) {
                        await deleteFromR2(employee[field]);
                    }
                    // Upload new file
                    updateData[field] = await uploadToR2(req.files[field][0], `employees/${field}`);
                }
            }
        }

        updateData.updatedBy = req.user.id;

        // Clean up empty strings for ObjectId fields
        const objectIdFields = ["manager", "department", "designation", "primaryCentre"];
        objectIdFields.forEach(field => {
            if (updateData[field] === "") {
                delete updateData[field];
            }
        });

        // Update the employee document with new data
        Object.assign(employee, updateData);

        // Save the employee - this will trigger the pre('save') hook to update currentSalary
        await employee.save();

        // Re-fetch with population to get the latest state
        const updatedEmployee = await Employee.findById(req.params.id).populate([
            { path: "primaryCentre", select: "centreName" },
            { path: "centres", select: "centreName" },
            { path: "department", select: "departmentName" },
            { path: "designation", select: "name" },
            { path: "manager", select: "name employeeId" }
        ]);

        const signedEmployee = await signEmployeeFiles(updatedEmployee);

        res.status(200).json({
            message: "Employee updated successfully",
            employee: signedEmployee
        });
    } catch (error) {
        console.error("Error updating employee:", error);
        if (error.code === 11000) {
            return res.status(400).json({
                message: "An employee with this email or ID already exists.",
                error: "Duplicate key error"
            });
        }
        res.status(500).json({
            message: "Error updating employee",
            error: error.message
        });
    }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Delete all associated files from R2
        const fileFields = [
            "aadharProof", "panProof", "bankStatement",
            "educationalQualification1", "educationalQualification2", "educationalQualification3",
            "form16", "insuranceDocument", "tdsCertificate", "profileImage"
        ];

        for (const field of fileFields) {
            if (employee[field]) {
                await deleteFromR2(employee[field]);
            }
        }

        await Employee.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: "Employee deleted successfully" });
    } catch (error) {
        console.error("Error deleting employee:", error);
        res.status(500).json({
            message: "Error deleting employee",
            error: error.message
        });
    }
};

// Add salary structure entry
export const addSalaryStructure = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        employee.salaryStructure.push(req.body);
        employee.updatedBy = req.user.id;
        await employee.save();

        res.status(200).json({
            message: "Salary structure added successfully",
            employee
        });
    } catch (error) {
        console.error("Error adding salary structure:", error);
        res.status(500).json({
            message: "Error adding salary structure",
            error: error.message
        });
    }
};

// Get employees for dropdown (managers)
export const getEmployeesForDropdown = async (req, res) => {
    try {
        const employees = await Employee.find({ status: "Active" })
            .select("employeeId name designation profileImage")
            .populate("designation", "name")
            .sort({ name: 1 });

        const signedEmployees = await Promise.all(employees.map(async emp => {
            const empObj = emp.toObject();
            if (empObj.profileImage) {
                empObj.profileImage = await getSignedFileUrl(empObj.profileImage);
            }
            return empObj;
        }));

        res.status(200).json(signedEmployees);
    } catch (error) {
        console.error("Error fetching employees for dropdown:", error);
        res.status(500).json({
            message: "Error fetching employees",
            error: error.message
        });
    }
};

// Get current logged-in employee's profile
export const getMyProfile = async (req, res) => {
    try {
        // Find employee linked to the current user
        const employee = await Employee.findOne({ user: req.user.id })
            .populate("department", "departmentName")
            .populate("designation", "name")
            .populate("manager", "name employeeId")
            .populate("primaryCentre", "centreName")
            .populate("centres", "centreName");

        if (!employee) {
            return res.status(404).json({ message: "Employee profile not found" });
        }

        const signedEmployee = await signEmployeeFiles(employee);
        res.status(200).json(signedEmployee);
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: "Error fetching profile", error: error.message });
    }
};

// Update current logged-in employee's profile (restricted fields)
export const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;

        // Find employee
        const employee = await Employee.findOne({ user: userId });
        if (!employee) {
            return res.status(404).json({ message: "Employee profile not found" });
        }

        // Check for R2 credentials before attempting any file operations
        if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
            console.error("Critical: Missing R2 Credentials during profile update");
            return res.status(500).json({
                message: "System Configuration Error: Storage credentials are missing on the server. Please contact Admin to check Environment Variables."
            });
        }

        // List of allowed fields to update
        const allowedUpdates = [
            "name", "spouseName", "dateOfBirth", "gender", "children",
            "phoneNumber", "whatsappNumber", "alternativeNumber",
            "state", "city", "pinCode", "address",
            "aadharNumber", "panNumber", "bankName", "branchName",
            "accountNumber", "ifscCode", "profileImage",
            "aadharProof", "panProof", "bankStatement",
            "educationalQualification1", "educationalQualification2", "educationalQualification3"
        ];

        // Apply updates only for allowed fields
        // Apply updates only for allowed fields
        Object.keys(updates).forEach(key => {
            // Exclude file fields from direct text update if they are in allowedUpdates list
            // (We handle them separately via req.files)
            if (allowedUpdates.includes(key) && !["profileImage", "aadharProof", "panProof", "bankStatement"].includes(key)) {
                if (updates[key] !== undefined && updates[key] !== "undefined" && updates[key] !== null && updates[key] !== "null") {
                    employee[key] = updates[key];
                }
            }
        });

        // Handle file uploads and delete old files
        if (req.files) {
            const fileFields = [
                "aadharProof", "panProof", "bankStatement",
                "educationalQualification1", "educationalQualification2", "educationalQualification3",
                "profileImage"
            ];

            for (const field of fileFields) {
                if (req.files[field] && req.files[field][0]) {
                    // Delete old file if exists
                    if (employee[field]) {
                        await deleteFromR2(employee[field]);
                    }
                    // Upload new file
                    const fileUrl = await uploadToR2(req.files[field][0]);
                    employee[field] = fileUrl;
                }
            }
        }

        await employee.save();
        const signedEmployee = await signEmployeeFiles(employee);

        res.status(200).json({
            message: "Profile updated successfully",
            employee: signedEmployee
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Error updating profile", error: error.message });
    }
};
