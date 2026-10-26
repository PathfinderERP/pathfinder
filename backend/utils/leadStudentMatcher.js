import Student from "../models/Students.js";
import Admission from "../models/Admission/Admission.js";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";
import BoardCourseCounselling from "../models/Admission/BoardCourseCounselling.js";
import LeadManagement from "../models/LeadManagement.js";

/**
 * Levenshtein distance between two strings
 */
export function levenshteinDistance(s1, s2) {
    if (!s1 || !s2) return (s1 || s2).length;
    const m = s1.length, n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }
    return dp[m][n];
}

/**
 * Normalizes a student/lead name: lowercase, trim, remove honorifics and non-alphanumeric characters
 */
export function normalizeName(name) {
    if (!name) return "";
    return String(name)
        .toLowerCase()
        .replace(/^(mr|mrs|ms|miss|master|dr)\.?\s+/i, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Cleans phone number to last 10 digits
 */
export function cleanPhoneNumber(phone) {
    if (!phone) return "";
    const digits = String(phone).replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : "";
}

/**
 * Generates phone search variants (10-digit, +91, 91, \t, etc.) for database indexed $in queries
 */
export function getPhoneVariants(phoneListOrSet) {
    const variants = new Set();
    const list = Array.isArray(phoneListOrSet) ? phoneListOrSet : Array.from(phoneListOrSet || []);
    list.forEach(raw => {
        if (!raw) return;
        const clean = cleanPhoneNumber(raw);
        if (clean && clean.length === 10) {
            variants.add(clean);
            variants.add(`+91${clean}`);
            variants.add(`91${clean}`);
            variants.add(`+91 ${clean}`);
            variants.add(`\t${clean}`);
            variants.add(` ${clean}`);
        } else if (clean) {
            variants.add(clean);
        }
    });
    return Array.from(variants);
}

/**
 * Smart matching between two student names:
 * - Returns true for exact or case/space insensitive match
 * - Handles minor phonetic / spelling variations
 * - Prevents siblings with the same surname from falsely matching (first name similarity required)
 */
export function isNameMatch(name1, name2) {
    const n1 = normalizeName(name1);
    const n2 = normalizeName(name2);
    if (!n1 || !n2) return false;
    if (n1 === n2) return true;

    // Stripped spaces match (e.g. "dipasmitamanna" vs "dipsmita manna")
    const s1 = n1.replace(/\s+/g, '');
    const s2 = n2.replace(/\s+/g, '');
    if (s1 === s2) return true;

    // Condensed string similarity
    const dist = levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    const overallSim = (maxLen - dist) / maxLen;

    // Token analysis
    const t1 = n1.split(' ').filter(Boolean);
    const t2 = n2.split(' ').filter(Boolean);

    // Multi-word name comparison
    if (t1.length >= 2 && t2.length >= 2) {
        const f1 = t1[0];
        const f2 = t2[0];
        const fDist = levenshteinDistance(f1, f2);
        const maxFLen = Math.max(f1.length, f2.length);
        const fSim = (maxFLen - fDist) / maxFLen;

        // Sibling guard: If first names are completely different (e.g. "rahul" vs "rohit"), they are DIFFERENT people
        if (fSim < 0.65) {
            return false;
        }

        // If first names match (or are very similar), and last names match (or are very similar)
        const l1 = t1[t1.length - 1];
        const l2 = t2[t2.length - 1];
        const lDist = levenshteinDistance(l1, l2);
        const maxLLen = Math.max(l1.length, l2.length);
        const lSim = (maxLLen - lDist) / maxLLen;

        if (fSim >= 0.7 && lSim >= 0.7) {
            return true;
        }
    }

    // High overall similarity (>= 80%) for single tokens / joined names
    if (overallSim >= 0.8) {
        if (t1.length < 2 || t2.length < 2) {
            return true;
        }
    }

    // Substring match if long enough (e.g. "deevija nag chowdhury" contains "deevija nag")
    if (s1.length >= 6 && s2.length >= 6) {
        if (s1.includes(s2) || s2.includes(s1)) {
            if (s1.startsWith(s2.slice(0, 4)) || s2.startsWith(s1.slice(0, 4))) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Builds the phone-to-student-names maps for admitted and counselled students.
 * Stores admission dates to distinguish new conversions from already-enrolled students.
 */
export async function getStudentPhoneNameMaps() {
    const [
        normalAdmissions,
        boardAdmissions,
        directEnrolledStudents,
        boardCounselling,
        allStudents
    ] = await Promise.all([
        Admission.find({}, { student: 1, admissionNumber: 1, admissionDate: 1, course: 1, boardCourseName: 1, createdAt: 1 }).populate('course', 'courseName').lean(),
        BoardCourseAdmission.find({}, { studentId: 1, studentName: 1, mobileNum: 1, admissionNumber: 1, boardCourseName: 1, admissionDate: 1, createdAt: 1 }).lean(),
        Student.find({ isEnrolled: true }).select("studentsDetails.studentName studentsDetails.mobileNum studentsDetails.whatsappNumber createdAt").lean(),
        BoardCourseCounselling.find().select("studentName mobileNum").lean(),
        Student.find().select("studentsDetails.studentName studentsDetails.mobileNum studentsDetails.whatsappNumber").lean()
    ]);

    const normalStudentIds = normalAdmissions.map(a => a.student?.toString()).filter(Boolean);
    const boardStudentIds = boardAdmissions.map(a => a.studentId?.toString()).filter(Boolean);
    const allAdmittedStudentIds = [...new Set([...normalStudentIds, ...boardStudentIds])];

    const admittedStudentsFromDetails = await Student.find({
        _id: { $in: allAdmittedStudentIds }
    }).select("studentsDetails.studentName studentsDetails.mobileNum studentsDetails.whatsappNumber createdAt").lean();

    const studentMap = new Map();
    admittedStudentsFromDetails.forEach(s => studentMap.set(s._id.toString(), s));

    const admittedPhoneMap = new Map();
    const rawAdmittedPhones = new Set();

    const addAdmitted = (phone, name, admissionDate, admissionNumber, studentId = '', courseTitle = '', admissionType = 'NORMAL', createdAt = null) => {
        if (!phone) return;
        rawAdmittedPhones.add(String(phone).trim());
        const cp = cleanPhoneNumber(phone);
        if (!cp) return;
        rawAdmittedPhones.add(cp);
        if (!admittedPhoneMap.has(cp)) admittedPhoneMap.set(cp, []);
        admittedPhoneMap.get(cp).push({
            name: name ? String(name).trim() : '',
            admissionDate: admissionDate ? new Date(admissionDate) : null,
            createdAt: createdAt ? new Date(createdAt) : null,
            admissionNumber: admissionNumber || '',
            studentId: studentId ? String(studentId) : '',
            courseTitle: courseTitle || '',
            admissionType: admissionType || 'NORMAL'
        });
    };

    normalAdmissions.forEach(adm => {
        const s = studentMap.get(adm.student?.toString());
        if (!s) return;
        const admDate = adm.admissionDate || adm.createdAt;
        const courseTitle = adm.course?.courseName || adm.boardCourseName || "Normal Course";
        (s.studentsDetails || []).forEach(d => {
            addAdmitted(d.mobileNum, d.studentName, admDate, adm.admissionNumber, s._id, courseTitle, 'NORMAL', adm.createdAt);
            addAdmitted(d.whatsappNumber, d.studentName, admDate, adm.admissionNumber, s._id, courseTitle, 'NORMAL', adm.createdAt);
        });
    });

    boardAdmissions.forEach(ba => {
        const admDate = ba.admissionDate || ba.createdAt;
        const courseTitle = ba.boardCourseName || "Board Course";
        const sid = ba.studentId?.toString() || '';
        addAdmitted(ba.mobileNum, ba.studentName, admDate, ba.admissionNumber, sid, courseTitle, 'BOARD', ba.createdAt);
        const s = sid ? studentMap.get(sid) : null;
        if (s) {
            (s.studentsDetails || []).forEach(d => {
                addAdmitted(d.mobileNum, d.studentName, admDate, ba.admissionNumber, s._id, courseTitle, 'BOARD', ba.createdAt);
                addAdmitted(d.whatsappNumber, d.studentName, admDate, ba.admissionNumber, s._id, courseTitle, 'BOARD', ba.createdAt);
            });
        }
    });

    directEnrolledStudents.forEach(s => {
        (s.studentsDetails || []).forEach(d => {
            addAdmitted(d.mobileNum, d.studentName, s.createdAt, d.admissionNumber || '', s._id, 'Direct Enrollment', 'NORMAL', s.createdAt);
            addAdmitted(d.whatsappNumber, d.studentName, s.createdAt, d.admissionNumber || '', s._id, 'Direct Enrollment', 'NORMAL', s.createdAt);
        });
    });

    const counsellingPhoneMap = new Map();
    const rawCounsellingPhones = new Set([...rawAdmittedPhones]);

    const addCounselling = (phone, name) => {
        if (!phone) return;
        rawCounsellingPhones.add(String(phone).trim());
        const cp = cleanPhoneNumber(phone);
        if (!cp) return;
        rawCounsellingPhones.add(cp);
        if (!counsellingPhoneMap.has(cp)) counsellingPhoneMap.set(cp, new Set());
        if (name && String(name).trim()) counsellingPhoneMap.get(cp).add(String(name).trim());
    };

    // All admitted are also considered counselled
    for (const [p, entries] of admittedPhoneMap.entries()) {
        for (const e of entries) {
            if (e.name) addCounselling(p, e.name);
        }
    }
    for (const bc of boardCounselling) {
        addCounselling(bc.mobileNum, bc.studentName);
    }
    for (const s of allStudents) {
        for (const d of s.studentsDetails || []) {
            addCounselling(d.mobileNum, d.studentName);
            addCounselling(d.whatsappNumber, d.studentName);
        }
    }

    return {
        admittedPhoneMap,
        counsellingPhoneMap,
        rawAdmittedPhones: Array.from(rawAdmittedPhones).filter(Boolean),
        rawCounsellingPhones: Array.from(rawCounsellingPhones).filter(Boolean)
    };
}

/**
 * Checks whether a given lead matches any admitted student whose admission occurred
 * ON OR AFTER the lead creation date (a genuine new conversion from this lead).
 */
export function isLeadAdmitted(lead, admittedPhoneMap) {
    if (!lead || !admittedPhoneMap) return false;
    const p1 = cleanPhoneNumber(lead.phoneNumber);
    const p2 = cleanPhoneNumber(lead.secondPhoneNumber);
    const leadName = lead.name;

    const admEntries = [
        ...(admittedPhoneMap.get(p1) || []),
        ...(admittedPhoneMap.get(p2) || [])
    ];

    if (admEntries.length === 0) return false;

    const matching = admEntries.filter(e => isNameMatch(leadName, e.name));
    if (matching.length === 0) return false;

    // A lead is only counted as a converted admission if the admission occurred ON OR AFTER the lead's creation date (allowing same-day)
    const leadDate = lead.createdAt ? new Date(lead.createdAt) : null;
    if (!leadDate) return true; // fallback if no date

    const startOfLeadDay = new Date(leadDate.getFullYear(), leadDate.getMonth(), leadDate.getDate()).getTime();
    return matching.some(e => {
        const admTime = e.admissionDate ? e.admissionDate.getTime() : 0;
        const createdTime = e.createdAt ? e.createdAt.getTime() : 0;
        return admTime >= startOfLeadDay || createdTime >= leadDate.getTime();
    });
}

/**
 * Returns matching pre-enrolled student record if the lead matches an existing student whose admission occurred
 * BEFORE the lead was created (i.e. existing student re-inquiring).
 */
export function getLeadPreEnrolledMatch(lead, admittedPhoneMap) {
    if (!lead || !admittedPhoneMap) return null;
    const p1 = cleanPhoneNumber(lead.phoneNumber);
    const p2 = cleanPhoneNumber(lead.secondPhoneNumber);
    const leadName = lead.name;

    const admEntries = [
        ...(admittedPhoneMap.get(p1) || []),
        ...(admittedPhoneMap.get(p2) || [])
    ];

    if (admEntries.length === 0) return null;

    const matching = admEntries.filter(e => isNameMatch(leadName, e.name));
    if (matching.length === 0) return null;

    const leadDate = lead.createdAt ? new Date(lead.createdAt) : null;
    if (!leadDate) return null;

    const startOfLeadDay = new Date(leadDate.getFullYear(), leadDate.getMonth(), leadDate.getDate()).getTime();
    const hasPostAdmission = matching.some(e => {
        const admTime = e.admissionDate ? e.admissionDate.getTime() : 0;
        const createdTime = e.createdAt ? e.createdAt.getTime() : 0;
        return admTime >= startOfLeadDay || createdTime >= leadDate.getTime();
    });

    // If all matched admissions happened before the lead was created, it's pre-enrolled (existing student)
    if (hasPostAdmission) return null;

    // Sort by latest admission first so the caller receives the most recent existing course & enrollment info
    const sorted = [...matching].sort((a, b) => {
        const ta = (a.admissionDate || a.createdAt || 0).getTime ? (a.admissionDate || a.createdAt).getTime() : 0;
        const tb = (b.admissionDate || b.createdAt || 0).getTime ? (b.admissionDate || b.createdAt).getTime() : 0;
        return tb - ta;
    });

    return sorted[0] || matching[0] || null;
}

/**
 * Checks whether a given lead matches an already-enrolled student whose admission occurred
 * BEFORE the lead was created (i.e. existing student re-inquiring).
 */
export function isLeadPreEnrolled(lead, admittedPhoneMap) {
    return Boolean(getLeadPreEnrolledMatch(lead, admittedPhoneMap));
}

/**
 * Checks whether a given lead matches any counselled student in counsellingPhoneMap
 */
export function isLeadCounselled(lead, counsellingPhoneMap) {
    if (!lead) return false;
    if (lead.isCounseled === true) return true;
    if (!counsellingPhoneMap) return false;

    const p1 = cleanPhoneNumber(lead.phoneNumber);
    const p2 = cleanPhoneNumber(lead.secondPhoneNumber);
    const leadName = lead.name;

    const cnsNames = new Set([
        ...(counsellingPhoneMap.get(p1) || []),
        ...(counsellingPhoneMap.get(p2) || [])
    ]);

    if (cnsNames.size === 0) return false;

    for (const cn of cnsNames) {
        if (isNameMatch(leadName, cn)) {
            return true;
        }
    }
    return false;
}

/**
 * Finds all lead IDs matching admitted and counselled student records within a given base query.
 * Segregates genuinely converted leads (admission on/after lead) from pre-enrolled existing students.
 */
export async function getMatchingLeadIds(baseQuery = {}, phoneMaps = null) {
    const maps = phoneMaps || await getStudentPhoneNameMaps();
    const { admittedPhoneMap, counsellingPhoneMap, rawCounsellingPhones } = maps;

    // Clone baseQuery and build candidate query
    const candidateQuery = { ...baseQuery };
    const baseAnd = candidateQuery.$and ? [...candidateQuery.$and] : [];
    if (candidateQuery.$or) {
        baseAnd.push({ $or: candidateQuery.$or });
        delete candidateQuery.$or;
    }

    baseAnd.push({
        $or: [
            { phoneNumber: { $in: rawCounsellingPhones } },
            { secondPhoneNumber: { $in: rawCounsellingPhones } }
        ]
    });
    candidateQuery.$and = baseAnd;

    const candidateLeads = await LeadManagement.find(candidateQuery)
        .select("_id name phoneNumber secondPhoneNumber isCounseled createdAt")
        .lean();

    const matchingAdmittedIds = [];
    const matchingPreEnrolledIds = [];
    const matchingPreEnrolledDetailsMap = new Map();
    const matchingCounsellingIds = [];

    for (const lead of candidateLeads) {
        if (isLeadAdmitted(lead, admittedPhoneMap)) {
            matchingAdmittedIds.push(lead._id);
        } else {
            const preMatch = getLeadPreEnrolledMatch(lead, admittedPhoneMap);
            if (preMatch) {
                matchingPreEnrolledIds.push(lead._id);
                matchingPreEnrolledDetailsMap.set(lead._id.toString(), {
                    studentId: preMatch.studentId,
                    admissionNumber: preMatch.admissionNumber,
                    courseTitle: preMatch.courseTitle,
                    admissionType: preMatch.admissionType,
                    studentName: preMatch.name
                });
            }
        }
        if (isLeadCounselled(lead, counsellingPhoneMap)) {
            matchingCounsellingIds.push(lead._id);
        }
    }

    return {
        matchingAdmittedIds,
        matchingPreEnrolledIds,
        matchingPreEnrolledDetailsMap,
        matchingCounsellingIds,
        maps
    };
}
