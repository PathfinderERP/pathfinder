import MarketingRequirement from "../../models/Operations/MarketingRequirement.js";

export const createRequirement = async (req, res) => {
    try {
        const { leaflets, banners, books } = req.body;
        const requirement = new MarketingRequirement({
            leaflets: Number(leaflets) || 0,
            banners: Number(banners) || 0,
            books: Number(books) || 0,
            user: req.user?._id
        });
        await requirement.save();
        res.status(201).json({ success: true, data: requirement });
    } catch (error) {
        console.error("Error creating marketing requirement:", error);
        res.status(500).json({ success: false, message: "Error creating requirement", error: error.message });
    }
};

export const getRequirements = async (req, res) => {
    try {
        const requirements = await MarketingRequirement.find().populate('user', 'name email').sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: requirements });
    } catch (error) {
        console.error("Error fetching marketing requirements:", error);
        res.status(500).json({ success: false, message: "Error fetching requirements", error: error.message });
    }
};
