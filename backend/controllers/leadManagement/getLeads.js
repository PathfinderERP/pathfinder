import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import mongoose from "mongoose";
import CentreSchema from "../../models/Master_data/Centre.js";
import Boards from "../../models/Master_data/Boards.js";
import Course from "../../models/Master_data/Courses.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../../config/r2Config.js";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";

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
        const query = await buildLeadQuery(req.query, req.user);

        const totalLeads = await LeadManagement.countDocuments(query);
        const contactedCount = await LeadManagement.countDocuments({ ...query, followUps: { $exists: true, $not: { $size: 0 } } });
        const remainingCount = await LeadManagement.countDocuments({ ...query, followUps: { $size: 0 } });

        const walkInQuery = { ...query };
        if (query.$and) {
            walkInQuery.$and = [...query.$and];
        }
        if (query.$or) {
            walkInQuery.$or = [...query.$or];
        }

        if (walkInQuery.$or) {
            walkInQuery.$and = walkInQuery.$and || [];
            walkInQuery.$and.push({
                $or: [
                    { isWalkIn: true },
                    { source: { $regex: /^walk[- ]?in$/i } }
                ]
            });
        } else {
            walkInQuery.$or = [
                { isWalkIn: true },
                { source: { $regex: /^walk[- ]?in$/i } }
            ];
        }
        const walkInCount = await LeadManagement.countDocuments(walkInQuery);

        const sortOption = query.nextFollowUpDate ? { nextFollowUpDate: 1 } : { isPriority: -1, createdAt: -1 };

        const leads = await LeadManagement.find(query)
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName')
            .populate('board', 'boardCourse')
            .populate('campaign', 'adName')
            .populate('createdBy', 'name')
            .sort(sortOption)
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
                remainingCount,
                walkInCount
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
            .populate('board', 'boardCourse')
            .populate('campaign', 'adName')
            .populate('createdBy', 'name');

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

export const getDistinctSchools = async (req, res) => {
    try {
        // Build user-scoped query — non-SuperAdmin users will only see schools
        // from leads they created or are assigned to (via buildLeadQuery access control).
        const baseQuery = await buildLeadQuery({}, req.user);

        // Add schoolName existence constraint on top of user scope
        baseQuery.schoolName = { $exists: true, $nin: [null, ""] };

        const schools = await LeadManagement.distinct("schoolName", baseQuery);
        const cleanSchools = schools.filter(s => s && s.trim() !== "");
        cleanSchools.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        res.status(200).json({ success: true, schools: cleanSchools });
    } catch (err) {
        console.error("Error fetching distinct schools:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

/**
 * Returns all distinct non-empty source values present in the LeadManagement collection.
 * Used by the frontend to enrich the Source filter with values beyond the master Sources list.
 */
export const getDistinctSources = async (req, res) => {
    try {
        const sources = await LeadManagement.distinct("source");
        const clean = sources
            .filter(s => s && typeof s === "string" && s.trim() !== "")
            .map(s => s.trim())
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
        res.status(200).json({ success: true, sources: clean });
    } catch (err) {
        console.error("Error fetching distinct lead sources:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

