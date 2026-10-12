import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import LeadManagement from "../../models/LeadManagement.js";
import { cleanPhoneNumber, isNameMatch } from "../../utils/leadStudentMatcher.js";

export const lookupEnrolledStudent = async (req, res) => {
    try {
        let { phone, name, leadId } = req.query;

        if (leadId) {
            const lead = await LeadManagement.findById(leadId).lean();
            if (lead) {
                phone = phone || lead.phoneNumber || lead.secondPhoneNumber;
                name = name || lead.name;
            }
        }

        if (!phone) {
            return res.status(400).json({ success: false, message: "Phone number or leadId is required" });
        }

        const cp = cleanPhoneNumber(phone);
        if (!cp || cp.length < 10) {
            return res.status(200).json({ success: true, found: false });
        }

        // Query students by phone
        const studentQuery = {
            $or: [
                { "studentsDetails.mobileNum": { $regex: cp } },
                { "studentsDetails.whatsappNumber": { $regex: cp } }
            ]
        };

        const matchingStudents = await Student.find(studentQuery)
            .select("_id studentsDetails status isEnrolled admissionNumber rollNo")
            .lean();

        // Also check BoardCourseAdmission direct mobileNum
        const matchingBoardAdmissions = await BoardCourseAdmission.find({
            mobileNum: { $regex: cp }
        }).select("_id studentId studentName mobileNum admissionNumber boardCourseName admissionDate createdAt").lean();

        const allStudentIds = [
            ...matchingStudents.map(s => s._id.toString()),
            ...matchingBoardAdmissions.map(ba => ba.studentId?.toString()).filter(Boolean)
        ];

        const uniqueStudentIds = [...new Set(allStudentIds)];

        if (uniqueStudentIds.length === 0 && matchingBoardAdmissions.length === 0) {
            return res.status(200).json({ success: true, found: false });
        }

        // Fetch normal admissions
        const normalAdmissions = await Admission.find({
            student: { $in: uniqueStudentIds }
        }).populate("course", "courseName").lean();

        // Fetch all board admissions for these students
        const allBoardAdmissions = await BoardCourseAdmission.find({
            studentId: { $in: uniqueStudentIds }
        }).lean();

        // If multiple students match, prioritize student name matching
        let bestStudent = null;
        if (matchingStudents.length > 0) {
            if (name) {
                bestStudent = matchingStudents.find(s => 
                    (s.studentsDetails || []).some(d => isNameMatch(name, d.studentName))
                ) || matchingStudents[0];
            } else {
                bestStudent = matchingStudents[0];
            }
        }

        const studentId = bestStudent ? bestStudent._id.toString() : (matchingBoardAdmissions[0]?.studentId?.toString() || null);
        const studentName = bestStudent?.studentsDetails?.[0]?.studentName || matchingBoardAdmissions[0]?.studentName || name || "";
        const centre = bestStudent?.studentsDetails?.[0]?.centre || "";

        // Collect all existing admission numbers
        const normalAdm = normalAdmissions.find(a => a.student?.toString() === studentId) || normalAdmissions[0];
        const boardAdm = allBoardAdmissions.find(b => b.studentId?.toString() === studentId) || matchingBoardAdmissions[0];

        const admissionNumber = normalAdm?.admissionNumber ||
            boardAdm?.admissionNumber ||
            bestStudent?.admissionNumber ||
            bestStudent?.rollNo ||
            bestStudent?.studentsDetails?.[0]?.admissionNumber ||
            bestStudent?.studentsDetails?.[0]?.rollNo ||
            "";

        const admissionsList = [
            ...normalAdmissions.map(a => ({
                admissionId: a._id,
                admissionType: "NORMAL",
                admissionNumber: a.admissionNumber,
                courseName: a.course?.courseName || a.boardCourseName || "Normal Course",
                admissionDate: a.admissionDate || a.createdAt
            })),
            ...allBoardAdmissions.map(b => ({
                admissionId: b._id,
                admissionType: "BOARD",
                admissionNumber: b.admissionNumber,
                courseName: b.boardCourseName || "Board Course",
                admissionDate: b.admissionDate || b.createdAt
            }))
        ];

        return res.status(200).json({
            success: true,
            found: Boolean(studentId || admissionNumber),
            studentId,
            studentName,
            admissionNumber,
            centre,
            admissions: admissionsList
        });

    } catch (error) {
        console.error("Lookup enrolled student error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
