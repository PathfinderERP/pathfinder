import PMOStudent from "../../models/PMOStudent.js";
import PNTSEStudent from "../../models/PNTSEStudent.js";
import Class from "../../models/Master_data/Class.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import Zone from "../../models/Zone.js";
import Session from "../../models/Master_data/Session.js";
import ExamTag from "../../models/Master_data/ExamTag.js";
import Boards from "../../models/Master_data/Boards.js";
import Payment from "../../models/Payment/Payment.js";
import { generateBillId } from "../../utils/billIdGenerator.js";
import XLSX from "xlsx";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import LeadManagement from "../../models/LeadManagement.js";
import CampaignLead from "../../models/CampaignLead.js";

// Helper function to find existing enrollment number across all courses
const findExistingEnrollment = async (mobile, email) => {
    let existingEnrollmentNo = null;
    let existingStudentId = null;
    let courseName = null;
    let admissionType = null;
    let existingStudentDoc = null;
    let normalAdmission = null;
    let boardAdmission = null;
    let pntseStudent = null;
    let prevPmoStudent = null;
    let leadStudent = null;

    // 1. Check ERP Student collection (Normal & Board Admissions)
    let erpStudent = null;
    if (mobile) {
        erpStudent = await Student.findOne({ "studentsDetails.mobileNum": mobile });
    }
    if (!erpStudent && email) {
        erpStudent = await Student.findOne({ "studentsDetails.studentEmail": email });
    }

    if (erpStudent) {
        existingStudentDoc = erpStudent;
        existingStudentId = erpStudent._id;
        normalAdmission = await Admission.findOne({ student: erpStudent._id }).populate('course class board').sort({ createdAt: -1 });
        boardAdmission = await BoardCourseAdmission.findOne({ studentId: erpStudent._id }).populate('boardId').sort({ createdAt: -1 });

        if (normalAdmission?.admissionNumber) {
            existingEnrollmentNo = normalAdmission.admissionNumber;
            courseName = normalAdmission?.course?.courseName || "Normal Course";
            admissionType = "NORMAL";
        } else if (boardAdmission?.admissionNumber) {
            existingEnrollmentNo = boardAdmission.admissionNumber;
            courseName = boardAdmission?.boardId?.boardName || boardAdmission?.boardId?.boardCourse || "Board Course";
            admissionType = "BOARD";
        }
    }

    // 2. Check PNTSE Student collection
    if (mobile) {
        pntseStudent = await PNTSEStudent.findOne({ mobile }).populate('class centre board session examTag').sort({ createdAt: -1 });
    }
    if (!pntseStudent && email) {
        pntseStudent = await PNTSEStudent.findOne({ email }).populate('class centre board session examTag').sort({ createdAt: -1 });
    }

    if (pntseStudent?.rollNo && !existingEnrollmentNo) {
        existingEnrollmentNo = pntseStudent.rollNo;
        courseName = pntseStudent.course || "PNTSE";
        admissionType = "PNTSE";
        if (pntseStudent.studentId) existingStudentId = pntseStudent.studentId;
        existingStudentDoc = pntseStudent;
    }

    // 3. Check existing PMO Student collection
    if (mobile) {
        prevPmoStudent = await PMOStudent.findOne({ mobile }).populate('class centre board session examTag').sort({ createdAt: -1 });
    }
    if (!prevPmoStudent && email) {
        prevPmoStudent = await PMOStudent.findOne({ email }).populate('class centre board session examTag').sort({ createdAt: -1 });
    }

    // 4. Check Lead Management / Campaign Lead
    if (mobile) {
        leadStudent = await LeadManagement.findOne({ phone: mobile }).lean() || await CampaignLead.findOne({ mobile }).lean();
    }
    if (!leadStudent && email) {
        leadStudent = await LeadManagement.findOne({ email }).lean() || await CampaignLead.findOne({ email }).lean();
    }

    return {
        existingEnrollmentNo,
        existingStudentId,
        courseName,
        admissionType,
        existingStudentDoc,
        erpStudent,
        normalAdmission,
        boardAdmission,
        pntseStudent,
        prevPmoStudent,
        leadStudent
    };
};

// Create PMO Student
export const createPMOStudent = async (req, res) => {
    try {
        const {
            name, mobile, secondaryMobile, email, dob, gender, address, city, state, pincode,
            class: classId, centre: centreId, session: sessionId, examTag: examTagId, board: boardId,
            course, paymentType, school, guardianName, guardianMobile, examDate, examVenue, reportingTime, timeSlot, remarks, status, score, rank,
            paymentMethod, transactionId, accountHolderName, chequeDate, receivedDate, waiver,
            studentId, rollNo: customRollNo
        } = req.body;

        if (!name || !mobile || !classId || !centreId || !sessionId || !examTagId || !course || !boardId) {
            return res.status(400).json({ message: "Required fields are missing (Name, Mobile, Class, Centre, Session, ExamTag, Board, Course)" });
        }

        // Sanitize: empty string studentId/rollNo
        let sanitizedStudentId = studentId && String(studentId).trim() !== '' ? studentId : undefined;
        let sanitizedCustomRollNo = customRollNo && String(customRollNo).trim() !== '' ? customRollNo : undefined;

        // Check if student is already enrolled in any course (Normal ERP, Board ERP, PNTSE, PMO)
        const enrollmentCheck = await findExistingEnrollment(mobile, email);

        if (enrollmentCheck.existingStudentId && !sanitizedStudentId) {
            sanitizedStudentId = enrollmentCheck.existingStudentId;
        }

        // Check for exact duplicate in PMO for the exact same mobile AND course
        const exactPmoDuplicate = await PMOStudent.findOne({ mobile, course, session: sessionId });
        if (exactPmoDuplicate) {
            return res.status(400).json({ message: `Student is already registered in PMO for ${course} (Roll No: ${exactPmoDuplicate.rollNo})` });
        }

        // Fetch centre
        const centreObj = await CentreSchema.findById(centreId);
        if (!centreObj) {
            return res.status(400).json({ message: "Centre not found" });
        }

        // Access check
        const isSuperAdmin = req.user.role === "superAdmin" || req.user.role === "Super Admin";
        if (!isSuperAdmin) {
            const assignedCentres = req.user.centres || [];
            if (!assignedCentres.map(c => c.toString()).includes(centreId.toString())) {
                return res.status(403).json({ message: "Access denied: you are not assigned to this centre." });
            }
        }

        // Validate class exists
        const classObj = await Class.findById(classId);
        if (!classObj) {
            return res.status(400).json({ message: "Class not found" });
        }

        // Determine Roll / Enrollment Number:
        // Priority 1: User-passed custom roll number (e.g. from carry-forward)
        // Priority 2: Auto-allocated from existing course enrollment (Normal ERP, Board ERP, PNTSE)
        // Priority 3: Generate new PMO roll number
        let rollNo = sanitizedCustomRollNo;

        if (!rollNo && enrollmentCheck.existingEnrollmentNo) {
            rollNo = enrollmentCheck.existingEnrollmentNo;
        }

        if (!rollNo) {
            // Generate new roll number: PATH{centreCode}{classCode}{3-digit seq}
            const twoDigitCode = centreObj.centreCode || String(centreObj.enterCode || "00").slice(0, 2).toUpperCase();
            const classNum = parseInt(String(classObj?.name || "").match(/\d+/)?.[0] || "0", 10);
            const classCode = String(classNum).padStart(2, '0');

            const count = await PMOStudent.countDocuments({ centre: centreId, class: classId });
            let nextIndex = count + 1;
            let isUnique = false;
            while (!isUnique) {
                rollNo = `PATH${twoDigitCode}${classCode}${String(nextIndex).padStart(3, '0')}`;
                const existing = await PMOStudent.findOne({ rollNo });
                if (!existing) {
                    isUnique = true;
                } else {
                    nextIndex++;
                }
            }
        }

        // PMO fee is ₹100 per course with discount support
        const GROSS_FEE = 100;
        const isPaid = paymentType !== 'free';
        const waiverAmt = Math.max(0, Math.min(GROSS_FEE, Number(waiver) || 0));
        const amountPaid = isPaid ? Math.max(0, GROSS_FEE - waiverAmt) : 0;

        const newStudent = new PMOStudent({
            name,
            mobile,
            secondaryMobile: secondaryMobile || "",
            email: email || "",
            dob: dob || "",
            gender: gender || "",
            address: address || "",
            city: city || "",
            state: state || "",
            pincode: pincode || "",
            class: classId,
            centre: centreId,
            session: sessionId,
            examTag: examTagId,
            board: boardId,
            course,
            paymentType: isPaid && amountPaid > 0 ? 'paid' : (waiverAmt === GROSS_FEE || paymentType === 'free' ? 'free' : 'paid'),
            amountPaid,
            waiver: waiverAmt,
            paymentMethod: isPaid ? (paymentMethod || 'CASH') : null,
            rollNo,
            school: school || "",
            guardianName: guardianName || "",
            guardianMobile: guardianMobile || "",
            examDate: examDate || "",
            examVenue: examVenue || "",
            reportingTime: reportingTime || "",
            timeSlot: timeSlot || "",
            remarks: remarks || "",
            status: status || 'Appeared',
            score: score || 0,
            rank,
            studentId: sanitizedStudentId
        });

        await newStudent.save();

        // Create Payment record & generate bill if paid or payment was processed
        let billData = null;
        if (isPaid && amountPaid > 0) {
            try {
                const isPHSPS = centreObj.centreName && /phsps/i.test(centreObj.centreName);
                const totalAmount = parseFloat(amountPaid.toFixed(2));
                const baseAmount = isPHSPS ? totalAmount : totalAmount / 1.18;
                const courseFee = parseFloat(baseAmount.toFixed(2));
                const gstPool = totalAmount - courseFee;
                const cgst = parseFloat((gstPool / 2).toFixed(2));
                const sgst = parseFloat((gstPool - cgst).toFixed(2));

                const billId = await generateBillId(centreObj.enterCode || centreObj.centreCode, receivedDate || new Date());

                const paymentRecord = new Payment({
                    admission: newStudent._id,
                    installmentNumber: 0,
                    amount: GROSS_FEE,
                    paidAmount: totalAmount,
                    dueDate: receivedDate ? new Date(receivedDate) : new Date(),
                    paidDate: receivedDate ? new Date(receivedDate) : new Date(),
                    receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
                    status: 'PAID',
                    paymentMethod: paymentMethod || 'CASH',
                    transactionId: transactionId || '',
                    accountHolderName: accountHolderName || '',
                    chequeDate: chequeDate ? new Date(chequeDate) : null,
                    remarks: remarks || `PMO Registration Fee - ${name}`,
                    recordedBy: req.user?.id || req.user?._id,
                    cgst,
                    sgst,
                    courseFee,
                    totalAmount,
                    billId,
                    boardCourseName: course,
                });

                await paymentRecord.save();

                // Link billId & paymentId
                newStudent.billId = billId;
                newStudent.paymentId = paymentRecord._id;
                await newStudent.save();

                // Build bill data for frontend receipt
                billData = {
                    billId,
                    billDate: paymentRecord.paidDate,
                    centre: {
                        name: centreObj.centreName,
                        address: centreObj.address || 'N/A',
                        phoneNumber: centreObj.phoneNumber || 'N/A',
                        gstNumber: centreObj.enterGstNo || 'N/A',
                        corporateAddress: centreObj.enterCorporateOfficeAddress || '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026',
                        corporatePhone: centreObj.enterCorporateOfficePhoneNumber || '033 2455-1840 / 2454-4817 / 4668'
                    },
                    student: {
                        id: newStudent._id,
                        name: newStudent.name,
                        admissionNumber: newStudent.rollNo,
                        phoneNumber: newStudent.mobile,
                        email: newStudent.email || 'N/A'
                    },
                    course: {
                        name: course,
                        department: 'PMO',
                        examTag: 'PMO',
                        class: classObj.name || 'N/A',
                        session: 'N/A'
                    },
                    payment: {
                        installmentNumber: 0,
                        paymentMethod: paymentMethod || 'CASH',
                        transactionId: transactionId || '',
                        paidDate: paymentRecord.paidDate,
                        receivedDate: paymentRecord.receivedDate,
                        accountHolderName: accountHolderName || '',
                        chequeDate: chequeDate ? new Date(chequeDate) : null,
                        status: 'PAID',
                        remarks: `PMO Fee | Gross: ₹${GROSS_FEE} | Discount: ₹${waiverAmt} | Net Paid: ₹${amountPaid}`
                    },
                    amounts: {
                        courseFee,
                        cgst,
                        sgst,
                        totalAmount,
                        waiver: waiverAmt,
                        grossFee: GROSS_FEE
                    }
                };
            } catch (billErr) {
                console.error("Error creating PMO payment record:", billErr);
            }
        }

        res.status(201).json({
            message: `PMO Student registered successfully! (Enrollment ID: ${rollNo})`,
            student: newStudent,
            autoAllocatedEnrollment: !!enrollmentCheck.existingEnrollmentNo,
            enrollmentNumber: rollNo,
            billData
        });
    } catch (err) {
        console.error("PMO Create Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get all PMO Students with filtering and search
export const getPMOStudents = async (req, res) => {
    try {
        const { search, centre, class: classId, session, examTag, status, zone, course, board } = req.query;
        const query = {};

        const parseList = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
            return String(val).split(',').map(v => v.trim()).filter(Boolean);
        };

        const isSuperAdmin = req.user.role === "superAdmin" || req.user.role === "Super Admin";
        let assignedCentres = null;
        if (!isSuperAdmin) {
            assignedCentres = (req.user.centres || []).map(c => (c._id || c).toString());
        }

        const zoneIds = parseList(zone);
        const centreIds = parseList(centre);

        if (zoneIds.length > 0) {
            const zones = await Zone.find({ _id: { $in: zoneIds } }).select("centres").lean();
            let zoneCentres = [];
            zones.forEach(z => {
                (z.centres || []).forEach(c => {
                    const cStr = (c._id || c).toString();
                    if (!zoneCentres.includes(cStr)) zoneCentres.push(cStr);
                });
            });

            if (centreIds.length > 0) {
                let validCentres = centreIds.filter(c => zoneCentres.includes(c));
                if (assignedCentres) {
                    validCentres = validCentres.filter(c => assignedCentres.includes(c));
                }
                query.centre = { $in: validCentres };
            } else {
                let targetCentres = zoneCentres;
                if (assignedCentres) {
                    targetCentres = targetCentres.filter(c => assignedCentres.includes(c));
                }
                query.centre = { $in: targetCentres };
            }
        } else if (centreIds.length > 0) {
            let validCentres = centreIds;
            if (assignedCentres) {
                validCentres = validCentres.filter(c => assignedCentres.includes(c));
            }
            query.centre = { $in: validCentres };
        } else if (assignedCentres) {
            query.centre = { $in: assignedCentres };
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
                { secondaryMobile: { $regex: search, $options: 'i' } },
                { rollNo: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const classIds = parseList(classId);
        if (classIds.length > 0) query.class = { $in: classIds };

        const sessionIds = parseList(session);
        if (sessionIds.length > 0) query.session = { $in: sessionIds };

        const examTagIds = parseList(examTag);
        if (examTagIds.length > 0) query.examTag = { $in: examTagIds };

        const boardIds = parseList(board);
        if (boardIds.length > 0) query.board = { $in: boardIds };

        const statusList = parseList(status);
        if (statusList.length > 0) query.status = { $in: statusList };

        const courseList = parseList(course);
        if (courseList.length > 0) {
            const courseRegexes = courseList.map(c => {
                const clean = c.replace(/[^a-zA-Z0-9]/g, '');
                return new RegExp(clean.replace('PMO', 'PMO[-\\s]*'), 'i');
            });
            query.$and = query.$and || [];
            query.$and.push({ $or: courseRegexes.map(rx => ({ course: { $regex: rx } })) });
        }

        const students = await PMOStudent.find(query)
            .populate('class')
            .populate('centre')
            .populate('session')
            .populate('examTag')
            .populate('board')
            .populate('paymentId')
            .sort({ createdAt: -1 });

        res.status(200).json(students);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Check if mobile or email exists and check existing enrollment across modules
export const checkDuplicate = async (req, res) => {
    try {
        const { mobile, email } = req.query;
        let mobileExistsInPmo = false;
        let emailExistsInPmo = false;

        if (mobile) {
            const student = await PMOStudent.findOne({ mobile });
            if (student) mobileExistsInPmo = true;
        }

        if (email) {
            const student = await PMOStudent.findOne({ email });
            if (student) emailExistsInPmo = true;
        }

        const enrollment = await findExistingEnrollment(mobile, email);

        let details = null;
        if (enrollment.existingEnrollmentNo || enrollment.existingStudentDoc) {
            const { erpStudent, normalAdmission, boardAdmission, pntseStudent, prevPmoStudent, leadStudent } = enrollment;
            const erpDetails = erpStudent?.studentsDetails?.[0] || {};

            // Match Board: check boardAdmission -> normalAdmission -> pntseStudent -> prevPmoStudent -> erpDetails -> examSchema
            const boardId = boardAdmission?.boardId?._id || normalAdmission?.board?._id || pntseStudent?.board?._id || prevPmoStudent?.board?._id || "";
            const boardName = boardAdmission?.boardId?.boardCourse || boardAdmission?.boardId?.boardName || normalAdmission?.board?.boardCourse || normalAdmission?.board?.boardName || pntseStudent?.board?.boardCourse || pntseStudent?.board?.boardName || prevPmoStudent?.board?.boardCourse || prevPmoStudent?.board?.boardName || erpDetails?.board || erpStudent?.board || erpStudent?.examSchema?.[0]?.board || erpStudent?.examSchema?.[0]?.examName || "";

            // Match Class: check normalAdmission -> pntseStudent -> prevPmoStudent -> erpStudent.examSchema
            const classId = normalAdmission?.class?._id || pntseStudent?.class?._id || prevPmoStudent?.class?._id || "";
            const className = normalAdmission?.class?.name || pntseStudent?.class?.name || prevPmoStudent?.class?.name || erpStudent?.examSchema?.[0]?.class || pntseStudent?.course || prevPmoStudent?.course || "";

            // Match Gender
            const gender = erpDetails?.gender || pntseStudent?.gender || prevPmoStudent?.gender || "";

            // Match School
            const school = pntseStudent?.school || pntseStudent?.schoolName || prevPmoStudent?.school || erpDetails?.schoolName || erpDetails?.school || leadStudent?.schoolName || leadStudent?.school || "";

            // Match Centre
            const centre = erpDetails?.centre || pntseStudent?.centre?.centreName || prevPmoStudent?.centre?.centreName || "";
            const centreId = pntseStudent?.centre?._id || prevPmoStudent?.centre?._id || "";

            // Match Contact & Personal Info
            const name = erpDetails?.studentName || pntseStudent?.name || prevPmoStudent?.name || "";
            const studentMobile = erpDetails?.mobileNum || pntseStudent?.mobile || prevPmoStudent?.mobile || mobile || "";
            const studentEmail = erpDetails?.studentEmail || pntseStudent?.email || prevPmoStudent?.email || email || "";
            const dob = erpDetails?.dateOfBirth || pntseStudent?.dob || prevPmoStudent?.dob || "";
            const address = erpDetails?.address || pntseStudent?.address || prevPmoStudent?.address || "";
            const city = erpDetails?.city || pntseStudent?.city || prevPmoStudent?.city || "";
            const state = erpDetails?.state || pntseStudent?.state || prevPmoStudent?.state || "";
            const pincode = erpDetails?.pincode || pntseStudent?.pincode || prevPmoStudent?.pincode || "";
            const guardianName = erpDetails?.guardians?.[0]?.guardianName || erpStudent?.guardians?.[0]?.guardianName || pntseStudent?.guardianName || prevPmoStudent?.guardianName || "";
            const guardianMobile = erpDetails?.guardians?.[0]?.guardianMobile || erpStudent?.guardians?.[0]?.guardianMobile || pntseStudent?.guardianMobile || prevPmoStudent?.guardianMobile || "";

            details = {
                student: enrollment.existingStudentDoc,
                name,
                mobile: studentMobile,
                email: studentEmail,
                gender,
                dob,
                school,
                schoolName: school,
                centre,
                centreId,
                classId,
                className,
                class: classId || className,
                boardId,
                boardName,
                board: boardId || boardName,
                course: enrollment.courseName || enrollment.admissionType || "Existing Course",
                admissionType: enrollment.admissionType || "EXISTING",
                rollNo: enrollment.existingEnrollmentNo || "",
                address,
                city,
                state,
                pincode,
                guardianName,
                guardianMobile
            };
        }

        res.status(200).json({
            mobileExistsInPmo,
            emailExistsInPmo,
            alreadyInOtherCourse: !!enrollment.existingEnrollmentNo,
            existingEnrollmentNo: enrollment.existingEnrollmentNo,
            existingStudentDetails: details
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Bulk check duplicates and auto-allocation for Excel imports
export const checkDuplicatesBulk = async (req, res) => {
    try {
        const { mobiles = [], emails = [] } = req.body;

        // 1. Check PMO duplicate
        const [pmoMobStudents, pmoEmailStudents] = await Promise.all([
            mobiles.length > 0 ? PMOStudent.find({ mobile: { $in: mobiles } }, "mobile name rollNo email").lean() : [],
            emails.length > 0 ? PMOStudent.find({ email: { $in: emails.map(e => e.toLowerCase()) } }, "email name rollNo mobile").lean() : []
        ]);

        const pmoMobiles = pmoMobStudents.map(s => s.mobile);
        const pmoEmails = pmoEmailStudents.map(s => (s.email || "").toLowerCase());

        // 2. Check ERP students (Normal & Board Admissions)
        const [erpMobStudents, erpEmailStudents, pntseStudents] = await Promise.all([
            mobiles.length > 0 ? Student.find({ "studentsDetails.mobileNum": { $in: mobiles } }, "studentsDetails").lean() : [],
            emails.length > 0 ? Student.find({ "studentsDetails.studentEmail": { $in: emails } }, "studentsDetails").lean() : [],
            mobiles.length > 0 || emails.length > 0 ? PNTSEStudent.find({ $or: [{ mobile: { $in: mobiles } }, { email: { $in: emails } }] }, "mobile email name rollNo").lean() : []
        ]);

        const erpStudentMap = new Map();
        [...erpMobStudents, ...erpEmailStudents].forEach(s => {
            if (!erpStudentMap.has(String(s._id))) erpStudentMap.set(String(s._id), s);
        });

        const carryForwardList = [];

        for (const erpStudent of erpStudentMap.values()) {
            const details = erpStudent.studentsDetails?.[0] || {};
            const mobile = details.mobileNum || "";
            const email = (details.studentEmail || "").toLowerCase();

            if (pmoMobiles.includes(mobile) || pmoEmails.includes(email)) continue;

            const [normalAdm, boardAdm] = await Promise.all([
                Admission.findOne({ student: erpStudent._id }, "admissionNumber").lean(),
                BoardCourseAdmission.findOne({ studentId: erpStudent._id }, "admissionNumber").lean()
            ]);

            const enrollmentNo = normalAdm?.admissionNumber || boardAdm?.admissionNumber || "";
            const admissionType = normalAdm ? "NORMAL" : (boardAdm ? "BOARD" : "UNKNOWN");

            carryForwardList.push({
                studentId: String(erpStudent._id),
                name: details.studentName || "",
                mobile,
                email: details.studentEmail || "",
                enrollmentNo,
                admissionType
            });
        }

        // Include PNTSE students for enrollment number reuse if not in ERP list
        for (const pntse of pntseStudents) {
            const mob = pntse.mobile || "";
            const em = (pntse.email || "").toLowerCase();
            const alreadyAdded = carryForwardList.some(c => c.mobile === mob || (c.email && c.email.toLowerCase() === em));
            if (!alreadyAdded && (pntse.rollNo)) {
                carryForwardList.push({
                    studentId: null,
                    name: pntse.name || "",
                    mobile: mob,
                    email: pntse.email || "",
                    enrollmentNo: pntse.rollNo,
                    admissionType: "PNTSE"
                });
            }
        }

        const carryForwardMobiles = new Set(carryForwardList.map(e => e.mobile).filter(Boolean));
        const carryForwardEmails = new Set(carryForwardList.map(e => (e.email || "").toLowerCase()).filter(Boolean));

        res.status(200).json({
            foundMobiles: pmoMobiles,
            foundEmails: pmoEmails,
            erpMobiles: [...carryForwardMobiles],
            erpEmails: [...carryForwardEmails],
            erpCarryForward: carryForwardList
        });
    } catch (err) {
        console.error("Bulk check error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Download Excel Template
export const downloadTemplate = async (req, res) => {
    try {
        const sampleRows = [
            {
                "Name*": "Aarav Sharma",
                "Mobile*": "9876543210",
                "Secondary Mobile": "9876543299",
                "Email": "aarav@example.com",
                "DOB (YYYY-MM-DD)": "2012-05-15",
                "Gender": "Male",
                "Class Name* (e.g. 6)": "6",
                "Board Name* (exact)": "CBSE",
                "Centre Name* (exact)": "HAZRA H.O",
                "Session Name* (e.g. 2025-2026)": "2025-2026",
                "ExamTag Name* (e.g. PMO 6)": "PMO 6",
                "Course* (e.g. PMO 6)": "PMO 6",
                "School": "ABC High School",
                "Guardian Name": "Rajesh Sharma",
                "Guardian Mobile": "9876543200",
                "Address": "12 Main Street",
                "City": "Kolkata",
                "State": "West Bengal",
                "Pincode": "700001",
                "Remarks": "Math Olympiad Student",
                "Exam Date (YYYY-MM-DD)": "2026-09-15",
                "Exam Venue": "Hazra Main Center",
                "Reporting Time (e.g. 09:30 AM)": "09:30 AM",
                "Exam Time (e.g. 10:00 AM)": "10:00 AM"
            },
            {
                "Name*": "Priya Verma",
                "Mobile*": "9876543211",
                "Secondary Mobile": "",
                "Email": "priya@example.com",
                "DOB (YYYY-MM-DD)": "2011-08-20",
                "Gender": "Female",
                "Class Name* (e.g. 6)": "7",
                "Board Name* (exact)": "ICSE",
                "Centre Name* (exact)": "DUMDUM",
                "Session Name* (e.g. 2025-2026)": "2025-2026",
                "ExamTag Name* (e.g. PMO 7)": "PMO 7",
                "Course* (e.g. PMO 7)": "PMO 7",
                "School": "XYZ School",
                "Guardian Name": "Suresh Verma",
                "Guardian Mobile": "9876543201",
                "Address": "45 Park Lane",
                "City": "Howrah",
                "State": "West Bengal",
                "Pincode": "711101",
                "Remarks": "",
                "Exam Date (YYYY-MM-DD)": "2026-09-15",
                "Exam Venue": "Dumdum Branch",
                "Reporting Time (e.g. 09:30 AM)": "10:30 AM",
                "Exam Time (e.g. 10:00 AM)": "11:00 AM"
            }
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(sampleRows);

        ws['!cols'] = [
            { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 10 },
            { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
            { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 15 },
            { wch: 18 }, { wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 30 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "PMO Students");
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=PMO_Import_Template.xlsx');
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Import students from Excel
export const importExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!rows || rows.length === 0) {
            return res.status(400).json({ message: "Excel file is empty or has no data rows" });
        }

        // Pre-fetch all master data
        const [allCentres, allClasses, allSessions, allExamTags, allBoards] = await Promise.all([
            CentreSchema.find(),
            Class.find(),
            Session.find(),
            ExamTag.find(),
            Boards.find()
        ]);

        const results = { success: 0, failed: 0, carryForward: 0, errors: [] };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;

            try {
                const getRowValue = (prefix) => {
                    const foundKey = Object.keys(row).find(k => k.toLowerCase().startsWith(prefix.toLowerCase()));
                    return foundKey ? row[foundKey] : undefined;
                };

                const name = String(getRowValue("Name*") ?? getRowValue("Name") ?? "").trim();
                const mobile = String(getRowValue("Mobile") ?? "").trim();
                const secondaryMobile = String(getRowValue("Secondary Mobile") ?? "").trim() || undefined;
                const email = String(getRowValue("Email") ?? "").trim() || undefined;
                const dob = String(getRowValue("DOB") ?? "").trim() || undefined;
                const gender = String(getRowValue("Gender") ?? "").trim() || undefined;
                const className = String(getRowValue("Class Name") ?? "").trim();
                const boardName = String(getRowValue("Board Name") ?? getRowValue("Board") ?? "").trim();
                const centreName = String(getRowValue("Centre Name") ?? "").trim();
                const sessionName = String(getRowValue("Session Name") ?? "").trim();
                const examTagName = String(getRowValue("ExamTag Name") ?? "").trim();
                let course = String(getRowValue("Course") ?? "").trim();
                if (/^PMO\s+CLASS\s+(\d+)$/i.test(course)) {
                    course = course.toUpperCase().replace(/PMO\s+CLASS\s+(\d+)/i, 'PMO $1');
                }
                const school = String(getRowValue("School") ?? "").trim() || undefined;
                const guardianName = String(getRowValue("Guardian Name") ?? "").trim() || undefined;
                const guardianMobile = String(getRowValue("Guardian Mobile") ?? "").trim() || undefined;
                const address = String(getRowValue("Address") ?? "").trim() || undefined;
                const city = String(getRowValue("City") ?? "").trim() || undefined;
                const state = String(getRowValue("State") ?? "").trim() || undefined;
                const pincode = String(getRowValue("Pincode") ?? "").trim() || undefined;
                const remarks = String(getRowValue("Remarks") ?? "").trim() || undefined;
                const examVenue = String(getRowValue("Exam Venue") ?? "").trim() || undefined;
                const reportingTime = String(getRowValue("Reporting Time") ?? "").trim() || undefined;
                const examTime = String(getRowValue("Exam Time") ?? "").trim() || undefined;
                const examDate = String(getRowValue("Exam Date") ?? "").trim() || undefined;
                const studentId = getRowValue("studentId") || undefined;

                if (!name || !mobile || !className || !boardName || !centreName || !sessionName || !examTagName || !course) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: Missing required fields (Name, Mobile, Class, Board, Centre, Session, ExamTag, Course)`);
                    continue;
                }

                // Match Centre
                const centreTarget = centreName.trim().toLowerCase();
                const centreTargetClean = centreTarget.replace(/[^a-z0-9]/g, '');
                const centreObj = allCentres.find(c => {
                    const cName = c.centreName?.trim().toLowerCase() || '';
                    const cCode = c.enterCode?.trim().toLowerCase() || '';
                    const cShort = c.centreCode?.trim().toLowerCase() || '';
                    return cName === centreTarget || cCode === centreTarget || cShort === centreTarget;
                }) || allCentres.find(c => {
                    const cNameClean = c.centreName?.replace(/[^a-z0-9]/g, '').toLowerCase() || '';
                    const cCodeClean = c.enterCode?.replace(/[^a-z0-9]/g, '').toLowerCase() || '';
                    return (cNameClean && cNameClean === centreTargetClean) || (cCodeClean && cCodeClean === centreTargetClean);
                });

                if (!centreObj) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: Centre "${centreName}" not found`);
                    continue;
                }

                // Match Class
                const classTarget = className.trim().toLowerCase();
                const classDigits = className.replace(/\D/g, '');
                const classObj = allClasses.find(c => c.name?.trim().toLowerCase() === classTarget) ||
                                 (classDigits ? allClasses.find(c => c.name?.replace(/\D/g, '') === classDigits) : null);
                if (!classObj) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: Class "${className}" not found`);
                    continue;
                }

                // Match Board
                const boardTarget = boardName.trim().toLowerCase();
                const boardClean = boardTarget.replace(/[^a-z0-9]/g, '');
                const boardObj = allBoards.find(b =>
                    b.boardCourse?.trim().toLowerCase() === boardTarget ||
                    b.boardName?.trim().toLowerCase() === boardTarget
                ) || allBoards.find(b => {
                    const bCourseClean = b.boardCourse?.replace(/[^a-z0-9]/g, '').toLowerCase() || '';
                    const bNameClean = b.boardName?.replace(/[^a-z0-9]/g, '').toLowerCase() || '';
                    return (bCourseClean && bCourseClean === boardClean) || (bNameClean && bNameClean === boardClean);
                });

                if (!boardObj) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: Board "${boardName}" not found in master data`);
                    continue;
                }

                // Match Session
                const sessionTarget = sessionName.trim().toLowerCase();
                const sessionClean = sessionTarget.replace(/[^a-z0-9]/g, '');
                const sessionObj = allSessions.find(s =>
                    s.sessionName?.trim().toLowerCase() === sessionTarget ||
                    s.name?.trim().toLowerCase() === sessionTarget
                ) || allSessions.find(s => {
                    const sNameClean = (s.sessionName || s.name || '').replace(/[^a-z0-9]/g, '').toLowerCase();
                    return sNameClean && (sNameClean === sessionClean || sNameClean.includes(sessionClean) || sessionClean.includes(sNameClean));
                });

                if (!sessionObj) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: Session "${sessionName}" not found`);
                    continue;
                }

                // Match ExamTag
                const examTagTarget = examTagName.trim().toLowerCase();
                const examTagClean = examTagTarget.replace(/[^a-z0-9]/g, '');
                const examTagObj = allExamTags.find(t => t.name?.trim().toLowerCase() === examTagTarget) ||
                                   allExamTags.find(t => t.name?.replace(/[^a-z0-9]/g, '').toLowerCase() === examTagClean) ||
                                   allExamTags[0];

                if (!examTagObj) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: ExamTag "${examTagName}" not found`);
                    continue;
                }

                // Check PMO duplicate
                const pmoDupMobile = await PMOStudent.findOne({ mobile, course, session: sessionObj._id });
                if (pmoDupMobile) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: Student already registered in PMO for ${course} (Roll: ${pmoDupMobile.rollNo}).`);
                    continue;
                }

                // Check other courses for auto-enrollment allocation
                const enrollmentCheck = await findExistingEnrollment(mobile, email);
                let rollNo = null;
                let finalStudentId = studentId || enrollmentCheck.existingStudentId;

                if (enrollmentCheck.existingEnrollmentNo) {
                    rollNo = enrollmentCheck.existingEnrollmentNo;
                    results.carryForward++;
                } else {
                    const twoDigitCode = centreObj.centreCode || String(centreObj.enterCode || "00").slice(0, 2).toUpperCase();
                    const classNum = parseInt(String(classObj?.name || "").match(/\d+/)?.[0] || "0", 10);
                    const classCode = String(classNum).padStart(2, '0');

                    const count = await PMOStudent.countDocuments({ centre: centreObj._id, class: classObj._id });
                    let nextIndex = count + 1;
                    let isUnique = false;
                    while (!isUnique) {
                        rollNo = `PATH${twoDigitCode}${classCode}${String(nextIndex).padStart(3, '0')}`;
                        const existing = await PMOStudent.findOne({ rollNo });
                        if (!existing) {
                            isUnique = true;
                        } else {
                            nextIndex++;
                        }
                    }
                }

                const newStudent = new PMOStudent({
                    name,
                    mobile,
                    secondaryMobile,
                    email,
                    dob,
                    gender,
                    address,
                    city,
                    state,
                    pincode,
                    class: classObj._id,
                    centre: centreObj._id,
                    session: sessionObj._id,
                    examTag: examTagObj._id,
                    board: boardObj._id,
                    course,
                    paymentType: 'paid',
                    amountPaid: 100,
                    waiver: 0,
                    rollNo,
                    school,
                    guardianName,
                    guardianMobile,
                    remarks,
                    examDate,
                    examVenue,
                    reportingTime,
                    timeSlot: examTime,
                    status: 'Appeared',
                    score: 0,
                    isImported: true,
                    isPaymentPending: true,
                    studentId: finalStudentId
                });

                await newStudent.save();
                results.success++;
            } catch (rowErr) {
                results.failed++;
                results.errors.push(`Row ${rowNum}: ${rowErr.message}`);
            }
        }

        res.status(200).json({
            message: `Import completed. ${results.success} imported, ${results.carryForward} carried forward with existing enrollment IDs, ${results.failed} failed.`,
            ...results
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Process payment for imported or pending PMO student
export const processStudentPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod, transactionId, accountHolderName, chequeDate, receivedDate, waiver } = req.body;

        const student = await PMOStudent.findById(id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const isSuperAdmin = req.user.role === "superAdmin" || req.user.role === "Super Admin";
        if (!isSuperAdmin) {
            const assignedCentres = req.user.centres || [];
            if (!assignedCentres.map(c => c.toString()).includes(student.centre.toString())) {
                return res.status(403).json({ message: "Access denied: you are not assigned to this student's centre." });
            }
        }

        const [centreObj, classObj] = await Promise.all([
            CentreSchema.findById(student.centre),
            Class.findById(student.class)
        ]);

        if (!centreObj) {
            return res.status(400).json({ message: "Centre not found" });
        }

        const centreCode = (centreObj.enterCode || centreObj.centreCode || "XX").toUpperCase();
        const GROSS_FEE = 100;
        const waiverAmt = Math.max(0, Math.min(GROSS_FEE, Number(waiver) || 0));
        const amountPaid = GROSS_FEE - waiverAmt;

        const isPHSPS = centreObj.centreName && /phsps/i.test(centreObj.centreName);
        const totalAmount = parseFloat(amountPaid.toFixed(2));
        const baseAmount = isPHSPS ? totalAmount : totalAmount / 1.18;
        const courseFee = parseFloat(baseAmount.toFixed(2));
        const gstPool = totalAmount - courseFee;
        const cgst = parseFloat((gstPool / 2).toFixed(2));
        const sgst = parseFloat((gstPool - cgst).toFixed(2));

        const billId = await generateBillId(centreCode, receivedDate || new Date());

        const paymentRecord = new Payment({
            admission: student._id,
            installmentNumber: 0,
            amount: GROSS_FEE,
            paidAmount: totalAmount,
            dueDate: receivedDate ? new Date(receivedDate) : new Date(),
            paidDate: receivedDate ? new Date(receivedDate) : new Date(),
            receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
            status: 'PAID',
            paymentMethod: paymentMethod || 'CASH',
            transactionId: transactionId || '',
            accountHolderName: accountHolderName || '',
            chequeDate: chequeDate ? new Date(chequeDate) : null,
            remarks: `PMO Registration Fee - ${student.name}`,
            recordedBy: req.user?.id || req.user?._id,
            cgst,
            sgst,
            courseFee,
            totalAmount,
            billId,
            boardCourseName: student.course,
        });

        await paymentRecord.save();

        student.paymentType = amountPaid > 0 ? 'paid' : 'free';
        student.amountPaid = totalAmount;
        student.waiver = waiverAmt;
        student.paymentMethod = paymentMethod || 'CASH';
        student.billId = billId;
        student.paymentId = paymentRecord._id;
        student.isPaymentPending = false;
        await student.save();
        await student.populate(['class', 'centre', 'session', 'examTag', 'board']);

        const billData = {
            billId,
            billDate: paymentRecord.paidDate,
            centre: {
                name: centreObj.centreName,
                address: centreObj.address || 'N/A',
                phoneNumber: centreObj.phoneNumber || 'N/A',
                gstNumber: centreObj.enterGstNo || 'N/A',
                corporateAddress: centreObj.enterCorporateOfficeAddress || '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026',
                corporatePhone: centreObj.enterCorporateOfficePhoneNumber || '033 2455-1840 / 2454-4817 / 4668'
            },
            student: {
                id: student._id,
                name: student.name,
                admissionNumber: student.rollNo,
                phoneNumber: student.mobile,
                email: student.email || 'N/A'
            },
            course: {
                name: student.course,
                department: 'PMO',
                examTag: 'PMO',
                class: classObj ? classObj.name : 'N/A',
                session: 'N/A'
            },
            payment: {
                installmentNumber: 0,
                paymentMethod: paymentMethod || 'CASH',
                transactionId: transactionId || '',
                paidDate: paymentRecord.paidDate,
                receivedDate: paymentRecord.receivedDate,
                accountHolderName: accountHolderName || '',
                chequeDate: chequeDate ? new Date(chequeDate) : null,
                status: 'PAID',
                remarks: `PMO Fee | Gross: ₹${GROSS_FEE} | Discount: ₹${waiverAmt} | Net: ₹${amountPaid}`
            },
            amounts: {
                courseFee,
                cgst,
                sgst,
                totalAmount,
                waiver: waiverAmt,
                grossFee: GROSS_FEE
            }
        };

        res.status(200).json({
            message: "Payment processed successfully",
            student,
            billData
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Set student payment type to Free (100% discount)
export const setStudentFree = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await PMOStudent.findById(id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const isSuperAdmin = req.user.role === "superAdmin" || req.user.role === "Super Admin";
        if (!isSuperAdmin) {
            const assignedCentres = req.user.centres || [];
            if (!assignedCentres.map(c => c.toString()).includes(student.centre.toString())) {
                return res.status(403).json({ message: "Access denied: you are not assigned to this student's centre." });
            }
        }

        student.paymentType = 'free';
        student.isPaymentPending = false;
        student.amountPaid = 0;
        student.waiver = 100;
        await student.save();
        await student.populate(['class', 'centre', 'session', 'examTag', 'board']);
        res.status(200).json({ message: "Student payment type updated to free (100% waiver)", student });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Update PMO Student
export const updatePMOStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const student = await PMOStudent.findById(id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const isSuperAdmin = req.user.role === "superAdmin" || req.user.role === "Super Admin";
        if (!isSuperAdmin) {
            const assignedCentres = req.user.centres || [];
            if (!assignedCentres.map(c => c.toString()).includes(student.centre.toString())) {
                return res.status(403).json({ message: "Access denied: you are not assigned to this student's centre." });
            }
            if (updateData.centre && !assignedCentres.map(c => c.toString()).includes(updateData.centre.toString())) {
                return res.status(403).json({ message: "Access denied: you are not assigned to the target centre." });
            }
        }

        if (updateData.mobile && updateData.mobile !== student.mobile) {
            const duplicateMobile = await PMOStudent.findOne({ mobile: updateData.mobile });
            if (duplicateMobile) {
                return res.status(400).json({ message: "Mobile number is already registered in PMO" });
            }
        }

        if (updateData.email && updateData.email !== student.email) {
            const duplicateEmail = await PMOStudent.findOne({ email: updateData.email });
            if (duplicateEmail) {
                return res.status(400).json({ message: "Email ID is already registered in PMO" });
            }
        }

        const updatedStudent = await PMOStudent.findByIdAndUpdate(id, updateData, { new: true })
            .populate('class')
            .populate('centre')
            .populate('session')
            .populate('examTag')
            .populate('board')
            .populate('paymentId');

        res.status(200).json({ message: "Student updated successfully", student: updatedStudent });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Delete PMO Student
export const deletePMOStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await PMOStudent.findById(id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const isSuperAdmin = req.user.role === "superAdmin" || req.user.role === "Super Admin";
        if (!isSuperAdmin) {
            const assignedCentres = req.user.centres || [];
            if (!assignedCentres.map(c => c.toString()).includes(student.centre.toString())) {
                return res.status(403).json({ message: "Access denied: you are not assigned to this student's centre." });
            }
        }

        if (student.paymentId) {
            await Payment.findByIdAndDelete(student.paymentId);
        }

        await PMOStudent.findByIdAndDelete(id);
        res.status(200).json({ message: "Student deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
