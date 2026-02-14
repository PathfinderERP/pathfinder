import CenterTagging from "../../models/Finance/CenterTagging.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import User from "../../models/User.js";

// @desc    Get all centres with their tagging status
// @route   GET /api/finance/center-tagging
// @access  Private
export const getCenterTaggings = async (req, res) => {
    try {
        let authorizedCentreIds = [];
        if (req.user.role !== "superAdmin") {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            authorizedCentreIds = currentUser ? currentUser.centres.map(c => c._id || c) : [];
        }
        const centres = await CentreSchema.find(req.user.role !== "superAdmin" ? { _id: { $in: authorizedCentreIds } } : {}).sort({ centreName: 1 });
        const taggings = await CenterTagging.find()
            .populate('centre', 'centreName')
            .populate('headCentre', 'centreName');

        const result = centres.map(centre => {
            const tagging = taggings.find(t => t.centre._id.toString() === centre._id.toString());
            return {
                _id: centre._id,
                centreName: centre.centreName,
                taggedHeadCentre: tagging ? tagging.headCentre.centreName : "Not Tagged",
                headCentreId: tagging ? tagging.headCentre._id : null
            };
        });

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: "Error fetching center taggings", error: error.message });
    }
};

// @desc    Tag a center to a head center
// @route   POST /api/finance/center-tagging
// @access  Private
export const tagCenter = async (req, res) => {
    try {
        const { centreId, headCentreId } = req.body;

        if (!centreId || !headCentreId) {
            return res.status(400).json({ message: "Centre ID and Head Centre ID are required" });
        }

        // Center Visibility Restriction
        if (req.user.role !== "superAdmin") {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentres = (currentUser ? currentUser.centres : []).map(c => c._id?.toString() || c.toString());
            if (!userCentres.includes(centreId)) {
                return res.status(403).json({ message: "Access denied: You cannot tag this center" });
            }
        }

        let tagging = await CenterTagging.findOne({ centre: centreId });

        if (tagging) {
            tagging.headCentre = headCentreId;
            await tagging.save();
        } else {
            tagging = new CenterTagging({
                centre: centreId,
                headCentre: headCentreId
            });
            await tagging.save();
        }

        const updatedTagging = await CenterTagging.findById(tagging._id)
            .populate('centre', 'centreName')
            .populate('headCentre', 'centreName');

        res.status(200).json({
            message: "Center tagged successfully",
            tagging: updatedTagging
        });
    } catch (error) {
        res.status(500).json({ message: "Error tagging center", error: error.message });
    }
};

// @desc    Get all available head centres (all centres for now)
// @route   GET /api/finance/center-tagging/heads
// @access  Private
export const getAvailableHeadCentres = async (req, res) => {
    try {
        let authorizedCentreIds = [];
        if (req.user.role !== "superAdmin") {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            authorizedCentreIds = currentUser ? currentUser.centres.map(c => c._id || c) : [];
        }
        const centres = await CentreSchema.find(req.user.role !== "superAdmin" ? { _id: { $in: authorizedCentreIds } } : {}, 'centreName').sort({ centreName: 1 });
        res.status(200).json(centres);
    } catch (error) {
        res.status(500).json({ message: "Error fetching head centres", error: error.message });
    }
};
