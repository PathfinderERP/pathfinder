import mongoose from "mongoose";
import User from "../../../models/User.js";
import Employee from "../../../models/HR/Employee.js";
import { getSignedFileUrl } from "../../../utils/r2Upload.js";

export const getAllAdminsBySuperAdmin = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).populate("centres", "centreName enterCode");

    res.status(200).json({
      message: "List of all admin users",
      count: admins.length,
      admins,
    });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllTeachersBySuperAdmin = async (req, res) => {
  try {
    const teachers = await User.find({ role: "teacher" }).populate("centres", "centreName enterCode");

    res.status(200).json({
      message: "List of all teachers users",
      count: teachers.length,
      teachers,
    });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllUsersBySuperAdmin = async (req, res) => {
  try {
    const requestingUser = req.user;
    const isSuperAdmin = requestingUser.role === "superAdmin" || requestingUser.role === "Super Admin";

    let query = {};

    const userRole = (requestingUser.role || "").toLowerCase().replace(/\s+/g, "");
    const isUnrestricted = ["superadmin", "admin", "super admin"].includes(userRole);

    // If not unrestricted, further filter to show only users who share the same centers
    if (!isUnrestricted) {
      const userCentreIds = (requestingUser.centres || []).map(c => (c._id || c).toString());

      if (userCentreIds.length > 0) {
        // Find users who share any of the same centers
        const centreObjectIds = userCentreIds.map(id => {
          try { return new mongoose.Types.ObjectId(id); } catch (e) { return null; }
        }).filter(id => id);

        // Match if any center ID overlaps (as string or ObjectId)
        query.centres = { $in: [...userCentreIds, ...centreObjectIds] };
      } else {
        // If user has no centers, they can only see themselves
        query._id = requestingUser._id;
      }
    }

    // Fetch users based on query, populate centre details
    const users = await User.find(query)
      .populate("centres", "centreName enterCode")
      .populate("assignedScript", "scriptName scriptContent")
      .select("-password")
      .lean();

    // Enrich users with employee data (profile image)
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      const employee = await Employee.findOne({ user: user._id });
      let profileImageUrl = null;
      if (employee?.profileImage) {
        profileImageUrl = await getSignedFileUrl(employee.profileImage);
      }

      return {
        ...user,
        profileImage: profileImageUrl,
        mobNum: user.mobNum || employee?.phoneNumber
      };
    }));

    res.status(200).json({
      message: "List of all users based on access permissions",
      count: enrichedUsers.length,
      users: enrichedUsers,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};
