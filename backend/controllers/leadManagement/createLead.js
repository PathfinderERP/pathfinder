import LeadManagement from "../../models/LeadManagement.js";

export const createLead = async (req, res) => {
    try {
        const {
            name,
            email,
            phoneNumber,
            schoolName,
            className,
            centre,
            course,
            source,
            targetExam,
            leadType,
            leadResponsibility
        } = req.body;

        if (!name || !email || !schoolName) {
            return res.status(400).json({ message: "Required fields are missing." });
        }

        const leadData = {
            name,
            email,
            phoneNumber,
            schoolName,
            source,
            targetExam,
            leadType,
            leadResponsibility
        };

        if (className) leadData.className = className;
        if (centre) leadData.centre = centre;
        if (course) leadData.course = course;
        if (req.body.board) leadData.board = req.body.board;

        const newLead = new LeadManagement(leadData);

        await newLead.save();

        // Populate references before sending response
        await newLead.populate(['className', 'centre', 'course', 'board']);

        res.status(201).json({
            message: "Lead created successfully",
            lead: newLead,
        });

    } catch (err) {
        console.error("Lead creation error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
