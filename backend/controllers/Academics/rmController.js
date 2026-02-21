import User from "../../models/User.js";
import Centre from "../../models/Master_data/Centre.js";
import Employee from "../../models/HR/Employee.js";
import bcrypt from "bcrypt";

// Create RM
export const createRM = async (req, res) => {
    try {
        const {
            name,
            email,
            mobNum,
            employeeId,
            password = "password123", // Default if not provided
            centreId
        } = req.body;

        // Validation
        if (!name || !email || !employeeId) {
            return res.status(400).json({ message: "Name, Email, and Employee ID are required." });
        }

        const rmMobile = mobNum || "0000000000"; // Default mobile due to UI restrictions

        const existingUser = await User.findOne({ $or: [{ email }, { employeeId }] });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email or Employee ID already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let centres = [];
        if (centreId) {
            centres.push(centreId);
        }

        const newRM = new User({
            name,
            email,
            mobNum: rmMobile,
            employeeId,
            password: hashedPassword,
            role: "RM",
            centres
        });

        await newRM.save();
        res.status(201).json({ message: "RM created successfully", rm: newRM });

    } catch (error) {
        console.error("Create RM Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get All RMs
export const getAllRMs = async (req, res) => {
    try {
        let query = { role: "RM" };

        if (req.user.role !== 'superAdmin') {
            const allowedCentreIds = req.user.centres || [];
            if (allowedCentreIds.length > 0) {
                query.centres = { $in: allowedCentreIds };
            } else {
                return res.status(200).json([]);
            }
        }

        const rms = await User.find(query)
            .populate("centres", "centreName unqiue_code")
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json(rms);
    } catch (error) {
        console.error("Get RMs Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update RM
export const updateRM = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, mobNum, employeeId, centreId } = req.body;

        const updates = { name, email, mobNum, employeeId };

        if (centreId !== undefined) {
            updates.centres = centreId ? [centreId] : [];
        }

        const updatedRM = await User.findByIdAndUpdate(id, updates, { new: true });

        if (!updatedRM) {
            return res.status(404).json({ message: "RM not found" });
        }
        res.status(200).json({ message: "RM updated successfully", rm: updatedRM });

    } catch (error) {
        console.error("Update RM Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete RM
export const deleteRM = async (req, res) => {
    try {
        const { id } = req.params;
        const rm = await User.findById(id);

        if (!rm) {
            return res.status(404).json({ message: "RM not found" });
        }

        // Prevent deleting the last SuperAdmin
        if (rm.role === "superAdmin") {
            const superAdminCount = await User.countDocuments({ role: "superAdmin" });
            if (superAdminCount <= 1) {
                return res.status(400).json({ message: "Cannot delete the last SuperAdmin" });
            }
        }

        // Delete associated Employee record if it exists
        await Employee.findOneAndDelete({ user: id });

        await User.findByIdAndDelete(id);

        res.status(200).json({ message: "RM and associated Employee record deleted successfully" });
    } catch (error) {
        console.error("Delete RM Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
