import Admission from "../../models/Admission/Admission.js";

// Fetch students for section allotment (with filters and RBAC)
export const getStudentSections = async (req, res) => {
    try {
        const { search, centre } = req.query;
        const user = req.user; // Assumes auth middleware populates this

        let query = { admissionStatus: "ACTIVE" };

        // 1. RBAC & Centre Filter
        if (user.role === "Super Admin") {
            if (centre) {
                query.centre = centre;
            }
        } else {
            // Non-Super Admins can only see their assigned centres
            // Assuming user.accessibleCentres or similar exists, or single centre
            // Falling back to exact match if user has a 'centre' field or 'accessibleCentres' array

            // Checking how permissions are usually handled. 
            // Often check req.user.accessibleCentres or req.user.centre

            // Logic adapted from other controllers:
            if (user.role !== "Super Admin") {
                // Check if user has specific centre access logic
                // For now, if no explicit centre access list, we might rely on the frontend passing the centre 
                // and the backend verifying it against user's allowed list. 
                // Let's assume strict filtering:
                if (user.accessibleCentres && user.accessibleCentres.length > 0) {
                    if (centre && user.accessibleCentres.includes(centre)) {
                        query.centre = centre;
                    } else {
                        query.centre = { $in: user.accessibleCentres };
                    }
                } else if (user.centre) {
                    query.centre = user.centre;
                }
            } else {
                // Super Admin: if centre provided in filter, use it
                if (centre) query.centre = centre;
            }
        }

        // 2. Search Filter (Complex because student details are in a reference)
        // We can't easily regex search on populated fields in a single query without aggregation.
        // Or we regex search Student first, then find Admissions.

        if (search) {
            // Option A: Aggregation (Better for performance)
            // Option B: Find matching Students first (Easier implementation)

            // Using Aggregation for robust filtering
            const pipeline = [
                {
                    $lookup: {
                        from: "students",
                        localField: "student",
                        foreignField: "_id",
                        as: "student"
                    }
                },
                { $unwind: "$student" }, // Convert array to object, mimicking populate
                {
                    $lookup: {
                        from: "users",
                        localField: "student.studentsDetails.0.centre",
                        foreignField: "centreName",
                        as: "centreDetails"
                    }
                },
                { $match: query } // Apply existing filters (status, centre)
            ];

            // Add Search logic
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

            // Project/Sort
            pipeline.push({ $sort: { createdAt: -1 } });

            const results = await Admission.aggregate(pipeline);

            // Manually populate other fields if needed or return structure
            return res.status(200).json(results);

        } else {
            // Standard Find if no search (faster than agg if not needed, but agg is fine too)
            const admissions = await Admission.find(query)
                .populate("student")
                .sort({ createdAt: -1 });
            return res.status(200).json(admissions);
        }

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
