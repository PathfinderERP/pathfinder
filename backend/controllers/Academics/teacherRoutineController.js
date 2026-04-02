import TeacherRoutine from "../../models/Academics/TeacherRoutine.js";
import User from "../../models/User.js";
import Employee from "../../models/HR/Employee.js";
import Centre from "../../models/Master_data/Centre.js";
import Subject from "../../models/Master_data/Subject.js";
import Class from "../../models/Master_data/Class.js";
import { getSignedFileUrl } from "../../utils/r2Upload.js";

// Create Teacher Routine
export const createTeacherRoutine = async (req, res) => {
    try {
        const {
            teacherId,
            centreId, // Now an array
            day,
            startTime,
            endTime,
            classId,
            subjectId,
            courseId,
            amount,
            classHours,
            typeOfEmployment,
            className // New string field
        } = req.body;

        // Ensure centreId, classId and subjectId are arrays
        const normalizedCentreId = Array.isArray(centreId) ? centreId : [centreId];
        const normalizedClassId = Array.isArray(classId) ? classId : [classId];
        const normalizedSubjectId = Array.isArray(subjectId) ? subjectId : [subjectId];

        const newRoutine = new TeacherRoutine({
            teacherId,
            centreId: normalizedCentreId,
            day,
            startTime,
            endTime,
            classId: normalizedClassId,
            subjectId: normalizedSubjectId,
            courseId,
            amount,
            classHours,
            typeOfEmployment,
            createdBy: req.user._id,
            className
        });

        await newRoutine.save();
        res.status(201).json({ message: "Teacher routine created successfully", routine: newRoutine });
    } catch (error) {
        console.error("Create Teacher Routine Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get All Teacher Routines (Flat List)
export const getAllTeacherRoutines = async (req, res) => {
    try {
        const routines = await TeacherRoutine.find()
            .populate("teacherId", "name email mobNum employeeId")
            .populate("centreId", "centreName")
            .populate("subjectId", "subName")
            .populate("classId", "name")
            .sort({ createdAt: -1 });

        const detailedRoutines = await Promise.all(routines.map(async (routine) => {
            const routineObj = routine.toObject();
            if (routine.teacherId) {
                const employee = await Employee.findOne({ user: routine.teacherId._id });
                if (employee) {
                    routineObj.typeOfEmployment = employee.typeOfEmployment;
                    if (employee.profileImage) {
                        routineObj.profileImage = await getSignedFileUrl(employee.profileImage);
                    }
                }
            }
            return routineObj;
        }));

        res.status(200).json(detailedRoutines);
    } catch (error) {
        console.error("Get Teacher Routines Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get Grouped Teacher Routines (Advanced Grid View)
export const getGroupedTeacherRoutines = async (req, res) => {
    try {
        const routines = await TeacherRoutine.find()
            .populate("teacherId", "name email mobNum employeeId")
            .populate("centreId", "centreName")
            .populate("subjectId", "subName")
            .populate("classId", "name")
            .sort({ teacherId: 1, day: 1, startTime: 1 });

        const groupedMap = new Map();

        for (const routine of routines) {
            const teacherId = routine.teacherId?._id?.toString();
            if (!teacherId) continue;

            if (!groupedMap.has(teacherId)) {
                // Fetch employee details once per teacher
                const employee = await Employee.findOne({ user: routine.teacherId._id });
                let profileImage = null;
                let typeOfEmployment = "N/A";
                if (employee) {
                    typeOfEmployment = employee.typeOfEmployment;
                    if (employee.profileImage) {
                        profileImage = await getSignedFileUrl(employee.profileImage);
                    }
                }

                groupedMap.set(teacherId, {
                    teacher: {
                        _id: teacherId,
                        name: routine.teacherId.name,
                        employeeId: routine.teacherId.employeeId,
                        email: routine.teacherId.email,
                        mobNum: routine.teacherId.mobNum,
                        profileImage,
                        typeOfEmployment
                    },
                    days: {
                        Monday: [],
                        Tuesday: [],
                        Wednesday: [],
                        Thursday: [],
                        Friday: [],
                        Saturday: [],
                        Sunday: []
                    }
                });
            }

            const teacherData = groupedMap.get(teacherId);
            teacherData.days[routine.day].push({
                _id: routine._id,
                centre: routine.centreId?.map(c => c.centreName).join(", "),
                startTime: routine.startTime,
                endTime: routine.endTime,
                class: routine.classId?.map(c => c.name).join(", "),
                subject: routine.subjectId?.map(s => s.subName).join(", "),
                amount: routine.amount,
                classHours: routine.classHours,
                centreIds: routine.centreId?.map(c => c._id),
                classIds: routine.classId?.map(c => c._id),
                subjectIds: routine.subjectId?.map(s => s._id),
                className: routine.className
            });
        }

        const result = Array.from(groupedMap.values());
        res.status(200).json(result);
    } catch (error) {
        console.error("Get Grouped Teacher Routines Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


// Update Teacher Routine
export const updateTeacherRoutine = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        updates.updatedBy = req.user._id;

        if (updates.centreId) updates.centreId = Array.isArray(updates.centreId) ? updates.centreId : [updates.centreId];
        if (updates.classId) updates.classId = Array.isArray(updates.classId) ? updates.classId : [updates.classId];
        if (updates.subjectId) updates.subjectId = Array.isArray(updates.subjectId) ? updates.subjectId : [updates.subjectId];

        const updatedRoutine = await TeacherRoutine.findByIdAndUpdate(id, updates, { new: true });
        if (!updatedRoutine) {
            return res.status(404).json({ message: "Routine not found" });
        }

        res.status(200).json({ message: "Routine updated successfully", routine: updatedRoutine });
    } catch (error) {
        console.error("Update Teacher Routine Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete Teacher Routine
export const deleteTeacherRoutine = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedRoutine = await TeacherRoutine.findByIdAndDelete(id);
        if (!deletedRoutine) {
            return res.status(404).json({ message: "Routine not found" });
        }
        res.status(200).json({ message: "Routine deleted successfully" });
    } catch (error) {
        console.error("Delete Teacher Routine Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Bulk Import Teacher Routines
export const bulkImportRoutines = async (req, res) => {
    try {
        const routinesData = req.body;
        if (!Array.isArray(routinesData) || routinesData.length === 0) {
            return res.status(400).json({ message: "Invalid data format. Expected an array of records." });
        }

        const stats = {
            total: routinesData.length,
            success: 0,
            failed: 0,
            errors: []
        };

        // Cache for lookup speed
        const centreCache = {};
        const subjectCache = {};
        const teacherCache = {};
        const classCache = {};

        for (const data of routinesData) {
            try {
                // Determine teacher
                let teacher;
                if (teacherCache[data.employeeId]) {
                    teacher = teacherCache[data.employeeId];
                } else {
                    teacher = await User.findOne({ employeeId: data.employeeId, role: "teacher" });
                    if (teacher) teacherCache[data.employeeId] = teacher;
                }

                if (!teacher) {
                    stats.failed++;
                    stats.errors.push(`Row failed: Teacher with Employee ID ${data.employeeId} not found.`);
                    continue;
                }

                // Determine Centre
                let centreId = data.centreId;
                if (data.centreName && !centreId) {
                    if (centreCache[data.centreName]) {
                        centreId = centreCache[data.centreName];
                    } else {
                        const centre = await Centre.findOne({ centreName: new RegExp(`^${data.centreName}$`, "i") });
                        if (centre) {
                            centreId = centre._id;
                            centreCache[data.centreName] = centreId;
                        }
                    }
                }

                // Determine Subject
                let subjectId = data.subjectId;
                if (data.subjectName && !subjectId) {
                    if (subjectCache[data.subjectName]) {
                        subjectId = subjectCache[data.subjectName];
                    } else {
                        const subject = await Subject.findOne({ subName: new RegExp(`^${data.subjectName}$`, "i") });
                        if (subject) {
                            subjectId = subject._id;
                            subjectCache[data.subjectName] = subjectId;
                        }
                    }
                }

                // Determine Class
                let classId = data.classId;
                if (data.className && !classId) {
                    if (classCache[data.className]) {
                        classId = classCache[data.className];
                    } else {
                        const cls = await Class.findOne({ name: new RegExp(`^${data.className}$`, "i") });
                        if (cls) {
                            classId = cls._id;
                            classCache[data.className] = classId;
                        }
                    }
                }

                const newRoutine = new TeacherRoutine({
                    teacherId: teacher._id,
                    centreId: centreId,
                    day: data.day,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    classId: classId,
                    subjectId: subjectId,
                    amount: data.amount,
                    classHours: data.classHours || 0,
                    typeOfEmployment: data.typeOfEmployment, // Manual override if provided
                    createdBy: req.user._id
                });

                await newRoutine.save();
                stats.success++;
            } catch (err) {
                stats.failed++;
                stats.errors.push(`Row error: ${err.message}`);
            }
        }

        res.status(201).json({
            message: `Import processed. Success: ${stats.success}, Failed: ${stats.failed}`,
            stats
        });
    } catch (error) {
        console.error("Bulk Import Routines Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


