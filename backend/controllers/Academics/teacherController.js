import User from "../../models/User.js";
import Employee from "../../models/HR/Employee.js";
import Centre from "../../models/Master_data/Centre.js";
import bcrypt from "bcrypt";
import { getSignedFileUrl } from "../../utils/r2Upload.js";

// Bulk Import Teachers
export const bulkImportTeachers = async (req, res) => {
    try {
        const teachersData = req.body;
        if (!Array.isArray(teachersData) || teachersData.length === 0) {
            return res.status(400).json({ message: "Invalid data format. Expected an array of records." });
        }

        const stats = {
            total: teachersData.length,
            success: 0,
            failed: 0,
            errors: []
        };

        const centres = await Centre.find({});
        const centreMap = new Map(centres.map(c => [c.centreName.toLowerCase(), c._id]));

        for (const data of teachersData) {
            try {
                // Basic Validation
                if (!data.name || !data.email || !data.employeeId) {
                    stats.failed++;
                    stats.errors.push(`Missing required fields for ${data.name || 'Unknown'}`);
                    continue;
                }

                // Duplicate Check
                const existing = await User.findOne({
                    $or: [{ email: data.email }, { employeeId: data.employeeId }],
                    role: "teacher" // Only check against teachers? User email must be unique across system actually.
                    // User model uniqueness is usually on email/employeeId globally.
                });

                if (existing) {
                    stats.failed++;
                    stats.errors.push(`User already exists: ${data.email} / ${data.employeeId}`);
                    continue;
                }

                // Resolve Centre
                let assignedCentres = [];
                if (data.centre) {
                    const cId = centreMap.get(data.centre.toLowerCase());
                    if (cId) assignedCentres.push(cId);
                }

                // Map Booleans
                const isTrue = (val) => String(val).toLowerCase() === 'true';

                // Hash Password (default to employeeId)
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(data.employeeId, salt);

                const newTeacher = new User({
                    name: data.name,
                    email: data.email,
                    employeeId: data.employeeId,
                    mobNum: data.mobNum || data.phoneNumber || "",
                    password: hashedPassword,
                    role: "teacher",

                    // Academic Fields
                    subject: data.subject,
                    designation: data.designation,
                    teacherDepartment: data.teacherDepartment || data.depertment, // Handle spelling typo in CSV 'depertment'
                    boardType: data.boardType || data.examArea, // 'examArea' in CSV
                    teacherType: data.teacherType || data.type, // 'type' in CSV

                    centres: assignedCentres,

                    // Permissions/HOD flags
                    isDeptHod: isTrue(data.isDeptHod || data.deptTypeHod),
                    isBoardHod: isTrue(data.isBoardHod || data.boardTypeHod),
                    isSubjectHod: isTrue(data.isSubjectHod || data.subjectWiseHod),

                    permissions: [],
                    granularPermissions: {}
                });

                await newTeacher.save();
                stats.success++;

            } catch (err) {
                stats.failed++;
                stats.errors.push(`Error importing ${data.name}: ${err.message}`);
            }
        }

        res.status(201).json({
            message: `Import processed. Success: ${stats.success}, Failed: ${stats.failed}`,
            stats
        });

    } catch (error) {
        console.error("Bulk Import Error:", error);
        res.status(500).json({ message: "Server error during import", error: error.message });
    }
};

// Create Teacher
export const createTeacher = async (req, res) => {
    try {
        const {
            name,
            email,
            mobNum,
            employeeId,
            password = "password123", // Default password
            subject,
            teacherDepartment,
            boardType,
            teacherType,
            designation,
            centre, // from form
            isDeptHod,
            isBoardHod,
            isSubjectHod
        } = req.body;

        // Validation
        if (!name || !email || !mobNum || !employeeId) {
            return res.status(400).json({ message: "Name, Email, Mobile, and Employee ID are required." });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { employeeId }] });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email or Employee ID already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // We need to resolve centre name to ID if needed? 
        // Or assume the frontend sends the centre ID/Object?
        // User model expects 'centres' as Array of ObjectIds. 
        // Screenshot shows a dropdown for Centre.
        // For simplicity, if we get a single centre ID, we push it.
        // If we get a centre name, we might need to find it directly or just store it if User model was loose, 
        // but User model has strict ref to CentreSchema.
        // Let's assume frontend sends a valid Centre ObjectId or we might need to look it up.
        // Ideally frontend sends Centre ID.

        // Wait, User.js says: centres: [{ type: ObjectId, ref: 'CentreSchema' }]
        // So we need to ensure we pass an array of IDs.

        let centres = [];
        if (centre && centre.trim() !== "") {
            centres.push(centre); // Assume centre is the ID
        }

        // Normalize or Validate Enums if necessary
        // teacherDepartment, teacherType are Enums.

        const newTeacher = new User({
            name,
            email,
            mobNum,
            employeeId,
            password: hashedPassword,
            role: "teacher",
            subject,
            teacherDepartment,
            boardType,
            teacherType,
            designation,
            centres,
            isDeptHod: isDeptHod || false,
            isBoardHod: isBoardHod || false,
            isSubjectHod: isSubjectHod || false
        });

        await newTeacher.save();

        res.status(201).json({ message: "Teacher created successfully", teacher: newTeacher });

    } catch (error) {
        console.error("Create Teacher Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update Teacher
export const updateTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Handle centres
        if (updates.centre !== undefined) {
            if (updates.centre && updates.centre.trim() !== "") {
                updates.centres = [updates.centre];
            } else {
                updates.centres = [];
            }
            delete updates.centre;
        }

        // Prevent password update from here for now, or handle it differently
        if (updates.password) {
            delete updates.password; // For security, handle password change separately if needed
        }

        if (updates.assignedScript === "") {
            updates.assignedScript = null;
        }

        const updatedTeacher = await User.findByIdAndUpdate(id, updates, { new: true });

        if (!updatedTeacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        res.status(200).json({ message: "Teacher updated successfully", teacher: updatedTeacher });

    } catch (error) {
        console.error("Update Teacher Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete Teacher
export const deleteTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        const teacher = await User.findById(id);

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        // Prevent deleting the last SuperAdmin
        if (teacher.role === "superAdmin") {
            const superAdminCount = await User.countDocuments({ role: "superAdmin" });
            if (superAdminCount <= 1) {
                return res.status(400).json({ message: "Cannot delete the last SuperAdmin" });
            }
        }

        // Delete associated Employee record if it exists
        await Employee.findOneAndDelete({ user: id });

        await User.findByIdAndDelete(id);

        res.status(200).json({ message: "Teacher and associated Employee record deleted successfully" });
    } catch (error) {
        console.error("Delete Teacher Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get All Teachers
export const getAllTeachers = async (req, res) => {
    try {
        let query = { role: { $in: ["teacher", "HOD"] } };

        if (req.user.role !== 'superAdmin' && req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.role !== 'HOD') {
            // Only restrict if the user has a role that should strictly be limited (e.g. maybe a lower role if exists).
            // For now, let's assume Teachers/HODs/Admins can see the full directory.
            // Or if we want to keep centre restriction but the user complained, maybe we just comment it out?
            // The user asked "why he can see only the two". Implies he wants to see ALL.
            /* 
            const allowedCentreIds = req.user.centres || [];
            if (allowedCentreIds.length > 0) {
                const ids = allowedCentreIds.map(c => c._id || c);
                query.centres = { $in: ids };
            } else {
                return res.status(200).json([]);
            }
            */
        }

        const teachers = await User.find(query)
            .select("-password")
            .populate("centres", "centreName")
            .sort({ createdAt: -1 });

        // Fetch profile images for each teacher from Employee model
        const teachersWithImages = await Promise.all(teachers.map(async (teacher) => {
            const teachObj = teacher.toObject();
            const employee = await Employee.findOne({ user: teacher._id });
            if (employee && employee.profileImage) {
                teachObj.profileImage = await getSignedFileUrl(employee.profileImage);
            }
            return teachObj;
        }));

        res.status(200).json(teachersWithImages);
    } catch (error) {
        console.error("Get Teachers Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
// Get Teacher By ID
export const getTeacherById = async (req, res) => {
    try {
        const { id } = req.params;
        const teacher = await User.findOne({ _id: id, role: "teacher" })
            .select("-password")
            .populate("centres", "centreName");

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        const teachObj = teacher.toObject();
        const employee = await Employee.findOne({ user: teacher._id });
        if (employee && employee.profileImage) {
            teachObj.profileImage = await getSignedFileUrl(employee.profileImage);
        }

        res.status(200).json(teachObj);
    } catch (error) {
        console.error("Get Teacher By ID Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
