import mongoose from 'mongoose';
import Student from '../models/Students.js';
import Admission from '../models/Admission/Admission.js';
import BoardCourseAdmission from '../models/Admission/BoardCourseAdmission.js';
import PNTSEStudent from '../models/PNTSEStudent.js';
import PMOStudent from '../models/PMOStudent.js';
import Zone from '../models/Zone.js';
import Centre from '../models/Master_data/Centre.js';
import ClassModel from '../models/Master_data/Class.js';
import Course from '../models/Master_data/Courses.js';
import Session from '../models/Master_data/Session.js';

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
                    name: doc.name,
                    mobile: doc.mobile,
                    email: doc.email || "",
                    gender: doc.gender || "",
                    school: doc.school || doc.schoolName || "",
                    schoolName: doc.school || doc.schoolName || "",
                    guardianName: doc.guardianName || "",
                    guardianMobile: doc.guardianMobile || "",
                    studentsDetails: [{
                        studentName: doc.name,
                        mobileNum: doc.mobile,
                        whatsappNumber: doc.secondaryMobile || doc.mobile,
                        studentEmail: doc.email || "",
                        gender: doc.gender || "",
                        schoolName: doc.school || doc.schoolName || "",
                        school: doc.school || doc.schoolName || "",
                        guardianName: doc.guardianName || "",
                        guardianMobile: doc.guardianMobile || "",
                        guardians: [{
                            guardianName: doc.guardianName || "",
                            guardianMobile: doc.guardianMobile || ""
                        }],
                        centre: doc.centre?.centreName || (typeof doc.centre === 'string' ? doc.centre : ""),
                        class: doc.class?.name || (typeof doc.class === 'string' ? doc.class : "")
                    }],
                    guardians: [{
                        guardianName: doc.guardianName || "",
                        guardianMobile: doc.guardianMobile || ""
                    }],
                    carryForwardBalance: 0,
                    isVirtualStudent: true
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
                name: doc.name,
                mobile: doc.mobile,
                email: doc.email || "",
                gender: doc.gender || "",
                school: doc.school || doc.schoolName || "",
                schoolName: doc.school || doc.schoolName || "",
                guardianName: doc.guardianName || "",
                guardianMobile: doc.guardianMobile || "",
                studentsDetails: [{
                    studentName: doc.name,
                    mobileNum: doc.mobile,
                    whatsappNumber: doc.secondaryMobile || doc.mobile,
                    studentEmail: doc.email || "",
                    gender: doc.gender || "",
                    schoolName: doc.school || doc.schoolName || "",
                    school: doc.school || doc.schoolName || "",
                    guardianName: doc.guardianName || "",
                    guardianMobile: doc.guardianMobile || "",
                    guardians: [{
                        guardianName: doc.guardianName || "",
                        guardianMobile: doc.guardianMobile || ""
                    }],
                    centre: doc.centre?.centreName || (typeof doc.centre === 'string' ? doc.centre : ""),
                    class: doc.class?.name || (typeof doc.class === 'string' ? doc.class : "")
                }],
                guardians: [{
                    guardianName: doc.guardianName || "",
                    guardianMobile: doc.guardianMobile || ""
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

/**
 * GET /api/carry-forward/pending-report
 * Reports students in Classes 6, 7, 8, 9, and 10 who have NOT yet carried forward
 * to an upper class or higher academic session.
 * For Class 10: carried forward into Class 11 (2-Year JEE, NEET, etc.) or Class 11 Board Courses.
 * Provides Centre-Wise breakdown counts and student drill-down.
 */
export const getPendingCarryForwardReport = async (req, res) => {
    try {
        const { session: querySession, zones, centres, class: classFilter, search } = req.query;
        const user = req.user || {};
        const isSuperAdmin = user.role === "superAdmin" || user.role === "Super Admin" || user.role?.toLowerCase() === "superadmin";

        // 1. Get Zone and Centre maps
        const { zones: dbZones, centreNameToZoneMap, centreIdToZoneMap } = await getZoneCentreMaps();

        // 2. Resolve Master Classes & Courses
        const [allDbClasses, allDbCourses, allDbCentres, dbSessions] = await Promise.all([
            ClassModel.find({}).lean(),
            Course.find({}).select('courseName class courseSession courseDuration').lean(),
            Centre.find({ status: { $ne: 'deactive' } }).select('centreName enterCode _id').lean(),
            Session.find({}).select('sessionName isGlobalActive').lean()
        ]);

        const classMap = {}; // classId -> className
        const classOrderMap = {}; // className -> number (e.g. '6' -> 6)
        allDbClasses.forEach(c => {
            const cid = c._id.toString();
            classMap[cid] = c.name;
            const match = String(c.name || '').match(/\d+/);
            if (match) classOrderMap[c.name] = parseInt(match[0], 10);
        });

        // Helper to extract numeric class from any string or ID
        const getNumericClass = (rawVal) => {
            if (!rawVal) return null;
            const strVal = classMap[rawVal.toString()] || String(rawVal);
            const match = strVal.match(/\d+/);
            return match ? parseInt(match[0], 10) : null;
        };

        const courseMap = {}; // courseId -> { name, classNum, session }
        allDbCourses.forEach(c => {
            courseMap[c._id.toString()] = {
                name: c.courseName,
                classNum: getNumericClass(c.class),
                session: c.courseSession
            };
        });

        // 3. Resolve Academic Sessions
        // Dynamic Indian Financial Year (starts April 1st)
        const now = new Date();
        const curMonth = now.getMonth(); // 0 = Jan, 3 = Apr
        const curYear = now.getFullYear();
        const fyStart = curMonth >= 3 ? curYear : curYear - 1;
        const currentFinancialYear = `${fyStart}-${fyStart + 1}`;

        // Active sessions from Session Master
        const activeSessions = dbSessions.filter(s => s.isGlobalActive === true);
        let availableSessions = activeSessions.map(s => s.sessionName?.trim()).filter(Boolean);

        // Fallback in case no session is explicitly marked isGlobalActive in master data:
        if (availableSessions.length === 0) {
            availableSessions = dbSessions.map(s => s.sessionName?.trim()).filter(Boolean);
        }
        if (availableSessions.length === 0) {
            availableSessions = [currentFinancialYear];
        }

        // Always ensure the current financial year is present in availableSessions
        if (!availableSessions.includes(currentFinancialYear)) {
            availableSessions.push(currentFinancialYear);
        }

        // Clean & sort sessions descending
        availableSessions = Array.from(new Set(availableSessions)).sort((a, b) => b.localeCompare(a));

        // Selected base session: use query (if explicitly passed in availableSessions) or default to current financial year
        let targetSession = querySession ? querySession.trim() : null;
        if (!targetSession || !availableSessions.includes(targetSession)) {
            targetSession = availableSessions.includes(currentFinancialYear) ? currentFinancialYear : availableSessions[0];
        }

        // 4. Fetch all normal and board course admissions
        const [normalAdmissions, boardAdmissions] = await Promise.all([
            Admission.find({ isCancelled: { $ne: true } })
                .select('student admissionNumber centre class course academicSession createdAt paymentStatus totalFees totalPaidAmount')
                .lean(),
            BoardCourseAdmission.find({})
                .select('studentId admissionNumber centre academicSession boardCourseName createdAt lastClass')
                .lean()
        ]);

        // Map all admissions by Student ID
        const studentHistory = {}; // sid -> { normal: [], board: [] }
        normalAdmissions.forEach(adm => {
            const sid = adm.student?.toString();
            if (!sid) return;
            if (!studentHistory[sid]) studentHistory[sid] = { normal: [], board: [] };

            let classNum = getNumericClass(adm.class);
            let sess = adm.academicSession;
            let courseName = 'General';

            if (adm.course) {
                const cInfo = courseMap[adm.course.toString()];
                if (cInfo) {
                    courseName = cInfo.name;
                    if (!classNum) classNum = cInfo.classNum;
                    if (!sess) sess = cInfo.session;
                }
            }

            studentHistory[sid].normal.push({
                _id: adm._id,
                admNo: adm.admissionNumber,
                centre: adm.centre,
                classNum,
                className: classNum ? String(classNum) : (adm.class ? classMap[adm.class.toString()] || 'Unknown' : 'Unknown'),
                session: sess || '',
                courseName,
                totalFees: adm.totalFees || 0,
                totalPaidAmount: adm.totalPaidAmount || 0,
                createdAt: adm.createdAt
            });
        });

        boardAdmissions.forEach(b => {
            const sid = b.studentId?.toString();
            if (!sid) return;
            if (!studentHistory[sid]) studentHistory[sid] = { normal: [], board: [] };

            studentHistory[sid].board.push({
                _id: b._id,
                admNo: b.admissionNumber,
                centre: b.centre,
                boardCourseName: b.boardCourseName || 'Board Course',
                session: b.academicSession || '',
                createdAt: b.createdAt
            });
        });

        // Helper to exclude zagartala, phsps, franchise, rkm, howrah, and durgapur centres
        const isExcludedCentreName = (centreName) => {
            if (!centreName) return false;
            const str = String(centreName).toLowerCase().trim();
            return /zagartala/i.test(str) ||
                /phsps/i.test(str) ||
                /franchise/i.test(str) ||
                /rkm/i.test(str) ||
                /^howrah$/i.test(str) ||
                /^durgapur$/i.test(str);
        };

        // 5. Target classes to evaluate: 6, 7, 8, 9, 10
        const TARGET_CLASSES = [6, 7, 8, 9, 10];

        // Identify all students in target classes for the base session
        const baseTargetStudentIds = new Set();
        const studentBaseInfo = {}; // sid -> { baseClassNum, centre, admNo, date, courseName }

        Object.entries(studentHistory).forEach(([sid, hist]) => {
            const baseAdms = hist.normal.filter(a =>
                a.session === targetSession &&
                a.classNum !== null &&
                TARGET_CLASSES.includes(a.classNum)
            );

            if (baseAdms.length > 0) {
                // Find highest target class in this session
                const maxClass = Math.max(...baseAdms.map(a => a.classNum));
                const latestAdm = baseAdms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                const centreName = latestAdm.centre || '';

                // Exclude zagartala, phsps, franchise centres
                if (isExcludedCentreName(centreName)) return;

                baseTargetStudentIds.add(sid);
                studentBaseInfo[sid] = {
                    baseClassNum: maxClass,
                    className: String(maxClass),
                    centre: latestAdm.centre,
                    admNo: latestAdm.admNo,
                    courseName: latestAdm.courseName,
                    admissionDate: latestAdm.createdAt
                };
            }
        });

        // Fetch student contact and basic profiles
        const studentDocs = await Student.find({ _id: { $in: Array.from(baseTargetStudentIds) } })
            .select('studentsDetails examSchema isEnrolled carryForwardBalance')
            .lean();

        const studentDocsMap = {};
        studentDocs.forEach(s => { studentDocsMap[s._id.toString()] = s; });

        // 6. Evaluate Carry Forward status for each student
        const pendingStudentsList = [];
        const carriedForwardStudentIds = new Set();

        baseTargetStudentIds.forEach(sid => {
            const baseInfo = studentBaseInfo[sid];
            const hist = studentHistory[sid] || { normal: [], board: [] };
            const currentClassNum = baseInfo.baseClassNum;

            let isCarriedForward = false;
            let cfDetails = null;

            if (currentClassNum >= 6 && currentClassNum <= 9) {
                // For Class 6, 7, 8, 9:
                // Carried forward if they have an admission in an upper class (classNum > currentClassNum)
                // OR in a subsequent academic session (e.g. 2027-2028 > 2026-2027)
                const cfNormal = hist.normal.find(a => {
                    const hasHigherSession = a.session && a.session.localeCompare(targetSession) > 0;
                    const hasHigherClass = a.classNum && a.classNum > currentClassNum;
                    return hasHigherSession || hasHigherClass;
                });

                if (cfNormal) {
                    isCarriedForward = true;
                    cfDetails = { type: 'Normal', nextClass: cfNormal.className, session: cfNormal.session };
                }
            } else if (currentClassNum === 10) {
                // For Class 10:
                // Carried forward if:
                // 1. Enrolled in Class 11 (2-Year JEE / NEET / WBJEE or any Class 11 normal course)
                // 2. Enrolled in a Board Course (WBCHSE / CBSE) which serves Class 11/12
                // 3. Enrolled in a higher academic session
                const cfNormal11 = hist.normal.find(a => {
                    const isClass11 = a.classNum === 11 || (a.courseName && /(?:11|2\s*year|jee|neet)/i.test(a.courseName) && a.classNum !== 10);
                    const hasHigherSession = a.session && a.session.localeCompare(targetSession) > 0;
                    return isClass11 || hasHigherSession;
                });

                if (cfNormal11) {
                    isCarriedForward = true;
                    cfDetails = { type: 'Normal (Class 11 / 2-Year)', nextClass: '11', session: cfNormal11.session };
                } else {
                    // Check Board Course admission
                    const cfBoard = hist.board.find(b => {
                        const bSess = b.session || '';
                        return bSess.localeCompare(targetSession) >= 0;
                    });

                    if (cfBoard) {
                        isCarriedForward = true;
                        cfDetails = { type: 'Board Course (Class 11)', courseName: cfBoard.boardCourseName, session: cfBoard.session };
                    }
                }
            }

            if (isCarriedForward) {
                carriedForwardStudentIds.add(sid);
            } else {
                // Student has NOT been carried forward yet (Pending)
                const doc = studentDocsMap[sid] || {};
                const details = doc.studentsDetails?.[0] || {};
                const centreName = baseInfo.centre || details.centre || '—';
                if (isExcludedCentreName(centreName)) return;

                const centreKey = (centreName || '').trim().toLowerCase();
                const zoneInfo = centreNameToZoneMap[centreKey] || centreIdToZoneMap[centreName] || { zoneId: '', zoneName: '—' };

                pendingStudentsList.push({
                    _id: sid,
                    studentId: sid,
                    name: details.studentName || 'Unknown',
                    mobile: details.mobileNum || '',
                    whatsappNumber: details.whatsappNumber || '',
                    email: details.studentEmail || '',
                    centre: centreName,
                    zoneName: zoneInfo.zoneName,
                    zoneId: zoneInfo.zoneId,
                    admissionNumber: baseInfo.admNo || details.rollNo || '',
                    currentClass: baseInfo.className,
                    academicSession: targetSession,
                    courseName: baseInfo.courseName,
                    admissionDate: baseInfo.admissionDate,
                    status: 'PENDING_CARRY_FORWARD'
                });
            }
        });

        // 7. Role-based centre filtering
        let allowedPendingStudents = pendingStudentsList.filter(s => !isExcludedCentreName(s.centre));
        let allowedAllStudentCentres = null;

        if (!isSuperAdmin && user.centres && Array.isArray(user.centres)) {
            const allowedCentresDocs = await Centre.find({ _id: { $in: user.centres } }).select('centreName').lean();
            const allowedNames = allowedCentresDocs.map(c => c.centreName.toLowerCase().trim()).filter(name => !isExcludedCentreName(name));
            allowedAllStudentCentres = new Set(allowedNames);
            allowedPendingStudents = allowedPendingStudents.filter(s => allowedNames.includes((s.centre || '').toLowerCase().trim()));
        }

        // 8. Build Centre-Wise Breakdown Matrix
        // Aggregate counts by Centre
        const centreAggMap = {}; // centreKey -> { centreName, zoneName, zoneId, totalPending, totalEnrolled, carriedForward, class6, class7, class8, class9, class10 }

        // Initialize with all active centres from the DB so centres with 0 pending are still visible
        allDbCentres.forEach(c => {
            const name = c.centreName || c.enterCode || '';
            const key = name.trim().toLowerCase();
            if (!key || isExcludedCentreName(name)) return;

            if (allowedAllStudentCentres && !allowedAllStudentCentres.has(key)) return;

            const zoneInfo = centreNameToZoneMap[key] || centreIdToZoneMap[c._id.toString()] || { zoneId: '', zoneName: '—' };
            centreAggMap[key] = {
                centreId: c._id.toString(),
                centreName: name,
                zoneName: zoneInfo.zoneName,
                zoneId: zoneInfo.zoneId,
                class6: 0,
                class7: 0,
                class8: 0,
                class9: 0,
                class10: 0,
                totalPending: 0,
                totalEnrolled: 0,
                carriedForwardCount: 0
            };
        });

        // Calculate total enrolled and carried forward per centre
        baseTargetStudentIds.forEach(sid => {
            const baseInfo = studentBaseInfo[sid];
            const centreName = baseInfo.centre || '—';
            if (isExcludedCentreName(centreName)) return;
            const key = centreName.trim().toLowerCase();
            if (!centreAggMap[key]) {
                const zoneInfo = centreNameToZoneMap[key] || { zoneId: '', zoneName: '—' };
                centreAggMap[key] = {
                    centreId: '',
                    centreName,
                    zoneName: zoneInfo.zoneName,
                    zoneId: zoneInfo.zoneId,
                    class6: 0,
                    class7: 0,
                    class8: 0,
                    class9: 0,
                    class10: 0,
                    totalPending: 0,
                    totalEnrolled: 0,
                    carriedForwardCount: 0
                };
            }

            centreAggMap[key].totalEnrolled++;
            if (carriedForwardStudentIds.has(sid)) {
                centreAggMap[key].carriedForwardCount++;
            }
        });

        // Add pending counts per class
        allowedPendingStudents.forEach(s => {
            const key = (s.centre || '').trim().toLowerCase();
            if (centreAggMap[key]) {
                centreAggMap[key].totalPending++;
                const clsKey = `class${s.currentClass}`;
                if (centreAggMap[key][clsKey] !== undefined) {
                    centreAggMap[key][clsKey]++;
                }
            }
        });

        // Convert matrix to array and compute conversion rates
        const centreWiseCounts = Object.values(centreAggMap).map(row => {
            const conversionRate = row.totalEnrolled > 0
                ? `${((row.carriedForwardCount / row.totalEnrolled) * 100).toFixed(1)}%`
                : '0.0%';
            return {
                ...row,
                conversionRate
            };
        }).sort((a, b) => b.totalPending - a.totalPending || a.centreName.localeCompare(b.centreName));

        // 9. Calculate Overall KPI Totals
        const allowedBaseTargetStudentIds = Array.from(baseTargetStudentIds).filter(sid => !isExcludedCentreName(studentBaseInfo[sid]?.centre));
        const allowedCarriedForwardCount = Array.from(carriedForwardStudentIds).filter(sid => !isExcludedCentreName(studentBaseInfo[sid]?.centre)).length;

        const summaryTotals = {
            totalEnrolled: allowedBaseTargetStudentIds.length,
            totalCarriedForward: allowedCarriedForwardCount,
            totalPending: allowedPendingStudents.length,
            class6Pending: allowedPendingStudents.filter(s => s.currentClass === '6').length,
            class7Pending: allowedPendingStudents.filter(s => s.currentClass === '7').length,
            class8Pending: allowedPendingStudents.filter(s => s.currentClass === '8').length,
            class9Pending: allowedPendingStudents.filter(s => s.currentClass === '9').length,
            class10Pending: allowedPendingStudents.filter(s => s.currentClass === '10').length,
            overallConversionRate: allowedBaseTargetStudentIds.length > 0
                ? `${((allowedCarriedForwardCount / allowedBaseTargetStudentIds.length) * 100).toFixed(1)}%`
                : '0.0%'
        };

        // 10. Apply Filters to the returned Students List
        let filteredStudents = allowedPendingStudents;

        if (zones) {
            const zoneList = Array.isArray(zones) ? zones : zones.split(',').map(z => z.trim().toLowerCase()).filter(Boolean);
            if (zoneList.length > 0) {
                filteredStudents = filteredStudents.filter(s =>
                    zoneList.includes((s.zoneId || '').toLowerCase()) ||
                    zoneList.includes((s.zoneName || '').toLowerCase())
                );
            }
        }

        if (centres) {
            const centreList = Array.isArray(centres) ? centres : centres.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
            if (centreList.length > 0) {
                filteredStudents = filteredStudents.filter(s => centreList.includes((s.centre || '').toLowerCase()));
            }
        }

        if (classFilter) {
            const targetClassStr = String(classFilter).trim();
            filteredStudents = filteredStudents.filter(s => s.currentClass === targetClassStr);
        }

        if (search) {
            const q = search.toLowerCase().trim();
            filteredStudents = filteredStudents.filter(s =>
                s.name.toLowerCase().includes(q) ||
                s.mobile.includes(q) ||
                s.admissionNumber.toLowerCase().includes(q) ||
                s.centre.toLowerCase().includes(q)
            );
        }

        res.status(200).json({
            success: true,
            session: targetSession,
            availableSessions,
            summary: summaryTotals,
            centreWiseCounts,
            students: filteredStudents,
            totalStudentsCount: filteredStudents.length
        });

    } catch (error) {
        console.error("Error generating pending carry forward report:", error);
        res.status(500).json({
            success: false,
            message: "Error generating pending carry forward report",
            error: error.message
        });
    }
};

