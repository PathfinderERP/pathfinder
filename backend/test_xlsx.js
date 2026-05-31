import mongoose from "mongoose";
import dotenv from "dotenv";
import Admission from "./models/Admission/Admission.js";
import * as XLSX from "xlsx";

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const adm = await Admission.findOne({ admissionNumber: "PATH26001453" }).lean();
        
        // Simulating the frontend formatting / mapping
        const student = adm.student; // wait, in backend it is populated, but let's check
        // Let's mock how the backend returns it in installmentController.js
        const mappedAdm = {
            admissionId: adm._id,
            admissionNumber: adm.admissionNumber,
            studentId: adm.student,
            studentName: "Dipa Bijoli", // mock
            email: "dipabijoli@gmail.com", // mock
            mobile: "8981094955", // mock
            course: "PATHFINDER COURSE", // mock
            department: "NEET", // mock
            centre: adm.centre,
            admissionDate: adm.admissionDate,
            totalFees: adm.totalFees,
            totalPaid: adm.totalPaidAmount,
            remainingAmount: adm.remainingAmount,
            paymentStatus: adm.paymentStatus,
            paymentBreakdown: adm.paymentBreakdown
        };

        const flatInstallments = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        mappedAdm.paymentBreakdown.forEach(inst => {
            flatInstallments.push({
                ...inst,
                admissionId: mappedAdm.admissionId,
                admissionNumber: mappedAdm.admissionNumber,
                studentId: mappedAdm.studentId,
                studentName: mappedAdm.studentName,
                email: mappedAdm.email,
                mobile: mappedAdm.mobile,
                course: mappedAdm.course,
                department: mappedAdm.department,
                centre: mappedAdm.centre,
                admissionDate: mappedAdm.admissionDate,
                admissionTotalFees: mappedAdm.totalFees,
                admissionTotalPaid: mappedAdm.totalPaid,
                admissionRemaining: mappedAdm.remainingAmount,
                admissionPaymentStatus: mappedAdm.paymentStatus
            });
        });

        // Now map for Excel
        const dataToExport = flatInstallments.map(inst => {
            const dueDate = new Date(inst.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const isOverdue = (inst.status !== "PAID" && inst.status !== "PENDING_CLEARANCE" && dueDate < today);
            const dueStatus = inst.status === "PAID" ? "PAID" : (isOverdue ? "OVERDUE" : "UPCOMING");

            return {
                "Due Date": new Date(inst.dueDate).toLocaleDateString('en-GB'),
                "Installment #": `Installment ${inst.installmentNumber}`,
                "Amount Due (₹)": inst.amount,
                "Amount Paid (₹)": inst.paidAmount || 0,
                "Inst. Status": inst.status,
                "Due Status": dueStatus,
                "Student Name": inst.studentName,
                "Admission Code": inst.admissionNumber,
                "Course": inst.course,
                "Department": inst.department,
                "Centre": inst.centre,
                "Mobile": inst.mobile,
                "Email": inst.email
            };
        });

        console.log("dataToExport sample for installment 2:");
        console.log(dataToExport[1]);

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log("Sheet rows generated:");
        sheetData.slice(0, 4).forEach((row, i) => {
            console.log(`Row ${i}:`, row);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
