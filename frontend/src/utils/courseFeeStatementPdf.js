import jsPDF from 'jspdf';
import logo from '../assets/logo-1.svg';

// Format number into Indian currency representation (e.g. 1,50,000)
const fmt = (n) => Math.ceil(Number(n) || 0).toLocaleString('en-IN');

// Format date into DD/MM/YYYY
const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

// Safe string extraction
const safeStr = (val, fallback = "N/A") => {
    if (val === undefined || val === null || val === "") return fallback;
    return String(val).trim();
};

// Convert image/svg to base64 PNG via canvas
const loadLogoBase64 = () => {
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width || 300;
                canvas.height = img.height || 80;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = logo;
        } catch {
            resolve(null);
        }
    });
};

/**
 * Generates and downloads a course-wise fee statement PDF
 * with student info, committed fee, paid amount, pending balance, and installment breakup.
 *
 * @param {Object} admission - The course admission object
 * @param {Object} student - The student profile object
 * @param {string} courseName - Resolved course title
 * @param {Object} currentUser - Current logged-in user
 */
export const downloadCourseFeeStatementPDF = async ({
    admission,
    student,
    courseName,
    currentUser = null
}) => {
    if (!admission) throw new Error("Admission data is required");

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();   // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
    const margin = 14;
    const contentWidth = pageWidth - (2 * margin);        // 182mm

    // Preload logo
    const logoBase64 = await loadLogoBase64();

    // Data points
    const studentDetails = student?.studentsDetails?.[0] || {};
    const studentName = safeStr(studentDetails.studentName || student?.studentName || "STUDENT").toUpperCase();
    const enrollmentNo = safeStr(admission.admissionNumber || student?.uid || "N/A");
    const centre = safeStr(studentDetails.centre || admission.centre || "N/A").toUpperCase();
    const contactNo = safeStr(studentDetails.mobileNum || "N/A");
    const guardianName = safeStr(student?.guardians?.[0]?.guardianName || studentDetails.guardians?.[0]?.guardianName || "N/A").toUpperCase();
    const division = safeStr(admission.admissionType === 'BOARD' ? (admission.board?.boardCourse || 'BOARD') : (admission.department?.departmentName || admission.centre || "N/A")).toUpperCase();
    const cohort = safeStr(admission.academicSession || "N/A");
    const admDate = formatDate(admission.admissionDate || admission.createdAt);
    const resolvedCourse = safeStr(courseName || "COURSE FEE STATEMENT").toUpperCase();

    // Financial numbers
    const committedFee = Math.ceil(Number(admission.totalFees) || 0);
    const totalPaid = Math.ceil(Number(admission.totalPaidAmount) || 0);
    const pendingBalance = Math.max(0, committedFee - totalPaid);
    const downPayment = Math.ceil(Number(admission.downPayment) || 0);
    const paymentStatus = safeStr(admission.paymentStatus || (pendingBalance === 0 ? "COMPLETED" : totalPaid > 0 ? "PARTIAL" : "PENDING")).toUpperCase();
    const admissionStatus = safeStr(admission.admissionStatus || "ACTIVE").toUpperCase();

    // Current date/time
    const now = new Date();
    const generatedOn = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const userRole = currentUser?.name || currentUser?.username || 'Authorized Personnel';

    let yPos = 12;

    // --- 1. HEADER SECTION ---
    // Brand Top Bar
    doc.setFillColor(15, 41, 66); // Dark Navy #0F2942
    doc.rect(margin, yPos, contentWidth, 24, 'F');

    // Accent line at top
    doc.setFillColor(6, 182, 212); // Cyan #06B6D4
    doc.rect(margin, yPos, contentWidth, 1.5, 'F');

    // Logo (if available) or fallback typography
    if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'PNG', margin + 4, yPos + 4, 30, 9);
        } catch {
            // fallback
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text("PATHFINDER", margin + 5, yPos + 10);
        }
    } else {
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text("PATHFINDER", margin + 5, yPos + 10);
    }

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("PATHFINDER EDUCATIONAL CENTRE LLP", margin + 38, yPos + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(6, 182, 212); // Cyan
    doc.text("OFFICIAL COURSE FEE STATEMENT & INSTALLMENT BREAKUP", margin + 38, yPos + 15);

    // Right-side reference & timestamp in header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`DOC REF: ${enrollmentNo}`, margin + contentWidth - 4, yPos + 8, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(203, 213, 225); // Slate 300
    doc.text(`Issued: ${generatedOn}`, margin + contentWidth - 4, yPos + 13, { align: 'right' });

    // Payment Status badge in header
    const badgeColor = paymentStatus === 'COMPLETED' ? [34, 197, 94] : paymentStatus === 'PARTIAL' ? [234, 179, 8] : [239, 68, 68];
    doc.setFillColor(...badgeColor);
    doc.roundedRect(margin + contentWidth - 36, yPos + 16, 32, 5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(paymentStatus, margin + contentWidth - 20, yPos + 19.5, { align: 'center' });

    yPos += 28;

    // --- 2. COURSE TITLE BAR ---
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.roundedRect(margin, yPos, contentWidth, 8, 1, 1, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, yPos, contentWidth, 8, 1, 1, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 41, 66);
    doc.text(`COURSE: ${resolvedCourse}`, margin + 4, yPos + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`STATUS: ${admissionStatus}`, margin + contentWidth - 4, yPos + 5.5, { align: 'right' });

    yPos += 11;

    // --- 3. STUDENT & COURSE DETAILS CARD (2 COLUMNS) ---
    const infoBoxHeight = 32;
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.roundedRect(margin, yPos, contentWidth, infoBoxHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, yPos, contentWidth, infoBoxHeight, 1.5, 1.5, 'S');

    // Divider line between left and right column
    const colMidX = margin + (contentWidth / 2);
    doc.setDrawColor(226, 232, 240);
    doc.line(colMidX, yPos + 3, colMidX, yPos + infoBoxHeight - 3);

    // Left Column
    const leftX = margin + 4;
    let rowY = yPos + 6;

    const drawMetaField = (x, y, label, value, highlightValue = false) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text(label, x, y);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        if (highlightValue) {
            doc.setTextColor(14, 116, 144); // Cyan 700
        } else {
            doc.setTextColor(15, 23, 42); // Slate 900
        }
        doc.text(value, x + 34, y);
    };

    drawMetaField(leftX, rowY, "Student Name:", studentName);
    rowY += 6.5;
    drawMetaField(leftX, rowY, "Enrollment No:", enrollmentNo, true);
    rowY += 6.5;
    drawMetaField(leftX, rowY, "Guardian / Parent:", guardianName);
    rowY += 6.5;
    drawMetaField(leftX, rowY, "Contact Number:", contactNo);

    // Right Column
    const rightX = colMidX + 4;
    rowY = yPos + 6;

    drawMetaField(rightX, rowY, "Centre / Branch:", centre);
    rowY += 6.5;
    drawMetaField(rightX, rowY, "Division / Dept:", division);
    rowY += 6.5;
    drawMetaField(rightX, rowY, "Academic Cohort:", cohort);
    rowY += 6.5;
    drawMetaField(rightX, rowY, "Admission Date:", admDate);

    yPos += infoBoxHeight + 5;

    // --- 4. FINANCIAL SUMMARY CARDS (4 KPI CARDS) ---
    const cardGap = 3.5;
    const cardWidth = (contentWidth - (cardGap * 3)) / 4; // ~42.8mm
    const cardHeight = 16;

    const drawKpiCard = (x, y, title, value, bgColor, strokeColor, valColor) => {
        doc.setFillColor(...bgColor);
        doc.roundedRect(x, y, cardWidth, cardHeight, 1.2, 1.2, 'F');
        doc.setDrawColor(...strokeColor);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, cardWidth, cardHeight, 1.2, 1.2, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(title, x + 3, y + 4.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...valColor);
        doc.text(value, x + 3, y + 11.5);
    };

    // 1. Total Committed Fee
    drawKpiCard(
        margin,
        yPos,
        "TOTAL COMMITTED FEE",
        `Rs. ${fmt(committedFee)}`,
        [236, 254, 255], // Cyan 50
        [165, 243, 252], // Cyan 200
        [14, 116, 144]   // Cyan 700
    );

    // 2. Total Paid
    drawKpiCard(
        margin + cardWidth + cardGap,
        yPos,
        "TOTAL PAID AMOUNT",
        `Rs. ${fmt(totalPaid)}`,
        [240, 253, 244], // Green 50
        [187, 247, 208], // Green 200
        [21, 128, 61]    // Green 700
    );

    // 3. Pending Balance
    const pendBg = pendingBalance === 0 ? [248, 250, 252] : [254, 242, 242];
    const pendBorder = pendingBalance === 0 ? [226, 232, 240] : [254, 202, 202];
    const pendText = pendingBalance === 0 ? [71, 85, 105] : [185, 28, 28];
    drawKpiCard(
        margin + (cardWidth + cardGap) * 2,
        yPos,
        "PENDING BALANCE",
        `Rs. ${fmt(pendingBalance)}`,
        pendBg,
        pendBorder,
        pendText
    );

    // 4. Down Payment
    drawKpiCard(
        margin + (cardWidth + cardGap) * 3,
        yPos,
        "DOWN PAYMENT",
        `Rs. ${fmt(downPayment)}`,
        [248, 250, 252], // Slate 50
        [226, 232, 240], // Slate 200
        [30, 41, 59]     // Slate 800
    );

    yPos += cardHeight + 7;

    // --- 5. INSTALLMENT-WISE BREAKUP TABLE ---
    // Section Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 41, 66);
    doc.text("PAYMENT SCHEDULE & INSTALLMENT BREAKUP", margin + 3.5, yPos + 3);

    // Small cyan indicator square
    doc.setFillColor(6, 182, 212);
    doc.rect(margin, yPos, 2, 4, 'F');

    yPos += 6;

    // Table Column Definitions
    const cols = [
        { key: 'inst', label: 'INST #', width: 14, align: 'center' },
        { key: 'dueDate', label: 'DUE DATE', width: 24, align: 'center' },
        { key: 'baseFee', label: 'BASE FEE', width: 23, align: 'right' },
        { key: 'variance', label: 'VARIANCE', width: 25, align: 'center' },
        { key: 'amount', label: 'PAYABLE', width: 25, align: 'right' },
        { key: 'liquidated', label: 'LIQUIDATED', width: 25, align: 'right' },
        { key: 'vector', label: 'VECTOR', width: 24, align: 'center' },
        { key: 'status', label: 'STATUS', width: 22, align: 'center' }
    ];

    const drawTableHeader = (currentY) => {
        doc.setFillColor(15, 41, 66); // Dark Navy #0F2942
        doc.rect(margin, currentY, contentWidth, 7, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);

        let curX = margin;
        cols.forEach(col => {
            const textX = col.align === 'center'
                ? curX + (col.width / 2)
                : col.align === 'right'
                    ? curX + col.width - 2
                    : curX + 2;
            doc.text(col.label, textX, currentY + 4.8, { align: col.align });
            curX += col.width;
        });

        return currentY + 7;
    };

    yPos = drawTableHeader(yPos);

    // Build row data
    const tableRows = [];

    // 1. If Down Payment exists, record as #0
    if (downPayment > 0) {
        tableRows.push({
            inst: 'DOWN PMT',
            dueDate: admDate,
            baseFee: `Rs. ${fmt(downPayment)}`,
            variance: '-',
            amount: `Rs. ${fmt(downPayment)}`,
            liquidated: `Rs. ${fmt(downPayment)}`,
            vector: safeStr(admission.paymentMethod || "PAID"),
            status: safeStr(admission.downPaymentStatus || "PAID"),
            isPaid: true
        });
    }

    // 2. Regular Installments from paymentBreakdown
    const baseInstallmentAmount = admission.installmentAmount ||
        (admission.numberOfInstallments > 0 ? Math.ceil((committedFee - downPayment) / admission.numberOfInstallments) : 0);

    const breakdown = admission.paymentBreakdown || [];
    if (breakdown.length > 0) {
        breakdown.forEach((payment) => {
            const remarks = payment.remarks || "";
            const arrearsMatch = remarks.match(/Includes ₹?([\d,]+) arrears/i);
            const creditMatch = remarks.match(/Credit of ₹?([\d,]+)/i);

            let varianceText = "-";
            if (arrearsMatch) {
                varianceText = `+Rs. ${fmt(arrearsMatch[1].replace(/,/g, ''))}`;
            } else if (creditMatch) {
                varianceText = `-Rs. ${fmt(creditMatch[1].replace(/,/g, ''))}`;
            }

            const pStatus = safeStr(payment.status || "PENDING").toUpperCase();
            const isRowPaid = ["PAID", "COMPLETED"].includes(pStatus);

            tableRows.push({
                inst: `#${payment.installmentNumber || 1}`,
                dueDate: formatDate(payment.dueDate),
                baseFee: `Rs. ${fmt(baseInstallmentAmount || payment.amount)}`,
                variance: varianceText,
                amount: `Rs. ${fmt(payment.amount)}`,
                liquidated: `Rs. ${fmt(payment.paidAmount || 0)}`,
                vector: safeStr(payment.paymentMethod || "UNSET").toUpperCase(),
                status: pStatus === "PENDING_CLEARANCE" ? "IN PROCESS" : pStatus,
                isPaid: isRowPaid
            });
        });
    } else if (admission.admissionType === 'BOARD' && admission.monthlySubjectHistory?.length > 0) {
        // Board monthly cycles
        admission.monthlySubjectHistory.forEach((hist, hIdx) => {
            const hStatus = safeStr(hist.status || (hist.isPaid ? "PAID" : "PENDING")).toUpperCase();
            tableRows.push({
                inst: `M-${hIdx + 1}`,
                dueDate: safeStr(hist.month),
                baseFee: `Rs. ${fmt(hist.totalAmount)}`,
                variance: `${hist.subjects?.length || 0} Subs`,
                amount: `Rs. ${fmt(hist.totalAmount)}`,
                liquidated: hist.isPaid ? `Rs. ${fmt(hist.totalAmount)}` : `Rs. 0`,
                vector: "BOARD",
                status: hStatus,
                isPaid: Boolean(hist.isPaid)
            });
        });
    } else if (tableRows.length === 0) {
        // Single payment record if no breakdown defined
        tableRows.push({
            inst: '#1',
            dueDate: admDate,
            baseFee: `Rs. ${fmt(committedFee)}`,
            variance: '-',
            amount: `Rs. ${fmt(committedFee)}`,
            liquidated: `Rs. ${fmt(totalPaid)}`,
            vector: safeStr(admission.paymentMethod || "UNSET"),
            status: paymentStatus,
            isPaid: paymentStatus === 'COMPLETED'
        });
    }

    // Render Table Rows
    const rowHeight = 6.2;
    tableRows.forEach((row, idx) => {
        // Page break if near bottom
        if (yPos + rowHeight > pageHeight - 32) {
            doc.addPage();
            yPos = margin + 5;
            yPos = drawTableHeader(yPos);
        }

        // Alternating zebra striping
        if (idx % 2 === 0) {
            doc.setFillColor(255, 255, 255);
        } else {
            doc.setFillColor(248, 250, 252); // Slate 50
        }
        doc.rect(margin, yPos, contentWidth, rowHeight, 'F');

        // Bottom border line
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.15);
        doc.line(margin, yPos + rowHeight, margin + contentWidth, yPos + rowHeight);

        doc.setFontSize(7);
        let curX = margin;

        cols.forEach(col => {
            const cellVal = row[col.key] || "";
            const textX = col.align === 'center'
                ? curX + (col.width / 2)
                : col.align === 'right'
                    ? curX + col.width - 2
                    : curX + 2;

            if (col.key === 'status') {
                doc.setFont('helvetica', 'bold');
                if (row.isPaid) {
                    doc.setTextColor(22, 163, 74); // Green 600
                } else if (cellVal === 'IN PROCESS') {
                    doc.setTextColor(2, 132, 199); // Sky 600
                } else {
                    doc.setTextColor(202, 138, 4); // Yellow 600
                }
            } else if (col.key === 'liquidated' && row.isPaid) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(22, 163, 74);
            } else if (col.key === 'inst') {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
            } else {
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(51, 65, 85);
            }

            doc.text(String(cellVal), textX, yPos + 4.2, { align: col.align });
            curX += col.width;
        });

        yPos += rowHeight;
    });

    // Table Summary Row
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.rect(margin, yPos, contentWidth, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(margin, yPos, contentWidth, 7, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("TOTAL AGGREGATE", margin + 4, yPos + 4.8);

    // Total Payable
    const payableColX = margin + cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width - 2;
    doc.text(`Rs. ${fmt(committedFee)}`, payableColX, yPos + 4.8, { align: 'right' });

    // Total Paid
    const paidColX = payableColX + cols[5].width;
    doc.setTextColor(22, 163, 74);
    doc.text(`Rs. ${fmt(totalPaid)}`, paidColX, yPos + 4.8, { align: 'right' });

    // Net Balance on status
    const balColX = margin + contentWidth - 2;
    doc.setTextColor(pendingBalance === 0 ? 22 : 185, pendingBalance === 0 ? 163 : 28, pendingBalance === 0 ? 74 : 28);
    doc.text(pendingBalance === 0 ? "PAID FULL" : `BAL: Rs. ${fmt(pendingBalance)}`, balColX, yPos + 4.8, { align: 'right' });

    yPos += 13;

    // --- 6. TERMS & VERIFICATION NOTES ---
    if (yPos > pageHeight - 38) {
        doc.addPage();
        yPos = margin + 5;
    }

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, contentWidth, 20, 1, 1, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, yPos, contentWidth, 20, 1, 1, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("OFFICIAL STATUTORY & PAYMENT TERMS:", margin + 3.5, yPos + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("1. This document serves as the authentic course fee schedule and installment ledger for the enrolled programme.", margin + 3.5, yPos + 8.5);
    doc.text("2. Payments must be cleared on or before the due date. Receipts are generated upon successful clearance of installments.", margin + 3.5, yPos + 12);
    doc.text("3. This is an official computer-generated document issued by Pathfinder Educational Centre LLP. No physical signature is required.", margin + 3.5, yPos + 15.5);

    yPos += 24;

    // --- 7. FOOTER SECTION ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`System Generated on ${generatedOn} | Authorized by: ${userRole}`, margin, pageHeight - 7);
    doc.text("Pathfinder ERP - Student Enrollment Registry", margin + contentWidth, pageHeight - 7, { align: 'right' });

    // Download / Save PDF
    const cleanStudentName = studentName.replace(/[^A-Za-z0-9]/g, '_').substring(0, 25);
    const cleanEnroll = enrollmentNo.replace(/[^A-Za-z0-9]/g, '_');
    const fileName = `Fee_Statement_${cleanEnroll}_${cleanStudentName}.pdf`;

    doc.save(fileName);
    return fileName;
};
