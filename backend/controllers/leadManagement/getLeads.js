import LeadManagement from "../../models/LeadManagement.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import Boards from "../../models/Master_data/Boards.js";
import Course from "../../models/Master_data/Courses.js";
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
        const { search, leadType, source, centre, course, leadResponsibility, board, className, fromDate, toDate, feedback } = req.query;
        const query = {};

        if (feedback) {
            const feedbackArray = Array.isArray(feedback) ? feedback : [feedback];
            query.followUps = {
                $elemMatch: { feedback: { $in: feedbackArray.map(f => f) } }
            };
        }

        // Date range filter
        if (fromDate || toDate) {
            query.createdAt = {};
            if (fromDate) query.createdAt.$gte = new Date(fromDate);
            if (toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        if (leadType) query.leadType = Array.isArray(leadType) ? { $in: leadType } : leadType;
        if (source) query.source = Array.isArray(source) ? { $in: source } : source;
        if (course) query.course = Array.isArray(course) ? { $in: course } : course;
        if (board) query.board = Array.isArray(board) ? { $in: board } : board;
        if (className) query.className = Array.isArray(className) ? { $in: className } : className;

        if (leadResponsibility) {
            query.leadResponsibility = Array.isArray(leadResponsibility)
                ? { $in: leadResponsibility }
                : { $regex: leadResponsibility, $options: "i" };
        }

        // Filter by Follow-up Status (Contacted vs Remaining)
        const { followUpStatus } = req.query;
        if (followUpStatus === 'contacted') {
            query.followUps = { $exists: true, $not: { $size: 0 } };
        } else if (followUpStatus === 'remaining') {
            query.followUps = { $size: 0 };
        }

        // Exclude counseled leads from dashboard stats to match lead list logic
        query.isCounseled = { $ne: true };

        // Centre-based access control
        const userRole = req.user.role?.toLowerCase();
        if (userRole !== 'superadmin' && userRole !== 'super admin') {
            // Fetch user's centres from database since JWT doesn't include them
            const User = (await import('../../models/User.js')).default;
            const userDoc = await User.findById(req.user.id).select('centres role name');

            if (!userDoc) {
                return res.status(401).json({ message: "User not found" });
            }

            console.log(`Lead Management - User ${userDoc.name} (${userDoc.role}) centres:`, userDoc.centres);

            console.log(`Lead Management - User ${userDoc.name} (${userDoc.role}) centres:`, userDoc.centres);

            // Access Control: User can see leads they created OR leads in their centres
            // Telecallers additionally see leads assigned to them.
            const userCentreIds = userDoc.centres || [];

            const orConditions = [
                { createdBy: userDoc._id }
            ];

            if (userDoc.role === 'telecaller') {
                const escapedName = userDoc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                orConditions.push({ leadResponsibility: { $regex: new RegExp(`^${escapedName}$`, "i") } });
            }

            if (userCentreIds.length > 0) {
                orConditions.push({ centre: { $in: userCentreIds } });
            }

            // Combined restriction
            query.$and = query.$and || [];
            query.$and.push({ $or: orConditions });

            // Handle specific centre filter from query if requested
            if (centre) {
                const requestedCentres = Array.isArray(centre) ? centre : [centre];
                // For non-superAdmin, specific centre filter only works within their orConditions
                // But we already have the centre logic inside orConditions.
                // If they specify a centre, we should further refine the centre part of the query.
                // Actually, the standard way is to just let the main query.centre filter it.
                const validRequestedCentres = requestedCentres.filter(reqCentre =>
                    userCentreIds.some(allowedCentre => allowedCentre.toString() === reqCentre.toString())
                );

                if (validRequestedCentres.length > 0) {
                    query.centre = { $in: validRequestedCentres };
                } else {
                    // If they requested centres they don't have access to, they still see their created leads
                    // so we don't return 403, we just don't add the centre filter.
                    // Or we add a filter that matches nothing for centre.
                    query.centre = { $in: [] };
                }
            }
        } else {
            // SuperAdmin can filter by centre if specified
            if (centre) {
                query.centre = centre;
            }
        }

        if (search) {
            const searchOr = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phoneNumber: { $regex: search, $options: "i" } },
                { schoolName: { $regex: search, $options: "i" } },
            ];

            if (query.$and) {
                query.$and.push({ $or: searchOr });
            } else if (query.$or) {
                // If there's already an $or, we must wrap both in an $and to preserve logic
                query.$and = [{ $or: query.$or }, { $or: searchOr }];
                delete query.$or;
            } else {
                query.$or = searchOr;
            }
        }



        const totalLeads = await LeadManagement.countDocuments(query);
        const contactedCount = await LeadManagement.countDocuments({ ...query, followUps: { $exists: true, $not: { $size: 0 } } });
        const remainingCount = await LeadManagement.countDocuments({ ...query, followUps: { $size: 0 } });

        const leads = await LeadManagement.find(query)
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName')
            .populate('board', 'boardCourse')
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
            },
            stats: {
                contactedCount,
                remainingCount
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
            .populate('course', 'courseName')
            .populate('board', 'boardCourse');

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
