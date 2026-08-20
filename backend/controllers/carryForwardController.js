import mongoose from 'mongoose';
import Student from '../models/Students.js';
import Admission from '../models/Admission/Admission.js';
import BoardCourseAdmission from '../models/Admission/BoardCourseAdmission.js';
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
        const [normalAdmissions, boardAdmissions] = await Promise.all([
            Admission.find({}, 'student admissionNumber centre course department academicSession totalFees totalPaidAmount paymentStatus admissionDate').lean(),
            BoardCourseAdmission.find({}, 'studentId admissionNumber centre boardCourseName department academicSession totalFees totalPaidAmount paymentStatus admissionDate').lean()
        ]);

        const studentAdmissionCount = {};
        const studentFirstAdmissionNo = {};
        const studentAdmissionsSummary = {};
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
                if (!studentAdmissionsSummary[sid]) studentAdmissionsSummary[sid] = [];
                studentAdmissionsSummary[sid].push({
                    _id: adm._id,
                    type: 'Normal',
                    admissionNumber: adm.admissionNumber,
                    centre: adm.centre
                });
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
                if (!studentAdmissionsSummary[sid]) studentAdmissionsSummary[sid] = [];
                studentAdmissionsSummary[sid].push({
                    _id: adm._id,
                    type: 'Board',
                    admissionNumber: adm.admissionNumber,
                    centre: adm.centre
                });
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

        const [student, normalAdmissions, boardAdmissions] = await Promise.all([
            Student.findById(studentId).lean(),
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
                .lean()
        ]);

        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

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

        // Check normal admissions first
        let matchedAdmission = await Admission.findOne({
            admissionNumber: { $regex: new RegExp(`^${cleanAdmNo}$`, 'i') }
        }).select('student admissionNumber').lean();

        let studentId = matchedAdmission?.student;

        // Check board admissions if not found
        if (!studentId) {
            const matchedBoard = await BoardCourseAdmission.findOne({
                admissionNumber: { $regex: new RegExp(`^${cleanAdmNo}$`, 'i') }
            }).select('studentId admissionNumber').lean();
            studentId = matchedBoard?.studentId;
        }

        // Check roll no / mobile / id as fallback
        if (!studentId) {
            const matchedStudent = await Student.findOne({
                $or: [
                    { "studentsDetails.mobileNum": cleanAdmNo },
                    { _id: mongoose.Types.ObjectId.isValid(cleanAdmNo) ? cleanAdmNo : undefined }
                ].filter(Boolean)
            }).select('_id').lean();
            studentId = matchedStudent?._id;
        }

        if (!studentId) {
            return res.status(404).json({ success: false, message: "No student found with this admission number" });
        }

        const [student, normalAdmissions, boardAdmissions] = await Promise.all([
            Student.findById(studentId).lean(),
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
                .lean()
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
