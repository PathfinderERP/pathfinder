import React, { useState, useEffect } from 'react';
import { FaFileInvoice, FaDownload, FaPrint, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import logo from '../../assets/logo-1.svg';

const BillGenerator = ({ admission, installment, onClose }) => {
    const [generating, setGenerating] = useState(false);
    const [billData, setBillData] = useState(null);
    const [logoBase64, setLogoBase64] = useState(null);
    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        // Preload logo and convert to PNG base64 for jsPDF
        const loadLogo = async () => {
            try {
                const img = new Image();
                img.src = logo;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    setLogoBase64(canvas.toDataURL('image/png'));
                };
            } catch (error) {
                console.error("Error loading logo:", error);
            }
        };
        loadLogo();
    }, []);

    const generateBill = async () => {
        if (!admission || !installment) {
            toast.error('Missing admission or installment data');
            return;
        }

        setGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const billingMonthParam = installment.billingMonth ? `?billingMonth=${installment.billingMonth}` : '';
            const response = await fetch(
                `${apiUrl}/payment/generate-bill/${admission._id}/${installment.installmentNumber}${billingMonthParam}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = await response.json();

            if (data.success) {
                setBillData(data.data);
                toast.success('Bill generated successfully!');
            } else {
                toast.error(data.message || 'Failed to generate bill');
            }
        } catch (error) {
            console.error('Error generating bill:', error);
            toast.error('Error generating bill');
        } finally {
            setGenerating(false);
        }
    };

    const numberToWords = (num) => {
        if (!num) return "Zero Only";

        const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
        const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
        const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

        const convertLessThanOneThousand = (n) => {
            if (n === 0) return "";
            if (n < 10) return units[n];
            if (n < 20) return teens[n - 10];
            if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + units[n % 10] : "");
            return units[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertLessThanOneThousand(n % 100) : "");
        };

        let str = "";
        let n = Math.floor(num);

        if (n >= 10000000) {
            str += convertLessThanOneThousand(Math.floor(n / 10000000)) + " Crore ";
            n %= 10000000;
        }
        if (n >= 100000) {
            str += convertLessThanOneThousand(Math.floor(n / 100000)) + " Lakh ";
            n %= 100000;
        }
        if (n >= 1000) {
            str += convertLessThanOneThousand(Math.floor(n / 1000)) + " Thousand ";
            n %= 1000;
        }
        str += convertLessThanOneThousand(n);

        return str.trim() + " Only";
    };

    const createPDFDoc = () => {
        const doc = new jsPDF();

        const drawBillPage = (copyType) => {
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 10;
            let midPoint = pageWidth / 2;

            // Helper to safe string
            const safeStr = (val) => (val !== undefined && val !== null) ? String(val) : '';

            // Get logged-in user info from localStorage
            const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
            const createdByName = userInfo.name || userInfo.username || 'N/A';

            // --- Header Section ---
            let yPos = 15;

            // Logo - Top Left
            if (logoBase64) {
                try {
                    doc.addImage(logoBase64, 'PNG', margin, 5, 40, 12);
                } catch (e) {
                    console.warn("Could not add logo", e);
                }
            }

            // Center Title
            doc.setFontSize(16); // Increased slightly
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text('PATHFINDER', pageWidth / 2, yPos, { align: 'center' });

            // Right Side Header (Status)
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(copyType, pageWidth - margin, yPos, { align: 'right' });

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 255); // Blue
            doc.setFont('helvetica', 'bold');
            // Check status for "RECEIVED" vs "IN PROCESS"
            const statusLabel = (billData.payment?.status === "PENDING_CLEARANCE") ? "IN PROCESS" : "RECEIVED";
            doc.text(statusLabel, pageWidth - margin, yPos + 6, { align: 'right' });

            // Centre Address (instead of name)
            // Move address down to clear the "RECEIVED" text
            yPos += 15;

            doc.setTextColor(0, 0, 0); // Reset to black
            doc.setFontSize(10);

            let address = safeStr(billData.centre?.address || billData.centre?.name);
            // Fix literal \n to actual newlines
            address = address.replace(/\\n/g, '\n');

            const splitAddress = doc.splitTextToSize(address, pageWidth - 4 * margin); // tighter margins for address
            doc.text(splitAddress, pageWidth / 2, yPos, { align: 'center' });
            yPos += (splitAddress.length * 5); // spacing based on lines

            // Address below title - Dynamic from centre data
            // doc.setFontSize(8);
            // doc.setFont('helvetica', 'normal');
            // const centreAddress = billData.centre?.address || '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026';
            // const centrePhone = billData.centre?.phoneNumber || '033 2455-1840 / 2454-4817 / 4668';
            // doc.text(centreAddress, pageWidth / 2, yPos + 5, { align: 'center' });
            // doc.text(`Ph.: ${centrePhone}`, pageWidth / 2, yPos + 9, { align: 'center' });

            yPos += 5;

            // --- Main Content Box (Grid) ---
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.setTextColor(0, 0, 0);

            const rowHeight = 8;

            // Helper to draw a row with a label and value
            const drawRow = (y, label, value, isFullWidth = true, splitX = null) => {
                if (isFullWidth) {
                    doc.rect(margin, y, pageWidth - 2 * margin, rowHeight);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    doc.text(label, margin + 2, y + 5.5);
                    if (value) {
                        doc.setFont('helvetica', 'bold');
                        doc.text(value, margin + 2 + doc.getTextWidth(label) + 2, y + 5.5);
                    }
                } else {
                    // Split row
                    const midX = splitX || pageWidth / 2;

                    // Left side
                    doc.rect(margin, y, midX - margin, rowHeight);
                    doc.setFont('helvetica', 'normal');
                    doc.text(label, margin + 2, y + 5.5);
                    if (value) {
                        doc.setFont('helvetica', 'bold');
                        doc.text(value, margin + 2 + doc.getTextWidth(label) + 2, y + 5.5);
                    }
                }
            };

            // 1. GSTN
            doc.rect(margin, yPos, pageWidth - 2 * margin, rowHeight);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('GSTN:', margin + 2, yPos + 5.5);

            // Use Centre GST if available, otherwise use Bill generated GST
            const gstToDisplay = (billData.centre?.gstNumber && billData.centre?.gstNumber !== 'N/A')
                ? billData.centre.gstNumber
                : billData.gstNumber;

            doc.text(safeStr(gstToDisplay), margin + 15, yPos + 5.5);
            yPos += rowHeight;

            // 2. MONEY RECEIPT Title
            doc.rect(margin, yPos, pageWidth - 2 * margin, rowHeight);
            doc.setFont('helvetica', 'bold');
            doc.text('MONEY RECEIPT', pageWidth / 2, yPos + 5.5, { align: 'center' });
            yPos += rowHeight;

            // 3. Branch | Received Date
            midPoint = pageWidth / 2;
            doc.rect(margin, yPos, midPoint - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('Branch :', margin + 2, yPos + 5.5);
            doc.setFont('helvetica', 'bold');
            doc.text(safeStr(billData.centre?.name), margin + 18, yPos + 5.5);

            // Right: Received Date
            doc.rect(midPoint, yPos, midPoint - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('RECEIVED:', midPoint + 2, yPos + 5.5);
            doc.setFont('helvetica', 'bold');
            const receivedDateMatch = billData.payment?.receivedDate || installment?.receivedDate;
            const receivedDateStr = receivedDateMatch ? new Date(receivedDateMatch).toLocaleDateString('en-IN') : 'N/A';
            doc.text(receivedDateStr, midPoint + 25, yPos + 5.5);
            yPos += rowHeight;

            // 4. Receipt No. | Date
            midPoint = pageWidth / 2;
            // Left: Receipt No
            doc.rect(margin, yPos, midPoint - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('Receipt No.:', margin + 2, yPos + 5.5);
            doc.setFont('helvetica', 'bold');
            doc.text(safeStr(billData.billId), margin + 25, yPos + 5.5);

            // Right: Date
            doc.rect(midPoint, yPos, midPoint - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('Date:', midPoint + 2, yPos + 5.5);
            doc.setFont('helvetica', 'bold');
            doc.text(new Date(billData.billDate).toLocaleDateString('en-IN'), midPoint + 15, yPos + 5.5);
            yPos += rowHeight;

            // 5. Student Name | Student ID
            // Left: Name
            doc.rect(margin, yPos, midPoint - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('Student Name:', margin + 2, yPos + 5.5);
            doc.setFont('helvetica', 'bold');
            doc.text(safeStr(billData.student?.name), margin + 28, yPos + 5.5);

            // Right: ID
            doc.rect(midPoint, yPos, midPoint - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('Admission No:', midPoint + 2, yPos + 5.5);
            doc.setFont('helvetica', 'bold');
            doc.text(safeStr(billData.student?.admissionNumber), midPoint + 26, yPos + 5.5);
            yPos += rowHeight;

            // 6. Contact No. | Session
            // Left: Contact
            doc.rect(margin, yPos, midPoint - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('Contact No.:', margin + 2, yPos + 5.5);
            doc.setFont('helvetica', 'bold');
            doc.text(safeStr(billData.student?.phoneNumber), margin + 25, yPos + 5.5);

            // Right: Session
            doc.rect(midPoint, yPos, midPoint - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('Session:', midPoint + 2, yPos + 5.5);
            doc.setFont('helvetica', 'bold');
            doc.text(safeStr(billData.course?.session || 'N/A'), midPoint + 18, yPos + 5.5);
            yPos += rowHeight;

            // 7. Course
            drawRow(yPos, 'Course:', safeStr(billData.course?.name));
            yPos += rowHeight;

            // 8. Fee Table Header
            const tableWidth = pageWidth - 2 * margin;
            const colWidth = tableWidth / 4;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);

            // Net Fees
            doc.rect(margin, yPos, colWidth, rowHeight);
            doc.text('Net Fees', margin + colWidth / 2, yPos + 5.5, { align: 'center' });

            // SGST
            doc.rect(margin + colWidth, yPos, colWidth, rowHeight);
            doc.text('SGST', margin + colWidth + colWidth / 2, yPos + 5.5, { align: 'center' });

            // CGST
            doc.rect(margin + 2 * colWidth, yPos, colWidth, rowHeight);
            doc.text('CGST', margin + 2 * colWidth + colWidth / 2, yPos + 5.5, { align: 'center' });

            // Amount Rs.
            doc.rect(margin + 3 * colWidth, yPos, colWidth, rowHeight);
            doc.text('Amount Rs.', margin + 3 * colWidth + colWidth / 2, yPos + 5.5, { align: 'center' });
            yPos += rowHeight;

            // 9. Fee Table Values
            const valueBoxHeight = 30;
            doc.setFont('helvetica', 'normal');

            // Col 1
            doc.rect(margin, yPos, colWidth, valueBoxHeight);
            doc.text('Rs. ' + (billData.amounts?.courseFee || 0).toFixed(2), margin + colWidth / 2, yPos + 12, { align: 'center' });

            // Col 2
            doc.rect(margin + colWidth, yPos, colWidth, valueBoxHeight);
            doc.text('Rs. ' + (billData.amounts?.sgst || 0).toFixed(2), margin + colWidth + colWidth / 2, yPos + 12, { align: 'center' });

            // Col 3
            doc.rect(margin + 2 * colWidth, yPos, colWidth, valueBoxHeight);
            doc.text('Rs. ' + (billData.amounts?.cgst || 0).toFixed(2), margin + 2 * colWidth + colWidth / 2, yPos + 12, { align: 'center' });

            // Col 4
            doc.rect(margin + 3 * colWidth, yPos, colWidth, valueBoxHeight);
            doc.text('Rs. ' + (billData.amounts?.totalAmount || 0).toFixed(2), margin + 3 * colWidth + colWidth / 2, yPos + 12, { align: 'center' });

            yPos += valueBoxHeight;

            // 10. Total Amount (in words)
            doc.rect(margin, yPos, tableWidth, rowHeight);
            doc.setFont('helvetica', 'bold');
            doc.text('Total Amount (in words):', margin + 2, yPos + 5.5);

            // Add Amount in Words
            doc.setFont('helvetica', 'normal');
            const amountInWords = numberToWords(billData.amounts?.totalAmount || 0);
            doc.text(amountInWords, margin + 50, yPos + 5.5);

            yPos += rowHeight;

            // 11. Mode of Payment | Transaction ID
            // Left: Mode
            doc.rect(margin, yPos, midPoint - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('Mode of Paymnt:', margin + 2, yPos + 5.5);
            doc.setFont('helvetica', 'bold');
            doc.text(safeStr(billData.payment?.paymentMethod), margin + 35, yPos + 5.5);

            // Right: Transaction ID
            doc.rect(midPoint, yPos, midPoint - margin, rowHeight);
            doc.setFont('helvetica', 'normal');

            const paymentMethod = safeStr(billData.payment?.paymentMethod).toUpperCase();
            const isCash = paymentMethod === 'CASH';

            doc.text('Transaction ID:', midPoint + 2, yPos + 5.5);
            doc.setFont('helvetica', 'bold');

            if (isCash) {
                // For Cash payments, show "/cash"
                doc.text('/cash', midPoint + 35, yPos + 5.5);
            } else {
                // For other payment methods, show actual transaction ID
                doc.text(safeStr(billData.payment?.transactionId), midPoint + 35, yPos + 5.5);
            }


            yPos += rowHeight;

            // 11b. Cheque/Bank Details (Conditional)
            if (['CHEQUE', 'BANK_TRANSFER'].includes(paymentMethod)) {
                // Left: Payer Name
                doc.rect(margin, yPos, midPoint - margin, rowHeight);
                doc.setFont('helvetica', 'normal');
                doc.text(paymentMethod === 'CHEQUE' ? 'Chq Name:' : 'Payer:', margin + 2, yPos + 5.5);
                doc.setFont('helvetica', 'bold');
                doc.text(safeStr(billData.payment?.accountHolderName), margin + 22, yPos + 5.5);

                // Right: Cheque Date
                doc.rect(midPoint, yPos, midPoint - margin, rowHeight);
                doc.setFont('helvetica', 'normal');
                doc.text(paymentMethod === 'CHEQUE' ? 'Chq Date:' : 'Pay Date:', midPoint + 2, yPos + 5.5);
                doc.setFont('helvetica', 'bold');
                const cDate = billData.payment?.chequeDate ? new Date(billData.payment?.chequeDate).toLocaleDateString('en-IN') : 'N/A';
                doc.text(cDate, midPoint + 20, yPos + 5.5);

                yPos += rowHeight;
            }

            // 12. Remarks
            doc.rect(margin, yPos, tableWidth, rowHeight);
            doc.setFont('helvetica', 'bold');
            doc.text('Remarks:', margin + 2, yPos + 5.5);
            yPos += rowHeight;

            // 13. Created by
            doc.rect(margin, yPos, tableWidth, rowHeight);
            doc.setFont('helvetica', 'bold');
            doc.text('Created by:', margin + 2, yPos + 5.5);
            doc.setFont('helvetica', 'normal');
            doc.text(createdByName, margin + 25, yPos + 5.5);
            yPos += rowHeight;

            // 14. Note and Sign
            const footerHeight = 25;
            // Left Box: Note
            const signBoxWidth = 60;
            const noteBoxWidth = tableWidth - signBoxWidth;

            doc.rect(margin, yPos, noteBoxWidth, footerHeight);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            const noteText = 'Note: Fees are not refundable under any circumstances and cannot be adjusted against any other name or course.';
            const wrappedNote = doc.splitTextToSize(noteText, noteBoxWidth - 4);
            doc.text(wrappedNote, margin + 2, yPos + 5);

            // Right Box: Sign
            doc.rect(margin + noteBoxWidth, yPos, signBoxWidth, footerHeight);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Sign. of Collector', margin + noteBoxWidth + signBoxWidth / 2, yPos + 20, { align: 'center' });

            yPos += footerHeight;

            // --- Footer ---
            yPos += 5;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.rect(margin, yPos - 4, tableWidth, 6); // Border around footer text
            const corpAddress = billData.centre?.corporateAddress || '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026';
            const corpPhone = billData.centre?.corporatePhone || '033 2455-1840 / 2454-4817 / 4668';
            doc.text(`Corporate Office: ${corpAddress}, Ph.:${corpPhone}`, pageWidth / 2, yPos, { align: 'center' });
        };

        // Generate Student Copy
        drawBillPage("STUDENT COPY");

        // Add new page
        doc.addPage();

        // Generate Office Copy
        drawBillPage("OFFICE COPY");

        return doc;
    };

    const downloadPDF = () => {
        if (!billData) {
            toast.error('No bill data available');
            return;
        }
        try {
            const doc = createPDFDoc();
            const safeStr = (val) => (val !== undefined && val !== null) ? String(val) : '';
            doc.save(`Bill_${safeStr(billData.billId)}.pdf`);
            toast.success('Bill downloaded successfully!');
        } catch (error) {
            console.error("PDF Generation Error:", error);
            toast.error("Failed to generate PDF. Please try again.");
        }
    };

    const printBill = () => {
        if (!billData) {
            toast.error('No bill data available');
            return;
        }
        try {
            const doc = createPDFDoc();
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        } catch (error) {
            console.error("PDF Print Error:", error);
            toast.error("Failed to print PDF. Please try again.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f24] rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-[#1a1f24] z-10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FaFileInvoice className="text-cyan-400" />
                        Bill Generator
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl"
                    >
                        &times;
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {!billData ? (
                        <div className="text-center py-12">
                            <FaFileInvoice className="text-6xl text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">
                                Generate Bill for Installment #{installment?.installmentNumber}
                            </h3>
                            <p className="text-gray-400 mb-6">
                                Click the button below to generate a bill for this payment
                            </p>
                            <button
                                onClick={generateBill}
                                disabled={generating}
                                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg flex items-center gap-2 mx-auto disabled:opacity-50"
                            >
                                {generating ? (
                                    <>
                                        <FaSpinner className="animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <FaFileInvoice />
                                        Generate Bill
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div>
                            {/* Bill Preview */}
                            <div className="bg-[#252b32] rounded-lg p-6 mb-6">
                                {/* Bill Header */}
                                <div className="text-center mb-6 pb-6 border-b border-gray-700">
                                    <h1 className="text-3xl font-bold text-cyan-400 mb-2">PATHFINDER ERP</h1>
                                    <p className="text-gray-400">Fee Payment Receipt</p>
                                    <div className="flex justify-between mt-4 text-sm items-center">
                                        <div className="text-left">
                                            <span className="text-white font-semibold block">Bill ID: {billData.billId}</span>
                                            <span className="text-gray-400 block">Date: {new Date(billData.billDate).toLocaleDateString('en-IN')}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-sm font-bold px-3 py-1 rounded-full ${billData.payment?.status === "PENDING_CLEARANCE" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                                                {billData.payment?.status === "PENDING_CLEARANCE" ? "IN PROCESS" : "RECEIVED"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Student Details */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-cyan-400 mb-3">Student Details</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div><span className="text-gray-400">Name:</span> <span className="text-white font-medium">{billData.student.name}</span></div>
                                        <div><span className="text-gray-400">Admission No:</span> <span className="text-white font-medium">{billData.student.admissionNumber}</span></div>
                                        <div><span className="text-gray-400">Phone:</span> <span className="text-white font-medium">{billData.student.phoneNumber}</span></div>
                                        <div className="col-span-2"><span className="text-gray-400">Email:</span> <span className="text-white font-medium">{billData.student.email || 'N/A'}</span></div>
                                    </div>
                                </div>

                                {/* Course Details */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-cyan-400 mb-3">Course Details</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div><span className="text-gray-400">Course:</span> <span className="text-white font-medium">{billData.course.name}</span></div>
                                        <div><span className="text-gray-400">Department:</span> <span className="text-white font-medium">{billData.course.department}</span></div>
                                        <div><span className="text-gray-400">Exam Tag:</span> <span className="text-white font-medium">{billData.course.examTag}</span></div>
                                        <div><span className="text-gray-400">Class:</span> <span className="text-white font-medium">{billData.course.class}</span></div>
                                        <div><span className="text-gray-400">Session:</span> <span className="text-white font-medium">{billData.course.session}</span></div>
                                    </div>
                                </div>

                                {/* Payment Details */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-cyan-400 mb-3">Payment Details</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div><span className="text-gray-400">Installment:</span> <span className="text-white font-medium">#{billData.payment.installmentNumber}</span></div>
                                        <div><span className="text-gray-400">Payment Method:</span> <span className="text-white font-medium">{billData.payment.paymentMethod || 'N/A'}</span></div>
                                        <div>
                                            <span className="text-gray-400 font-bold text-cyan-400 uppercase">Received Date:</span>
                                            <span className="text-cyan-400 font-bold ml-1">
                                                {(billData.payment.receivedDate || installment?.receivedDate)
                                                    ? new Date(billData.payment.receivedDate || installment?.receivedDate).toLocaleDateString('en-IN')
                                                    : 'N/A'}
                                            </span>
                                        </div>
                                        {billData.payment.paymentMethod?.toUpperCase() !== 'CASH' && (
                                            <div><span className="text-gray-400">Transaction ID:</span> <span className="text-white font-medium">{billData.payment.transactionId || 'N/A'}</span></div>
                                        )}
                                        <div><span className="text-gray-400">Payment Date:</span> <span className="text-white font-medium">{new Date(billData.payment.paidDate).toLocaleDateString('en-IN')}</span></div>
                                        {['CHEQUE', 'BANK_TRANSFER'].includes(billData.payment.paymentMethod) && (
                                            <>
                                                <div><span className="text-gray-400">Payer Name:</span> <span className="text-white font-medium">{billData.payment.accountHolderName || 'N/A'}</span></div>
                                                <div><span className="text-gray-400">Cheque Date:</span> <span className="text-white font-medium">{billData.payment.chequeDate ? new Date(billData.payment.chequeDate).toLocaleDateString('en-IN') : 'N/A'}</span></div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Fee Breakdown */}
                                <div className="bg-[#1a1f24] rounded-lg p-4">
                                    <h3 className="text-lg font-bold text-cyan-400 mb-4">Fee Breakdown</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Course Fee</span>
                                            <span className="text-white font-medium">₹ {billData.amounts.courseFee.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">CGST (9%)</span>
                                            <span className="text-white font-medium">₹ {billData.amounts.cgst.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">SGST (9%)</span>
                                            <span className="text-white font-medium">₹ {billData.amounts.sgst.toFixed(2)}</span>
                                        </div>
                                        <div className="border-t border-gray-700 pt-2 mt-2">
                                            <div className="flex justify-between text-lg font-bold">
                                                <span className="text-cyan-400">TOTAL AMOUNT</span>
                                                <span className="text-cyan-400">₹ {billData.amounts.totalAmount.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-500 text-center mt-6 italic">
                                    This is a computer-generated receipt and does not require a signature.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={downloadPDF}
                                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg flex items-center gap-2"
                                >
                                    <FaDownload />
                                    Download PDF
                                </button>
                                <button
                                    onClick={printBill}
                                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg flex items-center gap-2"
                                >
                                    <FaPrint />
                                    Print
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BillGenerator;
