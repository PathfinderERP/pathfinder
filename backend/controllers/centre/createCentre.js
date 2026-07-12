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
            locations, // New field
            status,
            centreCode
        } = req.body;

        if (!centreName || !enterCode || !state || !email || !phoneNumber || !salesPassword) {
            return res.status(400).json({ message: "Required fields are missing." });
        }

        // Normalize centreCode: convert "1" -> "01", "12" -> "12"
        let normalizedCode = undefined;
        if (centreCode !== undefined && centreCode !== "") {
            const num = parseInt(centreCode, 10);
            if (isNaN(num) || num < 1 || num > 99) {
                return res.status(400).json({ message: "2-Digit Code must be a number between 1 and 99." });
            }
            normalizedCode = num < 10 ? `0${num}` : `${num}`;

            // Check uniqueness
            const existing = await CentreSchema.findOne({ centreCode: normalizedCode });
            if (existing) {
                return res.status(400).json({ message: `Code ${normalizedCode} is already assigned to "${existing.centreName}".` });
            }
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
            locations,
            status,
            ...(normalizedCode !== undefined && { centreCode: normalizedCode })
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
