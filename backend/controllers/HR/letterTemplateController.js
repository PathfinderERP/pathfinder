import LetterTemplate from "../../models/HR/LetterTemplate.js";

// @desc    Get all templates for a letter type
// @route   GET /api/hr/letter-templates/:type
export const getTemplatesByType = async (req, res) => {
    try {
        const { type } = req.params;
        const templates = await LetterTemplate.find({ type });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: "Error fetching templates" });
    }
};

// @desc    Create a new template
// @route   POST /api/hr/letter-templates
export const createTemplate = async (req, res) => {
    try {
        const { name, subject, body, type } = req.body;
        const newTemplate = new LetterTemplate({
            name,
            subject,
            body,
            type,
            createdBy: req.user?._id
        });
        await newTemplate.save();
        res.status(201).json(newTemplate);
    } catch (error) {
        res.status(500).json({ message: "Error creating template" });
    }
};

// @desc    Delete a template
// @route   DELETE /api/hr/letter-templates/:id
export const deleteTemplate = async (req, res) => {
    try {
        await LetterTemplate.findByIdAndDelete(req.params.id);
        res.json({ message: "Template deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting template" });
    }
};
