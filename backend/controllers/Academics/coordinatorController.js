import User from "../../models/User.js";
import bcrypt from "bcrypt";

// Create Class Coordinator
export const createCoordinator = async (req, res) => {
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

        const coordinatorMobile = mobNum || "0000000000";

        const existingUser = await User.findOne({ $or: [{ email }, { employeeId }] });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email or Employee ID already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let centres = [];
        if (centreId) {
            centres.push(centreId);
        }

        const newCoordinator = new User({
            name,
            email,
            mobNum: coordinatorMobile,
            employeeId,
            password: hashedPassword,
            role: "Class_Coordinator",
            centres
        });

        await newCoordinator.save();
        res.status(201).json({ message: "Class Coordinator created successfully", coordinator: newCoordinator });

    } catch (error) {
        console.error("Create Coordinator Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get All Class Coordinators
export const getAllCoordinators = async (req, res) => {
    try {
        let query = { role: "Class_Coordinator" };

        if (req.user.role !== 'superAdmin') {
            const allowedCentreIds = req.user.centres || [];
            if (allowedCentreIds.length > 0) {
                query.centres = { $in: allowedCentreIds };
            } else {
                return res.status(200).json([]);
            }
        }

        const coordinators = await User.find(query)
            .populate("centres", "centreName unqiue_code")
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json(coordinators);
    } catch (error) {
        console.error("Get Coordinators Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update Class Coordinator
export const updateCoordinator = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, mobNum, employeeId, centreId } = req.body;

        const updates = { name, email, mobNum, employeeId };

        if (centreId !== undefined) {
            updates.centres = centreId ? [centreId] : [];
        }

        const updatedCoordinator = await User.findByIdAndUpdate(id, updates, { new: true });

        if (!updatedCoordinator) {
            return res.status(404).json({ message: "Class Coordinator not found" });
        }
        res.status(200).json({ message: "Class Coordinator updated successfully", coordinator: updatedCoordinator });

    } catch (error) {
        console.error("Update Coordinator Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete Class Coordinator
export const deleteCoordinator = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedCoordinator = await User.findByIdAndDelete(id);

        if (!deletedCoordinator) {
            return res.status(404).json({ message: "Class Coordinator not found" });
        }
        res.status(200).json({ message: "Class Coordinator deleted successfully" });
    } catch (error) {
        console.error("Delete Coordinator Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
