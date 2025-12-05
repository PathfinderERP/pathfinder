import User from "../../../models/User.js";

export const getAllAdminsBySuperAdmin = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).populate("centre", "centreName enterCode");

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
    const teachers = await User.find({ role: "teacher" }).populate("centre", "centreName enterCode");

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
    // Fetch all users except superAdmin, populate centre details
    const users = await User.find({ role: { $ne: "superAdmin" } }).populate("centre", "centreName enterCode");

    res.status(200).json({
      message: "List of all users",
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};