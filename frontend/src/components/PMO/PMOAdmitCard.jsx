import React, { useRef, useState } from 'react';
import { FaPrint, FaTimes, FaDownload, FaSpinner } from 'react-icons/fa';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import PMOAdmitCardTemplate from './PMOAdmitCardTemplate';
import { getAdmitCardFileName } from '../../utils/admitCardUtils';

const PMOAdmitCard = ({ student, onClose }) => {
    const printRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handlePrint = () => {
        const printContent = printRef.current;
        const originalContents = document.body.innerHTML;

        document.body.innerHTML = printContent.innerHTML;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload();
    };

    const handleDownloadPdf = async () => {
        if (!printRef.current) return;
        try {
            setIsDownloading(true);
            const element = printRef.current;
            
            const dataUrl = await toPng(element, {
                pixelRatio: 2,
                backgroundColor: '#ffffff'
            });

            if (!dataUrl || dataUrl === 'data:,') {
                throw new Error("Generated image is empty.");
            }
            
            const JsPDFConstructor = jsPDF.jsPDF || jsPDF;
            const pdf = new JsPDFConstructor('p', 'mm', 'a4');
            
            await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const yOffset = 8;
                        const maxAllowedHeight = pdf.internal.pageSize.getHeight() - (yOffset * 2);
                        
                        let finalWidth = pdfWidth;
                        let finalHeight = pdfHeight;
                        if (pdfHeight > maxAllowedHeight) {
                            finalHeight = maxAllowedHeight;
                            finalWidth = (img.width * finalHeight) / img.height;
                        }
            
                        const xOffset = (pdfWidth - finalWidth) / 2;
            
                        pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
                        const fileName = getAdmitCardFileName(student, 'PMO');
                        pdf.save(fileName);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                };
                img.onerror = reject;
                img.src = dataUrl;
            });

        } catch (err) {
            console.error("Failed to generate PDF details:", err);
            alert("Failed to generate PDF. Please try printing instead.");
        } finally {
            setIsDownloading(false);
        }
    };

    if (!student) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header Actions */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-100">
                    <h3 className="font-bold text-gray-800 text-lg">PMO Admit Card</h3>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleDownloadPdf}
                            disabled={isDownloading}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            {isDownloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                            {isDownloading ? 'Generating PDF...' : 'Download PDF'}
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm cursor-pointer"
                        >
                            <FaPrint /> Print
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* Printable Content Container */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-200 flex justify-center">
                    <PMOAdmitCardTemplate ref={printRef} student={student} />
                </div>
            </div>
        </div>
    );
};

export default PMOAdmitCard;
