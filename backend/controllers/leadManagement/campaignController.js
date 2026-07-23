import Campaign from "../../models/Campaign.js";
import LeadManagement from "../../models/LeadManagement.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../../config/r2Config.js";

export const getCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find().lean();
        
        // Enhance campaigns with dynamic lead and admission counts
        const enhancedCampaigns = await Promise.all(campaigns.map(async (campaign) => {
            // Count leads linked to this campaign
            const leadsCount = await LeadManagement.countDocuments({ campaign: campaign._id });
            
            // Get all lead phone numbers for this campaign
            const campaignLeads = await LeadManagement.find({ campaign: campaign._id })
                .select('phoneNumber secondPhoneNumber')
                .lean();
                
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
            
            return {
                ...campaign,
                leads: leadsCount,
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

export const createCampaign = async (req, res) => {
    try {
        const { adName, platform, creativeName, duration, budget, cpc, startDate, endDate, totalLikes, comments, shares, imageLink, videoLink } = req.body;
        
        if (!adName || !platform || budget === undefined || cpc === undefined || !startDate || !endDate) {
            return res.status(400).json({ message: "Required fields are missing." });
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
            comments: comments ? Number(comments) : 0,
            shares: shares ? Number(shares) : 0,
            imageLink: imageLink || "",
            videoLink: videoLink || "",
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
        const { adName, platform, creativeName, duration, budget, cpc, startDate, endDate, totalLikes, comments, shares, imageLink, videoLink } = req.body;
        
        if (!adName || !platform || budget === undefined || cpc === undefined || !startDate || !endDate) {
            return res.status(400).json({ message: "Required fields are missing." });
        }
        
        const updatedCampaign = await Campaign.findByIdAndUpdate(
            id,
            {
                adName,
                platform,
                creativeName,
                duration,
                budget: Number(budget),
                cpc: Number(cpc),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalLikes: totalLikes ? Number(totalLikes) : 0,
                comments: comments ? Number(comments) : 0,
                shares: shares ? Number(shares) : 0,
                imageLink: imageLink || "",
                videoLink: videoLink || ""
            },
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
        if (action === 'start')    newStatus = 'running';
        else if (action === 'end') newStatus = 'ended';
        else                       newStatus = 'running'; // restart → running again

        // Update convenience timestamp fields
        const update = {
            runStatus: newStatus,
            $push: { runLog: { action, timestamp: now, by: userName } }
        };
        if (action === 'start')   update.lastStartedAt   = now;
        if (action === 'end')     update.lastEndedAt     = now;
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
