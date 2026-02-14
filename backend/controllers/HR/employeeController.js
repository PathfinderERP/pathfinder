import Employee from "../../models/HR/Employee.js";
import Centre from "../../models/Master_data/Centre.js";
import Department from "../../models/Master_data/Department.js";
import Designation from "../../models/Master_data/Designation.js";
import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import s3Client from "../../config/r2Config.js";
import { uploadToR2, deleteFromR2, getSignedFileUrl, upload } from "../../utils/r2Upload.js";
export { upload };
import multer from "multer";

// Multer and R2 helpers are now centralized in r2Upload.js and used below.

// Multer and R2 helpers are now centralized in r2Upload.js and used below.

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
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const prefix = `EMP${year}`;

        const lastEmpById = await Employee.findOne({
            employeeId: { $regex: new RegExp(`^${prefix}`) }
        }).sort({ employeeId: -1 });

        let sequence = 1;
        if (lastEmpById && lastEmpById.employeeId) {
            const lastSeq = parseInt(lastEmpById.employeeId.slice(5), 10);
            if (!isNaN(lastSeq)) sequence = lastSeq + 1;
        }
        employeeData.employeeId = `${prefix}${String(sequence).padStart(6, "0")}`;

        // ---------------------------------------------------------
        // 2. Create User Account (Auto-generate if not exists)
        // ---------------------------------------------------------
        // Check if user with this email already exists
        let user = await User.findOne({ email: employeeData.email });

        if (!user) {
            // Create new user
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(employeeData.employeeId, salt); // Password = Employee ID

            // Try to determine role based on designation
            let role = 'admin';
            if (employeeData.designation) {
                const designation = await Designation.findById(employeeData.designation);
                if (designation) {
                    const desigName = designation.name.toLowerCase();
                    if (desigName.includes('counsellor')) {
                        role = 'counsellor';
                    } else if (desigName.includes('telecaller')) {
                        role = 'telecaller';
                    } else if (desigName.includes('teacher') || desigName.includes('faculty')) {
                        role = 'teacher';
                    } else if (desigName.includes('marketing')) {
                        role = 'marketing';
                    }
                }
            }

            user = new User({
                name: employeeData.name,
                email: employeeData.email,
                employeeId: employeeData.employeeId,
                mobNum: employeeData.phoneNumber || "0000000000",
                password: hashedPassword,
                role: role, // Dynamically determined role
                centres: employeeData.primaryCentre ? [employeeData.primaryCentre] : [],
                permissions: [],
                granularPermissions: {} // Default perms handled by model pre-save hook
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

        if (department) {
            const deptIds = department.split(',').filter(Boolean);
            query.department = { $in: deptIds };
        }
        if (designation) {
            const desigIds = designation.split(',').filter(Boolean);
            query.designation = { $in: desigIds };
        }
        if (centre) {
            const centreIds = centre.split(',').filter(Boolean);
            query.$or = [
                { primaryCentre: { $in: centreIds } },
                { centres: { $in: centreIds } }
            ];
        }
        if (status) {
            const statusValues = status.split(',').filter(Boolean);
            query.status = { $in: statusValues };
        }

        // Data Isolation: If not superAdmin, restrict to assigned centers
        const userRole = (req.user.role || "").toLowerCase();
        if (userRole !== 'superadmin' && userRole !== 'super admin') {
            const userCentres = req.user.centres || [];
            if (userCentres.length > 0) {
                query.$and = query.$and || [];
                query.$and.push({
                    $or: [
                        { primaryCentre: { $in: userCentres } },
                        { centres: { $in: userCentres } }
                    ]
                });
            } else {
                // If no centres assigned, they shouldn't see anyone (or maybe just themselves? 
                // but usually it means they have no access).
                query._id = null; // Forces empty result
            }
        }

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
        const userRole = (req.user.role || "").toLowerCase();
        const isSuperAdmin = userRole === 'superadmin' || userRole === 'super admin';
        const userCentres = req.user.centres || [];

        const query = { status: "Active" };
        if (!isSuperAdmin) {
            if (userCentres.length > 0) {
                query.$or = [
                    { primaryCentre: { $in: userCentres } },
                    { centres: { $in: userCentres } }
                ];
            } else {
                return res.status(200).json([]); // No centres, no managers
            }
        }

        const employees = await Employee.find(query)
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
        const fileFieldsList = [
            "profileImage", "aadharProof", "panProof", "bankStatement",
            "educationalQualification1", "educationalQualification2", "educationalQualification3"
        ];

        Object.keys(updates).forEach(key => {
            // Exclude file fields from direct text update if they are in allowedUpdates list
            // (We handle them separately via req.files)
            if (allowedUpdates.includes(key) && !fileFieldsList.includes(key)) {
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
                    const fileUrl = await uploadToR2(req.files[field][0], "employees/profile");
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

// Bulk Import Employees
export const bulkImportEmployees = async (req, res) => {
    try {
        const employeesData = req.body;
        if (!Array.isArray(employeesData) || employeesData.length === 0) {
            return res.status(400).json({ message: "Invalid data format. Expected an array." });
        }

        const stats = {
            total: employeesData.length,
            success: 0,
            failed: 0,
            errors: []
        };

        // ---------------------------------------------------------
        // Pre-calculate starting sequence to avoid DB race conditions in loop
        // ---------------------------------------------------------
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const prefix = `EMP${year}`;

        const lastRec = await Employee.findOne({
            employeeId: { $regex: new RegExp(`^${prefix}`) }
        }).sort({ employeeId: -1 });

        let currentSequence = 0;
        if (lastRec && lastRec.employeeId) {
            const lastSeq = parseInt(lastRec.employeeId.slice(prefix.length), 10);
            if (!isNaN(lastSeq)) currentSequence = lastSeq;
        }

        for (const data of employeesData) {
            try {
                // Check if employee already exists by email or employeeId (if provided)
                const checkQuery = [{ email: data.email }];
                if (data.employeeId) checkQuery.push({ employeeId: data.employeeId });

                const existing = await Employee.findOne({ $or: checkQuery });

                if (existing) {
                    // If existing record has same ID, it's a re-import/update case? 
                    // User said "dont create new". If it exists, we likely skip or update. 
                    // Given context of "bulk import", usually skipping existing is safer unless specified.
                    // However, if the email matches but ID differs, that's a conflict.

                    if (data.employeeId && existing.employeeId === data.employeeId) {
                        // ID matches, treat as update or just skip? 
                        // "employee id will be same... that will be saved in the database"
                        // For now, let's allow it to proceed to UPDATE if we implemented update logic, 
                        // but standard code here creates `new Employee`.
                        // If I assume the DB is empty (as user said), then `existing` will be null.
                        // But if they re-run it...
                        // Let's stick to: If exists, Skip/Error. User deleted data, so it should be clean.
                        // But if they provide an ID that *already* actually exists (maybe they missed deleting one), we should error.
                    }

                    stats.failed++;
                    stats.errors.push(`Employee with email ${data.email} or ID ${data.employeeId} already exists.`);
                    continue;
                }

                // Auto-generate employeeId if not provided
                if (!data.employeeId) {
                    currentSequence++;
                    data.employeeId = `${prefix}${String(currentSequence).padStart(6, "0")}`;
                }

                // Handle User linking
                let user = await User.findOne({ email: data.email });

                if (user) {
                    // Update existing user to ensure Employee ID matches the import
                    let isDirty = false;

                    if (user.employeeId !== data.employeeId) {
                        user.employeeId = data.employeeId;
                        isDirty = true;
                    }

                    // Force sync password to Employee ID as requested
                    // "password will be also same"
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(data.employeeId, salt);
                    // We can't easily compare hashed passwords, so we just overwrite it to ensure consistency
                    // Optimization: We could check if we really need to, but explicit request implies enforcement.
                    user.password = hashedPassword;
                    isDirty = true;

                    if (isDirty) {
                        await user.save();
                    }
                } else {
                    const salt = await bcrypt.genSalt(10);
                    // Password matches Employee ID as requested
                    const hashedPassword = await bcrypt.hash(data.employeeId, salt);

                    // Try to determine role based on designation
                    let role = 'admin';
                    if (data.designation) {
                        try {
                            const designation = await Designation.findById(data.designation);
                            if (designation) {
                                const desigName = designation.name.toLowerCase();
                                if (desigName.includes('counsellor')) {
                                    role = 'counsellor';
                                } else if (desigName.includes('telecaller')) {
                                    role = 'telecaller';
                                } else if (desigName.includes('teacher') || desigName.includes('faculty')) {
                                    role = 'teacher';
                                } else if (desigName.includes('marketing')) {
                                    role = 'marketing';
                                }
                            }
                        } catch (desigErr) {
                            console.error("Error fetching designation for bulk user role:", desigErr);
                        }
                    }

                    user = new User({
                        name: data.name,
                        email: data.email,
                        employeeId: data.employeeId,
                        mobNum: data.phoneNumber || "0000000000",
                        password: hashedPassword,
                        role: role,
                        centres: data.primaryCentre ? [data.primaryCentre] : [],
                        permissions: [],
                        granularPermissions: {} // Default perms handled by model pre-save hook
                    });
                    await user.save();
                }
                data.user = user._id;

                // Add metadata
                data.createdBy = req.user.id;
                data.updatedBy = req.user.id;

                // Clean up empty strings for ObjectId fields to prevent CastErrors
                const objectIdFields = ["manager", "department", "designation", "primaryCentre", "centres"];
                objectIdFields.forEach(field => {
                    if (data[field] === "" || data[field] === "null" || data[field] === null) {
                        delete data[field];
                    }
                });

                const employee = new Employee(data);
                await employee.save();
                stats.success++;

            } catch (err) {
                console.error(`Error importing employee ${data.email}:`, err);
                stats.failed++;
                stats.errors.push(`Error for ${data.email}: ${err.message}`);
            }
        }

        res.status(stats.failed > 0 ? 207 : 201).json({
            message: `${stats.success} employees imported successfully. ${stats.failed} failed.`,
            stats
        });

    } catch (error) {
        console.error("Bulk import error:", error);
        res.status(500).json({ message: "Internal server error during bulk import", error: error.message });
    }
};
