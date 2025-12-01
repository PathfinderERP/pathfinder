import User from "../../../models/User.js";

export const getAllAdminsBySuperAdmin = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" });

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
    const admins = await User.find({ role: "teacher" });

    res.status(200).json({
      message: "List of all teachers users",
      count: admins.length,
      admins,
    });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ message: "Server error" });
  }
};