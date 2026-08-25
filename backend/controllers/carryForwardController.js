import mongoose from 'mongoose';
import Student from '../models/Students.js';
import Admission from '../models/Admission/Admission.js';
import BoardCourseAdmission from '../models/Admission/BoardCourseAdmission.js';
import PNTSEStudent from '../models/PNTSEStudent.js';
import PMOStudent from '../models/PMOStudent.js';
import Zone from '../models/Zone.js';
import Centre from '../models/Master_data/Centre.js';

/**
 * Helper to build centre-to-zone and centre-to-zoneId map
 */
const getZoneCentreMaps = async () => {
    const zones = await Zone.find({ isActive: { $ne: false } })
        .populate({ path: 'centres', select: 'centreName _id' })
        .lean();

    const centreNameToZoneMap = {}; // centreName (lowercase) -> { zoneId, zoneName }
    const centreIdToZoneMap = {};   // centreId -> { zoneId, zoneName }

    zones.forEach(zone => {
        (zone.centres || []).forEach(centre => {
            if (centre) {
                const info = { zoneId: zone._id.toString(), zoneName: zone.name };
                if (centre._id) centreIdToZoneMap[centre._id.toString()] = info;
                if (centre.centreName) centreNameToZoneMap[centre.centreName.trim().toLowerCase()] = info;
            }
        });
    });

    return { zones, centreNameToZoneMap, centreIdToZoneMap };
};

/**
 * GET /api/carry-forward/students
 * High-performance endpoint to fetch all carry forward students with Zone and Centre mapping
 */
export const getCarryForwardStudents = async (req, res) => {
    try {
        const { search, class: classFilter, zones, centres, fromDate, toDate } = req.query;
        const user = req.user || {};
        const isSuperAdmin = user.role === "superAdmin" || user.role === "Super Admin" || user.role?.toLowerCase() === "superadmin";

        const { zones: dbZones, centreNameToZoneMap, centreIdToZoneMap } = await getZoneCentreMaps();

        // 1. Fetch slim admissions for counting courses per student & caching latest centre
        const [normalAdmissions, boardAdmissions, pntseStudents, pmoStudents] = await Promise.all([
            Admission.find({}, 'student admissionNumber centre course department academicSession totalFees totalPaidAmount paymentStatus admissionDate').lean(),
            BoardCourseAdmission.find({}, 'studentId admissionNumber centre boardCourseName department academicSession totalFees totalPaidAmount paymentStatus admissionDate').lean(),
            PNTSEStudent.find({}, 'studentId rollNo centre course amountPaid createdAt').populate('centre', 'centreName').lean(),
            PMOStudent.find({}, 'studentId rollNo centre course amountPaid createdAt').populate('centre', 'centreName').lean()
        ]);

        const studentAdmissionCount = {};
        const studentFirstAdmissionNo = {};
        const studentCentresFromAdm = {};
        const studentLatestAdmDate = {};

        normalAdmissions.forEach(adm => {
            const sid = adm.student?.toString();
            if (sid) {
                studentAdmissionCount[sid] = (studentAdmissionCount[sid] || 0) + 1;
                if (!studentFirstAdmissionNo[sid] && adm.admissionNumber) {
                    studentFirstAdmissionNo[sid] = adm.admissionNumber;
                }
                if (adm.centre && !studentCentresFromAdm[sid]) {
                    studentCentresFromAdm[sid] = adm.centre;
                }
                if (adm.admissionDate) {
                    const d = new Date(adm.admissionDate);
                    if (!studentLatestAdmDate[sid] || d > new Date(studentLatestAdmDate[sid])) {
                        studentLatestAdmDate[sid] = adm.admissionDate;
                    }
                }
            }
        });

        boardAdmissions.forEach(adm => {
            const sid = adm.studentId?.toString();
            if (sid) {
                studentAdmissionCount[sid] = (studentAdmissionCount[sid] || 0) + 1;
                if (!studentFirstAdmissionNo[sid] && adm.admissionNumber) {
                    studentFirstAdmissionNo[sid] = adm.admissionNumber;
                }
                if (adm.centre && !studentCentresFromAdm[sid]) {
                    studentCentresFromAdm[sid] = adm.centre;
                }
                if (adm.admissionDate) {
                    const d = new Date(adm.admissionDate);
                    if (!studentLatestAdmDate[sid] || d > new Date(studentLatestAdmDate[sid])) {
                        studentLatestAdmDate[sid] = adm.admissionDate;
                    }
                }
            }
        });

        pntseStudents.forEach(adm => {
            const sid = adm.studentId?.toString();
            if (sid) {
                studentAdmissionCount[sid] = (studentAdmissionCount[sid] || 0) + 1;
                if (!studentFirstAdmissionNo[sid] && adm.rollNo) {
                    studentFirstAdmissionNo[sid] = adm.rollNo;
                }
                const centreName = adm.centre?.centreName || (typeof adm.centre === 'string' ? adm.centre : null);
                if (centreName && !studentCentresFromAdm[sid]) {
                    studentCentresFromAdm[sid] = centreName;
                }
                if (adm.createdAt) {
                    const d = new Date(adm.createdAt);
                    if (!studentLatestAdmDate[sid] || d > new Date(studentLatestAdmDate[sid])) {
                        studentLatestAdmDate[sid] = adm.createdAt;
                    }
                }
            }
        });

        pmoStudents.forEach(adm => {
            const sid = adm.studentId?.toString();
            if (sid) {
                studentAdmissionCount[sid] = (studentAdmissionCount[sid] || 0) + 1;
                if (!studentFirstAdmissionNo[sid] && adm.rollNo) {
                    studentFirstAdmissionNo[sid] = adm.rollNo;
                }
                const centreName = adm.centre?.centreName || (typeof adm.centre === 'string' ? adm.centre : null);
                if (centreName && !studentCentresFromAdm[sid]) {
                    studentCentresFromAdm[sid] = centreName;
                }
                if (adm.createdAt) {
                    const d = new Date(adm.createdAt);
                    if (!studentLatestAdmDate[sid] || d > new Date(studentLatestAdmDate[sid])) {
                        studentLatestAdmDate[sid] = adm.createdAt;
                    }
                }
            }
        });

        const multiAdmissionStudentIds = Object.keys(studentAdmissionCount).filter(id => studentAdmissionCount[id] > 1);

        // 2. Query only students that have carry forward balance > 0 OR marked for carry forward OR multi admissions
        const studentQuery = {
            $or: [
                { carryForwardBalance: { $gt: 0 } },
                { markedForCarryForward: true },
                { _id: { $in: multiAdmissionStudentIds } }
            ]
        };

        const students = await Student.find(studentQuery)
            .select('studentsDetails examSchema carryForwardBalance markedForCarryForward isEnrolled createdAt')
            .sort({ updatedAt: -1, createdAt: -1 })
            .lean();

        // 3. Format and map Zone / Centre
        let formatted = students.map(s => {
            const details = s.studentsDetails?.[0] || {};
            const centreName = details.centre || studentCentresFromAdm[s._id.toString()] || "—";
            const currentClass = s.examSchema?.[0]?.class || details.class || "N/A";
            
            // Map centre to zone
            const centreKey = (centreName || "").trim().toLowerCase();
            const zoneInfo = centreNameToZoneMap[centreKey] || centreIdToZoneMap[centreName] || { zoneId: "", zoneName: "—" };

            const admCount = studentAdmissionCount[s._id.toString()] || 0;
            const hasMultipleCourses = admCount > 1;
            const hasCarryForwardBalance = (s.carryForwardBalance || 0) > 0 || s.markedForCarryForward;
            const admDate = studentLatestAdmDate[s._id.toString()] || s.createdAt;

            return {
                _id: s._id,
                name: details.studentName || "Unknown",
                email: details.studentEmail || "",
                mobile: details.mobileNum || "",
                secondaryMobile: details.whatsappNumber || "",
                centre: centreName,
                zoneName: zoneInfo.zoneName,
                zoneId: zoneInfo.zoneId,
                class: currentClass,
                admissionNumber: studentFirstAdmissionNo[s._id.toString()] || "",
                admissionCount: admCount,
                carryForwardBalance: s.carryForwardBalance || 0,
                markedForCarryForward: !!s.markedForCarryForward,
                hasMultipleCourses,
                hasCarryForwardBalance,
                admissionDate: admDate,
                createdAt: s.createdAt
            };
        });

        // 4. Role-based centre filtering
        if (!isSuperAdmin && user.centres && Array.isArray(user.centres)) {
            const allowedCentres = await Centre.find({ _id: { $in: user.centres } }).select('centreName').lean();
            const allowedNames = allowedCentres.map(c => c.centreName.toLowerCase().trim());
            formatted = formatted.filter(s => allowedNames.includes((s.centre || "").toLowerCase().trim()));
        }

        // 5. Optional query filter handling
        if (zones) {
            const zoneList = Array.isArray(zones) ? zones : zones.split(',').map(z => z.trim()).filter(Boolean);
            if (zoneList.length > 0) {
                formatted = formatted.filter(s => zoneList.includes(s.zoneId) || zoneList.includes(s.zoneName));
            }
        }

        if (centres) {
            const centreList = Array.isArray(centres) ? centres : centres.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
            if (centreList.length > 0) {
                formatted = formatted.filter(s => centreList.includes((s.centre || "").toLowerCase().trim()));
            }
        }

        if (classFilter) {
            formatted = formatted.filter(s => String(s.class).toLowerCase() === String(classFilter).toLowerCase());
        }

        if (search) {
            const q = search.toLowerCase().trim();
            formatted = formatted.filter(s =>
                s.name.toLowerCase().includes(q) ||
                s.mobile.includes(q) ||
                s.email.toLowerCase().includes(q) ||
                s.admissionNumber.toLowerCase().includes(q) ||
                s._id.toString().includes(q)
            );
        }

        if (fromDate || toDate) {
            const fromTime = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
            const toTime = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;
            formatted = formatted.filter(s => {
                const itemDate = s.admissionDate || s.createdAt;
                if (!itemDate) return false;
                const t = new Date(itemDate).getTime();
                if (fromTime && t < fromTime) return false;
                if (toTime && t > toTime) return false;
                return true;
            });
        }

        res.status(200).json({
            success: true,
            count: formatted.length,
            data: formatted
        });

    } catch (error) {
        console.error("Error fetching carry forward students:", error);
        res.status(500).json({ success: false, message: "Error fetching carry forward students", error: error.message });
    }
};

/**
 * GET /api/carry-forward/student-details/:studentId
 * Fetch full populated student admissions for the detail modal
 */
export const getCarryForwardStudentDetails = async (req, res) => {
    try {
        const { studentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ success: false, message: "Invalid student ID" });
        }

        let student = await Student.findById(studentId).lean();
        let studentMobile = student?.studentsDetails?.[0]?.mobileNum;

        // If not found in Student collection, check PNTSE / PMO
        if (!student) {
            const [pntseDoc, pmoDoc] = await Promise.all([
                PNTSEStudent.findById(studentId).populate('class', 'name').populate('centre', 'centreName').populate('session', 'sessionName').lean(),
                PMOStudent.findById(studentId).populate('class', 'name').populate('centre', 'centreName').populate('session', 'sessionName').lean()
            ]);
            const doc = pntseDoc || pmoDoc;
            if (doc) {
                student = {
                    _id: doc._id,
                    studentsDetails: [{
                        studentName: doc.name,
                        mobileNum: doc.mobile,
                        whatsappNumber: doc.secondaryMobile || doc.mobile,
                        studentEmail: doc.email || "",
                        centre: doc.centre?.centreName || (typeof doc.centre === 'string' ? doc.centre : ""),
                        class: doc.class?.name || (typeof doc.class === 'string' ? doc.class : "")
                    }],
                    carryForwardBalance: 0
                };
                studentMobile = doc.mobile;
            }
        }

        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const [normalAdmissions, boardAdmissions, pntseAdmissions, pmoAdmissions] = await Promise.all([
            Admission.find({ student: studentId })
                .populate('course', 'courseName')
                .populate('department', 'departmentName')
                .populate('class', 'name')
                .populate('examTag', 'name')
                .lean(),
            BoardCourseAdmission.find({ studentId })
                .populate('boardId', 'boardName boardCourse')
                .populate('department', 'departmentName')
                .populate('examTag', 'name')
                .lean(),
            PNTSEStudent.find({
                $or: [
                    { studentId },
                    ...(studentMobile ? [{ mobile: studentMobile }] : []),
                    { _id: studentId }
                ]
            }).populate('class', 'name').populate('centre', 'centreName').populate('session', 'sessionName').lean(),
            PMOStudent.find({
                $or: [
                    { studentId },
                    ...(studentMobile ? [{ mobile: studentMobile }] : []),
                    { _id: studentId }
                ]
            }).populate('class', 'name').populate('centre', 'centreName').populate('session', 'sessionName').lean()
        ]);

        const combinedAdmissions = [
            ...(normalAdmissions || []).map(a => ({
                ...a,
                type: 'Normal',
                course: a.course ? (typeof a.course === 'object' ? a.course : { courseName: String(a.course) }) : { courseName: a.boardCourseName || 'Course' },
                department: a.department ? (typeof a.department === 'object' ? a.department : { departmentName: String(a.department) }) : { departmentName: 'General' }
            })),
            ...(boardAdmissions || []).map(a => ({
                ...a,
                type: 'Board',
                course: a.boardId ? { ...a.boardId, courseName: a.boardCourseName || a.boardId.boardCourse || a.boardId.boardName || 'Board Course' } : { courseName: a.boardCourseName || 'Board Course' },
                department: a.department ? (typeof a.department === 'object' ? a.department : { departmentName: String(a.department) }) : { departmentName: 'Board Course' }
            })),
            ...(pntseAdmissions || []).map(a => ({
                ...a,
                type: 'PNTSE',
                admissionNumber: a.rollNo,
                course: { courseName: a.course || 'PNTSE' },
                department: { departmentName: 'PNTSE' },
                centre: a.centre?.centreName || (typeof a.centre === 'string' ? a.centre : '—'),
                academicSession: a.session?.sessionName || '—',
                totalFees: a.amountPaid || 0,
                totalPaidAmount: a.amountPaid || 0,
                paymentStatus: a.isPaymentPending ? 'PENDING' : 'PAID',
                admissionDate: a.createdAt
            })),
            ...(pmoAdmissions || []).map(a => ({
                ...a,
                type: 'PMO',
                admissionNumber: a.rollNo,
                course: { courseName: a.course || 'PMO' },
                department: { departmentName: 'PMO' },
                centre: a.centre?.centreName || (typeof a.centre === 'string' ? a.centre : '—'),
                academicSession: a.session?.sessionName || '—',
                totalFees: a.amountPaid || 0,
                totalPaidAmount: a.amountPaid || 0,
                paymentStatus: a.isPaymentPending ? 'PENDING' : 'PAID',
                admissionDate: a.createdAt
            }))
        ];

        res.status(200).json({
            success: true,
            student,
            admissions: combinedAdmissions
        });

    } catch (error) {
        console.error("Error fetching student details for carry forward:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * GET /api/carry-forward/search-enrolled
 * Search student by admission number
 */
export const searchEnrolledStudent = async (req, res) => {
    try {
        const { admissionNumber } = req.query;
        if (!admissionNumber || !admissionNumber.trim()) {
            return res.status(400).json({ success: false, message: "Admission number is required" });
        }

        const cleanAdmNo = admissionNumber.trim();
        const admRegex = new RegExp(`^${cleanAdmNo}$`, 'i');

        // Check normal admissions first
        let matchedAdmission = await Admission.findOne({
            admissionNumber: admRegex
        }).select('student admissionNumber').lean();

        let studentId = matchedAdmission?.student;

        // Check board admissions if not found
        if (!studentId) {
            const matchedBoard = await BoardCourseAdmission.findOne({
                admissionNumber: admRegex
            }).select('studentId admissionNumber').lean();
            studentId = matchedBoard?.studentId;
        }

        // Check PNTSE students if not found
        let matchedPntse = null;
        if (!studentId) {
            matchedPntse = await PNTSEStudent.findOne({
                $or: [
                    { rollNo: admRegex },
                    { billId: admRegex }
                ]
            }).populate('class', 'name').populate('centre', 'centreName').populate('session', 'sessionName').lean();
            studentId = matchedPntse?.studentId;
        }

        // Check PMO students if not found
        let matchedPmo = null;
        if (!studentId) {
            matchedPmo = await PMOStudent.findOne({
                $or: [
                    { rollNo: admRegex },
                    { billId: admRegex }
                ]
            }).populate('class', 'name').populate('centre', 'centreName').populate('session', 'sessionName').lean();
            studentId = matchedPmo?.studentId;
        }

        // Check roll no / mobile / id as fallback on Student
        let student = null;
        if (studentId) {
            student = await Student.findById(studentId).lean();
        } else {
            student = await Student.findOne({
                $or: [
                    { "studentsDetails.mobileNum": cleanAdmNo },
                    { "studentsDetails.rollNo": admRegex },
                    { _id: mongoose.Types.ObjectId.isValid(cleanAdmNo) ? cleanAdmNo : undefined }
                ].filter(Boolean)
            }).lean();
            studentId = student?._id;
        }

        // If still no student doc, but found PNTSE / PMO record directly
        if (!student && (matchedPntse || matchedPmo)) {
            const doc = matchedPntse || matchedPmo;
            student = {
                _id: doc._id,
                studentsDetails: [{
                    studentName: doc.name,
                    mobileNum: doc.mobile,
                    whatsappNumber: doc.secondaryMobile || doc.mobile,
                    studentEmail: doc.email || "",
                    centre: doc.centre?.centreName || (typeof doc.centre === 'string' ? doc.centre : ""),
                    class: doc.class?.name || (typeof doc.class === 'string' ? doc.class : "")
                }],
                carryForwardBalance: 0,
                isVirtualStudent: true
            };
            studentId = doc._id;
        }

        if (!student) {
            return res.status(404).json({ success: false, message: "No student found with this admission number" });
        }

        const studentMobile = student.studentsDetails?.[0]?.mobileNum;

        // Fetch all course records across Normal, Board, PNTSE, and PMO
        const [normalAdmissions, boardAdmissions, pntseAdmissions, pmoAdmissions] = await Promise.all([
            studentId && !student.isVirtualStudent ? Admission.find({ student: studentId })
                .populate('course', 'courseName')
                .populate('department', 'departmentName')
                .populate('class', 'name')
                .populate('examTag', 'name')
                .lean() : [],
            studentId && !student.isVirtualStudent ? BoardCourseAdmission.find({ studentId })
                .populate('boardId', 'boardName boardCourse')
                .populate('department', 'departmentName')
                .populate('examTag', 'name')
                .lean() : [],
            PNTSEStudent.find({
                $or: [
                    ...(studentId && !student.isVirtualStudent ? [{ studentId }] : []),
                    ...(studentMobile ? [{ mobile: studentMobile }] : []),
                    { rollNo: admRegex }
                ]
            }).populate('class', 'name').populate('centre', 'centreName').populate('session', 'sessionName').lean(),
            PMOStudent.find({
                $or: [
                    ...(studentId && !student.isVirtualStudent ? [{ studentId }] : []),
                    ...(studentMobile ? [{ mobile: studentMobile }] : []),
                    { rollNo: admRegex }
                ]
            }).populate('class', 'name').populate('centre', 'centreName').populate('session', 'sessionName').lean()
        ]);

        const combinedAdmissions = [
            ...(normalAdmissions || []).map(a => ({
                ...a,
                type: 'Normal',
                course: a.course ? (typeof a.course === 'object' ? a.course : { courseName: String(a.course) }) : { courseName: a.boardCourseName || 'Course' },
                department: a.department ? (typeof a.department === 'object' ? a.department : { departmentName: String(a.department) }) : { departmentName: 'General' }
            })),
            ...(boardAdmissions || []).map(a => ({
                ...a,
                type: 'Board',
                course: a.boardId ? { ...a.boardId, courseName: a.boardCourseName || a.boardId.boardCourse || a.boardId.boardName || 'Board Course' } : { courseName: a.boardCourseName || 'Board Course' },
                department: a.department ? (typeof a.department === 'object' ? a.department : { departmentName: String(a.department) }) : { departmentName: 'Board Course' }
            })),
            ...(pntseAdmissions || []).map(a => ({
                ...a,
                type: 'PNTSE',
                admissionNumber: a.rollNo,
                course: { courseName: a.course || 'PNTSE' },
                department: { departmentName: 'PNTSE' },
                centre: a.centre?.centreName || (typeof a.centre === 'string' ? a.centre : '—'),
                academicSession: a.session?.sessionName || '—',
                totalFees: a.amountPaid || 0,
                totalPaidAmount: a.amountPaid || 0,
                paymentStatus: a.isPaymentPending ? 'PENDING' : 'PAID',
                admissionDate: a.createdAt
            })),
            ...(pmoAdmissions || []).map(a => ({
                ...a,
                type: 'PMO',
                admissionNumber: a.rollNo,
                course: { courseName: a.course || 'PMO' },
                department: { departmentName: 'PMO' },
                centre: a.centre?.centreName || (typeof a.centre === 'string' ? a.centre : '—'),
                academicSession: a.session?.sessionName || '—',
                totalFees: a.amountPaid || 0,
                totalPaidAmount: a.amountPaid || 0,
                paymentStatus: a.isPaymentPending ? 'PENDING' : 'PAID',
                admissionDate: a.createdAt
            }))
        ];

        res.status(200).json({
            success: true,
            student,
            admissions: combinedAdmissions
        });

    } catch (error) {
        console.error("Error searching enrolled student:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
