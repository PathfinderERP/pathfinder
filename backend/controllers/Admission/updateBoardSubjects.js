import Admission from "../../models/Admission/Admission.js";
import Board from "../../models/Master_data/Boards.js";
import Payment from "../../models/Payment/Payment.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import { updateCentreTargetAchieved } from "../../services/centreTargetService.js";

// Generate a unique sequential bill ID
const generateBillId = async (centreCode) => {
    try {
        const date = new Date();
        const month = date.getMonth();
        const year = date.getFullYear();

        const currentYear = year;
        const currentMonth = month;

        let startYear, endYear;
        if (currentMonth >= 3) {
            startYear = currentYear;
            endYear = currentYear + 1;
        } else {
            startYear = currentYear - 1;
            endYear = currentYear;
        }

        const yearStr = `${startYear}-${endYear.toString().slice(-2)}`;
        const prefix = `PATH/${centreCode}/${yearStr}/`;

        const lastPayment = await Payment.findOne({
            billId: { $regex: new RegExp(`^${prefix.replace(/\//g, '\\/')}\\d+$`) }
        }).sort({ createdAt: -1 });

        let nextNumber = 1;

        if (lastPayment && lastPayment.billId) {
            const lastId = lastPayment.billId;
            const parts = lastId.split('/');
            const lastSeq = parts[parts.length - 1];

            if (lastSeq && !isNaN(lastSeq)) {
                nextNumber = parseInt(lastSeq) + 1;
            }
        }

        return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
    } catch (error) {
        console.error("Bill ID Gen Error:", error);
        return `PATH/${centreCode || 'GEN'}/${Date.now()}`;
    }
};

export const updateBoardSubjects = async (req, res) => {
    try {
        const { admissionId } = req.params;
        const {
            selectedSubjectIds,
            billingMonth,
            paymentAmount,
            paymentMethod = "CASH",
            transactionId = "",
            accountHolderName = "",
            chequeDate = "",
            receivedDate = ""
        } = req.body;

        // Validate required fields
        if (!selectedSubjectIds || selectedSubjectIds.length === 0 || !billingMonth || !paymentAmount) {
            return res.status(400).json({ message: "Selected subjects, billing month, and payment amount are required" });
        }

        // Fetch the admission
        const admission = await Admission.findById(admissionId).populate('board');
        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        if (admission.admissionType !== "BOARD") {
            return res.status(400).json({ message: "This operation is only for Board admissions" });
        }

        // Fetch Board with populated subjects
        const board = await Board.findById(admission.board._id).populate("subjects.subjectId");
        if (!board) {
            return res.status(404).json({ message: "Board not found" });
        }

        // Validate and calculate fees based on Board's configuration
        const validSelectedSubjects = [];
        for (const subjectId of selectedSubjectIds) {
            const boardSubject = board.subjects.find(s => s.subjectId._id.toString() === subjectId);
            if (boardSubject) {
                validSelectedSubjects.push({
                    _id: boardSubject.subjectId._id,
                    subName: boardSubject.subjectId.subName,
                    price: boardSubject.price || 0
                });
            }
        }

        if (validSelectedSubjects.length !== selectedSubjectIds.length) {
            return res.status(400).json({ message: "One or more subjects not configured for this board" });
        }

        const baseFees = validSelectedSubjects.reduce((sum, sub) => sum + sub.price, 0);
        const selectedSubjectsData = validSelectedSubjects.map(sub => ({
            subject: sub._id,
            name: sub.subName,
            price: sub.price
        }));

        // Update admission with new subjects and billing month
        admission.selectedSubjects = selectedSubjectsData;
        admission.billingMonth = billingMonth;

        // Construct updated course name
        const subNames = validSelectedSubjects.map(s => s.subName).join('+');
        admission.boardCourseName = `${board.boardCourse} ${admission.academicSession} ${subNames}`;

        await admission.save();

        // Create Payment record for this month
        if (paymentAmount > 0) {
            // Calculate tax breakdown
            const dpBaseAmount = paymentAmount / 1.18;
            const dpCgst = dpBaseAmount * 0.09;
            const dpSgst = dpBaseAmount * 0.09;
            const dpCourseFee = paymentAmount - dpCgst - dpSgst;

            // Fetch Centre Info for Bill ID
            let centreObj = await CentreSchema.findOne({ centreName: admission.centre });
            if (!centreObj) {
                centreObj = await CentreSchema.findOne({ centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') } });
            }
            const centreCode = centreObj ? centreObj.enterCode : 'GEN';

            // Generate bill ID for all payment methods (including Cheque) to allow receipt download
            let newBillId = await generateBillId(centreCode);

            const paymentData = {
                admission: admission._id,
                installmentNumber: 0, // Monthly payment
                amount: paymentAmount,
                paidAmount: paymentAmount,
                dueDate: new Date(),
                paidDate: new Date(),
                receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
                status: (paymentMethod === "CHEQUE") ? "PENDING_CLEARANCE" : "PAID",
                paymentMethod: paymentMethod,
                transactionId: transactionId,
                accountHolderName: accountHolderName,
                chequeDate: chequeDate,
                billingMonth: billingMonth,
                remarks: `Monthly Payment for ${billingMonth}`,
                recordedBy: req.user._id,
                // Bill Details
                cgst: parseFloat(dpCgst.toFixed(2)),
                sgst: parseFloat(dpSgst.toFixed(2)),
                courseFee: parseFloat(dpCourseFee.toFixed(2)),
                totalAmount: parseFloat(Number(paymentAmount).toFixed(2))
            };

            if (newBillId) {
                paymentData.billId = newBillId;
            }

            const payment = new Payment(paymentData);
            await payment.save();

            // Update Centre Target Achieved
            if (paymentAmount > 0 && admission.centre) {
                updateCentreTargetAchieved(admission.centre, new Date());
            }
        }

        const updatedAdmission = await Admission.findById(admission._id)
            .populate('student')
            .populate('board')
            .populate('selectedSubjects.subject')
            .populate('class')
            .populate('createdBy', 'name');

        res.status(200).json({
            message: "Board subjects updated and payment recorded successfully",
            admission: updatedAdmission
        });

    } catch (err) {
        console.error("Update board subjects error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
