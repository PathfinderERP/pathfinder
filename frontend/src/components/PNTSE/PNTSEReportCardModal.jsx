import React, { useRef, useState } from 'react';
import { FaPrint, FaDownload, FaTimes, FaSpinner } from 'react-icons/fa';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import PNTSEReportCardTemplate from './PNTSEReportCardTemplate';

const PNTSEReportCardModal = ({ student, onClose }) => {
    const reportRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);

    if (!student) return null;

    const handlePrint = () => {
        const printContent = reportRef.current;
        if (!printContent) return;
        const originalContents = document.body.innerHTML;

        document.body.innerHTML = printContent.innerHTML;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload(); // restore React event listeners after replacing body HTML
    };

    const handleDownloadPdf = async () => {
        if (!reportRef.current) return;
        try {
            setIsDownloading(true);
            const element = reportRef.current;

            const dataUrl = await toPng(element, {
                pixelRatio: 2,
                backgroundColor: '#ffffff'
            });

            if (!dataUrl || dataUrl === 'data:,') {
                throw new Error("Generated report card image is empty.");
            }

            const JsPDFConstructor = jsPDF.jsPDF || jsPDF;
            const pdf = new JsPDFConstructor('p', 'mm', 'a4');

            await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (img.height * pdfWidth) / img.width;

                    const yOffset = 6;
                    const maxAllowedHeight = pdf.internal.pageSize.getHeight() - (yOffset * 2);

                    let finalWidth = pdfWidth;
                    let finalHeight = pdfHeight;
                    if (pdfHeight > maxAllowedHeight) {
                        finalHeight = maxAllowedHeight;
                        finalWidth = (img.width * finalHeight) / img.height;
                    }

                    const xOffset = (pdfWidth - finalWidth) / 2;
                    pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
                    resolve();
                };
                img.src = dataUrl;
            });

            const cleanRoll = (student.rollNo || 'result').replace(/[^a-zA-Z0-9]/g, '_');
            const cleanName = (student.name || 'student').replace(/[^a-zA-Z0-9]/g, '_');
            pdf.save(`PNTSE_Report_Card_${cleanName}_${cleanRoll}.pdf`);
        } catch (err) {
            console.error("Failed to generate PDF:", err);
            alert("Could not generate PDF. You can use the Print button to save as PDF directly.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
            <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
                
                {/* Modal Top Control Bar */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            PNTSE Performance Report Card
                        </h2>
                        <p className="text-xs text-slate-400">
                            {student.name} &nbsp;•&nbsp; Roll: <span className="text-cyan-400 font-mono">{student.rollNo}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={isDownloading}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-all border border-slate-700 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {isDownloading ? <FaSpinner className="animate-spin text-cyan-400" /> : <FaDownload />}
                            Download PDF
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                        >
                            <FaPrint /> Print Report Card
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        >
                            <FaTimes size={16} />
                        </button>
                    </div>
                </div>

                {/* Printable Document Preview Area */}
                <div className="p-6 overflow-y-auto bg-slate-950/60 flex justify-center items-start flex-1">
                    <PNTSEReportCardTemplate
                        ref={reportRef}
                        student={student}
                    />
                </div>
            </div>
        </div>
    );
};

export default PNTSEReportCardModal;
