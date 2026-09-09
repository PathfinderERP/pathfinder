import React, { useRef, useState } from 'react';
import { FaPrint, FaTimes, FaDownload, FaSpinner } from 'react-icons/fa';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import PNTSEAdmitCardTemplate from './PNTSEAdmitCardTemplate';
import { getAdmitCardFileName } from '../../utils/admitCardUtils';

const PNTSEAdmitCard = ({ student, onClose }) => {
    const printRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handlePrint = () => {
        const printContent = printRef.current;
        const originalContents = document.body.innerHTML;

        document.body.innerHTML = printContent.innerHTML;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload(); // To restore React event listeners after replacing body HTML
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
            
            // Safe constructor instantiation supporting both ESM/CJS formats
            const JsPDFConstructor = jsPDF.jsPDF || jsPDF;
            const pdf = new JsPDFConstructor('p', 'mm', 'a4');
            
            await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = (img.height * pdfWidth) / img.width;
                        
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
                        const fileName = getAdmitCardFileName(student, 'PNTSE');
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
                    <h3 className="font-bold text-gray-800 text-lg">PNTSE Admit Card</h3>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleDownloadPdf}
                            disabled={isDownloading}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors shadow disabled:opacity-50 cursor-pointer"
                        >
                            {isDownloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                            Download PDF
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow cursor-pointer"
                        >
                            <FaPrint />
                            Print
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 bg-gray-300 hover:bg-gray-400 rounded-lg transition-colors text-gray-800 cursor-pointer"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>
                
                {/* Printable Content Container */}
                <div className="p-8 overflow-y-auto bg-gray-50 flex-1 flex justify-center">
                    <PNTSEAdmitCardTemplate ref={printRef} student={student} />
                </div>
            </div>
        </div>
    );
};

export default PNTSEAdmitCard;
