import LeadManagement from "../../models/LeadManagement.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";

export const getConversionDetails = async (req, res) => {
    try {
        const { type } = req.query;
        const normalizedType = (type || "").toLowerCase();
        const validTypes = ["counselled", "admitted", "uploaded_admissions", "uploaded_admitted", "manual_admissions", "manual_admitted"];
        if (!type || !validTypes.includes(normalizedType)) {
            return res.status(400).json({ message: "Invalid type parameter." });
        }

        // Build base query (we bypass the default isCounseled restriction for this lookup)
        const queryParams = { ...req.query };
        delete queryParams.followUpStatus;
        const baseQuery = await buildLeadQuery(queryParams, req.user);
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
        if (normalizedType === "admitted") {
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
        } else if (normalizedType === "uploaded_admissions" || normalizedType === "uploaded_admitted") {
            const admittedCondition = [
                { phoneNumber: { $in: allAdmittedPhoneNumbers } },
                { secondPhoneNumber: { $in: allAdmittedPhoneNumbers } }
            ];
            baseQuery.$and = baseQuery.$and || [];
            if (baseQuery.$or) {
                baseQuery.$and.push({ $or: baseQuery.$or });
                delete baseQuery.$or;
            }
            baseQuery.$and.push({ $or: admittedCondition });
            baseQuery.$and.push({
                $or: [
                    { isBulkUpload: true },
                    { campaign: { $exists: true, $ne: null } },
                    { campaignFrom: { $exists: true, $ne: null, $ne: "" } },
                    { source: { $regex: /bulk|import|excel|campaign|facebook|meta|google|ad|online|landing|upload/i } }
                ]
            });
        } else if (normalizedType === "manual_admissions" || normalizedType === "manual_admitted") {
            const admittedCondition = [
                { phoneNumber: { $in: allAdmittedPhoneNumbers } },
                { secondPhoneNumber: { $in: allAdmittedPhoneNumbers } }
            ];
            baseQuery.$and = baseQuery.$and || [];
            if (baseQuery.$or) {
                baseQuery.$and.push({ $or: baseQuery.$or });
                delete baseQuery.$or;
            }
            baseQuery.$and.push({ $or: admittedCondition });
            baseQuery.$and.push({
                $and: [
                    {
                        $or: [
                            { isBulkUpload: false },
                            { isBulkUpload: { $exists: false } }
                        ]
                    },
                    {
                        $or: [
                            { campaign: { $exists: false } },
                            { campaign: null }
                        ]
                    },
                    {
                        $or: [
                            { campaignFrom: { $exists: false } },
                            { campaignFrom: null },
                            { campaignFrom: "" }
                        ]
                    },
                    {
                        $or: [
                            { source: { $exists: false } },
                            { source: null },
                            { source: { $not: { $regex: /bulk|import|excel|campaign|facebook|meta|google|ad|online|landing|upload/i } } }
                        ]
                    }
                ]
            });
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

        // Retrieve down payment values, admitted course/board titles, and who admitted the student
        const [normalAdmissions, boardAdmissions] = await Promise.all([
            Admission.find({}, { student: 1, course: 1, board: 1, boardCourseName: 1, downPayment: 1, createdBy: 1 })
                .populate("course", "courseName")
                .populate("board", "boardCourse name")
                .populate("createdBy", "name")
                .lean(),
            BoardCourseAdmission.find({}, { studentId: 1, mobileNum: 1, boardId: 1, boardCourseName: 1, programme: 1, installments: { $slice: 1 }, examFeePaid: 1, additionalThingsPaid: 1, createdBy: 1 })
                .populate("boardId", "boardCourse name")
                .populate("createdBy", "name")
                .lean()
        ]);

        const downPaymentMap = new Map();
        const courseNameMap = new Map();
        const admittedByMap = new Map();

        const studentIds = normalAdmissions.map(a => a.student?.toString()).filter(Boolean);
        const admittedStudents = await Student.find({ _id: { $in: studentIds } }, { "studentsDetails.mobileNum": 1, "studentsDetails.whatsappNumber": 1 }).lean();
        
        const studentIdToPhones = new Map();
        admittedStudents.forEach(s => {
            const phones = (s.studentsDetails || []).flatMap(d => [d.mobileNum, d.whatsappNumber]).filter(Boolean).map(p => p.trim());
            studentIdToPhones.set(s._id.toString(), phones);
        });

        normalAdmissions.forEach(adm => {
            const sid = adm.student?.toString();
            const courseTitle = adm.course?.courseName || adm.boardCourseName || adm.board?.boardCourse || adm.board?.name || "";
            const admittedByName = adm.createdBy?.name || "";
            if (sid) {
                const amount = adm.downPayment ?? 0;
                downPaymentMap.set(sid, amount);
                if (courseTitle) courseNameMap.set(sid, courseTitle);
                if (admittedByName) admittedByMap.set(sid, admittedByName);

                const phones = studentIdToPhones.get(sid) || [];
                phones.forEach(p => {
                    downPaymentMap.set(p, amount);
                    if (courseTitle) courseNameMap.set(p, courseTitle);
                    if (admittedByName) admittedByMap.set(p, admittedByName);
                });
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
            const boardTitle = adm.boardCourseName || adm.boardId?.boardCourse || adm.boardId?.name || "Board Course";
            const admittedByName = adm.createdBy?.name || "";

            if (adm.studentId) {
                downPaymentMap.set(adm.studentId.toString(), amount);
                if (boardTitle) courseNameMap.set(adm.studentId.toString(), boardTitle);
                if (admittedByName) admittedByMap.set(adm.studentId.toString(), admittedByName);
            }
            if (adm.mobileNum) {
                const phone = adm.mobileNum.trim();
                downPaymentMap.set(phone, amount);
                if (boardTitle) courseNameMap.set(phone, boardTitle);
                if (admittedByName) admittedByMap.set(phone, admittedByName);
            }
        });

        const leadsWithPayments = leads.map(lead => {
            let downPayment = 0;
            let admittedCourseName = "";
            let admittedBy = "";

            const p1 = lead.phoneNumber ? lead.phoneNumber.trim() : "";
            const p2 = lead.secondPhoneNumber ? lead.secondPhoneNumber.trim() : "";

            if (p1 && downPaymentMap.has(p1)) {
                downPayment = downPaymentMap.get(p1);
            } else if (p2 && downPaymentMap.has(p2)) {
                downPayment = downPaymentMap.get(p2);
            }

            if (p1 && courseNameMap.has(p1)) {
                admittedCourseName = courseNameMap.get(p1);
            } else if (p2 && courseNameMap.has(p2)) {
                admittedCourseName = courseNameMap.get(p2);
            }

            if (p1 && admittedByMap.has(p1)) {
                admittedBy = admittedByMap.get(p1);
            } else if (p2 && admittedByMap.has(p2)) {
                admittedBy = admittedByMap.get(p2);
            }

            if (!admittedCourseName) {
                admittedCourseName = lead.course?.courseName || lead.board?.boardCourse || lead.board?.name || "";
            }

            if (!admittedBy && lead.createdBy?.name) {
                admittedBy = lead.createdBy.name;
            }

            return {
                ...lead.toObject ? lead.toObject() : lead,
                downPayment,
                admittedCourseName,
                admittedBy: admittedBy || "—"
            };
        });

        res.status(200).json({ success: true, leads: leadsWithPayments });
    } catch (err) {
        console.error("Error getting conversion details:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
