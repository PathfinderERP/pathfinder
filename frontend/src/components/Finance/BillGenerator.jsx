import React, { useState, useEffect } from 'react';
import { FaFileInvoice, FaDownload, FaPrint, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import logo from '../../assets/logo-1.svg';

const BillGenerator = ({ admission, installment, onClose, isDarkMode }) => {
    const [generating, setGenerating] = useState(false);
    const [billData, setBillData] = useState(null);
    const [logoBase64, setLogoBase64] = useState(null);
    const apiUrl = import.meta.env.VITE_API_URL;
    const safeStr = (val) => (val !== undefined && val !== null) ? String(val) : '';

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
            const queryParams = new URLSearchParams();
            if (installment.billingMonth) queryParams.append('billingMonth', installment.billingMonth);
            if (installment.billId) queryParams.append('billId', installment.billId);
            
            const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

            const response = await fetch(
                `${apiUrl}/payment/generate-bill/${admission._id}/${installment.installmentNumber}${queryString}`,
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
        // Landscape A4: width=297mm, height=210mm — fits 2 copies side by side
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        const pageWidth = doc.internal.pageSize.getWidth();   // 297mm
        const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
        const halfWidth = pageWidth / 2;  // ~148.5mm each copy
        const margin = 5;

        const drawBillPage = (copyType, xOffset) => {
            const colWidth = (halfWidth - 2 * margin) / 4;
            const tableWidth = halfWidth - 2 * margin;

            // Helper to safe string (local to this call)
            const localSafeStr = (val) => (val === undefined || val === null) ? '' : String(val);

            // Get logged-in user info from localStorage
            const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
            const createdByName = userInfo.name || userInfo.username || 'N/A';

            // --- Header Section ---
            let yPos = 6;

            // Logo - Top Left of this copy
            if (logoBase64) {
                try {
                    doc.addImage(logoBase64, 'PNG', xOffset + margin, yPos - 3, 28, 8);
                } catch (e) {
                    console.warn("Could not add logo", e);
                }
            }

            // Center Title
            doc.setFontSize(13);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text('PATHFINDER', xOffset + halfWidth / 2, yPos, { align: 'center' });

            // Right Side: copy type
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(copyType, xOffset + halfWidth - margin, yPos, { align: 'right' });

            // Status (RECEIVED / IN PROCESS / REJECTED)
            doc.setFontSize(9);
            const status = billData.payment?.status;
            const method = localSafeStr(billData.payment?.paymentMethod).toUpperCase();

            let statusLabel = "RECEIVED";
            let statusColor = [0, 150, 0]; // Green

            if (status === "REJECTED") {
                statusLabel = "REJECTED";
                statusColor = [200, 0, 0]; // Red
            } else if (status === "CANCELLED") {
                statusLabel = "CANCELLED";
                statusColor = [150, 150, 150]; // Gray
            } else if (status === "PENDING_CLEARANCE" || (method === "CHEQUE" && status === "PENDING")) {
                statusLabel = "IN PROCESS";
                statusColor = [0, 0, 200]; // Blue
            }

            doc.setTextColor(...statusColor);
            doc.setFont('helvetica', 'bold');
            doc.text(statusLabel, xOffset + halfWidth - margin, yPos + 5, { align: 'right' });

            // Centre Address (Centred)
            yPos += 8;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            let address = localSafeStr(billData.centre?.address || billData.centre?.name);
            address = address.replace(/\\n/g, '\n');
            const splitAddress = doc.splitTextToSize(address, tableWidth - 8);
            doc.text(splitAddress, xOffset + halfWidth / 2, yPos, { align: 'center' });
            yPos += (splitAddress.length * 3.5) + 2;

            // --- Rows ---
            const rowHeight = 5.8;

            const drawRow = (y, label, value, isFullWidth = true, splitX = null) => {
                const valStr = localSafeStr(value);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                const labelWidth = doc.getTextWidth(label);

                if (isFullWidth) {
                    const textStartX = xOffset + margin + 2 + labelWidth + 2;
                    const availableWidth = (xOffset + halfWidth - margin - 4) - textStartX;
                    doc.setFont('helvetica', 'bold');
                    const splitValue = doc.splitTextToSize(valStr, availableWidth);
                    const lines = splitValue.length;
                    const h = Math.max(rowHeight, (lines * 3.5) + 3);
                    doc.rect(xOffset + margin, y, tableWidth, h);
                    doc.setFont('helvetica', 'normal');
                    doc.text(label, xOffset + margin + 2, y + 4.2);
                    if (valStr) {
                        doc.setFont('helvetica', 'bold');
                        doc.text(splitValue, textStartX, y + 4.2);
                    }
                    return h;
                } else {
                    const midX = xOffset + (splitX || halfWidth / 2);
                    const leftBoxWidth = midX - (xOffset + margin);
                    doc.rect(xOffset + margin, y, leftBoxWidth, rowHeight);
                    doc.setFont('helvetica', 'normal');
                    doc.text(label, xOffset + margin + 2, y + 4.5);
                    if (valStr) {
                        doc.setFont('helvetica', 'bold');
                        const availableWidth = leftBoxWidth - (labelWidth + 6);
                        const displayVal = doc.getTextWidth(valStr) > availableWidth
                            ? doc.splitTextToSize(valStr, availableWidth)[0] + '...'
                            : valStr;
                        doc.text(displayVal, xOffset + margin + 2 + labelWidth + 2, y + 4.2);
                    }
                    return rowHeight;
                }
            };

            // GSTN row
            doc.rect(xOffset + margin, yPos, tableWidth, rowHeight);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.text('GSTN:', xOffset + margin + 2, yPos + 4.2);
            const gstToDisplay = (billData.centre?.gstNumber && billData.centre?.gstNumber !== 'N/A')
                ? billData.centre.gstNumber
                : billData.gstNumber;
            doc.text(localSafeStr(gstToDisplay), xOffset + margin + 13, yPos + 4.5);
            yPos += rowHeight;

            // MONEY RECEIPT
            doc.rect(xOffset + margin, yPos, tableWidth, rowHeight);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text('MONEY RECEIPT', xOffset + halfWidth / 2, yPos + 4.2, { align: 'center' });
            yPos += rowHeight;

            // Branch | Received Date
            const midX = xOffset + halfWidth / 2;
            doc.rect(xOffset + margin, yPos, halfWidth / 2 - margin, rowHeight);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.text('Branch :', xOffset + margin + 2, yPos + 4.2);
            doc.setFont('helvetica', 'bold');
            doc.text(localSafeStr(billData.centre?.name), xOffset + margin + 15, yPos + 4.2);
            doc.rect(midX, yPos, halfWidth / 2 - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('RECEIVED:', midX + 2, yPos + 4.2);
            doc.setFont('helvetica', 'bold');
            const receivedDateMatch = billData.payment?.receivedDate || installment?.receivedDate;
            const receivedDateStr = receivedDateMatch ? new Date(receivedDateMatch).toLocaleDateString('en-IN') : 'N/A';
            doc.text(receivedDateStr, midX + 21, yPos + 4.2);
            yPos += rowHeight;

            // Receipt No | Date
            doc.rect(xOffset + margin, yPos, halfWidth / 2 - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('Receipt No.:', xOffset + margin + 2, yPos + 4.2);
            doc.setFont('helvetica', 'bold');
            doc.text(localSafeStr(billData.billId), xOffset + margin + 22, yPos + 4.2);
            doc.rect(midX, yPos, halfWidth / 2 - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('Date:', midX + 2, yPos + 4.2);
            doc.setFont('helvetica', 'bold');
            doc.text(new Date(billData.billDate).toLocaleDateString('en-IN'), midX + 13, yPos + 4.2);
            yPos += rowHeight;

            // Student Name | Admission No
            doc.rect(xOffset + margin, yPos, halfWidth / 2 - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('Student Name:', xOffset + margin + 2, yPos + 4.2);
            doc.setFont('helvetica', 'bold');
            doc.text(localSafeStr(billData.student?.name), xOffset + margin + 25, yPos + 4.2);
            doc.rect(midX, yPos, halfWidth / 2 - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('Adm No:', midX + 2, yPos + 4.2);
            doc.setFont('helvetica', 'bold');
            doc.text(localSafeStr(billData.student?.admissionNumber), midX + 18, yPos + 4.2);
            yPos += rowHeight;

            // Contact No | Session
            doc.rect(xOffset + margin, yPos, halfWidth / 2 - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('Contact No.:', xOffset + margin + 2, yPos + 4.2);
            doc.setFont('helvetica', 'bold');
            doc.text(localSafeStr(billData.student?.phoneNumber), xOffset + margin + 22, yPos + 4.2);
            doc.rect(midX, yPos, halfWidth / 2 - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('Session:', midX + 2, yPos + 4.2);
            doc.setFont('helvetica', 'bold');
            doc.text(localSafeStr(billData.course?.session || 'N/A'), midX + 16, yPos + 4.2);
            yPos += rowHeight;

            // Course (full width, can wrap)
            const courseRowH = drawRow(yPos, 'Course:', localSafeStr(billData.course?.name));
            yPos += courseRowH;

            // Fee Table Header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.rect(xOffset + margin, yPos, colWidth, rowHeight);
            doc.text('Net Fees', xOffset + margin + colWidth / 2, yPos + 4.5, { align: 'center' });
            doc.rect(xOffset + margin + colWidth, yPos, colWidth, rowHeight);
            doc.text('SGST', xOffset + margin + colWidth + colWidth / 2, yPos + 4.5, { align: 'center' });
            doc.rect(xOffset + margin + 2 * colWidth, yPos, colWidth, rowHeight);
            doc.text('CGST', xOffset + margin + 2 * colWidth + colWidth / 2, yPos + 4.5, { align: 'center' });
            doc.rect(xOffset + margin + 3 * colWidth, yPos, colWidth, rowHeight);
            doc.text('Amount Rs.', xOffset + margin + 3 * colWidth + colWidth / 2, yPos + 4.5, { align: 'center' });
            yPos += rowHeight;

            // Fee Table Values
            const valueBoxHeight = 12;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.rect(xOffset + margin, yPos, colWidth, valueBoxHeight);
            doc.text('Rs. ' + (billData.amounts?.courseFee || 0).toFixed(2), xOffset + margin + colWidth / 2, yPos + 8, { align: 'center' });
            doc.rect(xOffset + margin + colWidth, yPos, colWidth, valueBoxHeight);
            doc.text('Rs. ' + (billData.amounts?.sgst || 0).toFixed(2), xOffset + margin + colWidth + colWidth / 2, yPos + 8, { align: 'center' });
            doc.rect(xOffset + margin + 2 * colWidth, yPos, colWidth, valueBoxHeight);
            doc.text('Rs. ' + (billData.amounts?.cgst || 0).toFixed(2), xOffset + margin + 2 * colWidth + colWidth / 2, yPos + 8, { align: 'center' });
            doc.rect(xOffset + margin + 3 * colWidth, yPos, colWidth, valueBoxHeight);
            doc.text('Rs. ' + (billData.amounts?.totalAmount || 0).toFixed(2), xOffset + margin + 3 * colWidth + colWidth / 2, yPos + 8, { align: 'center' });
            yPos += valueBoxHeight;

            // Total in words
            const amountInWords = numberToWords(billData.amounts?.totalAmount || 0);
            const amtRowH = drawRow(yPos, 'Total Amount (in words):', amountInWords);
            yPos += amtRowH;

            // Mode of Payment | Transaction ID
            doc.rect(xOffset + margin, yPos, halfWidth / 2 - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text('Mode:', xOffset + margin + 2, yPos + 4.2);
            doc.setFont('helvetica', 'bold');
            doc.text(localSafeStr(billData.payment?.paymentMethod), xOffset + margin + 13, yPos + 4.2);
            doc.rect(midX, yPos, halfWidth / 2 - margin, rowHeight);
            doc.setFont('helvetica', 'normal');
            doc.text('Txn ID:', midX + 2, yPos + 4.2);
            doc.setFont('helvetica', 'bold');
            const paymentMethod2 = localSafeStr(billData.payment?.paymentMethod).toUpperCase();
            doc.text(paymentMethod2 === 'CASH' ? '/cash' : localSafeStr(billData.payment?.transactionId), midX + 15, yPos + 4.2);
            yPos += rowHeight;

            // Cheque/Bank Details (Conditional)
            if (['CHEQUE', 'BANK_TRANSFER'].includes(paymentMethod2)) {
                doc.rect(xOffset + margin, yPos, halfWidth / 2 - margin, rowHeight);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.text(paymentMethod2 === 'CHEQUE' ? 'Chq Name:' : 'Payer:', xOffset + margin + 2, yPos + 4.2);
                doc.setFont('helvetica', 'bold');
                doc.text(localSafeStr(billData.payment?.accountHolderName), xOffset + margin + 20, yPos + 4.2);
                doc.rect(midX, yPos, halfWidth / 2 - margin, rowHeight);
                doc.setFont('helvetica', 'normal');
                doc.text(paymentMethod2 === 'CHEQUE' ? 'Chq Date:' : 'Pay Date:', midX + 2, yPos + 4.2);
                doc.setFont('helvetica', 'bold');
                const cDate = billData.payment?.chequeDate ? new Date(billData.payment.chequeDate).toLocaleDateString('en-IN') : 'N/A';
                doc.text(cDate, midX + 18, yPos + 4.2);
                yPos += rowHeight;
            }

            // Remarks
            const remarksText = billData.payment?.remarks || installment?.remarks || '';
            const remarksH = drawRow(yPos, 'Remarks:', remarksText);
            yPos += remarksH;

            // Created by
            doc.rect(xOffset + margin, yPos, tableWidth, rowHeight);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.text('Created by:', xOffset + margin + 2, yPos + 4.2);
            doc.setFont('helvetica', 'normal');
            doc.text(createdByName, xOffset + margin + 20, yPos + 4.2);
            yPos += rowHeight;

            // Note and Sign footer
            const footerHeight = 18;
            const signBoxWidth = 42;
            const noteBoxWidth = tableWidth - signBoxWidth;
            doc.rect(xOffset + margin, yPos, noteBoxWidth, footerHeight);
            doc.setFontSize(6);
            doc.setFont('helvetica', 'bold');
            const noteText = 'Note: Fees are not refundable under any circumstances and cannot be adjusted against any other name or course.';
            const wrappedNote = doc.splitTextToSize(noteText, noteBoxWidth - 4);
            doc.text(wrappedNote, xOffset + margin + 2, yPos + 4);
            doc.rect(xOffset + margin + noteBoxWidth, yPos, signBoxWidth, footerHeight);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('Sign. of Collector', xOffset + margin + noteBoxWidth + signBoxWidth / 2, yPos + 14, { align: 'center' });
            yPos += footerHeight;

            // Corporate footer
            yPos += 2;
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.rect(xOffset + margin, yPos - 3, tableWidth, 5);
            const corpAddress = billData.centre?.corporateAddress || '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026';
            const corpPhone = billData.centre?.corporatePhone || '033 2455-1840 / 2454-4817 / 4668';
            doc.text(`Corporate Office: ${corpAddress}, Ph.:${corpPhone}`, xOffset + halfWidth / 2, yPos, { align: 'center' });
        };

        // Draw Student Copy on left half
        drawBillPage("STUDENT COPY", 0);

        // Draw dashed vertical separator in the middle
        doc.setLineDash([2, 2], 0);
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.3);
        doc.line(halfWidth, 4, halfWidth, pageHeight - 4);
        doc.setLineDash([], 0); // Reset dash
        doc.setDrawColor(0);

        // Draw Office Copy on right half
        drawBillPage("OFFICE COPY", halfWidth);

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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all duration-300">
            <div className={`rounded-2xl border w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-[#0f1215] border-gray-700' : 'bg-white border-gray-200'}`}>
                {/* Header */}
                <div className={`p-6 border-b flex justify-between items-center sticky top-0 z-10 transition-all ${isDarkMode ? 'bg-[#0f1215] border-gray-700' : 'bg-white border-gray-100'}`}>
                    <h2 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <FaFileInvoice className="text-cyan-500" />
                        Bill Generator
                    </h2>
                    <button
                        onClick={onClose}
                        className={`text-2xl transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
                    >
                        &times;
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {!billData ? (
                        <div className="text-center py-12">
                            <FaFileInvoice className={`text-6xl mx-auto mb-4 opacity-20 ${isDarkMode ? 'text-gray-400' : 'text-gray-300'}`} />
                            <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Generate Bill for Installment #{installment?.installmentNumber}
                            </h3>
                            <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Click the button below to generate a bill for this payment
                            </p>
                            <button
                                onClick={generateBill}
                                disabled={generating}
                                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg flex items-center gap-2 mx-auto disabled:opacity-50 transition-all shadow-lg"
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
                            <div className={`rounded-xl p-8 mb-6 border transition-all ${isDarkMode ? 'bg-white/5 border-gray-700' : 'bg-gray-50 border-gray-200 shadow-inner'}`}>
                                {/* Bill Header */}
                                <div className={`text-center mb-8 pb-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                    <h1 className="text-3xl font-black text-cyan-600 mb-2 italic tracking-tighter">PATHFINDER <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>ERP</span></h1>
                                    <p className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Official Fee Payment Receipt</p>
                                    
                                    <div className="flex justify-between mt-8 text-xs items-end">
                                        <div className="text-left space-y-1">
                                            <div>
                                                <span className={`font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Bill ID:</span>
                                                <span className={`font-black ml-2 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{billData.billId}</span>
                                            </div>
                                            <div>
                                                <span className={`font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Date:</span>
                                                <span className={`font-bold ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{new Date(billData.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {(() => {
                                                const status = billData.payment?.status;
                                                const method = safeStr(billData.payment?.paymentMethod).toUpperCase();
                                                
                                                if (status === "REJECTED") {
                                                    return <span className="text-[10px] font-black px-4 py-1.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-widest">REJECTED</span>;
                                                }
                                                if (status === "CANCELLED") {
                                                    return <span className="text-[10px] font-black px-4 py-1.5 rounded-full bg-gray-500/10 text-gray-500 border border-gray-500/20 uppercase tracking-widest">CANCELLED</span>;
                                                }
                                                if (status === "PENDING_CLEARANCE" || (method === "CHEQUE" && status === "PENDING")) {
                                                    return <span className="text-[10px] font-black px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-widest">IN PROCESS</span>;
                                                }
                                                return <span className="text-[10px] font-black px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">RECEIVED</span>;
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    {/* Student Details */}
                                    <div className={`p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-white/5 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                                        <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-4">Student Intelligence</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-xs">
                                                <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Full Name</span>
                                                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{billData.student.name}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Admission No</span>
                                                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{billData.student.admissionNumber}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Contact</span>
                                                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{billData.student.phoneNumber}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Course Details */}
                                    <div className={`p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-white/5 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                                        <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-4">Program Details</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-xs">
                                                <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Course</span>
                                                <span className={`font-bold text-right max-w-[150px] truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{billData.course.name}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Academic Session</span>
                                                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{billData.course.session}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Department</span>
                                                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{billData.course.department}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Info */}
                                <div className={`p-6 rounded-xl border mb-8 transition-all ${isDarkMode ? 'bg-white/5 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 text-center">Transaction Summary</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Installment</div>
                                            <div className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>#{billData.payment.installmentNumber}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Method</div>
                                            <div className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{billData.payment.paymentMethod}</div>
                                        </div>
                                        <div className="text-center col-span-2 md:col-span-1">
                                            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Received Date</div>
                                            <div className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                {(billData.payment.receivedDate || installment?.receivedDate)
                                                    ? new Date(billData.payment.receivedDate || installment?.receivedDate).toLocaleDateString('en-IN')
                                                    : 'N/A'}
                                            </div>
                                        </div>
                                        <div className="text-center col-span-2 md:col-span-1">
                                            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Transaction ID</div>
                                            <div className={`text-sm font-black truncate px-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                {billData.payment.transactionId || (installment?.transactionId || 'N/A')}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Fee Breakdown Table */}
                                <div className={`rounded-xl overflow-hidden border transition-all ${isDarkMode ? 'bg-[#0f1215] border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className={isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'}>
                                                <th className={`text-left py-3 px-4 font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Description</th>
                                                <th className={`text-right py-3 px-4 font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                            <tr className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                                <td className="py-3 px-4 font-bold">Base Course Fees</td>
                                                <td className="text-right py-3 px-4 font-black">₹ {billData.amounts.courseFee.toFixed(2)}</td>
                                            </tr>
                                            <tr className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                                <td className="py-3 px-4 font-bold text-gray-500">CGST (9%)</td>
                                                <td className="text-right py-3 px-4 font-black text-gray-500">₹ {billData.amounts.cgst.toFixed(2)}</td>
                                            </tr>
                                            <tr className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                                <td className="py-3 px-4 font-bold text-gray-500">SGST (9%)</td>
                                                <td className="text-right py-3 px-4 font-black text-gray-500">₹ {billData.amounts.sgst.toFixed(2)}</td>
                                            </tr>
                                            <tr className={isDarkMode ? 'bg-cyan-500/10' : 'bg-cyan-50'}>
                                                <td className={`py-4 px-4 font-black uppercase tracking-widest ${isDarkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Grand Total</td>
                                                <td className={`text-right py-4 px-4 font-black text-lg ${isDarkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>₹ {billData.amounts.totalAmount.toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-8 text-center">
                                    <p className={`text-[10px] font-bold italic mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                        * This is a computer-generated digital receipt and does not require a physical signature.
                                    </p>
                                    <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`}>
                                        Pathfinder ERP Intelligence System
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 max-w-md mx-auto">
                                <button
                                    onClick={() => setBillData(null)}
                                    className={`flex-1 py-4 px-6 border rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                                >
                                    New Bill
                                </button>
                                <button
                                    onClick={downloadPDF}
                                    className="flex-1 py-4 px-6 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 active:scale-95"
                                >
                                    <FaDownload />
                                    Download PDF
                                </button>
                                <button
                                    onClick={printBill}
                                    className={`p-4 border rounded-2xl transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <FaPrint />
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
