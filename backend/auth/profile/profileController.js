import User from "../../models/User.js";
import bcrypt from "bcrypt";

export const getMyProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId)
            .populate("centres", "centreName enterCode")
            .select("-password"); // Exclude password from response

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "Profile fetched successfully",
            user,
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, email, mobNum, currentPassword, newPassword } = req.body;

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // If updating password, verify current password first
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({
                    message: "Current password is required to set a new password"
                });
            }

            // Verify current password
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                return res.status(400).json({ message: "Current password is incorrect" });
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        // Update other fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (mobNum) user.mobNum = mobNum;

        await user.save();

        // Return updated user without password
        const updatedUser = await User.findById(userId)
            .populate("centres", "centreName enterCode")
            .select("-password");

        res.status(200).json({
            message: "Profile updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        console.error("Error updating profile:", error);

        // Handle duplicate email error
        if (error.code === 11000) {
            return res.status(400).json({ message: "Email already exists" });
        }

        res.status(500).json({ message: "Server error" });
    }
};
