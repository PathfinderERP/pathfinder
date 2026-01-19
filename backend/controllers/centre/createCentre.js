import CentreSchema from "../../models/Master_data/Centre.js";

export const createCentre = async (req, res) => {
    try {
        const {
            centreName,
            enterCode,
            state,
            email,
            phoneNumber,
            salesPassword,
            location,
            address,
            locationPreview,
            enterGstNo,
            enterCorporateOfficeAddress,
            enterCorporateOfficePhoneNumber,
            locations // New field
        } = req.body;

        if (!centreName || !enterCode || !state || !email || !phoneNumber || !salesPassword) {
            return res.status(400).json({ message: "Required fields are missing." });
        }

        const newCentre = new CentreSchema({
            centreName,
            enterCode,
            state,
            email,
            phoneNumber,
            salesPassword,
            location,
            address,
            locationPreview,
            enterGstNo,
            enterCorporateOfficeAddress,
            enterCorporateOfficePhoneNumber,
            locations // Save locations
        });

        await newCentre.save();

        res.status(201).json({
            message: "Centre created successfully",
            centre: newCentre,
        });

    } catch (err) {
        console.error("Centre creation error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
