import PNTSEStudent from "../../models/PNTSEStudent.js";
import Class from "../../models/Master_data/Class.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import Session from "../../models/Master_data/Session.js";
import ExamTag from "../../models/Master_data/ExamTag.js";
import Payment from "../../models/Payment/Payment.js";
import { generateBillId } from "../../utils/billIdGenerator.js";
import XLSX from "xlsx";

// Create PNTSE Student
export const createPNTSEStudent = async (req, res) => {
    try {
        const {
            name, mobile, email, dob, gender, address, city, state, pincode,
            class: classId, centre: centreId, session: sessionId, examTag: examTagId,
            course, paymentType, school, guardianName, guardianMobile, examDate, remarks, status, score, rank,
            // Payment fields (only used when paymentType === 'paid')
            paymentMethod, transactionId, accountHolderName, chequeDate, receivedDate, waiver,
            studentId, rollNo: customRollNo
        } = req.body;

        if (!name || !mobile || !classId || !centreId || !sessionId || !examTagId || !course) {
            return res.status(400).json({ message: "Required fields are missing" });
        }

        // Check for duplicate mobile
        const duplicateMobile = await PNTSEStudent.findOne({ mobile });
        if (duplicateMobile) {
            if (!sanitizedStudentId || String(duplicateMobile.studentId) !== String(sanitizedStudentId)) {
                return res.status(400).json({ message: "Mobile number is already registered" });
            }
        }

        // Check for duplicate email
        if (email) {
            const duplicateEmail = await PNTSEStudent.findOne({ email });
            if (duplicateEmail) {
                if (!sanitizedStudentId || String(duplicateEmail.studentId) !== String(sanitizedStudentId)) {
                    return res.status(400).json({ message: "Email ID is already registered" });
                }
            }
        }

        // Fetch center to get code
        const centreObj = await CentreSchema.findById(centreId);
        if (!centreObj) {
            return res.status(400).json({ message: "Centre not found" });
        }

        // Granular check: Only allow creating for assigned centres if not superAdmin
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

        // Sanitize: empty string studentId/rollNo causes ObjectId cast errors
        const sanitizedStudentId = studentId && studentId.trim() !== '' ? studentId : undefined;
        const sanitizedCustomRollNo = customRollNo && customRollNo.trim() !== '' ? customRollNo : undefined;

        let rollNo = sanitizedCustomRollNo;
        if (!rollNo) {
            // Generate roll number: PATH{centreCode}{6-digit seq per centre}
            // Use the 2-digit unique centreCode (e.g. "01"), fallback to enterCode first 2 digits
            const twoDigitCode = centreObj.centreCode || String(centreObj.enterCode || "00").slice(0, 2).toUpperCase();

            // Count all students for this centre to get next sequential number
            const count = await PNTSEStudent.countDocuments({ centre: centreId });
            let nextIndex = count + 1;
            let isUnique = false;
            while (!isUnique) {
                rollNo = `PATH${twoDigitCode}${String(nextIndex).padStart(6, '0')}`;
                const existing = await PNTSEStudent.findOne({ rollNo });
                if (!existing) {
                    isUnique = true;
                } else {
                    nextIndex++;
                }
            }
        }

        // Determine amounts
        const waiverAmt = paymentType === 'paid' ? Math.max(0, Math.min(100, Number(waiver) || 0)) : 0;
        const grossFee = paymentType === 'paid' ? 100 : 0;
        const amountPaid = grossFee - waiverAmt;

        const newStudent = new PNTSEStudent({
            name, mobile, email, dob, gender, address, city, state, pincode,
            class: classId,
            centre: centreId,
            session: sessionId,
            examTag: examTagId,
            course,
            paymentType: paymentType || 'free',
            amountPaid,
            waiver: waiverAmt,
            paymentMethod: paymentType === 'paid' ? (paymentMethod || 'CASH') : null,
            rollNo,
            school,
            guardianName,
            guardianMobile,
            examDate,
            remarks,
            status: status || 'Appeared',
            score: score || 0,
            rank,
            studentId: sanitizedStudentId
        });

        await newStudent.save();

        // ─── PAID: Create Payment record & generate bill ─────────────────────────
        let billData = null;
        if (paymentType === 'paid') {
            try {
                const isPHSPS = centreObj.centreName && /phsps/i.test(centreObj.centreName);
                const totalAmount = parseFloat(amountPaid.toFixed(2));
                const baseAmount = isPHSPS ? totalAmount : totalAmount / 1.18;
                const courseFee = parseFloat(baseAmount.toFixed(2));
                const gstPool = totalAmount - courseFee;
                const cgst = parseFloat((gstPool / 2).toFixed(2));
                const sgst = parseFloat((gstPool - cgst).toFixed(2));

                const billId = await generateBillId(centreObj.centreCode || centreObj.enterCode, receivedDate || new Date());

                const paymentRecord = new Payment({
                    admission: newStudent._id,          // PNTSE student _id stored as admission ref
                    installmentNumber: 0,
                    amount: grossFee,
                    paidAmount: totalAmount,
                    dueDate: receivedDate ? new Date(receivedDate) : new Date(),
                    paidDate: receivedDate ? new Date(receivedDate) : new Date(),
                    receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
                    status: 'PAID',
                    paymentMethod: paymentMethod || 'CASH',
                    transactionId: transactionId || '',
                    accountHolderName: accountHolderName || '',
                    chequeDate: chequeDate ? new Date(chequeDate) : null,
                    remarks: remarks || `PNTSE Registration Fee - ${name}`,
                    recordedBy: req.user?.id || req.user?._id,
                    cgst,
                    sgst,
                    courseFee,
                    totalAmount,
                    billId,
                    boardCourseName: course,   // reuse boardCourseName for PNTSE course label
                });

                await paymentRecord.save();

                // Back-link billId and paymentId to the student record
                newStudent.billId = billId;
                newStudent.paymentId = paymentRecord._id;
                await newStudent.save();

                // Build billData in the same shape BillGenerator expects
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
                        department: 'PNTSE',
                        examTag: 'PNTSE',
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
                        remarks: `PNTSE Fee | Gross: ₹${grossFee} | Waiver: ₹${waiverAmt} | Net: ₹${amountPaid}`
                    },
                    amounts: {
                        courseFee,
                        cgst,
                        sgst,
                        totalAmount,
                        waiver: waiverAmt,
                        grossFee
                    }
                };
            } catch (billErr) {
                console.error("Error creating PNTSE payment record:", billErr);
                // Student is saved — don't fail the whole request, just skip bill
            }
        }
        // ─────────────────────────────────────────────────────────────────────────

        res.status(201).json({
            message: "Student registered successfully",
            student: newStudent,
            billData   // null for free, populated for paid
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};



// Get all PNTSE Students with filtering and search
export const getPNTSEStudents = async (req, res) => {
    try {
        const { search, centre, class: classId, session, examTag, status } = req.query;

        const query = {};

        const isSuperAdmin = req.user.role === "superAdmin" || req.user.role === "Super Admin";

        if (!isSuperAdmin) {
            const assignedCentres = req.user.centres || [];
            if (centre) {
                if (assignedCentres.map(c => c.toString()).includes(centre.toString())) {
                    query.centre = centre;
                } else {
                    query.centre = { $in: assignedCentres };
                }
            } else {
                query.centre = { $in: assignedCentres };
            }
        } else {
            if (centre) query.centre = centre;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
                { rollNo: { $regex: search, $options: 'i' } }
            ];
        }

        if (classId) query.class = classId;
        if (session) query.session = session;
        if (examTag) query.examTag = examTag;
        if (status) query.status = status;

        const students = await PNTSEStudent.find(query)
            .populate('class')
            .populate('centre')
            .populate('session')
            .populate('examTag')
            .populate('paymentId')
            .sort({ createdAt: -1 });

        res.status(200).json(students);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Check if mobile or email exists
export const checkDuplicate = async (req, res) => {
    try {
        const { mobile, email } = req.query;
        let mobileExists = false;
        let emailExists = false;

        if (mobile) {
            const student = await PNTSEStudent.findOne({ mobile });
            if (student) mobileExists = true;
        }

        if (email) {
            const student = await PNTSEStudent.findOne({ email });
            if (student) emailExists = true;
        }

        res.status(200).json({ mobileExists, emailExists });
    } catch (err) {
        console.error(err);
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
                "Email": "aarav@example.com",
                "DOB (YYYY-MM-DD)": "2012-05-15",
                "Gender": "Male",
                "Class Name* (e.g. 6)": "6",
                "Centre Name* (exact)": "HAZRA H.O",
                "Session Name* (e.g. 2025-2026)": "2025-2026",
                "ExamTag Name* (e.g. PNTSE 6)": "PNTSE 6",
                "Course* (e.g. PNTSE CLASS 6)": "PNTSE CLASS 6",
                "School": "ABC High School",
                "Guardian Name": "Rajesh Sharma",
                "Guardian Mobile": "9876543200",
                "Address": "12 Main Street",
                "City": "Kolkata",
                "State": "West Bengal",
                "Pincode": "700001",
                "Remarks": "Good student"
            },
            {
                "Name*": "Priya Verma",
                "Mobile*": "9876543211",
                "Email": "",
                "DOB (YYYY-MM-DD)": "2011-08-20",
                "Gender": "Female",
                "Class Name* (e.g. 7)": "7",
                "Centre Name* (exact)": "DUMDUM",
                "Session Name* (e.g. 2025-2026)": "2025-2026",
                "ExamTag Name* (e.g. PNTSE 7)": "PNTSE 7",
                "Course* (e.g. PNTSE CLASS 6)": "PNTSE CLASS 7",
                "School": "XYZ School",
                "Guardian Name": "Suresh Verma",
                "Guardian Mobile": "9876543201",
                "Address": "45 Park Lane",
                "City": "Howrah",
                "State": "West Bengal",
                "Pincode": "711101",
                "Remarks": ""
            }
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(sampleRows);

        // Set column widths
        ws['!cols'] = [
            { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 10 },
            { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
            { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 15 },
            { wch: 18 }, { wch: 10 }, { wch: 20 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "PNTSE Students");
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=PNTSE_Import_Template.xlsx');
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

        // Pre-fetch all master data to avoid repeated DB calls per row
        const [allCentres, allClasses, allSessions, allExamTags] = await Promise.all([
            CentreSchema.find(),
            Class.find(),
            Session.find(),
            ExamTag.find()
        ]);

        const results = { success: 0, failed: 0, errors: [] };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // Excel row number (header is row 1)

            try {
                const name = String(row["Name*"] ?? "").trim();
                const mobile = String(row["Mobile*"] ?? "").trim();
                const email = String(row["Email"] ?? "").trim() || undefined;
                const dob = String(row["DOB (YYYY-MM-DD)"] ?? "").trim() || undefined;
                const gender = String(row["Gender"] ?? "").trim() || undefined;
                const className = String(row["Class Name* (e.g. 6th)"] ?? "").trim();
                const centreName = String(row["Centre Name* (exact)"] ?? "").trim();
                const sessionName = String(row["Session Name* (e.g. 2025-26)"] ?? "").trim();
                const examTagName = String(row["ExamTag Name* (e.g. PNTSE)"] ?? "").trim();
                const course = String(row["Course* (e.g. PNTSE CLASS 6)"] ?? "").trim();
                const school = String(row["School"] ?? "").trim() || undefined;
                const guardianName = String(row["Guardian Name"] ?? "").trim() || undefined;
                const guardianMobile = String(row["Guardian Mobile"] ?? "").trim() || undefined;
                const address = String(row["Address"] ?? "").trim() || undefined;
                const city = String(row["City"] ?? "").trim() || undefined;
                const state = String(row["State"] ?? "").trim() || undefined;
                const pincode = String(row["Pincode"] ?? "").trim() || undefined;
                const remarks = String(row["Remarks"] ?? "").trim() || undefined;
                const studentId = row["studentId"] || undefined;

                // Validate required
                if (!name || !mobile || !className || !centreName || !sessionName || !examTagName || !course) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: Missing required fields (Name, Mobile, Class, Centre, Session, ExamTag, Course)`);
                    continue;
                }

                // Resolve references by name (case-insensitive)
                const centreObj = allCentres.find(c =>
                    c.centreName?.toLowerCase() === centreName.toLowerCase() ||
                    c.enterCode?.toLowerCase() === centreName.toLowerCase()
                );
                if (!centreObj) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: Centre "${centreName}" not found`);
                    continue;
                }

                // Granular check: Only allow importing for assigned centres if not superAdmin
                const isSuperAdmin = req.user.role === "superAdmin" || req.user.role === "Super Admin";
                if (!isSuperAdmin) {
                    const assignedCentres = req.user.centres || [];
                    if (!assignedCentres.map(c => c.toString()).includes(centreObj._id.toString())) {
                        results.failed++;
                        results.errors.push(`Row ${rowNum}: You are not assigned to centre "${centreName}"`);
                        continue;
                    }
                }

                const classObj = allClasses.find(c => c.name?.toLowerCase() === className.toLowerCase());
                if (!classObj) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: Class "${className}" not found`);
                    continue;
                }

                const sessionObj = allSessions.find(s => s.sessionName?.toLowerCase() === sessionName.toLowerCase());
                if (!sessionObj) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: Session "${sessionName}" not found`);
                    continue;
                }

                const examTagObj = allExamTags.find(t => t.name?.toLowerCase() === examTagName.toLowerCase());
                if (!examTagObj) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: ExamTag "${examTagName}" not found`);
                    continue;
                }

                // Check duplicate mobile
                const dupMobile = await PNTSEStudent.findOne({ mobile });
                if (dupMobile && (!studentId || String(dupMobile.studentId) !== String(studentId))) {
                    results.failed++;
                    results.errors.push(`[DUPLICATE_MOBILE] Row ${rowNum}: Mobile "${mobile}" already registered for student "${dupMobile.name}" (Roll: ${dupMobile.rollNo || 'N/A'})`);
                    continue;
                }

                // Check duplicate email
                if (email) {
                    const dupEmail = await PNTSEStudent.findOne({ email });
                    if (dupEmail && (!studentId || String(dupEmail.studentId) !== String(studentId))) {
                        results.failed++;
                        results.errors.push(`[DUPLICATE_EMAIL] Row ${rowNum}: Email "${email}" already registered for student "${dupEmail.name}" (Roll: ${dupEmail.rollNo || 'N/A'})`);
                        continue;
                    }
                }

                // Generate roll number: PATH{centreCode}{6-digit seq per centre}
                const twoDigitCode = centreObj.centreCode || String(centreObj.enterCode || "00").slice(0, 2).toUpperCase();

                const count = await PNTSEStudent.countDocuments({ centre: centreObj._id });
                let nextIndex = count + 1;
                let rollNo;
                let isUnique = false;
                while (!isUnique) {
                    rollNo = `PATH${twoDigitCode}${String(nextIndex).padStart(6, '0')}`;
                    const existing = await PNTSEStudent.findOne({ rollNo });
                    if (!existing) {
                        isUnique = true;
                    } else {
                        nextIndex++;
                    }
                }

                // Save student (all imports are FREE by default but pending selection)
                const newStudent = new PNTSEStudent({
                    name, mobile, email, dob, gender, address, city, state, pincode,
                    class: classObj._id,
                    centre: centreObj._id,
                    session: sessionObj._id,
                    examTag: examTagObj._id,
                    course,
                    paymentType: 'free',
                    amountPaid: 0,
                    rollNo,
                    school, guardianName, guardianMobile, remarks,
                    status: 'Appeared',
                    score: 0,
                    isImported: true,
                    isPaymentPending: true,
                    studentId
                });

                await newStudent.save();
                results.success++;
            } catch (rowErr) {
                results.failed++;
                results.errors.push(`Row ${rowNum}: ${rowErr.message}`);
            }
        }

        res.status(200).json({
            message: `Import completed. ${results.success} imported, ${results.failed} failed.`,
            ...results
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Set imported student as Free
export const setStudentFree = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await PNTSEStudent.findById(id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Granular check: Only allow if center is assigned to the user
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
        student.waiver = 0;
        await student.save();
        await student.populate(['class', 'centre', 'session', 'examTag']);
        res.status(200).json({ message: "Student payment type updated to free", student });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Process payment for imported student
export const processStudentPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod, transactionId, accountHolderName, chequeDate, receivedDate, waiver } = req.body;

        const student = await PNTSEStudent.findById(id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Granular check: Only allow if center is assigned to the user
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

        const centreCode = (centreObj.centreCode || centreObj.enterCode || "XX").toUpperCase();

        const waiverAmt = Math.max(0, Math.min(100, Number(waiver) || 0));
        const grossFee = 100;
        const amountPaid = grossFee - waiverAmt;

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
            amount: grossFee,
            paidAmount: totalAmount,
            dueDate: receivedDate ? new Date(receivedDate) : new Date(),
            paidDate: receivedDate ? new Date(receivedDate) : new Date(),
            receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
            status: 'PAID',
            paymentMethod: paymentMethod || 'CASH',
            transactionId: transactionId || '',
            accountHolderName: accountHolderName || '',
            chequeDate: chequeDate ? new Date(chequeDate) : null,
            remarks: `PNTSE Registration Fee - ${student.name}`,
            recordedBy: req.user?.id || req.user?._id,
            cgst,
            sgst,
            courseFee,
            totalAmount,
            billId,
            boardCourseName: student.course,
        });

        await paymentRecord.save();

        student.paymentType = 'paid';
        student.amountPaid = totalAmount;
        student.waiver = waiverAmt;
        student.paymentMethod = paymentMethod || 'CASH';
        student.billId = billId;
        student.paymentId = paymentRecord._id;
        student.isPaymentPending = false;
        await student.save();
        await student.populate(['class', 'centre', 'session', 'examTag']);

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
                department: 'PNTSE',
                examTag: 'PNTSE',
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
                remarks: `PNTSE Fee | Gross: ₹${grossFee} | Waiver: ₹${waiverAmt} | Net: ₹${amountPaid}`
            },
            amounts: {
                courseFee,
                cgst,
                sgst,
                totalAmount,
                waiver: waiverAmt,
                grossFee
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

// Update PNTSE Student
export const updatePNTSEStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const student = await PNTSEStudent.findById(id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Granular check: Only allow if center is assigned to the user
        const isSuperAdmin = req.user.role === "superAdmin" || req.user.role === "Super Admin";
        if (!isSuperAdmin) {
            const assignedCentres = req.user.centres || [];
            if (!assignedCentres.map(c => c.toString()).includes(student.centre.toString())) {
                return res.status(403).json({ message: "Access denied: you are not assigned to this student's centre." });
            }

            // Also check if they try to update to a center they are not assigned to
            if (updateData.centre && !assignedCentres.map(c => c.toString()).includes(updateData.centre.toString())) {
                return res.status(403).json({ message: "Access denied: you are not assigned to the target centre." });
            }
        }

        if (updateData.mobile && updateData.mobile !== student.mobile) {
            const duplicateMobile = await PNTSEStudent.findOne({ mobile: updateData.mobile });
            if (duplicateMobile) {
                return res.status(400).json({ message: "Mobile number is already registered" });
            }
        }

        if (updateData.email && updateData.email !== student.email) {
            const duplicateEmail = await PNTSEStudent.findOne({ email: updateData.email });
            if (duplicateEmail) {
                return res.status(400).json({ message: "Email ID is already registered" });
            }
        }

        // If class or centre changes, regenerate roll number
        if ((updateData.centre && String(updateData.centre) !== String(student.centre)) ||
            (updateData.class && String(updateData.class) !== String(student.class))) {
            const centreId = updateData.centre || student.centre;
            const classId = updateData.class || student.class;

            const centreObj = await CentreSchema.findById(centreId);
            const classObj = await Class.findById(classId);
            if (centreObj && classObj) {
                // Generate roll number: PATH{centreCode}{6-digit seq per centre}
                const twoDigitCode = centreObj.centreCode || String(centreObj.enterCode || "00").slice(0, 2).toUpperCase();

                const count = await PNTSEStudent.countDocuments({ centre: centreId });
                let nextIndex = count + 1;
                let rollNo;
                let isUnique = false;
                while (!isUnique) {
                    rollNo = `PATH${twoDigitCode}${String(nextIndex).padStart(6, '0')}`;
                    const existing = await PNTSEStudent.findOne({ rollNo });
                    if (!existing) {
                        isUnique = true;
                    } else {
                        nextIndex++;
                    }
                }
                updateData.rollNo = rollNo;
            }
        }

        const updatedStudent = await PNTSEStudent.findByIdAndUpdate(id, updateData, { new: true })
            .populate('class')
            .populate('centre')
            .populate('session')
            .populate('examTag')
            .populate('paymentId');

        res.status(200).json({ message: "Student updated successfully", student: updatedStudent });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Delete PNTSE Student
export const deletePNTSEStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await PNTSEStudent.findById(id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Granular check: Only allow if center is assigned to the user
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

        await PNTSEStudent.findByIdAndDelete(id);
        res.status(200).json({ message: "Student deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
