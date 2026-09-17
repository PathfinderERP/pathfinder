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
import Department from '../models/Master_data/Department.js';
import CarryForwardRemark from '../models/CarryForwardRemark.js';
import { getActiveCarryForwardBalance } from '../utils/carryForwardHelper.js';

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
        const { search, class: classFilter, zones, centres, fromDate, toDate, departments, programmes } = req.query;
        const user = req.user || {};
        const isSuperAdmin = user.role === "superAdmin" || user.role === "Super Admin" || user.role?.toLowerCase() === "superadmin";

        const { zones: dbZones, centreNameToZoneMap, centreIdToZoneMap } = await getZoneCentreMaps();

        // 1. Fetch slim admissions for counting courses per student & caching latest centre
        const [normalAdmissions, boardAdmissions, pntseStudents, pmoStudents] = await Promise.all([
            Admission.find({}, 'student admissionNumber centre course department programme academicSession totalFees totalPaidAmount paymentStatus admissionDate').populate('department', 'departmentName name').lean(),
            BoardCourseAdmission.find({}, 'studentId admissionNumber centre boardCourseName department programme academicSession totalFees totalPaidAmount paymentStatus admissionDate').populate('department', 'departmentName name').lean(),
            PNTSEStudent.find({}, 'studentId rollNo centre course amountPaid createdAt').populate('centre', 'centreName').lean(),
            PMOStudent.find({}, 'studentId rollNo centre course amountPaid createdAt').populate('centre', 'centreName').lean()
        ]);

        const studentAdmissionCount = {};
        const studentFirstAdmissionNo = {};
        const studentCentresFromAdm = {};
        const studentLatestAdmDate = {};
        const studentDepartments = {};
        const studentProgrammes = {};
        const studentFirstDepartment = {};
        const studentFirstProgramme = {};

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
                if (adm.department) {
                    const dId = adm.department._id ? adm.department._id.toString() : adm.department.toString();
                    const dName = adm.department.departmentName || adm.department.name || '';
                    if (!studentDepartments[sid]) studentDepartments[sid] = [];
                    studentDepartments[sid].push({ id: dId, name: dName });
                    if (!studentFirstDepartment[sid]) studentFirstDepartment[sid] = { id: dId, name: dName };
                }
                if (adm.programme) {
                    if (!studentProgrammes[sid]) studentProgrammes[sid] = [];
                    studentProgrammes[sid].push(adm.programme);
                    if (!studentFirstProgramme[sid]) studentFirstProgramme[sid] = adm.programme;
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
                if (adm.department) {
                    const dId = adm.department._id ? adm.department._id.toString() : adm.department.toString();
                    const dName = adm.department.departmentName || adm.department.name || '';
                    if (!studentDepartments[sid]) studentDepartments[sid] = [];
                    studentDepartments[sid].push({ id: dId, name: dName });
                    if (!studentFirstDepartment[sid]) studentFirstDepartment[sid] = { id: dId, name: dName };
                }
                if (adm.programme) {
                    if (!studentProgrammes[sid]) studentProgrammes[sid] = [];
                    studentProgrammes[sid].push(adm.programme);
                    if (!studentFirstProgramme[sid]) studentFirstProgramme[sid] = adm.programme;
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

            const sidStr = s._id.toString();
            const firstDept = studentFirstDepartment[sidStr];
            const deptsList = studentDepartments[sidStr] || [];
            const progsList = studentProgrammes[sidStr] || [];
            const firstProg = studentFirstProgramme[sidStr] || (progsList[0] || '');

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
                admissionNumber: studentFirstAdmissionNo[sidStr] || "",
                admissionCount: admCount,
                carryForwardBalance: s.carryForwardBalance || 0,
                markedForCarryForward: !!s.markedForCarryForward,
                hasMultipleCourses,
                hasCarryForwardBalance,
                admissionDate: admDate,
                createdAt: s.createdAt,
                department: firstDept?.id || '',
                departmentName: firstDept?.name || '',
                departments: deptsList.map(d => d.id),
                programme: firstProg,
                programmes: progsList
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

        if (departments) {
            const deptList = Array.isArray(departments) 
                ? departments 
                : departments.split(',').map(d => d.trim()).filter(Boolean);
            if (deptList.length > 0) {
                formatted = formatted.filter(s => {
                    return (s.department && deptList.includes(s.department)) ||
                           (s.departments && s.departments.some(d => deptList.includes(d)));
                });
            }
        }

        if (programmes) {
            const progList = Array.isArray(programmes) 
                ? programmes.map(p => p.trim().toUpperCase()) 
                : programmes.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
            if (progList.length > 0) {
                formatted = formatted.filter(s => {
                    return (s.programme && progList.includes(s.programme.toUpperCase())) ||
                           (s.programmes && s.programmes.some(p => progList.includes(p.toUpperCase())));
                });
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

        if (student && student.carryForwardBalance > 0 && !student.isVirtualStudent) {
            student.carryForwardBalance = await getActiveCarryForwardBalance(studentId);
        }

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
        const { session: querySession, zones, centres, class: classFilter, departments, programmes, search } = req.query;
        const user = req.user || {};
        const isSuperAdmin = user.role === "superAdmin" || user.role === "Super Admin" || user.role?.toLowerCase() === "superadmin";

        // 1. Get Zone and Centre maps
        const { zones: dbZones, centreNameToZoneMap, centreIdToZoneMap } = await getZoneCentreMaps();

        // 2. Resolve Master Classes, Courses, Centres, Sessions, Departments, and Active Students
        const [allDbClasses, allDbCourses, allDbCentres, dbSessions, allDbDepartments, activeStudents, allRemarks] = await Promise.all([
            ClassModel.find({}).lean(),
            Course.find({}).select('courseName class courseSession courseDuration department').lean(),
            Centre.find({ status: { $ne: 'deactive' } }).select('centreName enterCode _id').lean(),
            Session.find({}).select('sessionName isGlobalActive').lean(),
            Department.find({}).select('departmentName _id').lean(),
            Student.find({ status: { $ne: 'Deactivated' } })
                .select('_id studentsDetails examSchema isEnrolled carryForwardBalance status department')
                .lean(),
            CarryForwardRemark.find({}).lean()
        ]);

        const remarksMap = {};
        (allRemarks || []).forEach(r => {
            if (r.studentId) remarksMap[r.studentId.toString()] = r;
            if (r.admissionNumber) remarksMap[r.admissionNumber.toString().trim().toLowerCase()] = r;
        });

        // Map of active students (strictly excluding deactivated students)
        const activeStudentMap = {};
        activeStudents.forEach(s => {
            if (s.status && s.status.toLowerCase() === 'deactivated') return;
            activeStudentMap[s._id.toString()] = s;
        });

        const departmentMap = {};
        allDbDepartments.forEach(d => {
            departmentMap[d._id.toString()] = d.departmentName;
        });

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

        const courseMap = {}; // courseId -> { name, classNum, session, department }
        allDbCourses.forEach(c => {
            courseMap[c._id.toString()] = {
                name: c.courseName,
                classNum: getNumericClass(c.class),
                session: c.courseSession,
                department: c.department ? c.department.toString() : null
            };
        });

        // 3. Resolve Academic Sessions
        const now = new Date();
        const curMonth = now.getMonth();
        const curYear = now.getFullYear();
        const fyStart = curMonth >= 3 ? curYear : curYear - 1;
        const currentFinancialYear = `${fyStart}-${fyStart + 1}`;

        const activeSessions = dbSessions.filter(s => s.isGlobalActive === true);
        let availableSessions = activeSessions.map(s => s.sessionName?.trim()).filter(Boolean);

        if (availableSessions.length === 0) {
            availableSessions = dbSessions.map(s => s.sessionName?.trim()).filter(Boolean);
        }
        if (availableSessions.length === 0) {
            availableSessions = [currentFinancialYear];
        }

        if (!availableSessions.includes(currentFinancialYear)) {
            availableSessions.push(currentFinancialYear);
        }

        availableSessions = Array.from(new Set(availableSessions)).sort((a, b) => b.localeCompare(a));

        let targetSession = querySession ? querySession.trim() : null;
        if (!targetSession || !availableSessions.includes(targetSession)) {
            targetSession = availableSessions.includes(currentFinancialYear) ? currentFinancialYear : availableSessions[0];
        }

        // 4. Fetch all active normal and board course admissions (excluding cancelled/deactivated)
        const [normalAdmissions, boardAdmissions] = await Promise.all([
            Admission.find({ 
                isCancelled: { $ne: true },
                status: { $nin: ['DEACTIVATED', 'CANCELLED', 'REJECTED'] }
            })
                .select('student admissionNumber centre class course department programme academicSession createdAt totalFees totalPaidAmount')
                .lean(),
            BoardCourseAdmission.find({
                status: { $nin: ['DEACTIVATED', 'CANCELLED', 'REJECTED'] }
            })
                .select('studentId admissionNumber centre department programme academicSession boardCourseName createdAt lastClass')
                .lean()
        ]);

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

        // 5. Deduplicate and unify students across Normal Admissions and Board Course Admissions
        // Key is unique enrollment number (admissionNumber.trim().toUpperCase()) or studentId
        const canonicalStudentMap = {};
        const sidToKeyMap = {};
        const admNoToKeyMap = {};

        const getOrCreateStudentGroup = (sid, admNo) => {
            const cleanAdmNo = (admNo || '').trim().toUpperCase();
            let key = (cleanAdmNo ? admNoToKeyMap[cleanAdmNo] : null) || (sid ? sidToKeyMap[sid] : null);

            if (!key) {
                key = cleanAdmNo || (sid ? `SID_${sid}` : `TMP_${Math.random()}`);
                canonicalStudentMap[key] = {
                    key,
                    sid: sid || null,
                    admNo: cleanAdmNo || '',
                    normal: [],
                    board: [],
                    studentDoc: (sid && activeStudentMap[sid]) ? activeStudentMap[sid] : null
                };
            }

            if (cleanAdmNo) admNoToKeyMap[cleanAdmNo] = key;
            if (sid) {
                sidToKeyMap[sid] = key;
                if (!canonicalStudentMap[key].sid) canonicalStudentMap[key].sid = sid;
                if (!canonicalStudentMap[key].studentDoc && activeStudentMap[sid]) {
                    canonicalStudentMap[key].studentDoc = activeStudentMap[sid];
                }
            }
            if (cleanAdmNo && !canonicalStudentMap[key].admNo) {
                canonicalStudentMap[key].admNo = cleanAdmNo;
            }

            return canonicalStudentMap[key];
        };

        // Populate Normal Admissions into unified student groups
        normalAdmissions.forEach(adm => {
            const sid = adm.student?.toString();
            // Exclude deactivated students
            if (sid && !activeStudentMap[sid]) return;

            const group = getOrCreateStudentGroup(sid, adm.admissionNumber);

            let classNum = getNumericClass(adm.class);
            let sess = adm.academicSession;
            let courseName = 'General';
            let deptId = adm.department ? adm.department.toString() : null;

            if (adm.course) {
                const cInfo = courseMap[adm.course.toString()];
                if (cInfo) {
                    courseName = cInfo.name;
                    if (!classNum) classNum = cInfo.classNum;
                    if (!sess) sess = cInfo.session;
                    if (!deptId && cInfo.department) deptId = cInfo.department;
                }
            }

            const prog = adm.programme || group.studentDoc?.studentsDetails?.[0]?.programme || 'CRP';

            group.normal.push({
                _id: adm._id,
                admNo: adm.admissionNumber,
                centre: adm.centre,
                classNum,
                className: classNum ? String(classNum) : (adm.class ? classMap[adm.class.toString()] || 'Unknown' : 'Unknown'),
                session: sess || '',
                courseName,
                department: deptId || group.studentDoc?.department?.toString() || null,
                programme: prog,
                totalFees: adm.totalFees || 0,
                totalPaidAmount: adm.totalPaidAmount || 0,
                createdAt: adm.createdAt
            });
        });

        // Populate Board Course Admissions into unified student groups
        boardAdmissions.forEach(b => {
            const sid = b.studentId?.toString();
            // Exclude deactivated students
            if (sid && !activeStudentMap[sid]) return;

            const group = getOrCreateStudentGroup(sid, b.admissionNumber);

            let classNum = getNumericClass(b.lastClass);
            if (!classNum && b.boardCourseName) {
                const m = b.boardCourseName.match(/class\s*(\d+)/i);
                if (m) classNum = parseInt(m[1], 10);
            }
            if (!classNum && group.studentDoc?.examSchema?.[0]?.class) {
                classNum = getNumericClass(group.studentDoc.examSchema[0].class);
            }

            const deptId = b.department ? b.department.toString() : (group.studentDoc?.department?.toString() || null);
            const prog = b.programme || group.studentDoc?.studentsDetails?.[0]?.programme || 'CRP';

            group.board.push({
                _id: b._id,
                admNo: b.admissionNumber,
                centre: b.centre,
                classNum,
                className: classNum ? String(classNum) : 'Board Course',
                boardCourseName: b.boardCourseName || 'Board Course',
                session: b.academicSession || '',
                department: deptId,
                programme: prog,
                createdAt: b.createdAt
            });
        });

        // 6. Target classes to evaluate: 6, 7, 8, 9, 10
        const TARGET_CLASSES = [6, 7, 8, 9, 10];
        const baseTargetKeys = new Set();
        const studentBaseInfo = {};

        const selectedDeptList = departments 
            ? (Array.isArray(departments) ? departments : String(departments).split(',')).map(d => d.trim()).filter(Boolean)
            : [];
        const selectedProgList = programmes
            ? (Array.isArray(programmes) ? programmes : String(programmes).split(',')).map(p => p.trim().toUpperCase()).filter(Boolean)
            : [];

        Object.values(canonicalStudentMap).forEach(group => {
            const normalInSession = group.normal.filter(a =>
                a.session === targetSession &&
                a.classNum !== null &&
                TARGET_CLASSES.includes(a.classNum)
            );
            const boardInSession = group.board.filter(b =>
                b.session === targetSession &&
                b.classNum !== null &&
                TARGET_CLASSES.includes(b.classNum)
            );

            const allInSession = [...normalInSession, ...boardInSession];
            if (allInSession.length === 0) return;

            const maxClass = Math.max(...allInSession.map(x => x.classNum));
            const latestAdm = allInSession.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
            const centreName = latestAdm.centre || group.studentDoc?.studentsDetails?.[0]?.centre || '';

            if (isExcludedCentreName(centreName)) return;

            const deptId = latestAdm.department || group.studentDoc?.department?.toString() || null;
            const prog = (latestAdm.programme || group.studentDoc?.studentsDetails?.[0]?.programme || 'CRP').toUpperCase();

            // Department filter
            if (selectedDeptList.length > 0) {
                if (!deptId || !selectedDeptList.includes(deptId.toString())) {
                    return;
                }
            }

            // Programme filter
            if (selectedProgList.length > 0) {
                if (!selectedProgList.includes(prog)) {
                    return;
                }
            }

            baseTargetKeys.add(group.key);
            studentBaseInfo[group.key] = {
                key: group.key,
                sid: group.sid,
                baseClassNum: maxClass,
                className: String(maxClass),
                centre: centreName,
                admNo: latestAdm.admNo || group.admNo,
                courseName: latestAdm.courseName || latestAdm.boardCourseName || 'General',
                admissionDate: latestAdm.createdAt,
                department: deptId,
                departmentName: deptId && departmentMap[deptId] ? departmentMap[deptId] : '—',
                programme: prog,
                studentDoc: group.studentDoc
            };
        });

        // 7. Evaluate Carry Forward status for each unified student
        const pendingStudentsList = [];
        const carriedForwardKeys = new Set();

        baseTargetKeys.forEach(key => {
            const baseInfo = studentBaseInfo[key];
            const group = canonicalStudentMap[key];
            const currentClassNum = baseInfo.baseClassNum;

            let isCarriedForward = false;
            let cfDetails = null;

            if (currentClassNum >= 6 && currentClassNum <= 9) {
                // For Class 6, 7, 8, 9:
                // Carried forward if they have an admission in an upper class (classNum > currentClassNum)
                // OR in a subsequent academic session (e.g. 2027-2028 > 2026-2027)
                const cfNormal = group.normal.find(a => {
                    const hasHigherSession = a.session && a.session.localeCompare(targetSession) > 0;
                    const hasHigherClass = a.classNum && a.classNum > currentClassNum;
                    return hasHigherSession || hasHigherClass;
                });

                const cfBoard = group.board.find(b => {
                    const hasHigherSession = b.session && b.session.localeCompare(targetSession) > 0;
                    const hasHigherClass = b.classNum && b.classNum > currentClassNum;
                    return hasHigherSession || hasHigherClass;
                });

                if (cfNormal) {
                    isCarriedForward = true;
                    cfDetails = { type: 'Normal', nextClass: cfNormal.className, session: cfNormal.session };
                } else if (cfBoard) {
                    isCarriedForward = true;
                    cfDetails = { type: 'Board Course', nextClass: cfBoard.className, session: cfBoard.session };
                }
            } else if (currentClassNum === 10) {
                // For Class 10:
                // Carried forward if:
                // 1. Enrolled in Class 11 (2-Year JEE / NEET / WBJEE or any Class 11 normal course)
                // 2. Enrolled in a Board Course (WBCHSE / CBSE) which serves Class 11/12
                // 3. Enrolled in a higher academic session
                const cfNormal11 = group.normal.find(a => {
                    const isClass11 = a.classNum === 11 || (a.courseName && /(?:11|2\s*year|jee|neet)/i.test(a.courseName) && a.classNum !== 10);
                    const hasHigherSession = a.session && a.session.localeCompare(targetSession) > 0;
                    return isClass11 || hasHigherSession;
                });

                if (cfNormal11) {
                    isCarriedForward = true;
                    cfDetails = { type: 'Normal (Class 11 / 2-Year)', nextClass: '11', session: cfNormal11.session };
                } else {
                    const cfBoard = group.board.find(b => {
                        const bSess = b.session || '';
                        const isClass11Or12 = b.classNum === 11 || b.classNum === 12;
                        return isClass11Or12 || bSess.localeCompare(targetSession) >= 0;
                    });

                    if (cfBoard) {
                        isCarriedForward = true;
                        cfDetails = { type: 'Board Course (Class 11)', courseName: cfBoard.boardCourseName, session: cfBoard.session };
                    }
                }
            }

            if (isCarriedForward) {
                carriedForwardKeys.add(key);
            } else {
                // Student has NOT been carried forward yet (Pending)
                const doc = baseInfo.studentDoc || {};
                const details = doc.studentsDetails?.[0] || {};
                const centreName = baseInfo.centre || details.centre || '—';
                if (isExcludedCentreName(centreName)) return;

                const centreKey = (centreName || '').trim().toLowerCase();
                const zoneInfo = centreNameToZoneMap[centreKey] || centreIdToZoneMap[centreName] || { zoneId: '', zoneName: '—' };

                const rDoc = (baseInfo.sid && remarksMap[baseInfo.sid.toString()]) ||
                             (baseInfo.admNo && remarksMap[baseInfo.admNo.toString().trim().toLowerCase()]) ||
                             (details.rollNo && remarksMap[details.rollNo.toString().trim().toLowerCase()]);

                pendingStudentsList.push({
                    _id: baseInfo.sid || key,
                    studentId: baseInfo.sid || key,
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
                    department: baseInfo.department,
                    departmentName: baseInfo.departmentName,
                    programme: baseInfo.programme,
                    remarks: rDoc?.latestRemark || '',
                    remarksHistory: rDoc?.remarksHistory || [],
                    status: 'PENDING_CARRY_FORWARD'
                });
            }
        });

        // 8. Role-based centre filtering
        let allowedPendingStudents = pendingStudentsList.filter(s => !isExcludedCentreName(s.centre));
        let allowedAllStudentCentres = null;

        if (!isSuperAdmin && user.centres && Array.isArray(user.centres)) {
            const allowedCentresDocs = await Centre.find({ _id: { $in: user.centres } }).select('centreName').lean();
            const allowedNames = allowedCentresDocs.map(c => c.centreName.toLowerCase().trim()).filter(name => !isExcludedCentreName(name));
            allowedAllStudentCentres = new Set(allowedNames);
            allowedPendingStudents = allowedPendingStudents.filter(s => allowedNames.includes((s.centre || '').toLowerCase().trim()));
        }

        // 9. Build Centre-Wise Breakdown Matrix
        const centreAggMap = {};

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
        baseTargetKeys.forEach(key => {
            const baseInfo = studentBaseInfo[key];
            const centreName = baseInfo.centre || '—';
            if (isExcludedCentreName(centreName)) return;
            const cKey = centreName.trim().toLowerCase();
            if (!centreAggMap[cKey]) {
                const zoneInfo = centreNameToZoneMap[cKey] || { zoneId: '', zoneName: '—' };
                centreAggMap[cKey] = {
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

            centreAggMap[cKey].totalEnrolled++;
            if (carriedForwardKeys.has(key)) {
                centreAggMap[cKey].carriedForwardCount++;
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

        // 10. Calculate Overall KPI Totals
        const allowedBaseTargetKeys = Array.from(baseTargetKeys).filter(k => !isExcludedCentreName(studentBaseInfo[k]?.centre));
        const allowedCarriedForwardCount = Array.from(carriedForwardKeys).filter(k => !isExcludedCentreName(studentBaseInfo[k]?.centre)).length;

        const summaryTotals = {
            totalEnrolled: allowedBaseTargetKeys.length,
            totalCarriedForward: allowedCarriedForwardCount,
            totalPending: allowedPendingStudents.length,
            class6Pending: allowedPendingStudents.filter(s => s.currentClass === '6').length,
            class7Pending: allowedPendingStudents.filter(s => s.currentClass === '7').length,
            class8Pending: allowedPendingStudents.filter(s => s.currentClass === '8').length,
            class9Pending: allowedPendingStudents.filter(s => s.currentClass === '9').length,
            class10Pending: allowedPendingStudents.filter(s => s.currentClass === '10').length,
            overallConversionRate: allowedBaseTargetKeys.length > 0
                ? `${((allowedCarriedForwardCount / allowedBaseTargetKeys.length) * 100).toFixed(1)}%`
                : '0.0%'
        };

        // 11. Apply Filters to the returned Students List
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
                s.centre.toLowerCase().includes(q) ||
                (s.departmentName && s.departmentName.toLowerCase().includes(q)) ||
                (s.programme && s.programme.toLowerCase().includes(q))
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

/**
 * POST /api/carry-forward/remarks
 * Save or update remark for a student
 */
export const saveCarryForwardRemark = async (req, res) => {
    try {
        const { studentId, admissionNumber, session, remark } = req.body;
        if (!remark || !remark.trim()) {
            return res.status(400).json({ success: false, message: 'Remark is required' });
        }

        const user = req.user || {};
        const userName = user.name || user.username || user.email || 'Staff';
        const userId = user._id || user.id;

        const cleanRemark = remark.trim();
        const historyEntry = {
            remark: cleanRemark,
            addedBy: userName,
            addedByUserId: userId,
            createdAt: new Date()
        };

        const orConditions = [];
        if (studentId) orConditions.push({ studentId: String(studentId) });
        if (admissionNumber) orConditions.push({ admissionNumber: String(admissionNumber).trim() });

        if (orConditions.length === 0) {
            return res.status(400).json({ success: false, message: 'studentId or admissionNumber is required' });
        }

        let query = { $or: orConditions };
        if (session) {
            query.session = session;
        }

        let record = await CarryForwardRemark.findOne(query);

        if (record) {
            record.latestRemark = cleanRemark;
            if (!record.remarksHistory) record.remarksHistory = [];
            record.remarksHistory.unshift(historyEntry);
            record.updatedBy = userName;
            record.updatedByUserId = userId;
            if (studentId && !record.studentId) record.studentId = String(studentId);
            if (admissionNumber && !record.admissionNumber) record.admissionNumber = String(admissionNumber).trim();
            if (session && !record.session) record.session = session;
            await record.save();
        } else {
            record = await CarryForwardRemark.create({
                studentId: studentId ? String(studentId) : undefined,
                admissionNumber: admissionNumber ? String(admissionNumber).trim() : undefined,
                session: session || '',
                latestRemark: cleanRemark,
                remarksHistory: [historyEntry],
                updatedBy: userName,
                updatedByUserId: userId
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Remark saved successfully',
            data: record
        });
    } catch (error) {
        console.error('Error saving carry forward remark:', error);
        return res.status(500).json({
            success: false,
            message: 'Error saving carry forward remark',
            error: error.message
        });
    }
};

