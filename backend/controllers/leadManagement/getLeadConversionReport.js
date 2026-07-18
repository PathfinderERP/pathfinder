import LeadManagement from "../../models/LeadManagement.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";

/**
 * Lead Conversion Report
 *
 * Modified to filter based on actual Counselling and Admission dates
 * rather than Lead creation dates.
 */
export const getLeadConversionReport = async (req, res) => {
    try {
        const queryParams = { ...req.query };
        queryParams.includeInvalid = true;

        const { fromDate, toDate } = queryParams;

        // Guard: require at least one date boundary
        if (!fromDate && !toDate) {
            return res.status(400).json({
                success: false,
                message: "Please select a date range to run the conversion report. Running without a date filter may cause timeouts on large datasets."
            });
        }

        // Remove date parameters so buildLeadQuery doesn't filter leads by createdAt
        delete queryParams.fromDate;
        delete queryParams.toDate;

        const baseMatch = await buildLeadQuery(queryParams, req.user);

        // ── STEP 1: Query Counselling (Student creation) phone numbers in date range ──
        const studentDateQuery = {};
        if (fromDate) studentDateQuery.$gte = new Date(fromDate);
        if (toDate) {
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            studentDateQuery.$lte = end;
        }

        const studentsInDateRange = await Student.find(
            { createdAt: studentDateQuery },
            { "studentsDetails.mobileNum": 1 }
        ).lean();

        const counselledPhones = [];
        for (const student of studentsInDateRange) {
            const phones = (student.studentsDetails || [])
                .map(d => (d.mobileNum || "").trim())
                .filter(Boolean);
            counselledPhones.push(...phones);
        }
        const uniqueCounselledPhones = [...new Set(counselledPhones)];

        // ── STEP 2: Query Admissions in date range and get their phone numbers ──
        const admissionDateQuery = {};
        if (fromDate) admissionDateQuery.$gte = new Date(fromDate);
        if (toDate) {
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            admissionDateQuery.$lte = end;
        }

        const [normalAdms, boardAdms] = await Promise.all([
            Admission.find({ admissionDate: admissionDateQuery }, { student: 1 }).lean(),
            BoardCourseAdmission.find({ admissionDate: admissionDateQuery }, { studentId: 1 }).lean()
        ]);

        const admittedStudentIds = new Set();
        for (const adm of normalAdms) {
            if (adm.student) admittedStudentIds.add(adm.student.toString());
        }
        for (const adm of boardAdms) {
            if (adm.studentId) admittedStudentIds.add(adm.studentId.toString());
        }

        const admittedIdsArray = [...admittedStudentIds];

        const admittedStudents = admittedIdsArray.length > 0 ? await Student.find(
            { _id: { $in: admittedIdsArray } },
            { "studentsDetails.mobileNum": 1 }
        ).lean() : [];

        const admittedPhones = [];
        for (const student of admittedStudents) {
            const phones = (student.studentsDetails || [])
                .map(d => (d.mobileNum || "").trim())
                .filter(Boolean);
            admittedPhones.push(...phones);
        }
        const uniqueAdmittedPhones = [...new Set(admittedPhones)];

        // ── STEP 3: Aggregates grouped by leadType ──
        const totalStats = await LeadManagement.aggregate([
            { $match: baseMatch },
            { $group: { _id: "$leadType", total: { $sum: 1 } } }
        ]);

        const counsellingStats = uniqueCounselledPhones.length > 0 ? await LeadManagement.aggregate([
            {
                $match: {
                    ...baseMatch,
                    $or: [
                        { phoneNumber: { $in: uniqueCounselledPhones } },
                        { secondPhoneNumber: { $in: uniqueCounselledPhones } }
                    ]
                }
            },
            { $group: { _id: "$leadType", counselled: { $sum: 1 } } }
        ]) : [];

        const admissionStats = uniqueAdmittedPhones.length > 0 ? await LeadManagement.aggregate([
            {
                $match: {
                    ...baseMatch,
                    $or: [
                        { phoneNumber: { $in: uniqueAdmittedPhones } },
                        { secondPhoneNumber: { $in: uniqueAdmittedPhones } }
                    ]
                }
            },
            { $group: { _id: "$leadType", admitted: { $sum: 1 } } }
        ]) : [];

        // ── STEP 4: Merge statistics ──
        const leadTypes = ["HOT LEAD", "WARM LEAD", "COLD LEAD", "NEUTRAL LEAD", "INVALID LEAD"];
        const groups = {};
        for (const type of leadTypes) {
            groups[type] = { total: 0, counselled: 0, admitted: 0 };
        }

        for (const item of totalStats) {
            const type = item._id || "NEUTRAL LEAD";
            if (!groups[type]) groups[type] = { total: 0, counselled: 0, admitted: 0 };
            groups[type].total = item.total;
        }

        for (const item of counsellingStats) {
            const type = item._id || "NEUTRAL LEAD";
            if (!groups[type]) groups[type] = { total: 0, counselled: 0, admitted: 0 };
            groups[type].counselled = item.counselled;
        }

        for (const item of admissionStats) {
            const type = item._id || "NEUTRAL LEAD";
            if (!groups[type]) groups[type] = { total: 0, counselled: 0, admitted: 0 };
            groups[type].admitted = item.admitted;
        }

        const conversionStats = Object.entries(groups)
            .filter(([, v]) => v.total > 0)
            .map(([type, v]) => ({ _id: type, ...v }));

        return res.status(200).json({ success: true, conversionStats });

    } catch (err) {
        console.error("Conversion report error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error during conversion report generation",
            error: err.message
        });
    }
};
