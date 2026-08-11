import LeadManagement from "../../models/LeadManagement.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";

export const getConversionDetails = async (req, res) => {
    try {
        const { type } = req.query;
        if (!type || !["counselled", "admitted"].includes(type.toLowerCase())) {
            return res.status(400).json({ message: "Invalid type parameter. Must be 'counselled' or 'admitted'." });
        }

        // Build base query (we bypass the default isCounseled restriction for this lookup)
        const baseQuery = await buildLeadQuery(req.query, req.user);
        delete baseQuery.isCounseled;
        if (baseQuery.$and) {
            baseQuery.$and = baseQuery.$and.filter(c => !c.hasOwnProperty('isCounseled'));
        }

        // Gather phone numbers like getLeads.js does
        const [
            normalStudentIds,
            boardStudentIds,
            directEnrolledMobiles,
            directEnrolledWhatsapp,
            boardAdmittedMobiles,
            boardCounsellingMobiles,
            studentMobiles,
            studentWhatsapp
        ] = await Promise.all([
            Admission.distinct("student"),
            BoardCourseAdmission.distinct("studentId"),
            Student.find({ isEnrolled: true }).distinct("studentsDetails.mobileNum"),
            Student.find({ isEnrolled: true }).distinct("studentsDetails.whatsappNumber"),
            BoardCourseAdmission.distinct("mobileNum"),
            BoardCourseCounselling.distinct("mobileNum"),
            Student.distinct("studentsDetails.mobileNum"),
            Student.distinct("studentsDetails.whatsappNumber")
        ]);

        const allAdmittedStudentIds = [...new Set([...normalStudentIds, ...boardStudentIds])];

        const admittedStudentsFromDetails = await Student.find({
            _id: { $in: allAdmittedStudentIds }
        }).select("studentsDetails.mobileNum studentsDetails.whatsappNumber").lean();

        const phonesFromDetails = admittedStudentsFromDetails.flatMap(s => (s.studentsDetails || []).flatMap(d => [d.mobileNum, d.whatsappNumber])).filter(Boolean);

        const allAdmittedPhoneNumbers = [...new Set([
            ...directEnrolledMobiles,
            ...directEnrolledWhatsapp,
            ...boardAdmittedMobiles,
            ...phonesFromDetails
        ])].filter(Boolean);

        const allCounsellingPhoneNumbers = [...new Set([
            ...allAdmittedPhoneNumbers,
            ...boardCounsellingMobiles,
            ...studentMobiles,
            ...studentWhatsapp
        ])].filter(Boolean);

        // Apply type-specific filter
        if (type.toLowerCase() === "admitted") {
            const admittedCondition = [
                { phoneNumber: { $in: allAdmittedPhoneNumbers } },
                { secondPhoneNumber: { $in: allAdmittedPhoneNumbers } }
            ];
            if (baseQuery.$or) {
                baseQuery.$and = baseQuery.$and || [];
                baseQuery.$and.push({ $or: baseQuery.$or });
                delete baseQuery.$or;
                baseQuery.$and.push({ $or: admittedCondition });
            } else {
                baseQuery.$or = admittedCondition;
            }
        } else {
            // counselled
            const counselledCondition = [
                { isCounseled: true },
                { phoneNumber: { $in: allCounsellingPhoneNumbers } },
                { secondPhoneNumber: { $in: allCounsellingPhoneNumbers } }
            ];
            if (baseQuery.$or) {
                baseQuery.$and = baseQuery.$and || [];
                baseQuery.$and.push({ $or: baseQuery.$or });
                delete baseQuery.$or;
                baseQuery.$and.push({ $or: counselledCondition });
            } else {
                baseQuery.$or = counselledCondition;
            }
        }

                const leads = await LeadManagement.find(baseQuery)
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName')
            .populate('board', 'boardCourse')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        // Retrieve down payment values
        const [normalAdmissions, boardAdmissions] = await Promise.all([
            Admission.find({}, { student: 1, downPayment: 1 }).lean(),
            BoardCourseAdmission.find({}, { studentId: 1, mobileNum: 1, programme: 1, installments: { $slice: 1 }, examFeePaid: 1, additionalThingsPaid: 1 }).lean()
        ]);

        const downPaymentMap = new Map();

        const studentIds = normalAdmissions.map(a => a.student?.toString()).filter(Boolean);
        const admittedStudents = await Student.find({ _id: { $in: studentIds } }, { "studentsDetails.mobileNum": 1, "studentsDetails.whatsappNumber": 1 }).lean();
        
        const studentIdToPhones = new Map();
        admittedStudents.forEach(s => {
            const phones = (s.studentsDetails || []).flatMap(d => [d.mobileNum, d.whatsappNumber]).filter(Boolean).map(p => p.trim());
            studentIdToPhones.set(s._id.toString(), phones);
        });

        normalAdmissions.forEach(adm => {
            const sid = adm.student?.toString();
            if (sid) {
                const amount = adm.downPayment ?? 0;
                downPaymentMap.set(sid, amount);
                const phones = studentIdToPhones.get(sid) || [];
                phones.forEach(p => downPaymentMap.set(p, amount));
            }
        });

        boardAdmissions.forEach(adm => {
            let amount = 0;
            if (adm.programme === 'CRP') {
                const firstInstallment = (adm.installments || [])[0];
                amount = firstInstallment?.paidAmount ?? 0;
            } else {
                amount = (adm.examFeePaid || 0) + (adm.additionalThingsPaid || 0);
            }
            if (adm.studentId) {
                downPaymentMap.set(adm.studentId.toString(), amount);
            }
            if (adm.mobileNum) {
                downPaymentMap.set(adm.mobileNum.trim(), amount);
            }
        });

        const leadsWithPayments = leads.map(lead => {
            let downPayment = 0;
            if (lead.phoneNumber && downPaymentMap.has(lead.phoneNumber.trim())) {
                downPayment = downPaymentMap.get(lead.phoneNumber.trim());
            } else if (lead.secondPhoneNumber && downPaymentMap.has(lead.secondPhoneNumber.trim())) {
                downPayment = downPaymentMap.get(lead.secondPhoneNumber.trim());
            }
            return {
                ...lead.toObject ? lead.toObject() : lead,
                downPayment
            };
        });

        res.status(200).json({ success: true, leads: leadsWithPayments });
    } catch (err) {
        console.error("Error getting conversion details:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
