import Campaign from "../../models/Campaign.js";
import LeadManagement from "../../models/LeadManagement.js";
import CampaignLead from "../../models/CampaignLead.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import { uploadToR2, getSignedFileUrl } from "../../utils/r2Upload.js";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../../config/r2Config.js";

export const getCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find().lean();

        // Enhance campaigns with dynamic lead and admission counts
        const enhancedCampaigns = await Promise.all(campaigns.map(async (campaign) => {
            // Count leads linked to this campaign from both LeadManagement and unpushed CampaignLead
            const lmLeadsCount = await LeadManagement.countDocuments({ campaign: campaign._id });
            const clUnpushedCount = await CampaignLead.countDocuments({ campaign: campaign._id, isPushed: false });
            const totalLeadsCount = lmLeadsCount + clUnpushedCount;

            // Get all lead phone numbers for this campaign
            const [lmLeads, clLeads] = await Promise.all([
                LeadManagement.find({ campaign: campaign._id }).select('phoneNumber secondPhoneNumber').lean(),
                CampaignLead.find({ campaign: campaign._id, isPushed: false }).select('phoneNumber secondPhoneNumber').lean()
            ]);
            const campaignLeads = [...lmLeads, ...clLeads];

            const phoneNumbers = campaignLeads.map(l => l.phoneNumber).filter(Boolean);
            const secondPhoneNumbers = campaignLeads.map(l => l.secondPhoneNumber).filter(Boolean);
            const allPhones = [...new Set([...phoneNumbers, ...secondPhoneNumbers])];

            let admissionsCount = 0;
            if (allPhones.length > 0) {
                // Find student IDs matching these phone numbers
                const matchingStudents = await Student.find({
                    $or: [
                        { 'studentsDetails.mobileNum': { $in: allPhones } },
                        { 'studentsDetails.whatsappNumber': { $in: allPhones } }
                    ]
                }).select('_id').lean();

                const studentIds = matchingStudents.map(s => s._id);

                if (studentIds.length > 0) {
                    // Count admissions for these students
                    admissionsCount = await Admission.countDocuments({
                        student: { $in: studentIds }
                    });
                }
            }

            let signedImageLink = campaign.imageLink;
            if (signedImageLink) {
                signedImageLink = await getSignedFileUrl(signedImageLink);
            }

            let signedVideoLink = campaign.videoLink;
            if (signedVideoLink) {
                signedVideoLink = await getSignedFileUrl(signedVideoLink);
            }

            let signedMedia = campaign.uploadedMedia || [];
            if (signedMedia.length > 0) {
                signedMedia = await Promise.all(signedMedia.map(url => getSignedFileUrl(url)));
            }

            return {
                ...campaign,
                imageLink: signedImageLink,
                videoLink: signedVideoLink,
                uploadedMedia: signedMedia,
                leads: totalLeadsCount,
                admission: admissionsCount
            };
        }));

        res.status(200).json({
            message: "Campaigns fetched successfully",
            campaigns: enhancedCampaigns
        });
    } catch (err) {
        console.error("Error fetching campaigns:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const getCampaignLeadsDetails = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "Campaign ID is required." });
        }

        const campaign = await Campaign.findById(id).lean();
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found." });
        }

        // Fetch leads from LeadManagement (pushed leads)
        const pushedLeads = await LeadManagement.find({ campaign: id })
            .populate('className', 'name')
            .populate('centre', 'centreName name')
            .populate('course', 'name courseName')
            .populate('board', 'name boardName')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        // Fetch unpushed leads from CampaignLead
        const unpushedLeads = await CampaignLead.find({ campaign: id, isPushed: false })
            .populate('className', 'name')
            .populate('centre', 'centreName name')
            .populate('course', 'name courseName')
            .populate('board', 'name boardName')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        const formatLeadDoc = (l, isPushed) => {
            const classNameStr = l.className?.name || l.className?.className || (typeof l.className === 'string' && l.className.trim() ? l.className.trim() : '') || '—';
            const centreStr = l.centre?.centreName || l.centre?.name || (typeof l.centre === 'string' && l.centre.trim() ? l.centre.trim() : '') || '—';
            const courseStr = l.course?.courseName || l.course?.name || l.courseText || l.courseName || (typeof l.course === 'string' && l.course.trim() ? l.course.trim() : '') || '—';
            const boardStr = l.board?.boardName || l.board?.name || l.boardText || l.boardName || (typeof l.board === 'string' && l.board.trim() ? l.board.trim() : '') || '—';
            const leadType = (l.leadType || l.type || l.leadCategory || '').toUpperCase().trim();
            const email = (l.email || '').trim();
            const schoolName = (l.schoolName || l.school || '').trim();

            return {
                ...l,
                isPushed,
                email,
                schoolName,
                leadType,
                classNameStr,
                centreStr,
                courseStr,
                boardStr,
                uploaderName: l.createdBy?.name || l.marketingBy || l.leadResponsibility || 'System'
            };
        };

        const formattedPushed = pushedLeads.map(l => formatLeadDoc(l, true));
        const formattedUnpushed = unpushedLeads.map(l => formatLeadDoc(l, false));

        const allLeads = [...formattedUnpushed, ...formattedPushed];

        return res.status(200).json({
            message: "Campaign leads fetched successfully",
            campaign: {
                _id: campaign._id,
                adName: campaign.adName,
                platform: campaign.platform,
                creativeName: campaign.creativeName,
                budget: campaign.budget
            },
            summary: {
                total: allLeads.length,
                pushedCount: formattedPushed.length,
                unpushedCount: formattedUnpushed.length
            },
            leads: allLeads
        });
    } catch (err) {
        console.error("Error fetching campaign leads details:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const getCampaignPresignedUrl = async (req, res) => {
    try {
        const { fileName, fileType } = req.body;
        if (!fileName) {
            return res.status(400).json({ message: "fileName is required." });
        }
        const data = await getPresignedUploadUrl(fileName, fileType, "campaigns");
        res.status(200).json(data);
    } catch (err) {
        console.error("Error generating campaign presigned URL:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

const checkIsVideoFile = (file, url) => {
    if (file && file.mimetype && file.mimetype.startsWith('video/')) return true;
    if (file && file.originalname && /\.(mp4|webm|ogg|mov|m4v|avi|mkv)$/i.test(file.originalname)) return true;
    if (url && /\.(mp4|webm|ogg|mov|m4v|avi|mkv)(\?.*)?$/i.test(url)) return true;
    return false;
};

export const createCampaign = async (req, res) => {
    try {
        const { adName, platform, creativeName, duration, budget, cpc, startDate, endDate, totalLikes, totalViews, comments, shares, imageLink, videoLink, uploadedMedia } = req.body;

        if (!adName || !platform || budget === undefined || cpc === undefined || !startDate || !endDate) {
            return res.status(400).json({ message: "Required fields are missing." });
        }

        let mediaUrls = [];
        if (uploadedMedia) {
            let parsed = uploadedMedia;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (e) { parsed = [parsed]; }
            }
            if (Array.isArray(parsed)) {
                mediaUrls = [...parsed];
            }
        }

        let firstVideoUrl = mediaUrls.find(url => checkIsVideoFile(null, url)) || "";
        let firstImageUrl = mediaUrls.find(url => !checkIsVideoFile(null, url)) || "";

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const url = await uploadToR2(file, "campaigns");
                if (url) {
                    mediaUrls.push(url);
                    if (checkIsVideoFile(file, url)) {
                        if (!firstVideoUrl) firstVideoUrl = url;
                    } else {
                        if (!firstImageUrl) firstImageUrl = url;
                    }
                }
            }
        }

        const newCampaign = new Campaign({
            adName,
            platform,
            creativeName,
            duration,
            budget: Number(budget),
            cpc: Number(cpc),
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            totalLikes: totalLikes ? Number(totalLikes) : 0,
            totalViews: totalViews ? Number(totalViews) : 0,
            comments: comments ? Number(comments) : 0,
            shares: shares ? Number(shares) : 0,
            imageLink: imageLink || firstImageUrl || "",
            videoLink: videoLink || firstVideoUrl || "",
            uploadedMedia: mediaUrls,
            createdBy: req.user._id || req.user.id
        });

        await newCampaign.save();

        res.status(201).json({
            message: "Campaign created successfully",
            campaign: newCampaign
        });
    } catch (err) {
        console.error("Error creating campaign:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const deleteCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedCampaign = await Campaign.findByIdAndDelete(id);

        if (!deletedCampaign) {
            return res.status(404).json({ message: "Campaign not found." });
        }

        // Set campaign field in associated leads to null
        await LeadManagement.updateMany({ campaign: id }, { $set: { campaign: null } });

        res.status(200).json({
            message: "Campaign deleted successfully."
        });
    } catch (err) {
        console.error("Error deleting campaign:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const updateCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { adName, platform, creativeName, duration, budget, cpc, startDate, endDate, totalLikes, totalViews, comments, shares, imageLink, videoLink } = req.body;

        if (!adName || !platform || budget === undefined || cpc === undefined || !startDate || !endDate) {
            return res.status(400).json({ message: "Required fields are missing." });
        }

        let newMediaUrls = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const url = await uploadToR2(file, "campaigns");
                if (url) newMediaUrls.push(url);
            }
        }

        const updateData = {
            adName,
            platform,
            creativeName,
            duration,
            budget: Number(budget),
            cpc: Number(cpc),
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            totalLikes: totalLikes ? Number(totalLikes) : 0,
            totalViews: totalViews ? Number(totalViews) : 0,
            comments: comments ? Number(comments) : 0,
            shares: shares ? Number(shares) : 0,
            imageLink: imageLink || "",
            videoLink: videoLink || ""
        };

        let updateQuery = { $set: updateData };
        if (newMediaUrls.length > 0) {
            updateQuery.$push = { uploadedMedia: { $each: newMediaUrls } };
        }

        const updatedCampaign = await Campaign.findByIdAndUpdate(
            id,
            updateQuery,
            { new: true }
        );

        if (!updatedCampaign) {
            return res.status(404).json({ message: "Campaign not found." });
        }

        res.status(200).json({
            message: "Campaign updated successfully",
            campaign: updatedCampaign
        });
    } catch (err) {
        console.error("Error updating campaign:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// ── Run lifecycle: start / end / restart ────────────────────────────────────
export const runCampaignAction = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'start' | 'end' | 'restart'

        if (!['start', 'end', 'restart'].includes(action)) {
            return res.status(400).json({ message: "Invalid action. Must be start, end, or restart." });
        }

        const campaign = await Campaign.findById(id);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found." });
        }

        const now = new Date();
        const userName = req.user?.name || req.user?.email || "Unknown";

        // Determine new runStatus
        let newStatus;
        if (action === 'start') newStatus = 'running';
        else if (action === 'end') newStatus = 'ended';
        else newStatus = 'running'; // restart → running again

        // Update convenience timestamp fields
        const update = {
            runStatus: newStatus,
            $push: { runLog: { action, timestamp: now, by: userName } }
        };
        if (action === 'start') update.lastStartedAt = now;
        if (action === 'end') update.lastEndedAt = now;
        if (action === 'restart') update.lastRestartedAt = now;

        const updated = await Campaign.findByIdAndUpdate(id, update, { new: true });

        res.status(200).json({
            message: `Campaign ${action}ed successfully.`,
            campaign: updated
        });
    } catch (err) {
        console.error("Error running campaign action:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const uploadCampaignMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const files = req.files; // expecting multiple files potentially

        if (!files || files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        const campaign = await Campaign.findById(id);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        const bucketName = process.env.R2_BUCKET_NAME || "telecalleraudio"; // or another bucket if configured
        const uploadedUrls = [];

        for (const file of files) {
            const fileName = `campaigns/${id}_${Date.now()}_${file.originalname}`;

            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
            }));

            // Generate a 7-day presigned URL, matching the approach used in uploadRecording
            const presignedUrl = await getSignedUrl(
                s3Client,
                new GetObjectCommand({ Bucket: bucketName, Key: fileName }),
                { expiresIn: 604800 }
            );

            uploadedUrls.push(presignedUrl);
        }

        // Add to campaign
        const updatedCampaign = await Campaign.findByIdAndUpdate(
            id,
            { $push: { uploadedMedia: { $each: uploadedUrls } } },
            { new: true }
        );

        res.status(200).json({
            message: "Media uploaded successfully",
            urls: uploadedUrls,
            campaign: updatedCampaign
        });
    } catch (err) {
        console.error("Error uploading campaign media:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const deleteCampaignMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const { mediaIndex, mediaUrl } = req.body;

        const campaign = await Campaign.findById(id);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        let updatedMedia = [...(campaign.uploadedMedia || [])];

        if (typeof mediaIndex === 'number' && mediaIndex >= 0 && mediaIndex < updatedMedia.length) {
            updatedMedia.splice(mediaIndex, 1);
        } else if (mediaUrl) {
            updatedMedia = updatedMedia.filter(url => url !== mediaUrl);
        } else {
            return res.status(400).json({ message: "Media index or URL is required" });
        }

        campaign.uploadedMedia = updatedMedia;
        await campaign.save();

        res.status(200).json({
            message: "Media deleted successfully",
            campaign
        });
    } catch (err) {
        console.error("Error deleting campaign media:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const replaceCampaignMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const { mediaIndex } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "No replacement file provided" });
        }

        const idx = parseInt(mediaIndex, 10);
        if (isNaN(idx) || idx < 0) {
            return res.status(400).json({ message: "Valid media index is required" });
        }

        const campaign = await Campaign.findById(id);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        if (idx >= (campaign.uploadedMedia || []).length) {
            return res.status(400).json({ message: "Invalid media index" });
        }

        const bucketName = process.env.R2_BUCKET_NAME || "telecalleraudio";
        const fileName = `campaigns/${id}_${Date.now()}_${file.originalname}`;

        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
        }));

        const presignedUrl = await getSignedUrl(
            s3Client,
            new GetObjectCommand({ Bucket: bucketName, Key: fileName }),
            { expiresIn: 604800 }
        );

        campaign.uploadedMedia[idx] = presignedUrl;
        campaign.markModified('uploadedMedia');
        await campaign.save();

        res.status(200).json({
            message: "Media replaced successfully",
            campaign
        });
    } catch (err) {
        console.error("Error replacing campaign media:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

