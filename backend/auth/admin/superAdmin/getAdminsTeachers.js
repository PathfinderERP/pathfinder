import mongoose from "mongoose";
import User from "../../../models/User.js";
import Employee from "../../../models/HR/Employee.js";
import { getSignedFileUrl } from "../../../utils/r2Upload.js";

export const getAllAdminsBySuperAdmin = async (req, res) => {
  try {
    const userRoleStr = (req.user.role || "").toLowerCase().replace(/\s+/g, "");
    const privilegedRoles = ["superadmin", "super admin", "centerincharge", "zonalmanager", "hod", "assistantzonalmanager", "assistantcenterincharge", "hr"];
    const isPrivileged = privilegedRoles.includes(userRoleStr);

    let query = { role: "admin" };

    if (!isPrivileged) {
      // Non-privileged users (including standard admin) can ONLY see themselves
      query._id = req.user.id;
    } else if (userRoleStr !== "superadmin" && userRoleStr !== "super admin" && userRoleStr !== "hr") {
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

    const privilegedRoles = ["superadmin", "super admin", "centerincharge", "zonalmanager", "hod", "assistantzonalmanager", "assistantcenterincharge", "hr"];
    const isUnderPrivileged = !privilegedRoles.includes(userRole);

    let query = { role: "teacher" };

    if (isUnderPrivileged) {
      query._id = requestingUser._id;
    } else if (userRole !== "superadmin" && userRole !== "super admin" && userRole !== "hr") {
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
    const isSuperAdminOrHR = ["superadmin", "super admin", "hr"].includes(userRole);

    let query = {};

    // If not superAdmin or HR, further filter to show only users who share the same centers
    if (!isSuperAdminOrHR && req.query.ignoreCentre !== "true") {
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

      // If user is a centerIncharge, restrict queried roles
      if (userRole === "centerincharge" || userRole === "centreincharge" || userRole === "assistantcenterincharge") {
        query.role = { $in: ["telecaller", "centralizedTelecaller", "counsellor", "marketing", "zonalManager", "centerIncharge", "Center Incharge", "centerincharge", "centreincharge", "Centre Incharge", "assistantZonalManager", "assistantCenterIncharge", "supportStaff"] };
      }
    }

    // Fetch users based on query, populate centre details
    const users = await User.find(query)
      .populate("centres", "centreName enterCode")
      .populate("assignedScript", "scriptName scriptContent")
      .select("-password")
      .lean();

    // Enrich users with employee data (profile image)
    let enrichedUsers;
    if (req.query.ignoreCentre === "true") {
      enrichedUsers = users.map(user => ({
        ...user,
        profileImage: null,
        mobNum: user.mobNum || ""
      }));
    } else {
      const userIds = users.map(u => u._id);
      const employees = await Employee.find({ user: { $in: userIds } }).lean();
      const employeeMap = {};
      employees.forEach(emp => {
        if (emp.user) {
          employeeMap[emp.user.toString()] = emp;
        }
      });

      // Batch load audit users (createdBy, updatedBy, deactivatedBy) to avoid populate queries
      const auditUserIds = new Set();
      users.forEach(u => {
        if (u.createdBy) auditUserIds.add(u.createdBy.toString());
        if (u.updatedBy) auditUserIds.add(u.updatedBy.toString());
        if (u.deactivatedBy) auditUserIds.add(u.deactivatedBy.toString());
      });

      const auditUsers = await User.find({ _id: { $in: Array.from(auditUserIds) } }).select("name").lean();
      const auditUserMap = {};
      auditUsers.forEach(au => {
        auditUserMap[au._id.toString()] = au;
      });

      enrichedUsers = await Promise.all(users.map(async (user) => {
        const employee = employeeMap[user._id.toString()];
        let profileImageUrl = null;
        if (employee?.profileImage) {
          profileImageUrl = await getSignedFileUrl(employee.profileImage);
        }

        const createdByUser = user.createdBy ? auditUserMap[user.createdBy.toString()] : null;
        const updatedByUser = user.updatedBy ? auditUserMap[user.updatedBy.toString()] : null;
        const deactivatedByUser = user.deactivatedBy ? auditUserMap[user.deactivatedBy.toString()] : null;

        return {
          ...user,
          profileImage: profileImageUrl,
          mobNum: user.mobNum || employee?.phoneNumber,
          createdBy: createdByUser ? { _id: createdByUser._id, name: createdByUser.name } : null,
          updatedBy: updatedByUser ? { _id: updatedByUser._id, name: updatedByUser.name } : null,
          deactivatedBy: deactivatedByUser ? { _id: deactivatedByUser._id, name: deactivatedByUser.name } : null
        };
      }));
    }

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
