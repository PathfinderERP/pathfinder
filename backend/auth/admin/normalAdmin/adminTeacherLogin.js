import bcrypt from "bcryptjs";
import User from "../../../models/User.js";
import Employee from "../../../models/HR/Employee.js";
import { generateToken } from "../../../middleware/auth.js";
import { getSignedFileUrl } from "../../../controllers/HR/employeeController.js";

export default async function adminTeacherLogin(req, res) {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).populate("centres", "centreName enterCode");

        if (!user) {
            return res.status(400).json({ message: "User does not exist" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const employee = await Employee.findOne({ user: user._id });
        const profileImageUrl = employee?.profileImage ? await getSignedFileUrl(employee.profileImage) : null;
        const token = generateToken(user);

        res.status(200).json({
            message: "Login successfully",
            token,
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