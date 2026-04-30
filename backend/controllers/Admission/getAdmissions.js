import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import { getCache, setCache, generateCacheKey } from "../../utils/redisCache.js";

export const getAdmissions = async (req, res) => {
    try {
        let query = {};
        let allowedCentreNames = [];

        // Centre-based access control
        if (req.user.role !== 'superAdmin') {
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
                    query.centre = { $in: [] };
                }
            }
        } else {
            if (req.query.centre) {
                const requestedCentres = req.query.centre.split(',').map(c => c.trim());
                query.centre = { $in: requestedCentres };
            }
        }

        // Apply additional filters if provided
        if (req.query.status) query.admissionStatus = req.query.status;
        if (req.query.course) query.course = { $in: req.query.course.split(',') };
        if (req.query.class) query.class = { $in: req.query.class.split(',') };
        if (req.query.examTag) query.examTag = { $in: req.query.examTag.split(',') };

        // Date range filtering
        if (req.query.startDate || req.query.endDate) {
            query.admissionDate = {};
            if (req.query.startDate) query.admissionDate.$gte = new Date(req.query.startDate);
            if (req.query.endDate) {
                const end = new Date(req.query.endDate);
                end.setHours(23, 59, 59, 999);
                query.admissionDate.$lte = end;
            }
        }

        // REDIS CACHING LOGIC
        const cacheKey = generateCacheKey("admissions:list", {
            query: req.query,
            allowedCentres: allowedCentreNames,
            role: req.user.role
        });

        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            return res.status(200).json(cachedData);
        }

        // Fetch Normal Admissions if not in cache
        const normalAdmissions = await Admission.find(query)
            .populate({
                path: 'student',
                populate: [
                    { path: 'batches' },
                    { path: 'allocatedItems.allocatedBy', select: 'name' }
                ]
            })
            .populate('course')
            .populate('class')
            .populate('board')
            .populate('examTag')
            .populate('department')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .lean();

        // Save to cache (TTL: 10 minutes for this frequent list)
        await setCache(cacheKey, normalAdmissions, 600);

        res.status(200).json(normalAdmissions);
    } catch (err) {
        console.error("getAdmissions error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
