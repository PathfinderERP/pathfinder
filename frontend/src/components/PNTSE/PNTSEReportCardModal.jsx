import React, { useRef, useState, useEffect } from 'react';
import { FaPrint, FaDownload, FaTimes, FaSpinner } from 'react-icons/fa';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import PNTSEReportCardTemplate, { STATIC_AIR_TOTAL_BY_CLASS, getClassNumber } from './PNTSEReportCardTemplate';

const PNTSEReportCardModal = ({
    student,
    onClose,
    totalCentreStudents: propTotalCentre,
    totalPfStudents: propTotalPf
}) => {
    const reportRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const initialCentre = Number(
        propTotalCentre ||
        student?.totalCentreStudents ||
        student?.result?.totalCentreStudents ||
        0
    );
    const modalClassNum = getClassNumber(student?.class?.name || student?.course || student?.class);
    const modalStaticAirTotal = STATIC_AIR_TOTAL_BY_CLASS[modalClassNum];
    const initialPf = (modalStaticAirTotal !== undefined && modalStaticAirTotal !== null)
        ? modalStaticAirTotal
        : Number(
            propTotalPf ||
            student?.totalPfStudents ||
            student?.result?.totalPfStudents ||
            0
        );

    const [counts, setCounts] = useState({
        totalCentreStudents: initialCentre,
        totalPfStudents: initialPf
    });

    useEffect(() => {
        if (initialCentre > 0 && initialPf > 0) {
            setCounts({
                totalCentreStudents: initialCentre,
                totalPfStudents: initialPf
            });
            return;
        }

        let isMounted = true;
        const fetchExamStats = async () => {
            try {
                const classId = student?.class?._id || student?.class || student?.course;
                const centreId = student?.centre?._id || student?.centre;
                if (!classId) return;

                const token = localStorage.getItem("token");
                const url = new URL(`${import.meta.env.VITE_API_URL}/pntse/exam-class-stats`);
                if (classId) url.searchParams.append("classId", classId);
                if (centreId) url.searchParams.append("centreId", centreId);

                const res = await fetch(url.toString(), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) return;
                const data = await res.json();
                if (isMounted && data.success) {
                    setCounts({
                        totalCentreStudents: data.totalCentreStudents || initialCentre,
                        totalPfStudents: (modalStaticAirTotal !== undefined && modalStaticAirTotal !== null)
                            ? modalStaticAirTotal
                            : (data.totalPfStudents || initialPf)
                    });
                }
            } catch (err) {
                console.error("Failed to load exam counts in report card modal:", err);
            }
        };

        fetchExamStats();
        return () => { isMounted = false; };
    }, [student, propTotalCentre, propTotalPf]);

    if (!student) return null;

    const handlePrint = () => {
        const element = reportRef.current;
        if (!element) return;

        let iframe = document.getElementById('pntse-report-print-frame');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'pntse-report-print-frame';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);
        }

        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(el => el.outerHTML)
            .join('\n');

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Pathfinder National Talent Search Examination - ${student?.name || ''}</title>
                    ${styles}
                    <style>
                        @page {
                            size: A4 portrait;
                            margin: 4mm 6mm;
                        }
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            box-sizing: border-box;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            background: #ffffff !important;
                            width: 100% !important;
                            height: 100% !important;
                            overflow: hidden !important;
                        }
                        .print-wrapper {
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 auto !important;
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                        }
                    </style>
                </head>
                <body>
                    <div class="print-wrapper">
                        ${element.outerHTML}
                    </div>
                </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }, 300);
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
                        totalCentreStudents={counts.totalCentreStudents}
                        totalPfStudents={counts.totalPfStudents}
                    />
                </div>
            </div>
        </div>
    );
};

export default PNTSEReportCardModal;
