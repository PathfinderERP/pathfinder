import Admission from "../../models/Admission/Admission.js";
import CentreSchema from "../../models/Master_data/Centre.js";

export const getAdmissions = async (req, res) => {
    try {
        let query = {};

        // Centre-based access control
        if (req.user.role !== 'superAdmin') {
            // Get user's allowed centre names from populated centres or by querying
            let allowedCentreNames = [];

            // req.user might have populated centres if coming from certain paths, 
            // but standard requireAuth doesn't populate.
            const userCentres = await CentreSchema.find({
                _id: { $in: req.user.centres }
            }).select('centreName');

            allowedCentreNames = userCentres.map(c => c.centreName);

            if (allowedCentreNames.length === 0) {
                return res.status(200).json([]);
            }

            // Base restriction
            query.centre = { $in: allowedCentreNames };

            // Handle query-level centre filtering
            if (req.query.centre) {
                const requestedCentres = req.query.centre.split(',').map(c => c.trim());
                const validRequestedCentres = requestedCentres.filter(c => allowedCentreNames.includes(c));

                if (validRequestedCentres.length > 0) {
                    query.centre = { $in: validRequestedCentres };
                } else {
                    // Requested centres are none of the allowed ones
                    query.centre = { $in: [] };
                }
            }
        } else {
            // SuperAdmin can filter by centre if specified
            if (req.query.centre) {
                const requestedCentres = req.query.centre.split(',').map(c => c.trim());
                query.centre = { $in: requestedCentres };
            }
        }

        // Apply additional filters if provided
        if (req.query.status) {
            query.admissionStatus = req.query.status;
        }

        // Multi-select filters
        if (req.query.course) {
            const courses = req.query.course.split(',');
            query.course = { $in: courses };
        }

        if (req.query.class) {
            const classes = req.query.class.split(',');
            query.class = { $in: classes };
        }

        if (req.query.examTag) {
            const examTags = req.query.examTag.split(',');
            query.examTag = { $in: examTags };
        }

        const admissions = await Admission.find(query)
            .populate('student')
            .populate('course')
            .populate('class')
            .populate('board')
            .populate('examTag')
            .populate('department')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json(admissions);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
