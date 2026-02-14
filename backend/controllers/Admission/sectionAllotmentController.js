import Admission from "../../models/Admission/Admission.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import mongoose from "mongoose";

// Fetch students for section allotment (with filters and RBAC)
export const getStudentSections = async (req, res) => {
    try {
        const { search, centre, course, class: className, examTag } = req.query;
        const user = req.user;

        // Base Query
        let matchQuery = { admissionStatus: "ACTIVE" };

        // 1. RBAC & Centre Filter logic
        if (user.role !== 'superAdmin' && user.role !== 'Super Admin') {
            // Non-Super Admins: Get allowed centres from user profile
            const userCentres = await CentreSchema.find({
                _id: { $in: user.centres }
            }).select('centreName');

            const allowedCentreNames = userCentres.map(c => c.centreName);

            if (allowedCentreNames.length === 0) {
                return res.status(200).json([]);
            }

            // Base restriction
            matchQuery.centre = { $in: allowedCentreNames };

            // Handle query-level centre filtering
            if (centre) {
                const requestedCentres = centre.split(',').map(c => c.trim());
                const validRequestedCentres = requestedCentres.filter(c => allowedCentreNames.includes(c));

                if (validRequestedCentres.length > 0) {
                    matchQuery.centre = { $in: validRequestedCentres };
                } else {
                    matchQuery.centre = { $in: [] };
                }
            }
        } else {
            // Super Admin
            if (centre) {
                const requestedCentres = centre.split(',').map(c => c.trim());
                matchQuery.centre = { $in: requestedCentres };
            }
        }

        // Multi-select Filters (Casting to ObjectId for Aggregation)
        if (course) {
            const courseIds = course.split(',').filter(id => id.length === 24);
            if (courseIds.length > 0) {
                matchQuery.course = { $in: courseIds.map(id => new mongoose.Types.ObjectId(id)) };
            }
        }
        if (className) {
            const classIds = className.split(',').filter(id => id.length === 24);
            if (classIds.length > 0) {
                matchQuery.class = { $in: classIds.map(id => new mongoose.Types.ObjectId(id)) };
            }
        }
        if (examTag) {
            const examTagIds = examTag.split(',').filter(id => id.length === 24);
            if (examTagIds.length > 0) {
                matchQuery.examTag = { $in: examTagIds.map(id => new mongoose.Types.ObjectId(id)) };
            }
        }

        // 2. Aggregation Pipeline
        const pipeline = [
            // Populate Student first to allow searching by student name
            {
                $lookup: {
                    from: "students",
                    localField: "student",
                    foreignField: "_id",
                    as: "student"
                }
            },
            { $unwind: "$student" },

            { $match: matchQuery }, // Apply filters

            // Populate other fields for display
            {
                $lookup: {
                    from: "courses",
                    localField: "course",
                    foreignField: "_id",
                    as: "course"
                }
            },
            { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "classes",
                    localField: "class",
                    foreignField: "_id",
                    as: "class"
                }
            },
            { $unwind: { path: "$class", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "boards",
                    localField: "board",
                    foreignField: "_id",
                    as: "board"
                }
            },
            { $unwind: { path: "$board", preserveNullAndEmptyArrays: true } },
        ];

        if (search) {
            const searchRegex = new RegExp(search, "i");
            pipeline.push({
                $match: {
                    $or: [
                        { "student.studentsDetails.0.studentName": searchRegex },
                        { "student.studentsDetails.0.studentEmail": searchRegex },
                        { "student.studentsDetails.0.mobileNum": searchRegex },
                        { "admissionNumber": searchRegex }
                    ]
                }
            });
        }

        pipeline.push({ $sort: { createdAt: -1 } });

        const results = await Admission.aggregate(pipeline);
        return res.status(200).json(results);

    } catch (error) {
        console.error("Error fetching student sections:", error);
        res.status(500).json({ message: "Server error fetching data" });
    }
};

// Update section allotment for a student
export const allotSection = async (req, res) => {
    try {
        const { admissionId } = req.params;
        const { examSection, studySection, omrCode, rm } = req.body;

        const admission = await Admission.findById(admissionId);
        if (!admission) {
            return res.status(404).json({ message: "Admission record not found" });
        }

        // Update fields
        admission.sectionAllotment = {
            examSection: examSection || admission.sectionAllotment?.examSection,
            studySection: studySection || admission.sectionAllotment?.studySection,
            omrCode: omrCode || admission.sectionAllotment?.omrCode,
            rm: rm || admission.sectionAllotment?.rm
        };

        await admission.save();

        res.status(200).json({ message: "Section allotted successfully", admission });
    } catch (error) {
        console.error("Error allotting section:", error);
        res.status(500).json({ message: "Server error updating section" });
    }
};
