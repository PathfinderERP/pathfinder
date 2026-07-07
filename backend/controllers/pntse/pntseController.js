import PNTSEStudent from "../../models/PNTSEStudent.js";
import Class from "../../models/Master_data/Class.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import Session from "../../models/Master_data/Session.js";
import ExamTag from "../../models/Master_data/ExamTag.js";
import XLSX from "xlsx";

// Create PNTSE Student
export const createPNTSEStudent = async (req, res) => {
    try {
        const {
            name, mobile, email, dob, gender, address, city, state, pincode,
            class: classId, centre: centreId, session: sessionId, examTag: examTagId,
            course, paymentType, school, guardianName, guardianMobile, examDate, remarks, status, score, rank
        } = req.body;

        if (!name || !mobile || !classId || !centreId || !sessionId || !examTagId || !course) {
            return res.status(400).json({ message: "Required fields are missing" });
        }

        // Check for duplicate mobile
        const duplicateMobile = await PNTSEStudent.findOne({ mobile });
        if (duplicateMobile) {
            return res.status(400).json({ message: "Mobile number is already registered" });
        }

        // Check for duplicate email
        if (email) {
            const duplicateEmail = await PNTSEStudent.findOne({ email });
            if (duplicateEmail) {
                return res.status(400).json({ message: "Email ID is already registered" });
            }
        }

        // Fetch center to get code
        const centreObj = await CentreSchema.findById(centreId);
        if (!centreObj) {
            return res.status(400).json({ message: "Centre not found" });
        }
        const centreCode = (centreObj.enterCode || "XX").toUpperCase();

        // Fetch class to get digit
        const classObj = await Class.findById(classId);
        if (!classObj) {
            return res.status(400).json({ message: "Class not found" });
        }
        // Extract digit from class name (e.g. "6th" -> "6", "Class 6" -> "6")
        const classDigit = classObj.name.replace(/\D/g, "") || classObj.name;

        // Generate roll no starting from 1 for each center and class combination
        const count = await PNTSEStudent.countDocuments({ centre: centreId, class: classId });
        let nextIndex = count + 1;
        let rollNo;
        let isUnique = false;
        while (!isUnique) {
            rollNo = `PNTSE/${centreCode}/${classDigit}/${String(nextIndex).padStart(5, '0')}`;
            const existing = await PNTSEStudent.findOne({ rollNo });
            if (!existing) {
                isUnique = true;
            } else {
                nextIndex++;
            }
        }

        // Determine amount paid (default 100 for paid, 0 for free)
        const amt = paymentType === 'paid' ? 100 : 0;

        const newStudent = new PNTSEStudent({
            name, mobile, email, dob, gender, address, city, state, pincode,
            class: classId,
            centre: centreId,
            session: sessionId,
            examTag: examTagId,
            course,
            paymentType: paymentType || 'free',
            amountPaid: amt,
            rollNo,
            school,
            guardianName,
            guardianMobile,
            examDate,
            remarks,
            status: status || 'Appeared',
            score: score || 0,
            rank
        });

        await newStudent.save();
        res.status(201).json({ message: "Student registered successfully", student: newStudent });
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

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
                { rollNo: { $regex: search, $options: 'i' } }
            ];
        }

        if (centre) query.centre = centre;
        if (classId) query.class = classId;
        if (session) query.session = session;
        if (examTag) query.examTag = examTag;
        if (status) query.status = status;

        const students = await PNTSEStudent.find(query)
            .populate('class')
            .populate('centre')
            .populate('session')
            .populate('examTag')
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
                "Class Name* (e.g. 6th)": "6th",
                "Centre Name* (exact)": "Hazra",
                "Session Name* (e.g. 2025-26)": "2025-26",
                "ExamTag Name* (e.g. PNTSE)": "PNTSE",
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
                "Class Name* (e.g. 6th)": "7th",
                "Centre Name* (exact)": "Howrah",
                "Session Name* (e.g. 2025-26)": "2025-26",
                "ExamTag Name* (e.g. PNTSE)": "PNTSE",
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
                if (dupMobile) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: Mobile ${mobile} already registered`);
                    continue;
                }

                // Check duplicate email
                if (email) {
                    const dupEmail = await PNTSEStudent.findOne({ email });
                    if (dupEmail) {
                        results.failed++;
                        results.errors.push(`Row ${rowNum}: Email ${email} already registered`);
                        continue;
                    }
                }

                // Generate roll number
                const centreCode = (centreObj.enterCode || "XX").toUpperCase();
                const classDigit = classObj.name.replace(/\D/g, "") || classObj.name;

                const count = await PNTSEStudent.countDocuments({ centre: centreObj._id, class: classObj._id });
                let nextIndex = count + 1;
                let rollNo;
                let isUnique = false;
                while (!isUnique) {
                    rollNo = `PNTSE/${centreCode}/${classDigit}/${String(nextIndex).padStart(5, '0')}`;
                    const existing = await PNTSEStudent.findOne({ rollNo });
                    if (!existing) {
                        isUnique = true;
                    } else {
                        nextIndex++;
                    }
                }

                // Save student (all imports are FREE by default)
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
                    score: 0
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
