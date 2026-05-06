import Student from "../../models/Students.js";
import User from "../../models/User.js";
import mongoose from "mongoose";

export const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .populate('course')
      .populate('batches')
      .populate('department')
      .sort({ createdAt: -1 });

    // Manually resolve counselledBy if it's an ObjectID
    const userIds = students
      .map(s => s.counselledBy)
      .filter(id => id && mongoose.Types.ObjectId.isValid(id));

    const users = await User.find({ _id: { $in: userIds } }).select('name');
    const userMap = users.reduce((map, user) => {
      map[user._id.toString()] = user.name;
      return map;
    }, {});

    const processedStudents = students.map(student => {
      const s = student.toObject();
      if (s.counselledBy && mongoose.Types.ObjectId.isValid(s.counselledBy)) {
        s.counselledBy = userMap[s.counselledBy] || s.counselledBy;
      }
      return s;
    });

    res.status(200).json(processedStudents);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Server error while fetching students" });
  }
};
