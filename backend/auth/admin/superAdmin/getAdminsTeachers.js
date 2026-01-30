import User from "../../../models/User.js";

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

    // If not SuperAdmin, filter to show only users who share the same centers
    if (!isSuperAdmin) {
      const userCentreIds = requestingUser.centres || [];
      if (userCentreIds.length > 0) {
        query.centres = { $in: userCentreIds };
      } else {
        // If user has no centers, they shouldn't see anyone (except maybe themselves)
        query._id = requestingUser._id;
      }
    }

    // Fetch users based on query, populate centre details
    const users = await User.find(query)
      .populate("centres", "centreName enterCode")
      .populate("assignedScript", "scriptName scriptContent")
      .select("-password"); // Security: Never return passwords

    res.status(200).json({
      message: "List of all users based on access permissions",
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};