import React, { useState } from 'react';
import { FaFileInvoice, FaDownload, FaPrint, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';

const BillGenerator = ({ admission, installment, onClose }) => {
    const [generating, setGenerating] = useState(false);
    const [billData, setBillData] = useState(null);
    const apiUrl = import.meta.env.VITE_API_URL;

    const generateBill = async () => {
        if (!admission || !installment) {
            toast.error('Missing admission or installment data');
            return;
        }

        setGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${apiUrl}/payment/generate-bill/${admission._id}/${installment.installmentNumber}`,
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

    const createPDFDoc = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Helper to safe string
        const safeStr = (val) => (val !== undefined && val !== null) ? String(val) : '';

        // Colors
        const primaryColor = [0, 188, 212]; // Cyan
        const textGray = [156, 163, 175];

        // Header Background
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 40, 'F');

        // Company Name
        doc.setFontSize(24);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('PATHFINDER ERP', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Fee Payment Receipt', pageWidth / 2, 30, { align: 'center' });

        // Bill ID and Date
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`Bill ID: ${safeStr(billData.billId)}`, 20, 55);
        doc.text(`Date: ${new Date(billData.billDate).toLocaleDateString('en-IN')}`, pageWidth - 20, 55, { align: 'right' });

        // Divider
        doc.setDrawColor(...textGray);
        doc.setLineWidth(0.5);
        doc.line(20, 60, pageWidth - 20, 60);

        // Student Details Section
        let yPos = 75;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('STUDENT DETAILS', 20, yPos);
        
        yPos += 10;
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        
        const studentDetails = [
            ['Name:', safeStr(billData.student?.name)],
            ['Admission No:', safeStr(billData.student?.admissionNumber)],
            ['Student ID:', safeStr(billData.student?.id)],
            ['Phone:', safeStr(billData.student?.phoneNumber)],
            ['Email:', safeStr(billData.student?.email || 'N/A')]
        ];

        studentDetails.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, 20, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(value, 60, yPos);
            yPos += 7;
        });

        // Course Details Section
        yPos += 5;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('COURSE DETAILS', 20, yPos);
        
        yPos += 10;
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        
        const courseDetails = [
            ['Course:', safeStr(billData.course?.name)],
            ['Department:', safeStr(billData.course?.department)],
            ['Exam Tag:', safeStr(billData.course?.examTag)],
            ['Class:', safeStr(billData.course?.class)]
        ];

        courseDetails.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, 20, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(value, 60, yPos);
            yPos += 7;
        });

        // Payment Details Section
        yPos += 5;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('PAYMENT DETAILS', 20, yPos);
        
        yPos += 10;
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        
        const paymentDetails = [
            ['Installment No:', `#${safeStr(billData.payment?.installmentNumber)}`],
            ['Payment Method:', safeStr(billData.payment?.paymentMethod || 'N/A')],
            ['Transaction ID:', safeStr(billData.payment?.transactionId || 'N/A')],
            ['Payment Date:', new Date(billData.payment?.paidDate).toLocaleDateString('en-IN')]
        ];

        paymentDetails.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, 20, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(value, 60, yPos);
            yPos += 7;
        });

        // Fee Breakdown Table
        yPos += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('FEE BREAKDOWN', 20, yPos);
        
        yPos += 10;

        // Table Header
        doc.setFillColor(240, 240, 240);
        doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Description', 25, yPos);
        doc.text('Amount (₹)', pageWidth - 25, yPos, { align: 'right' });
        
        yPos += 10;

        // Table Rows
        doc.setFont('helvetica', 'normal');
        const feeItems = [
            ['Course Fee', (billData.amounts?.courseFee || 0).toFixed(2)],
            ['CGST (9%)', (billData.amounts?.cgst || 0).toFixed(2)],
            ['SGST (9%)', (billData.amounts?.sgst || 0).toFixed(2)]
        ];

        feeItems.forEach(([desc, amount]) => {
            doc.text(desc, 25, yPos);
            doc.text(amount, pageWidth - 25, yPos, { align: 'right' });
            yPos += 7;
        });

        // Total Line
        doc.setLineWidth(0.5);
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 7;

        // Total Amount
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL AMOUNT', 25, yPos);
        doc.text(`₹ ${(billData.amounts?.totalAmount || 0).toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });

        // Footer
        yPos = pageHeight - 30;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...textGray);
        doc.text('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, yPos, { align: 'center' });
        doc.text('For any queries, please contact the finance department.', pageWidth / 2, yPos + 5, { align: 'center' });
        
        // Watermark
        doc.setFontSize(50);
        doc.setTextColor(200, 200, 200);
        doc.setFont('helvetica', 'bold');
        doc.text('PAID', pageWidth / 2, pageHeight / 2, { 
            align: 'center', 
            angle: 45,
            opacity: 0.1 
        });

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
                                    <div className="flex justify-between mt-4 text-sm">
                                        <span className="text-white font-semibold">Bill ID: {billData.billId}</span>
                                        <span className="text-gray-400">Date: {new Date(billData.billDate).toLocaleDateString('en-IN')}</span>
                                    </div>
                                </div>

                                {/* Student Details */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-cyan-400 mb-3">Student Details</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div><span className="text-gray-400">Name:</span> <span className="text-white font-medium">{billData.student.name}</span></div>
                                        <div><span className="text-gray-400">Admission No:</span> <span className="text-white font-medium">{billData.student.admissionNumber}</span></div>
                                        <div><span className="text-gray-400">Student ID:</span> <span className="text-white font-medium">{billData.student.id}</span></div>
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
                                    </div>
                                </div>

                                {/* Payment Details */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-cyan-400 mb-3">Payment Details</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div><span className="text-gray-400">Installment:</span> <span className="text-white font-medium">#{billData.payment.installmentNumber}</span></div>
                                        <div><span className="text-gray-400">Payment Method:</span> <span className="text-white font-medium">{billData.payment.paymentMethod || 'N/A'}</span></div>
                                        <div><span className="text-gray-400">Transaction ID:</span> <span className="text-white font-medium">{billData.payment.transactionId || 'N/A'}</span></div>
                                        <div><span className="text-gray-400">Payment Date:</span> <span className="text-white font-medium">{new Date(billData.payment.paidDate).toLocaleDateString('en-IN')}</span></div>
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
