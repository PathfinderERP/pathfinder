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


        // let portalToken = null;
        // try {
        //     // Attempt 1: Using user's current password
        //     let portalResponse = await fetch("https://api.studypathportal.in/api/token/", {
        //         method: "POST",
        //         headers: { "Content-Type": "application/json" },
        //         body: JSON.stringify({ username: email, password: password })
        //     });

        //     if (!portalResponse.ok && password !== "000000") {
        //         // Attempt 2: Using default password fallback
        //         portalResponse = await fetch("https://api.studypathportal.in/api/token/", {
        //             method: "POST",
        //             headers: { "Content-Type": "application/json" },
        //             body: JSON.stringify({ username: email, password: "000000" })
        //         });
        //     }

        //     if (portalResponse.ok) {
        //         const portalData = await portalResponse.json();
        //         portalToken = portalData.access;
        //     } else {
        //         console.warn(`External portal login failed for ${email} on all password attempts.`);
        //     }
        // } catch (portalError) {
        //     console.error("External portal login networking error:", portalError.message);
        // }


        res.status(200).json({
            message: "Login successfully",
            token,
            // portalToken, // Now active to provide token to frontend
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