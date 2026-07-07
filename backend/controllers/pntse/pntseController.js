import PNTSEStudent from "../../models/PNTSEStudent.js";
import Class from "../../models/Master_data/Class.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import Session from "../../models/Master_data/Session.js";
import ExamTag from "../../models/Master_data/ExamTag.js";

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
