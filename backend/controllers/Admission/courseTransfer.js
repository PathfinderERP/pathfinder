
import Admission from "../../models/Admission/Admission.js";
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

        if (mongoose.Types.ObjectId.isValid(query)) {
            const admissionByStudentId = await Admission.find({ student: query })
                .populate("student", "studentsDetails mobileNum email")
                .populate("course", "courseName feesStructure")
                .populate("department")
                .populate("class")
                .populate("examTag");

            if (admissionByStudentId.length > 0) {
                return res.status(200).json(admissionByStudentId);
            }
        }

        const admissions = await Admission.find({
            $or: [
                { admissionNumber: { $regex: query, $options: "i" } },
            ]
        })
            .populate("student", "studentsDetails mobileNum email")
            .populate("course", "courseName feesStructure")
            .populate("department")
            .populate("class")
            .populate("examTag");

        // If we want to search by student name, it's slightly more complex with populate, 
        // so let's first try finding students matching the name
        const students = await Student.find({
            "studentsDetails.0.studentName": { $regex: query, $options: "i" }
        });

        const studentIds = students.map(s => s._id);

        const admissionsByStudent = await Admission.find({
            student: { $in: studentIds }
        })
            .populate("student")
            .populate("course")
            .populate("department")
            .populate("class")
            .populate("examTag");

        // Merge and deduplicate
        const allAdmissions = [...admissions, ...admissionsByStudent];
        const uniqueAdmissions = Array.from(new Set(allAdmissions.map(a => a._id.toString())))
            .map(id => allAdmissions.find(a => a._id.toString() === id));

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

        // 1. Get the current admission details
        const currentAdmission = await Admission.findById(admissionId).populate('course');
        if (!currentAdmission) {
            return res.status(404).json({ message: "Original admission not found" });
        }

        // 2. Fetch new course details
        const newCourse = await Course.findById(newCourseId);
        if (!newCourse) {
            return res.status(404).json({ message: "New course not found" });
        }

        // 3. Calculate new fees
        const baseFees = newCourse.feesStructure.reduce((sum, fee) => sum + fee.value, 0);
        const taxableAmount = Math.max(0, baseFees - Number(feeWaiver));

        // Calculate Taxes (18% for now, split 9/9)
        const cgstAmount = Math.round(taxableAmount * 0.09);
        const sgstAmount = Math.round(taxableAmount * 0.09);

        // Calculate total fees for new course
        const totalNewFees = taxableAmount + cgstAmount + sgstAmount;

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
                remarks: i === 0 && creditAmount > 0 ? `Transferred from ${currentAdmission.course.courseName}. Credit: ₹${creditAmount}` : ""
            });
        }

        // 7. Update the Existing Admission Record
        // We overwrite the course, fees, and payment schedule, but keep the ID and Payment History (Paid Amount).

        currentAdmission.course = newCourseId;
        currentAdmission.examTag = newExamTagId;
        currentAdmission.academicSession = newAcademicSession;
        currentAdmission.department = newCourse.department || currentAdmission.department; // Update dept if available

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

        // Update payment status based on new calculations
        currentAdmission.paymentStatus = remainingAmount <= 0 ? "COMPLETED" : "PARTIAL";
        // If remaining is 0, it's completed. If > 0, it's Partial (since they have paid *some* amount effectively via credit).
        // Or should it be PENDING if they paid 0? But credit > 0 means they paid something previously.
        // If creditAmount is 0 and remaining > 0, then it is PENDING or PARTIAL depending on... well, let's stick to PARTIAL/COMPLETED logic or keep existing logic.
        // If creditAmount > 0, they have "Paid" something.

        currentAdmission.remarks = (currentAdmission.remarks || "") + ` | Course Transferred to ${newCourse.courseName} on ${new Date().toLocaleDateString()}.`;

        await currentAdmission.save();

        res.status(200).json({
            message: "Course transferred successfully (Updated existing enrollment)",
            admission: currentAdmission
        });

    } catch (err) {
        console.error("Course transfer error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
