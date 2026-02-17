import bcrypt from "bcryptjs";
import User from "../../../models/User.js";
import Employee from "../../../models/HR/Employee.js";
import { generateToken } from "../../../middleware/auth.js";
import { getSignedFileUrl } from "../../../utils/r2Upload.js";

export default async function adminTeacherLogin(req, res) {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).populate("centres", "centreName enterCode");

        if (!user) {
            return res.status(400).json({ message: "User does not exist" });
        }

        if (user.isActive === false) {
            return res.status(403).json({ message: "Your account has been deactivated. Please contact support." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const employee = await Employee.findOne({ user: user._id });
        const profileImageUrl = employee?.profileImage ? await getSignedFileUrl(employee.profileImage) : null;
        const token = generateToken(user);

        // --- Synchronized External Portal Authentication ---
        let portalToken = null;
        try {
            const portalResponse = await fetch("https://pathfinder-student-portal.onrender.com/api/token/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: email, password: password })
            });
            if (portalResponse.ok) {
                const portalData = await portalResponse.json();
                portalToken = portalData.access;
            }
        } catch (portalError) {
            console.error("External portal login failed:", portalError.message);
            // We don't block the main login if the external portal is down
        }
        // ---------------------------------------------------

        res.status(200).json({
            message: "Login successfully",
            token,
            portalToken, // Added portal token
            user: {
                id: user._id,
                name: user.name,
                employeeId: user.employeeId,
                role: user.role,
                centres: user.centres,
                profileImage: profileImageUrl,
                permissions: user.permissions || [],
                granularPermissions: user.granularPermissions || {},
                canEditUsers: user.canEditUsers || false,
                canDeleteUsers: user.canDeleteUsers || false
            }
        });
    } catch (error) {
        console.log("Error in login:", error);
        res.status(500).json({ message: "Error in login" });
    }
}