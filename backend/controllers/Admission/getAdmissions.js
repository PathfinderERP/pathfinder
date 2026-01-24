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
                const requestedCentres = req.query.centre.split(',');
                // Filter requested centres to only include allowed ones
                const validRequestedCentres = requestedCentres.filter(c => allowedCentreNames.includes(c));
                
                if (validRequestedCentres.length > 0) {
                    query.centre = { $in: validRequestedCentres };
                } else {
                    // User trying to access unauthorized centre(s) ONLY, or invalid names
                    // Return empty or error. Since we have a base query restricted to allowedCentreNames, 
                    // if validRequestedCentres is empty but req.query.centre matches nothing allowed, 
                    // we can just let the base query run? NO, user wanted specific centres.
                    // If none are valid, return empty result (impossible condition)
                    query.centre = { $in: [] }; 
                }
            }
        } else {
            // SuperAdmin can filter by centre if specified
            if (req.query.centre) {
                const centreParam = req.query.centre;
                if (centreParam.includes(',')) {
                    query.centre = { $in: centreParam.split(',') };
                } else {
                    query.centre = centreParam;
                }
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
