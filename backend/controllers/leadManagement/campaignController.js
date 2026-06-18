import Campaign from "../../models/Campaign.js";
import LeadManagement from "../../models/LeadManagement.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";

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
        const { adName, platform, creativeName, duration, budget, cpc, startDate, endDate } = req.body;
        
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
