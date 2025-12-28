import User from "../../models/User.js";
import Employee from "../../models/HR/Employee.js";
import bcrypt from "bcrypt";
import { getSignedFileUrl } from "../HR/employeeController.js";

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
        const deletedTeacher = await User.findByIdAndDelete(id);

        if (!deletedTeacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        res.status(200).json({ message: "Teacher deleted successfully" });
    } catch (error) {
        console.error("Delete Teacher Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get All Teachers
export const getAllTeachers = async (req, res) => {
    try {
        const teachers = await User.find({ role: "teacher" })
            .select("-password")
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
