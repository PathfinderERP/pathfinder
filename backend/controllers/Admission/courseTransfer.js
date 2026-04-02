
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Course from "../../models/Master_data/Courses.js";
import Student from "../../models/Students.js";
import mongoose from "mongoose";

// Search admission by ID or Student Name
export const searchAdmission = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ message: "Query is required" });
        }

        // 1. Search by Student ID if query is an ObjectId
        let admissionsByStudentId = [];
        if (mongoose.Types.ObjectId.isValid(query)) {
            const normal = await Admission.find({ student: query })
                .populate("student", "studentsDetails mobileNum email")
                .populate("course", "courseName feesStructure")
                .populate("department")
                .populate("class")
                .populate("examTag");

            const board = await BoardCourseAdmission.find({ studentId: query })
                .populate("studentId", "studentsDetails mobileNum email")
                .populate("boardId");

            // Normalize board results to look like normal admissions for frontend compatibility
            const normalizedBoard = board.map(b => {
                const bj = b.toJSON();
                return {
                    ...bj,
                    student: bj.studentId,
                    type: "BOARD",
                    course: { courseName: bj.boardCourseName || "Board Course" }
                };
            });

            admissionsByStudentId = [...normal, ...normalizedBoard];
            if (admissionsByStudentId.length > 0) {
                return res.status(200).json(admissionsByStudentId);
            }
        }

        // 2. Search by Admission Number in both collections
        const normalAdmissions = await Admission.find({
            admissionNumber: { $regex: query, $options: "i" }
        })
            .populate("student", "studentsDetails mobileNum email")
            .populate("course", "courseName feesStructure")
            .populate("department")
            .populate("class")
            .populate("examTag");

        const boardAdmissions = await BoardCourseAdmission.find({
            admissionNumber: { $regex: query, $options: "i" }
        })
            .populate("studentId", "studentsDetails mobileNum email")
            .populate("boardId");

        const normalizedBoardAdmissions = boardAdmissions.map(b => {
            const bj = b.toJSON();
            return {
                ...bj,
                student: bj.studentId,
                type: "BOARD",
                course: { courseName: bj.boardCourseName || "Board Course" }
            };
        });

        // 3. Search by Student Name
        const students = await Student.find({
            "studentsDetails.0.studentName": { $regex: query, $options: "i" }
        });

        const studentIds = students.map(s => s._id);

        const normalByStudentName = await Admission.find({
            student: { $in: studentIds }
        })
            .populate("student")
            .populate("course")
            .populate("department")
            .populate("class")
            .populate("examTag");

        const boardByStudentName = await BoardCourseAdmission.find({
            $or: [
                { studentId: { $in: studentIds } },
                { studentName: { $regex: query, $options: "i" } }
            ]
        })
            .populate("studentId")
            .populate("boardId");

        const normalizedBoardByName = boardByStudentName.map(b => {
            const bj = b.toJSON();
            return {
                ...bj,
                student: bj.studentId,
                type: "BOARD",
                course: { courseName: bj.boardCourseName || "Board Course" }
            };
        });

        // Merge all and deduplicate based on _id
        const all = [...normalAdmissions, ...normalizedBoardAdmissions, ...normalByStudentName, ...normalizedBoardByName];
        const uniqueAdmissions = Array.from(new Set(all.map(a => a._id.toString())))
            .map(id => all.find(a => a._id.toString() === id));

        res.status(200).json(uniqueAdmissions);

    } catch (err) {
        console.error("Error searching admission:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// Process Course Transfer
// Process Course Transfer
export const transferCourse = async (req, res) => {
    try {
        const {
            admissionId,
            newCourseId,
            newAcademicSession,
            newExamTagId,
            feeWaiver = 0,
            numberOfInstallments = 1
        } = req.body;

        // 1. Get the current admission details (try Normal Admission first, then Board)
        let currentAdmission = await Admission.findById(admissionId).populate('course');
        let type = "NORMAL";

        if (!currentAdmission) {
            currentAdmission = await BoardCourseAdmission.findById(admissionId);
            type = "BOARD";
        }

        if (!currentAdmission) {
            return res.status(404).json({ message: "Original admission not found" });
        }

        const sourceCourseName = type === "NORMAL" ? currentAdmission.course?.courseName : currentAdmission.boardCourseName;

        // 2. Fetch new course details
        const newCourse = await Course.findById(newCourseId);
        if (!newCourse) {
            return res.status(404).json({ message: "New course not found" });
        }

        // 3. Calculate new fees (Inclusive Deduction)
        const baseFees = newCourse.feesStructure.reduce((sum, fee) => sum + fee.value, 0);
        const totalInclusiveBeforeWaiver = baseFees * 1.18;
        const totalNewFees = Math.max(0, totalInclusiveBeforeWaiver - Number(feeWaiver));

        // Back-calculate taxable and tax
        const taxableAmount = totalNewFees / 1.18;
        const cgstAmount = Math.round(taxableAmount * 0.09);
        const sgstAmount = Math.round(taxableAmount * 0.09);

        // 4. Calculate Carry Forward (Credit) from existing payments
        // We use the total amount paid so far in the current admission as the credit
        const creditAmount = currentAdmission.totalPaidAmount || 0;

        // 5. Calculate Remaining Amount
        let remainingAmount = totalNewFees - creditAmount;
        let excessAmount = 0;

        if (remainingAmount < 0) {
            excessAmount = Math.abs(remainingAmount);
            remainingAmount = 0;
            // Note: We are currently not handling refunds of excess amount automatically in this scope,
            // but the system will show 0 remaining.
        }

        // 6. Generate New Payment Breakdown for the Remaining Amount
        const installmentAmount = Math.ceil(remainingAmount / numberOfInstallments);
        const paymentBreakdown = [];
        const currentDate = new Date();

        for (let i = 0; i < numberOfInstallments; i++) {
            const dueDate = new Date(currentDate);
            dueDate.setMonth(dueDate.getMonth() + i + 1);

            paymentBreakdown.push({
                installmentNumber: i + 1,
                dueDate: dueDate,
                amount: i === numberOfInstallments - 1
                    ? remainingAmount - (installmentAmount * (numberOfInstallments - 1))
                    : installmentAmount,
                status: "PENDING",
                remarks: i === 0 && creditAmount > 0 ? `Transferred from ${sourceCourseName}. Credit: ₹${creditAmount}` : ""
            });
        }

        // 7. Update or Create the Admission Record
        let savedAdmission;
        if (type === "NORMAL") {
            // Overwrite existing Normal Admission
            currentAdmission.course = newCourseId;
            if (newExamTagId && newExamTagId !== "") {
                currentAdmission.examTag = newExamTagId;
            }
            currentAdmission.academicSession = newAcademicSession;
            currentAdmission.department = newCourse.department || currentAdmission.department;
            currentAdmission.baseFees = baseFees;
            currentAdmission.discountAmount = Number(feeWaiver);
            currentAdmission.cgstAmount = cgstAmount;
            currentAdmission.sgstAmount = sgstAmount;
            currentAdmission.totalFees = totalNewFees;
            currentAdmission.remainingAmount = remainingAmount;
            currentAdmission.numberOfInstallments = numberOfInstallments;
            currentAdmission.installmentAmount = installmentAmount;
            currentAdmission.paymentBreakdown = paymentBreakdown;
            currentAdmission.feeStructureSnapshot = newCourse.feesStructure;
            currentAdmission.paymentStatus = remainingAmount <= 0 ? "COMPLETED" : "PARTIAL";
            currentAdmission.remarks = (currentAdmission.remarks || "") + ` | Course Transferred to ${newCourse.courseName} on ${new Date().toLocaleDateString()}.`;
            
            await currentAdmission.save();
            savedAdmission = currentAdmission;
        } else {
            // Source was BOARD, we need to create a NEW NORMAL Admission because they are in different collections
            savedAdmission = new Admission({
                student: currentAdmission.studentId,
                admissionNumber: currentAdmission.admissionNumber,
                admissionType: "NORMAL",
                course: newCourseId,
                examTag: newExamTagId,
                academicSession: newAcademicSession,
                department: newCourse.department,
                centre: currentAdmission.centre,
                baseFees: baseFees,
                discountAmount: Number(feeWaiver),
                cgstAmount: cgstAmount,
                sgstAmount: sgstAmount,
                totalFees: totalNewFees,
                downPayment: currentAdmission.totalPaidAmount || 0, // Previous payments count as DP/Credit
                totalPaidAmount: currentAdmission.totalPaidAmount || 0,
                remainingAmount: remainingAmount,
                numberOfInstallments: numberOfInstallments,
                installmentAmount: installmentAmount,
                paymentBreakdown: paymentBreakdown,
                feeStructureSnapshot: newCourse.feesStructure,
                paymentStatus: remainingAmount <= 0 ? "COMPLETED" : "PARTIAL",
                remarks: `Transferred from Board Course: ${currentAdmission.boardCourseName}. Original ID: ${currentAdmission._id}`
            });

            await savedAdmission.save();

            // Deactivate or mark the old Board Admission as transferred
            currentAdmission.status = "CANCELLED"; // Or add a "TRANSFERRED" status if supported
            currentAdmission.remarks = (currentAdmission.remarks || "") + ` | Transferred to Normal Course ${newCourse.courseName} on ${new Date().toLocaleDateString()}.`;
            await currentAdmission.save();
        }

        res.status(200).json({
            message: type === "NORMAL" 
                ? "Course transferred successfully (Updated existing enrollment)" 
                : "Course transferred successfully (Created new normal enrollment from board)",
            admission: savedAdmission
        });

    } catch (err) {
        console.error("Course transfer error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
