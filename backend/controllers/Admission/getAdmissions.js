import Admission from "../../models/Admission/Admission.js";
import CentreSchema from "../../models/Master_data/Centre.js";

export const getAdmissions = async (req, res) => {
    try {
        let query = {};

        // Centre-based access control
        if (req.user.role !== 'superAdmin') {
            // Get user's allowed centre names
            const userCentres = await CentreSchema.find({
                _id: { $in: req.user.centres }
            }).select('centreName');

            const allowedCentreNames = userCentres.map(c => c.centreName);

            if (allowedCentreNames.length === 0) {
                // User has no centres assigned, return empty
                return res.status(200).json([]);
            }

            // Filter by allowed centres
            query.centre = { $in: allowedCentreNames };

            // If a specific centre is requested via query param, validate it
            if (req.query.centre) {
                if (allowedCentreNames.includes(req.query.centre)) {
                    query.centre = req.query.centre;
                } else {
                    // User trying to access unauthorized centre
                    return res.status(403).json({
                        message: "Access denied. You don't have permission to view this centre's data."
                    });
                }
            }
        } else {
            // SuperAdmin can filter by centre if specified
            if (req.query.centre) {
                query.centre = req.query.centre;
            }
        }

        // Apply additional filters if provided
        if (req.query.status) {
            query.admissionStatus = req.query.status;
        }

        const admissions = await Admission.find(query)
            .populate('student')
            .populate('course')
            .populate('class')
            .populate('examTag')
            .populate('department')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json(admissions);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
