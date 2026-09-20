import Admission from "../models/Admission/Admission.js";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";

/**
 * Validates if the given roll number was created specifically in PNTSE or PMO.
 * 
 * - Pre-defined ERP enrollment numbers carried forward INTO PNTSE/PMO follow:
 *   PATH + 2-digit academic year (e.g. 19, 20..29) + 6+ digits (12+ characters total).
 *   Examples: PATH26004746, PATH25011723, PATH24005792.
 * - PNTSE created roll numbers:
 *   PATH + 2-digit centreCode + 2-digit classCode + 3-digit seq (exactly 11 characters total).
 *   Examples: PATH1310039, PATH4308001, PATH0807048, PATH0408045.
 * - PMO created roll numbers:
 *   Starts with 'PMO' (e.g. PMO9905001) or 11 characters PATH...
 *
 * @param {string} roll
 * @returns {boolean} true if created in PNTSE/PMO, false if pre-defined ERP roll number
 */
export const isPntseOrPmoCreatedRollNo = (roll) => {
    if (!roll) return false;
    const clean = String(roll).trim();
    if (/^PMO/i.test(clean)) return true;
    // Check if it matches ERP pre-defined format (PATH + 2-digit year like 20..29 + 6+ digits, length >= 12)
    if (/^PATH(19|2[0-9])0[0-9]\d{4,}/i.test(clean) || clean.length >= 12) {
        return false;
    }
    // PNTSE / PMO created format: PATH + 7 digits (length exactly 11)
    return /^PATH\d{7}$/i.test(clean);
};

/**
 * Attaches admissionStatus ('Normal', 'Board', 'Both', 'None') to an array of PNTSE/PMO student objects.
 * ONLY evaluates admission status for students whose enrollment numbers were CREATED in PNTSE or PMO.
 * Pre-defined ERP enrollment numbers carried forward into PNTSE/PMO will always have admissionStatus = 'None'.
 *
 * @param {Array} students Array of student documents (mongoose docs or plain objects)
 * @returns {Promise<Array>} Array of student objects with `admissionStatus` attached
 */
export const attachAdmissionStatus = async (students) => {
    if (!students || students.length === 0) return students;

    // Only students with PNTSE or PMO created enrollment numbers should be evaluated
    const pntsePmoStudents = students.filter(s => isPntseOrPmoCreatedRollNo(s.rollNo));

    if (pntsePmoStudents.length === 0) {
        return students.map(doc => {
            const obj = doc.toObject ? doc.toObject() : { ...doc };
            obj.admissionStatus = "None";
            return obj;
        });
    }

    const studentIds = pntsePmoStudents.map(s => s._id);
    const refStudentIds = pntsePmoStudents.map(s => s.studentId).filter(Boolean);
    const allIds = [...new Set([...studentIds, ...refStudentIds])];
    const rollNos = pntsePmoStudents.map(s => (s.rollNo || "").trim()).filter(Boolean);

    const [adms, boardAdms] = await Promise.all([
        Admission.find({
            $or: [
                { student: { $in: allIds } },
                { admissionNumber: { $in: rollNos } }
            ]
        }, "student admissionNumber admissionType").lean(),
        BoardCourseAdmission.find({
            $or: [
                { studentId: { $in: allIds } },
                { admissionNumber: { $in: rollNos } }
            ]
        }, "studentId admissionNumber").lean()
    ]);

    const normalStudentSet = new Set();
    const normalRollSet = new Set();
    const boardStudentSet = new Set();
    const boardRollSet = new Set();

    adms.forEach(a => {
        const sId = a.student?.toString();
        const roll = a.admissionNumber?.trim();
        if (a.admissionType === 'BOARD') {
            if (sId) boardStudentSet.add(sId);
            if (roll) boardRollSet.add(roll);
        } else {
            if (sId) normalStudentSet.add(sId);
            if (roll) normalRollSet.add(roll);
        }
    });

    boardAdms.forEach(b => {
        const sId = b.studentId?.toString();
        const roll = b.admissionNumber?.trim();
        if (sId) boardStudentSet.add(sId);
        if (roll) boardRollSet.add(roll);
    });

    return students.map(doc => {
        const obj = doc.toObject ? doc.toObject() : { ...doc };
        const roll = (obj.rollNo || "").trim();

        // Pre-defined ERP enrollment numbers carried forward into PNTSE/PMO get 'None'
        if (!isPntseOrPmoCreatedRollNo(roll)) {
            obj.admissionStatus = "None";
            return obj;
        }

        const sId = obj._id?.toString();
        const refId = obj.studentId?.toString();

        const isNormal = normalStudentSet.has(sId) || (refId && normalStudentSet.has(refId)) || (roll && normalRollSet.has(roll));
        const isBoard = boardStudentSet.has(sId) || (refId && boardStudentSet.has(refId)) || (roll && boardRollSet.has(roll));

        if (isNormal && isBoard) {
            obj.admissionStatus = "Both";
        } else if (isNormal) {
            obj.admissionStatus = "Normal";
        } else if (isBoard) {
            obj.admissionStatus = "Board";
        } else {
            obj.admissionStatus = "None";
        }
        return obj;
    });
};

export default attachAdmissionStatus;

