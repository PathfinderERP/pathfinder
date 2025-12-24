import Employee from "../../models/HR/Employee.js";
import Centre from "../../models/Master_data/Centre.js";
import Department from "../../models/Master_data/Department.js";
import Designation from "../../models/Master_data/Designation.js";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../../config/r2Config.js";
import multer from "multer";

// Configure multer for file uploads
const storage = multer.memoryStorage();
export const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to upload file to Cloudflare R2
const uploadToR2 = async (file, folder = "employees") => {
    if (!file) return null;

    const fileName = `${folder}/${Date.now()}_${file.originalname}`;
    const uploadParams = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    try {
        await s3Client.send(new PutObjectCommand(uploadParams));
        return `${process.env.R2_PUBLIC_URL}/${fileName}`;
    } catch (error) {
        console.error("Error uploading to R2:", error);
        throw new Error("File upload failed");
    }
};

// Helper function to delete file from R2
const deleteFromR2 = async (fileUrl) => {
    if (!fileUrl) return;

    try {
        const fileName = fileUrl.replace(`${process.env.R2_PUBLIC_URL}/`, "");
        const deleteParams = {
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
        };
        await s3Client.send(new DeleteObjectCommand(deleteParams));
    } catch (error) {
        console.error("Error deleting from R2:", error);
    }
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

        res.status(201).json({
            message: "Employee created successfully",
            employee
        });
    } catch (error) {
        console.error("Error creating employee:", error);
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

        res.status(200).json({
            employees,
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

        res.status(200).json(employee);
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

        const updatedEmployee = await Employee.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate([
            { path: "primaryCentre", select: "centreName" },
            { path: "centres", select: "centreName" },
            { path: "department", select: "departmentName" },
            { path: "designation", select: "name" },
            { path: "manager", select: "name employeeId" }
        ]);

        res.status(200).json({
            message: "Employee updated successfully",
            employee: updatedEmployee
        });
    } catch (error) {
        console.error("Error updating employee:", error);
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
        const { effectiveDate, amount } = req.body;
        const employee = await Employee.findById(req.params.id);

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        employee.salaryStructure.push({ effectiveDate, amount });
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
