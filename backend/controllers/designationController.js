import Designation from "../models/Master_data/Designation.js";

// Get all designations
export const getDesignations = async (req, res) => {
    try {
        const designations = await Designation.find({ isActive: true })
            .populate("department", "departmentName")
            .sort({ name: 1 });
        res.status(200).json(designations);
    } catch (error) {
        console.error("Error fetching designations:", error);
        res.status(500).json({ message: "Error fetching designations", error: error.message });
    }
};

// Get single designation
export const getDesignationById = async (req, res) => {
    try {
        const designation = await Designation.findById(req.params.id).populate("department", "departmentName");
        if (!designation) {
            return res.status(404).json({ message: "Designation not found" });
        }
        res.status(200).json(designation);
    } catch (error) {
        console.error("Error fetching designation:", error);
        res.status(500).json({ message: "Error fetching designation", error: error.message });
    }
};

// Create designation
export const createDesignation = async (req, res) => {
    try {
        const { name, description, department } = req.body;
        const designation = new Designation({ name, description, department });
        await designation.save();
        res.status(201).json({ message: "Designation created successfully", designation });
    } catch (error) {
        console.error("Error creating designation:", error);
        res.status(500).json({ message: "Error creating designation", error: error.message });
    }
};

// Update designation
export const updateDesignation = async (req, res) => {
    try {
        const { name, description, department, isActive } = req.body;
        const designation = await Designation.findByIdAndUpdate(
            req.params.id,
            { name, description, department, isActive },
            { new: true, runValidators: true }
        );
        if (!designation) {
            return res.status(404).json({ message: "Designation not found" });
        }
        res.status(200).json({ message: "Designation updated successfully", designation });
    } catch (error) {
        console.error("Error updating designation:", error);
        res.status(500).json({ message: "Error updating designation", error: error.message });
    }
};

// Delete designation
export const deleteDesignation = async (req, res) => {
    try {
        const designation = await Designation.findByIdAndDelete(req.params.id);
        if (!designation) {
            return res.status(404).json({ message: "Designation not found" });
        }
        res.status(200).json({ message: "Designation deleted successfully" });
    } catch (error) {
        console.error("Error deleting designation:", error);
        res.status(500).json({ message: "Error deleting designation", error: error.message });
    }
};
