import Admission from "../../models/Admission/Admission.js";
import Student from "../../models/Students.js";
import Payment from "../../models/Payment/Payment.js";
import User from "../../models/User.js";

// Search student by name, email, or admission number
export const searchStudent = async (req, res) => {
    try {
        const { searchTerm } = req.query;

        if (!searchTerm || searchTerm.trim().length < 2) {
            return res.status(400).json({ message: "Search term must be at least 2 characters" });
        }

        // Search in Student collection
        const students = await Student.find({
            status: "Active",
            $or: [
                { "studentsDetails.studentName": { $regex: searchTerm, $options: "i" } },
                { "studentsDetails.studentEmail": { $regex: searchTerm, $options: "i" } }
            ]
        }).limit(10);

        // Also search by admission number in Admission collection
        const admissions = await Admission.find({
            admissionNumber: { $regex: searchTerm, $options: "i" },
            admissionStatus: "ACTIVE"
        })
            .populate("student")
            .populate("course", "courseName")
            .limit(10);

        // Combine results
        const results = [];

        // Add from students
        students.forEach(student => {
            if (student.studentsDetails && student.studentsDetails[0]) {
                results.push({
                    studentId: student._id,
                    studentName: student.studentsDetails[0].studentName,
                    email: student.studentsDetails[0].studentEmail,
                    mobile: student.studentsDetails[0].mobileNum,
                    type: "student"
                });
            }
        });

        // Add from admissions
        admissions.forEach(admission => {
            if (admission.student && admission.student.studentsDetails && admission.student.studentsDetails[0]) {
                results.push({
                    studentId: admission.student._id,
                    admissionId: admission._id,
                    admissionNumber: admission.admissionNumber,
                    studentName: admission.student.studentsDetails[0].studentName,
                    email: admission.student.studentsDetails[0].studentEmail,
                    mobile: admission.student.studentsDetails[0].mobileNum,
                    course: admission.course?.courseName,
                    type: "admission"
                });
            }
        });

        res.status(200).json(results);
    } catch (error) {
        console.error("Search Student Error:", error);
        res.status(500).json({ message: "Error searching students", error: error.message });
    }
};

// Get complete financial details for a student
export const getStudentFinancialDetails = async (req, res) => {
    try {
        const { studentId } = req.params;

        // Get all admissions for this student
        const admissions = await Admission.find({ student: studentId })
            .populate("student")
            .populate("course", "courseName duration")
            .populate("class", "className")
            .populate("examTag", "examTagName")
            .populate("createdBy", "name")
            .sort({ createdAt: -1 });

        if (!admissions || admissions.length === 0) {
            return res.status(404).json({ message: "No active admissions found for this student" });
        }

        // Check if student is deactivated
        if (admissions[0].student && admissions[0].student.status === 'Deactivated') {
            return res.status(400).json({ message: "This student is deactivated. Financial details are restricted." });
        }

        // Get all payments for these admissions
        const admissionIds = admissions.map(adm => adm._id);
        const payments = await Payment.find({ admission: { $in: admissionIds } })
            .populate("admission")
            .populate("recordedBy", "name")
            .sort({ createdAt: -1 });

        // Format the response with safe navigation
        const firstAdmission = admissions[0];
        const studentData = firstAdmission.student;

        // Check if student data exists
        if (!studentData || !studentData.studentsDetails || !studentData.studentsDetails[0]) {
            return res.status(404).json({ message: "Student details not found" });
        }

        const studentInfo = studentData.studentsDetails[0];

        const financialData = {
            studentInfo: {
                studentId: studentData._id,
                name: studentInfo.studentName || "N/A",
                email: studentInfo.studentEmail || "N/A",
                mobile: studentInfo.mobileNum || "N/A",
                whatsapp: studentInfo.whatsappNumber || "N/A",
                centre: studentInfo.centre || "N/A",
                address: studentInfo.address || "N/A"
            },
            admissions: admissions.map(admission => {
                // Get payments for this admission
                const admissionPayments = payments.filter(p =>
                    p.admission && p.admission._id.toString() === admission._id.toString()
                );

                return {
                    admissionId: admission._id,
                    admissionNumber: admission.admissionNumber || "N/A",
                    admissionDate: admission.admissionDate,
                    course: admission.course?.courseName || "N/A",
                    class: admission.class?.className || "N/A",
                    examTag: admission.examTag?.examTagName || "N/A",
                    academicSession: admission.academicSession || "N/A",
                    centre: admission.centre || "N/A",

                    // Fee Details
                    baseFees: admission.baseFees || 0,
                    discountAmount: admission.discountAmount || 0,
                    cgstAmount: admission.cgstAmount || 0,
                    sgstAmount: admission.sgstAmount || 0,
                    totalFees: admission.totalFees || 0,
                    downPayment: admission.downPayment || 0,
                    downPaymentStatus: admission.downPaymentStatus || "PAID",
                    remainingAmount: admission.remainingAmount || 0,
                    totalPaidAmount: admission.totalPaidAmount || 0,
                    admittedBy: admission.createdBy?.name || "N/A",

                    // Installment Info
                    numberOfInstallments: admission.numberOfInstallments || 0,
                    installmentAmount: admission.installmentAmount || 0,
                    paymentStatus: admission.paymentStatus || "PENDING",
                    admissionStatus: admission.admissionStatus || "ACTIVE",

                    // Payment Breakdown from Admission
                    paymentBreakdown: admission.paymentBreakdown || [],

                    // Actual Payment Records
                    paymentHistory: admissionPayments.map(payment => ({
                        paymentId: payment._id,
                        installmentNumber: payment.installmentNumber || 0,
                        amount: payment.amount || 0,
                        paidAmount: payment.paidAmount || 0,
                        dueDate: payment.dueDate,
                        paidDate: payment.paidDate,
                        status: payment.status || "PENDING",
                        paymentMethod: payment.paymentMethod || "N/A",
                        transactionId: payment.transactionId || null,
                        accountHolderName: payment.accountHolderName || null,
                        chequeDate: payment.chequeDate,
                        remarks: payment.remarks || null,
                        billId: payment.billId || null,
                        recordedBy: payment.recordedBy?.name || "N/A",
                        createdAt: payment.createdAt
                    }))
                };
            }),

            // Summary
            summary: {
                totalAdmissions: admissions.length,
                totalFeesAcrossAll: admissions.reduce((sum, adm) => sum + (adm.totalFees || 0), 0),
                totalPaidAcrossAll: admissions.reduce((sum, adm) => sum + (adm.totalPaidAmount || 0), 0),
                totalRemainingAcrossAll: admissions.reduce((sum, adm) => sum + (adm.remainingAmount || 0), 0),
                totalPayments: payments.length
            }
        };

        res.status(200).json(financialData);
    } catch (error) {
        console.error("Get Student Financial Details Error:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({ message: "Error fetching financial details", error: error.message });
    }
};

// Get detailed fee due list with filters
export const getFeeDueList = async (req, res) => {
    try {
        const { centre, course, department, startDate, endDate, searchTerm, minAmount, maxAmount } = req.query;

        // Build filter object
        const filter = {
            admissionStatus: "ACTIVE",
            paymentStatus: { $in: ["PENDING", "PARTIAL"] }
        };

        // Center Visibility Restriction
        if (req.user.role !== "superAdmin" && req.user.role !== "Super Admin") {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentreNames = currentUser ? currentUser.centres.map(c => (c.centreName || "").trim()).filter(Boolean) : [];

            if (centre) {
                const trimmedCentre = (centre || "").trim();
                if (!userCentreNames.includes(trimmedCentre)) {
                    return res.status(403).json({ message: "Access denied to this centre" });
                }
                filter.centre = trimmedCentre;
            } else {
                filter.centre = { $in: userCentreNames };
            }
        } else if (centre) {
            filter.centre = (centre || "").trim();
        }

        if (course) filter.course = course;
        if (department) filter.department = department;

        // Fetch admissions with populated data
        const admissions = await Admission.find(filter)
            .populate("student")
            .populate("course", "courseName")
            .populate("department", "departmentName")
            .sort({ createdAt: -1 });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueList = [];
        let criticalCount = 0;
        let overdueCount = 0;
        let dueTodayCount = 0;

        for (const admission of admissions) {
            const student = admission.student;
            if (!student || !student.studentsDetails || !student.studentsDetails[0]) continue;

            const studentInfo = student.studentsDetails[0];

            // Filter by search term if provided
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const matches = studentInfo.studentName?.toLowerCase().includes(searchLower) ||
                    admission.admissionNumber?.toLowerCase().includes(searchLower) ||
                    studentInfo.studentEmail?.toLowerCase().includes(searchLower);
                if (!matches) continue;
            }

            for (const payment of admission.paymentBreakdown) {
                if (payment.status === "PENDING" || payment.status === "OVERDUE") {
                    const dueDate = new Date(payment.dueDate);
                    dueDate.setHours(0, 0, 0, 0);

                    // Filter by date range if provided
                    if (startDate && dueDate < new Date(startDate)) continue;
                    if (endDate && dueDate > new Date(endDate)) continue;

                    const diffTime = today - dueDate;
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays >= 0) {
                        const monthsOverdue = Math.floor(diffDays / 30);

                        // Categorize
                        if (diffDays >= 7) criticalCount++;
                        else if (diffDays > 0) overdueCount++;
                        else dueTodayCount++;

                        if (minAmount && payment.amount < parseFloat(minAmount)) continue;
                        if (maxAmount && payment.amount > parseFloat(maxAmount)) continue;

                        dueList.push({
                            admissionId: admission._id,
                            admissionNumber: admission.admissionNumber,
                            studentId: student._id,
                            studentName: studentInfo.studentName,
                            phoneNumber: studentInfo.mobileNum,
                            email: studentInfo.studentEmail,
                            course: admission.course?.courseName || "N/A",
                            department: admission.department?.departmentName || "N/A",
                            centre: admission.centre,
                            installmentNumber: payment.installmentNumber,
                            dueDate: payment.dueDate,
                            amount: payment.amount,
                            daysOverdue: diffDays,
                            monthsOverdue: monthsOverdue,
                            status: diffDays === 0 ? "DUE TODAY" : (diffDays >= 7 ? "CRITICAL" : "OVERDUE")
                        });
                    }
                }
            }
        }

        // Sort by days overdue descending
        dueList.sort((a, b) => b.daysOverdue - a.daysOverdue);

        res.status(200).json({
            success: true,
            total: dueList.length,
            stats: {
                critical: criticalCount,
                overdue: overdueCount,
                dueToday: dueTodayCount
            },
            data: dueList
        });
    } catch (error) {
        console.error("Get Fee Due List Error:", error);
        res.status(500).json({ message: "Error fetching fee due list", error: error.message });
    }
};

// Get all admissions with filters
export const getAllAdmissions = async (req, res) => {
    try {
        const { centre, course, department, startDate, endDate, searchTerm, minRemaining, maxRemaining } = req.query;

        const filter = { admissionStatus: "ACTIVE" };

        // Center Visibility Restriction
        if (req.user.role !== "superAdmin" && req.user.role !== "Super Admin") {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentreNames = currentUser ? currentUser.centres.map(c => (c.centreName || "").trim()).filter(Boolean) : [];
            // Normalize centre names for case-insensitive comparison
            const normalizedUserCentres = userCentreNames.map(c => c.toLowerCase());

            if (centre) {
                // Handle both string and array input
                const requestedCentres = Array.isArray(centre) ? centre : [centre];

                // Validate all requested centres are allowed (case-insensitive)
                const isAllowed = requestedCentres.every(c => {
                    const normalizedRequested = (c || "").trim().toLowerCase();
                    return normalizedUserCentres.includes(normalizedRequested);
                });

                if (!isAllowed) {
                    return res.status(403).json({ message: "Access denied to one or more selected centres" });
                }
                // Use case-insensitive regex for MongoDB query - allow surrounding whitespace
                filter.centre = {
                    $in: requestedCentres.map(c => new RegExp(`^\\s*${(c || "").trim()}\\s*$`, 'i'))
                };
            } else {
                // Use case-insensitive regex for MongoDB query - allow surrounding whitespace
                filter.centre = {
                    $in: userCentreNames.map(c => new RegExp(`^\\s*${c}\\s*$`, 'i'))
                };
            }
        } else if (centre) {
            const requestedCentres = Array.isArray(centre) ? centre : [centre];
            // Use case-insensitive regex for MongoDB query - allow surrounding whitespace
            filter.centre = {
                $in: requestedCentres.map(c => new RegExp(`^\\s*${(c || "").trim()}\\s*$`, 'i'))
            };
        }

        if (course) {
            const courses = Array.isArray(course) ? course : [course];
            filter.course = { $in: courses };
        }
        if (department) {
            const departments = Array.isArray(department) ? department : [department];
            filter.department = { $in: departments };
        }

        if (startDate || endDate) {
            const dateFilter = {};
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
            }
            filter["paymentBreakdown.dueDate"] = dateFilter;
        }

        if (minRemaining) filter.remainingAmount = { ...filter.remainingAmount, $gte: parseFloat(minRemaining) };
        if (maxRemaining) filter.remainingAmount = { ...filter.remainingAmount, $lte: parseFloat(maxRemaining) };

        let admissions = await Admission.find(filter)
            .populate("student")
            .populate("course", "courseName")
            .populate("department", "departmentName")
            .sort({ createdAt: -1 });

        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            admissions = admissions.filter(adm => {
                const student = adm.student?.studentsDetails?.[0];
                return (
                    adm.admissionNumber?.toLowerCase().includes(searchLower) ||
                    student?.studentName?.toLowerCase().includes(searchLower) ||
                    student?.studentEmail?.toLowerCase().includes(searchLower) ||
                    student?.mobileNum?.includes(searchTerm)
                );
            });
        }

        const result = admissions.map(adm => {
            const student = adm.student?.studentsDetails?.[0];
            return {
                admissionId: adm._id,
                admissionNumber: adm.admissionNumber,
                studentId: adm.student?._id,
                studentName: student?.studentName || "N/A",
                email: student?.studentEmail || "N/A",
                mobile: student?.mobileNum || "N/A",
                course: adm.course?.courseName || "N/A",
                department: adm.department?.departmentName || "N/A",
                centre: adm.centre || student?.centre || "N/A",
                admissionDate: adm.admissionDate,
                totalFees: adm.totalFees,
                totalPaid: adm.totalPaidAmount,
                remainingAmount: adm.remainingAmount,
                paymentStatus: adm.paymentStatus,
                paymentBreakdown: adm.paymentBreakdown || []
            };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Get All Admissions Error:", error);
        res.status(500).json({ message: "Error fetching admissions", error: error.message });
    }
};
