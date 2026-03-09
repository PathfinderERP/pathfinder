import User from "../../models/User.js";
import Employee from "../../models/HR/Employee.js";
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
            // Check if there's a serious conflict (e.g. Email matches but Emp ID doesn't, or vice-versa)
            if (existingUser.email !== email || existingUser.employeeId !== employeeId) {
                return res.status(400).json({ 
                    message: "Conflict: Email or Employee ID belongs to another user. Please verify the details." 
                });
            }

            // Promote existing user to Class_Coordinator
            existingUser.role = "Class_Coordinator";
            
            if (centreId) {
                const centreIdStr = centreId.toString();
                if (!existingUser.centres.some(c => c.toString() === centreIdStr)) {
                    existingUser.centres.push(centreId);
                }
            }

            // Update name and mobile if they provided new ones
            if (name) existingUser.name = name;
            if (mobNum) existingUser.mobNum = mobNum;

            await existingUser.save();
            return res.status(200).json({ 
                message: "Existing user promoted to Class Coordinator successfully", 
                coordinator: existingUser 
            });
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

        const userRole = (req.user.role || "").toLowerCase().replace(/\s+/g, "");
        const privilegedRoles = ["superadmin", "super admin", "admin", "centerincharge", "zonalmanager", "zonalhead", "hr", "class_coordinator", "rm", "hod"];
        const isPrivileged = privilegedRoles.includes(userRole);

        if (userRole !== "superadmin" && userRole !== "super admin" && userRole !== "hr") {
            if (isPrivileged) {
                const allowedCentreIds = req.user.centres || [];
                if (allowedCentreIds.length > 0) {
                    query.centres = { $in: allowedCentreIds };
                } else {
                    query._id = req.user.id;
                }
            } else {
                query._id = req.user.id;
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
        const coordinator = await User.findById(id);

        if (!coordinator) {
            return res.status(404).json({ message: "Class Coordinator not found" });
        }

        // Prevent deleting the last SuperAdmin
        if (coordinator.role === "superAdmin") {
            const superAdminCount = await User.countDocuments({ role: "superAdmin" });
            if (superAdminCount <= 1) {
                return res.status(400).json({ message: "Cannot delete the last SuperAdmin" });
            }
        }

        // Delete associated Employee record if it exists
        await Employee.findOneAndDelete({ user: id });

        await User.findByIdAndDelete(id);

        res.status(200).json({ message: "Class Coordinator and associated Employee record deleted successfully" });
    } catch (error) {
        console.error("Delete Coordinator Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
