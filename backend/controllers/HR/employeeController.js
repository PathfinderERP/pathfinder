import Employee from "../../models/HR/Employee.js";
import Centre from "../../models/Master_data/Centre.js";
import Department from "../../models/Master_data/Department.js";
import Designation from "../../models/Master_data/Designation.js";
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../../config/r2Config.js";
import multer from "multer";
import dotenv from "dotenv";
dotenv.config();
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

    // If it's already a full URL but not to our R2 (e.g. external), return as is
    // However, in this project, we store the full URL or the key? 
    // Currently, we store `${publicUrl}/${fileName}`. 
    // If publicUrl was undefined, it's "undefined/employees/..."

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

        // Parse children if it's a string
        if (typeof employeeData.children === "string") {
            try {
                employeeData.children = JSON.parse(employeeData.children);
            } catch (e) {
                employeeData.children = [];
            }
        }

        // Parse centres array if it's a string
        if (typeof employeeData.centres === "string") {
            try {
                employeeData.centres = JSON.parse(employeeData.centres);
            } catch (e) {
                employeeData.centres = [];
            }
        }

        // Parse workingDays if it's a string
        if (typeof employeeData.workingDays === "string") {
            try {
                employeeData.workingDays = JSON.parse(employeeData.workingDays);
            } catch (e) {
                employeeData.workingDays = {};
            }
        }

        // Parse salaryStructure if it's a string
        if (typeof employeeData.salaryStructure === "string") {
            try {
                employeeData.salaryStructure = JSON.parse(employeeData.salaryStructure);
            } catch (e) {
                employeeData.salaryStructure = [];
            }
        }

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
            message: "Employee created successfully",
            employee: signedEmployee
        });
    } catch (error) {
        console.error("Error creating employee:", error);
        if (error.code === 11000) {
            return res.status(400).json({
                message: "An employee with this email or ID already exists.",
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
            .select("employeeId name designation")
            .populate("designation", "name")
            .sort({ name: 1 });

        res.status(200).json(employees);
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
            .populate("department", "name")
            .populate("designation", "name")
            .populate("manager", "name employeeId")
            .populate("primaryCentre", "name");

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
                if (updates[key] !== undefined && updates[key] !== "undefined" && updates[key] !== "null") {
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

        res.status(200).json({
            message: "Profile updated successfully",
            employee
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Error updating profile", error: error.message });
    }
};
