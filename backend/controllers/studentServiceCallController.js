import StudentServiceCall from "../models/StudentServiceCall.js";

const formatDateToISOString = (d) => {
    const dateObj = new Date(d);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const logStudentServiceCall = async (req, res) => {
    try {
        const {
            studentId,
            admissionId,
            studentName,
            enrollmentNo,
            studentPhone,
            centreId,
            centreName,
            servicePurpose,
            status,
            remarks,
            nextFollowUpDate
        } = req.body;

        if (!studentName) {
            return res.status(400).json({ message: "Student Name is required." });
        }

        if (!servicePurpose) {
            return res.status(400).json({ message: "Service Purpose is required." });
        }

        const callDate = formatDateToISOString(new Date());
        const userRoleStr = Array.isArray(req.user.role) ? req.user.role.join(", ") : (req.user.role || "");

        let resolvedCentreId = centreId || null;
        let resolvedCentreName = centreName || "";

        if (!resolvedCentreId && req.user.centre) {
            resolvedCentreId = req.user.centre._id || req.user.centre;
            resolvedCentreName = req.user.centre.centreName || resolvedCentreName;
        } else if (!resolvedCentreId && req.user.centres && req.user.centres.length > 0) {
            resolvedCentreId = req.user.centres[0]._id || req.user.centres[0];
            resolvedCentreName = req.user.centres[0].centreName || resolvedCentreName;
        }

        const newCall = new StudentServiceCall({
            student: studentId || null,
            admission: admissionId || null,
            studentName,
            enrollmentNo: enrollmentNo || "",
            studentPhone: studentPhone || "",
            centre: resolvedCentreId,
            centreName: resolvedCentreName,
            user: req.user._id,
            userName: req.user.name || "Unknown User",
            userRole: userRoleStr,
            servicePurpose,
            status: status || "Neutral",
            remarks: remarks || "",
            nextFollowUpDate: nextFollowUpDate || "",
            callDate
        });

        await newCall.save();
        res.status(201).json({ message: "Service call logged successfully.", serviceCall: newCall });
    } catch (error) {
        console.error("Error logging student service call:", error);
        res.status(500).json({ message: "Failed to log service call.", error: error.message });
    }
};

export const getStudentServiceHistory = async (req, res) => {
    try {
        const { studentId, admissionId } = req.query;

        let query = {};
        if (studentId) query.student = studentId;
        else if (admissionId) query.admission = admissionId;
        else {
            return res.status(400).json({ message: "Student ID or Admission ID is required." });
        }

        const history = await StudentServiceCall.find(query)
            .populate("user", "name role")
            .sort({ createdAt: -1 });

        res.status(200).json({ history });
    } catch (error) {
        console.error("Error fetching student service call history:", error);
        res.status(500).json({ message: "Failed to fetch service history.", error: error.message });
    }
};
