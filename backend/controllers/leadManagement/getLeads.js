import LeadManagement from "../../models/LeadManagement.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../../config/r2Config.js";

// Helper function to refresh presigned URLs for recordings
const refreshAudioUrls = async (leads) => {
    const bucketName = process.env.R2_BUCKET_NAME || "telecalleraudio";

    for (const lead of leads) {
        if (lead.recordings && lead.recordings.length > 0) {
            for (const recording of lead.recordings) {
                if (recording.audioUrl) {
                    try {
                        // Extract the key from the existing URL or use a stored key
                        // Assuming the key is stored or can be extracted
                        const urlParts = recording.audioUrl.split('/');
                        const keyIndex = urlParts.findIndex(part => part === 'recordings');
                        if (keyIndex !== -1 && urlParts[keyIndex + 1]) {
                            const key = `recordings/${urlParts[keyIndex + 1].split('?')[0]}`;

                            // Generate fresh presigned URL (valid for 7 days)
                            const freshUrl = await getSignedUrl(
                                s3Client,
                                new GetObjectCommand({ Bucket: bucketName, Key: key }),
                                { expiresIn: 604800 } // 7 days
                            );

                            recording.audioUrl = freshUrl;
                        }
                    } catch (error) {
                        console.error(`Failed to refresh URL for recording:`, error);
                        // Keep the old URL if refresh fails
                    }
                }
            }
        }
    }

    return leads;
};

export const getLeads = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build Filter
        const { search, leadType, source, centre, course, leadResponsibility } = req.query;
        const query = {};

        if (leadType) query.leadType = leadType;
        if (source) query.source = source;
        if (course) query.course = course;
        if (leadResponsibility) query.leadResponsibility = leadResponsibility;

        // Exclude counseled leads from the main list
        query.isCounseled = { $ne: true };

        // Centre-based access control
        if (req.user.role !== 'superAdmin') {
            // Fetch user's centres from database since JWT doesn't include them
            const User = (await import('../../models/User.js')).default;
            const userDoc = await User.findById(req.user.id).select('centres role name');

            if (!userDoc) {
                return res.status(401).json({ message: "User not found" });
            }

            console.log(`Lead Management - User ${userDoc.name} (${userDoc.role}) centres:`, userDoc.centres);

            // Telecallers: Can only see their own assigned leads
            if (userDoc.role === 'telecaller') {
                query.leadResponsibility = userDoc.name;
            }

            // For all non-superAdmin users: Filter by assigned centres
            const userCentreIds = userDoc.centres || [];

            if (userCentreIds.length === 0) {
                // User has no centres assigned, return empty
                console.log(`Lead Management - User ${userDoc.name} has no centres assigned`);
                return res.status(200).json({
                    message: "Leads fetched successfully",
                    leads: [],
                    pagination: {
                        currentPage: page,
                        totalPages: 0,
                        totalLeads: 0,
                        limit
                    }
                });
            }

            // Filter by allowed centres
            query.centre = { $in: userCentreIds };

            // If a specific centre is requested via query param, validate it
            if (centre) {
                if (userCentreIds.map(c => c.toString()).includes(centre)) {
                    query.centre = centre;
                } else {
                    // User trying to access unauthorized centre
                    console.log(`Lead Management - User ${userDoc.name} tried to access unauthorized centre: ${centre}`);
                    return res.status(403).json({
                        message: "Access denied. You don't have permission to view this centre's leads."
                    });
                }
            }
        } else {
            // SuperAdmin can filter by centre if specified
            if (centre) {
                query.centre = centre;
            }
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phoneNumber: { $regex: search, $options: "i" } },
                { schoolName: { $regex: search, $options: "i" } },
            ];
        }

        console.log("Lead Management - Final query:", JSON.stringify(query, null, 2));

        const totalLeads = await LeadManagement.countDocuments(query);

        const leads = await LeadManagement.find(query)
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Refresh expired audio URLs
        const leadsWithFreshUrls = await refreshAudioUrls(leads);

        res.status(200).json({
            message: "Leads fetched successfully",
            leads: leadsWithFreshUrls,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalLeads / limit),
                totalLeads,
                limit
            }
        });

    } catch (err) {
        console.error("Error fetching leads:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const getLeadById = async (req, res) => {
    try {
        const { id } = req.params;

        const lead = await LeadManagement.findById(id)
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName');

        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        res.status(200).json({
            message: "Lead fetched successfully",
            lead,
        });

    } catch (err) {
        console.error("Error fetching lead:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
