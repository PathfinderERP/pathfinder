import mongoose from "mongoose";
import User from "../../../models/User.js";
import Employee from "../../../models/HR/Employee.js";
import { getSignedFileUrl } from "../../../utils/r2Upload.js";

export const getAllAdminsBySuperAdmin = async (req, res) => {
  try {
    const userRoleStr = (req.user.role || "").toLowerCase().replace(/\s+/g, "");
    const privilegedRoles = ["superadmin", "super admin", "centerincharge", "zonalmanager", "zonalhead"];
    const isPrivileged = privilegedRoles.includes(userRoleStr);

    let query = { role: "admin" };

    if (!isPrivileged) {
      // Non-privileged users (including standard admin) can ONLY see themselves
      query._id = req.user.id;
    } else if (userRoleStr !== "superadmin" && userRoleStr !== "super admin") {
      const userCentreIds = (req.user.centres || []).map(c => (c._id || c).toString());
      if (userCentreIds.length > 0) {
        query.centres = { $in: userCentreIds };
      } else {
        query._id = req.user.id;
      }
    }

    const admins = await User.find(query)
      .populate("centres", "centreName enterCode")
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .populate("deactivatedBy", "name");

    res.status(200).json({
      message: "List of admin users based on access",
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
    const requestingUser = req.user;
    const userRole = (requestingUser.role || "").toLowerCase().replace(/\s+/g, "");

    const privilegedRoles = ["superadmin", "centerincharge", "zonalmanager", "zonalhead"];
    const isUnderPrivileged = !privilegedRoles.includes(userRole);

    let query = { role: "teacher" };

    if (isUnderPrivileged) {
      query._id = requestingUser._id;
    } else if (userRole !== "superadmin") {
      const userCentreIds = (requestingUser.centres || []).map(c => (c._id || c).toString());
      if (userCentreIds.length > 0) {
        const centreObjectIds = userCentreIds.map(id => {
          try { return new mongoose.Types.ObjectId(id); } catch (e) { return null; }
        }).filter(id => id);
        query.centres = { $in: [...userCentreIds, ...centreObjectIds] };
      } else {
        query._id = requestingUser._id;
      }
    }

    const teachers = await User.find(query)
      .populate("centres", "centreName enterCode")
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .populate("deactivatedBy", "name");

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
    const userRole = (requestingUser.role || "").toLowerCase().replace(/\s+/g, "");
    const isSuperAdmin = ["superadmin", "super admin"].includes(userRole);

    let query = {};

    // If not superAdmin, further filter to show only users who share the same centers
    if (!isSuperAdmin) {
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
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .populate("deactivatedBy", "name")
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
