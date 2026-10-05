import mongoose from "mongoose";
import User from "../../models/User.js";
import LeadManagement from "../../models/LeadManagement.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";
import { getMatchingLeadIds, isNameMatch, cleanPhoneNumber } from "../../utils/leadStudentMatcher.js";

export const getConversionDetails = async (req, res) => {
    try {
        const { type } = req.query;
        const normalizedType = (type || "").toLowerCase();
        const validTypes = ["counselled", "admitted", "uploaded_admissions", "uploaded_admitted", "manual_admissions", "manual_admitted"];
        if (!type || !validTypes.includes(normalizedType)) {
            return res.status(400).json({ message: "Invalid type parameter." });
        }

        // Build base query (we bypass the default isCounseled and followUpStatus restrictions for this lookup)
        const queryParams = { ...req.query };
        delete queryParams.followUpStatus;
        const baseQuery = await buildLeadQuery(queryParams, req.user);
        delete baseQuery.isCounseled;
        if (baseQuery.$and) {
            baseQuery.$and = baseQuery.$and.filter(c => !c.hasOwnProperty('isCounseled'));
        }

        // Gather matching admitted and counselled lead IDs using (phone + student name) matching
        const { matchingAdmittedIds, matchingCounsellingIds } = await getMatchingLeadIds(baseQuery);

        // Apply type-specific filter
        if (normalizedType === "admitted") {
            baseQuery.$and = baseQuery.$and || [];
            if (baseQuery.$or) {
                baseQuery.$and.push({ $or: baseQuery.$or });
                delete baseQuery.$or;
            }
            baseQuery.$and.push({ _id: { $in: matchingAdmittedIds } });
        } else if (normalizedType === "uploaded_admissions" || normalizedType === "uploaded_admitted") {
            baseQuery.$and = baseQuery.$and || [];
            if (baseQuery.$or) {
                baseQuery.$and.push({ $or: baseQuery.$or });
                delete baseQuery.$or;
            }
            baseQuery.$and.push({ _id: { $in: matchingAdmittedIds } });
            baseQuery.$and.push({
                $or: [
                    { isBulkUpload: true },
                    { campaign: { $exists: true, $ne: null } },
                    { campaignFrom: { $exists: true, $ne: null, $ne: "" } },
                    { source: { $regex: /bulk|import|excel|campaign|facebook|meta|google|ad|online|landing|upload/i } }
                ]
            });
        } else if (normalizedType === "manual_admissions" || normalizedType === "manual_admitted") {
            baseQuery.$and = baseQuery.$and || [];
            if (baseQuery.$or) {
                baseQuery.$and.push({ $or: baseQuery.$or });
                delete baseQuery.$or;
            }
            baseQuery.$and.push({ _id: { $in: matchingAdmittedIds } });
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
            baseQuery.$and = baseQuery.$and || [];
            if (baseQuery.$or) {
                baseQuery.$and.push({ $or: baseQuery.$or });
                delete baseQuery.$or;
            }
            baseQuery.$and.push({
                $or: [
                    { isCounseled: true },
                    { _id: { $in: matchingCounsellingIds } }
                ]
            });
        }

        const leads = await LeadManagement.find(baseQuery)
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName')
            .populate('board', 'boardCourse')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        // Retrieve down payment values, admitted course/board titles, who admitted the student, and enrollment number
        const [normalAdmissions, boardAdmissions] = await Promise.all([
            Admission.find({}, { admissionNumber: 1, student: 1, course: 1, board: 1, boardCourseName: 1, downPayment: 1, createdBy: 1, admissionDate: 1, createdAt: 1 })
                .populate("course", "courseName")
                .populate("board", "boardCourse name")
                .populate("createdBy", "name")
                .lean(),
            BoardCourseAdmission.find({}, { admissionNumber: 1, studentId: 1, mobileNum: 1, boardId: 1, boardCourseName: 1, programme: 1, installments: { $slice: 1 }, examFeePaid: 1, additionalThingsPaid: 1, createdBy: 1, admissionDate: 1, createdAt: 1 })
                .populate("boardId", "boardCourse name")
                .populate("createdBy", "name")
                .lean()
        ]);

        const studentIds = normalAdmissions.map(a => a.student?.toString()).filter(Boolean);
        const boardStudentIds = boardAdmissions.map(a => a.studentId?.toString()).filter(Boolean);
        const allStudentIds = [...new Set([...studentIds, ...boardStudentIds])];

        const admittedStudents = await Student.find(
            { _id: { $in: allStudentIds } },
            { 
                "studentsDetails.studentName": 1, 
                "studentsDetails.mobileNum": 1, 
                "studentsDetails.whatsappNumber": 1, 
                "studentsDetails.studentEmail": 1, 
                "guardians.guardianEmail": 1,
                "leadBy": 1,
                "counselledBy": 1,
                "createdBy": 1
            }
        ).lean();

        // Resolve user IDs from student leadBy and counselledBy
        const userIdsToResolve = [];
        admittedStudents.forEach(s => {
            if (s.leadBy && mongoose.Types.ObjectId.isValid(s.leadBy)) {
                userIdsToResolve.push(s.leadBy);
            }
            if (s.counselledBy && mongoose.Types.ObjectId.isValid(s.counselledBy)) {
                userIdsToResolve.push(s.counselledBy);
            }
        });
        const resolvedUsers = userIdsToResolve.length > 0 
            ? await User.find({ _id: { $in: userIdsToResolve } }, { name: 1 }).lean()
            : [];
        const userMap = new Map();
        resolvedUsers.forEach(u => userMap.set(u._id.toString(), u.name));

        // Student ID to details: { names, phones, emails, leadByName, counselledByName }
        const studentInfoMap = new Map();
        admittedStudents.forEach(s => {
            const sid = s._id.toString();
            const names = (s.studentsDetails || []).map(d => d.studentName).filter(Boolean);
            const phones = (s.studentsDetails || []).flatMap(d => [d.mobileNum, d.whatsappNumber]).filter(Boolean).map(p => cleanPhoneNumber(p)).filter(Boolean);
            const emails = [
                ...(s.studentsDetails || []).map(d => d.studentEmail).filter(Boolean),
                ...(s.guardians || []).map(g => g.guardianEmail).filter(Boolean)
            ];
            const leadByName = (s.leadBy && userMap.get(s.leadBy.toString())) || "";
            let counselledByName = "";
            if (s.counselledBy && userMap.has(s.counselledBy.toString())) {
                counselledByName = userMap.get(s.counselledBy.toString());
            } else if (s.counselledBy && typeof s.counselledBy === 'string' && s.counselledBy !== 'N/A') {
                counselledByName = s.counselledBy;
            }
            const studentCreatedBy = (s.createdBy && typeof s.createdBy === 'string') ? s.createdBy : "";

            studentInfoMap.set(sid, { names, phones, emails, leadByName, counselledByName, studentCreatedBy });
        });

        // Map cleaned phone -> array of admission details
        const phoneToAdmissionEntries = new Map();
        const addAdmissionEntry = (phone, entry) => {
            const cp = cleanPhoneNumber(phone);
            if (!cp) return;
            if (!phoneToAdmissionEntries.has(cp)) {
                phoneToAdmissionEntries.set(cp, []);
            }
            phoneToAdmissionEntries.get(cp).push(entry);
        };

        normalAdmissions.forEach(adm => {
            const sid = adm.student?.toString();
            const sInfo = sid ? studentInfoMap.get(sid) : null;
            const courseTitle = adm.course?.courseName || adm.boardCourseName || adm.board?.boardCourse || adm.board?.name || "";
            const admittedByName = adm.createdBy?.name || sInfo?.leadByName || sInfo?.counselledByName || sInfo?.studentCreatedBy || "";
            const enrollNo = adm.admissionNumber || "";
            const amount = adm.downPayment ?? 0;
            const email = sInfo?.emails?.[0] || "";
            const studentNames = sInfo?.names || [];

            const entry = {
                studentNames,
                amount,
                courseTitle,
                admittedByName,
                enrollNo,
                email,
                admissionDate: adm.admissionDate || adm.createdAt || null
            };

            (sInfo?.phones || []).forEach(p => addAdmissionEntry(p, entry));
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
            const sid = adm.studentId?.toString();
            const sInfo = sid ? studentInfoMap.get(sid) : null;
            const admittedByName = adm.createdBy?.name || sInfo?.leadByName || sInfo?.counselledByName || sInfo?.studentCreatedBy || "";
            const enrollNo = adm.admissionNumber || "";
            const email = sInfo?.emails?.[0] || "";
            const studentNames = [
                adm.studentName,
                ...(sInfo?.names || [])
            ].filter(Boolean);

            const entry = {
                studentNames,
                amount,
                courseTitle: boardTitle,
                admittedByName,
                enrollNo,
                email,
                admissionDate: adm.admissionDate || adm.createdAt || null
            };

            if (adm.mobileNum) {
                addAdmissionEntry(adm.mobileNum, entry);
            }
            (sInfo?.phones || []).forEach(p => addAdmissionEntry(p, entry));
        });

        const leadsWithPayments = leads.map(lead => {
            const cp1 = cleanPhoneNumber(lead.phoneNumber);
            const cp2 = cleanPhoneNumber(lead.secondPhoneNumber);

            const candidateEntries = [
                ...(phoneToAdmissionEntries.get(cp1) || []),
                ...(phoneToAdmissionEntries.get(cp2) || [])
            ];

            // Match by student name if multiple candidates, else take first
            let matchedEntry = null;
            if (candidateEntries.length > 0) {
                matchedEntry = candidateEntries.find(entry => 
                    (entry.studentNames || []).some(sn => isNameMatch(lead.name, sn))
                ) || candidateEntries[0];
            }

            const downPayment = matchedEntry ? matchedEntry.amount : 0;
            const admittedCourseName = matchedEntry?.courseTitle || "";
            const leadCourseFallback = lead.board?.boardCourse ? `${lead.board.boardCourse}${lead.className?.name ? ' Class ' + lead.className.name : ''} Board Course` : "";
            const leadCourseName = lead.course?.courseName || lead.courseText || leadCourseFallback || lead.board?.name || "NA";
            const enrollmentNo = matchedEntry?.enrollNo || "NA";
            const email = lead.email ? lead.email.trim() : (matchedEntry?.email || "NA");
            const admittedBy = matchedEntry?.admittedByName || "NA";
            const admissionDate = matchedEntry?.admissionDate || null;
            const source = lead.source || (lead.isBulkUpload ? "BULK UPLOAD" : (lead.isWalkIn ? "WALK-IN" : "DIRECT / MANUAL"));

            return {
                ...lead.toObject ? lead.toObject() : lead,
                downPayment,
                admittedCourseName: admittedCourseName || "NA",
                leadCourseName: leadCourseName || "NA",
                enrollmentNo: enrollmentNo || "NA",
                email: email || "NA",
                admittedBy: admittedBy || "NA",
                admissionDate,
                source
            };
        });

        res.status(200).json({ success: true, leads: leadsWithPayments });
    } catch (err) {
        console.error("Error getting conversion details:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
