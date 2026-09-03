import React, { useRef, useState } from 'react';
import { FaPrint, FaTimes, FaDownload, FaSpinner } from 'react-icons/fa';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

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
                        
                        let finalWidth = pdfWidth;
                        let finalHeight = pdfHeight;
                        if (pdfHeight > pdf.internal.pageSize.getHeight()) {
                            finalHeight = pdf.internal.pageSize.getHeight();
                            finalWidth = (img.width * finalHeight) / img.height;
                        }
            
                        const xOffset = (pdfWidth - finalWidth) / 2;
                        const yOffset = 10; // small top margin
            
                        pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
                        pdf.save(`PNTSE_Admit_Card_${student?.rollNo || student?.name?.replace(/\s+/g, '_')}.pdf`);
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

    // Helper to extract class roman numeral (e.g., from "Class 6" or "6" to "VI")
    const getRomanClass = (className) => {
        if (!className) return '';
        const name = className.toString().toLowerCase();
        if (name.includes('5')) return 'V';
        if (name.includes('6')) return 'VI';
        if (name.includes('7')) return 'VII';
        if (name.includes('8')) return 'VIII';
        if (name.includes('9')) return 'IX';
        if (name.includes('10')) return 'X';
        return '';
    };

    const studentClass = student.class?.name || student.class || '';
    const romanClass = getRomanClass(studentClass);
    const centreName = student.centre?.centreName || student.centre?.enterCode || student.centre || '';

    // Parse examDate if exists
    let examDay = ['D', 'D'];
    let examMonth = ['M', 'M'];
    let examYear = ['Y', 'Y', 'Y', 'Y'];
    let isExamDatePopulated = false;

    if (student.examDate) {
        try {
            const dateObj = new Date(student.examDate);
            if (!isNaN(dateObj.getTime())) {
                const dayStr = String(dateObj.getDate()).padStart(2, '0');
                const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
                const yearStr = String(dateObj.getFullYear());

                examDay = dayStr.split('');
                examMonth = monthStr.split('');
                examYear = yearStr.split('');
                isExamDatePopulated = true;
            }
        } catch (e) {
            console.error("Error parsing exam date:", e);
        }
    }
    const formatReportingTime = (timeStr) => {
        if (!timeStr) return '';
        // If already formatted with AM/PM, return as-is
        if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(timeStr)) return timeStr;
        const parts = timeStr.split(':');
        if (parts.length >= 2) {
            let hours = parseInt(parts[0], 10);
            const minutes = parts[1].replace(/[^0-9]/g, '').padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            return `${hours}:${minutes} ${ampm}`;
        }
        return timeStr;
    };

    // Attempt to pad roll number or use empty boxes if none
    const rollBoxes = Array(7).fill('');
    if (student.rollNo) {
        const rollStr = student.rollNo.toString().replace(/[^a-zA-Z0-9]/g, ''); // just taking alphanumeric
        const rollChars = rollStr.substring(rollStr.length - 7).padStart(7, ' ').split('');
        for(let i=0; i<7; i++) {
            rollBoxes[i] = rollChars[i];
        }
    }

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
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors shadow disabled:opacity-50"
                        >
                            {isDownloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                            Download PDF
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow"
                        >
                            <FaPrint />
                            Print
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 bg-gray-300 hover:bg-gray-400 rounded-lg transition-colors text-gray-800"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>
                
                {/* Printable Content Container */}
                <div className="p-8 overflow-y-auto bg-gray-50 flex-1 flex justify-center">
                    
                    {/* Real Admit Card Structure */}
                    <div ref={printRef} className="w-[840px] bg-white text-black p-6 font-sans">
                        {/* Define print specific styles inside */}
                        <style type="text/css" media="print">
                            {`
                                @page { size: A4 portrait; margin: 10mm; }
                                body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            `}
                        </style>
                        
                        <div className="border-[3px] border-black p-6 relative flex flex-col">
                            {/* Admit Card Sidebar text */}
                            <div 
                                className="absolute -left-4 top-8 bottom-8 w-12 bg-black text-white flex items-center justify-center font-extrabold text-2xl tracking-[0.35em] uppercase z-10 shadow-sm"
                                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                            >
                                ADMIT CARD
                            </div>
 
                            <div className="ml-12 pl-2 flex flex-col gap-5">
                                {/* Header / Logo area */}
                                <div className="text-center">
                                    <div className="flex justify-center items-center gap-3">
                                        <div className="w-12 h-12 flex items-center justify-center shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-12 h-12">
                                                {/* Orange Background */}
                                                <rect width="100" height="100" fill="#E65100"/>
                                                
                                                {/* Sun Ring */}
                                                <circle cx="58" cy="36" r="14" stroke="white" strokeWidth="3" fill="none"/>
                                                
                                                {/* Sun Rays */}
                                                <line x1="58" y1="18" x2="58" y2="6" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                                                <line x1="71" y1="23" x2="81" y2="13" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                                                <line x1="76" y1="36" x2="88" y2="36" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                                                <line x1="71" y1="49" x2="81" y2="59" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                                                <line x1="45" y1="23" x2="35" y2="13" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                                                <line x1="40" y1="36" x2="28" y2="36" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                                                <line x1="45" y1="49" x2="35" y2="59" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                                                
                                                {/* Bottom Book Spine/Body */}
                                                <path d="M15,74 Q13,76 15,78 L35,90 Q37,92 39,90 L75,70 Q77,68 75,66 L71,64 Z" fill="white" stroke="#E65100" strokeWidth="1.5"/>
                                                {/* Bottom Book Pages */}
                                                <path d="M37,87 L73,69 M71,67 L35,85" stroke="#E65100" strokeWidth="1"/>
                                                {/* Bottom Book Spine Ridges */}
                                                <line x1="17" y1="77" x2="19" y2="79" stroke="#E65100" strokeWidth="1.5"/>
                                                <line x1="21" y1="80" x2="23" y2="82" stroke="#E65100" strokeWidth="1.5"/>
                                                <line x1="25" y1="83" x2="27" y2="85" stroke="#E65100" strokeWidth="1.5"/>
                                                <line x1="29" y1="86" x2="31" y2="88" stroke="#E65100" strokeWidth="1.5"/>

                                                {/* Top Book Spine/Body */}
                                                <path d="M15,62 Q13,64 15,66 L35,78 Q37,80 39,78 L75,58 Q77,56 75,54 L71,52 Z" fill="white" stroke="#E65100" strokeWidth="1.5"/>
                                                {/* Top Book Cover Label Box */}
                                                <path d="M28,62 L48,52 L58,58 L38,68 Z" fill="none" stroke="#E65100" strokeWidth="1.5"/>
                                                {/* Top Book Spine Ridges */}
                                                <line x1="17" y1="65" x2="19" y2="67" stroke="#E65100" strokeWidth="1.5"/>
                                                <line x1="21" y1="68" x2="23" y2="70" stroke="#E65100" strokeWidth="1.5"/>
                                                <line x1="25" y1="71" x2="27" y2="73" stroke="#E65100" strokeWidth="1.5"/>
                                                <line x1="29" y1="74" x2="31" y2="76" stroke="#E65100" strokeWidth="1.5"/>
                                            </svg>
                                        </div>
                                        <div className="text-left">
                                            <h1 className="text-3xl font-extrabold tracking-tight m-0 leading-none">PATHFINDER<sup className="text-lg">&reg;</sup></h1>
                                            <p className="text-xs font-bold tracking-widest text-gray-800 m-0">Where Aspiration Meets Success</p>
                                        </div>
                                    </div>
                                    <h2 className="text-lg font-extrabold mt-3 uppercase tracking-wide">
                                        PATHFINDER NATIONAL TALENT SEARCH EXAMINATION (PNTSE)
                                    </h2>
                                </div>

                                {/* Upper Section: Form Fields on Left, Photo Box on Right */}
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 flex flex-col gap-4">
                                        
                                        {/* Row 1: Reg No and Centre */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex gap-2 items-center">
                                                    <span className="font-bold text-xs w-28 leading-tight">
                                                        Registration Number<br/><span className="font-normal italic text-[10px] text-gray-600">(for Office Use Only)</span>
                                                    </span>
                                                    <div className="flex">
                                                        {rollBoxes.map((char, i) => (
                                                            <div key={i} className={`w-7 h-8 border border-black flex items-center justify-center font-bold text-base ${i > 0 ? 'border-l-0' : ''}`}>
                                                                {char}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex ml-[120px]">
                                                    <div className="bg-black text-white text-[9px] px-1 font-bold w-14 text-center mt-0.5">Centre Code</div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-1.5 pt-1">
                                                <span className="font-bold text-xs whitespace-nowrap">Name of Centre:</span>
                                                <div className="border border-black px-2 py-0.5 font-bold text-xs max-w-[160px] truncate" title={centreName}>
                                                    {centreName || '-'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Exam Date */}
                                        <div className="flex gap-2 items-center">
                                            <span className="font-bold text-xs w-28">Examination Date:</span>
                                            <div className="flex gap-1.5">
                                                <div className="flex">
                                                    <div className={`w-7 h-8 border border-black text-center flex items-center justify-center font-bold text-sm ${isExamDatePopulated ? 'text-black' : 'text-gray-400'}`}>
                                                        {examDay[0]}
                                                    </div>
                                                    <div className={`w-7 h-8 border border-black border-l-0 text-center flex items-center justify-center font-bold text-sm ${isExamDatePopulated ? 'text-black' : 'text-gray-400'}`}>
                                                        {examDay[1]}
                                                    </div>
                                                </div>
                                                <div className="flex">
                                                    <div className={`w-7 h-8 border border-black text-center flex items-center justify-center font-bold text-sm ${isExamDatePopulated ? 'text-black' : 'text-gray-400'}`}>
                                                        {examMonth[0]}
                                                    </div>
                                                    <div className={`w-7 h-8 border border-black border-l-0 text-center flex items-center justify-center font-bold text-sm ${isExamDatePopulated ? 'text-black' : 'text-gray-400'}`}>
                                                        {examMonth[1]}
                                                    </div>
                                                </div>
                                                <div className="flex">
                                                    <div className={`w-7 h-8 border border-black text-center flex items-center justify-center font-bold text-sm ${isExamDatePopulated ? 'text-black' : 'text-gray-400'}`}>
                                                        {examYear[0]}
                                                    </div>
                                                    <div className={`w-7 h-8 border border-black border-l-0 text-center flex items-center justify-center font-bold text-sm ${isExamDatePopulated ? 'text-black' : 'text-gray-400'}`}>
                                                        {examYear[1]}
                                                    </div>
                                                    <div className={`w-7 h-8 border border-black border-l-0 text-center flex items-center justify-center font-bold text-sm ${isExamDatePopulated ? 'text-black' : 'text-gray-400'}`}>
                                                        {examYear[2]}
                                                    </div>
                                                    <div className={`w-7 h-8 border border-black border-l-0 text-center flex items-center justify-center font-bold text-sm ${isExamDatePopulated ? 'text-black' : 'text-gray-400'}`}>
                                                        {examYear[3]}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 3: Class */}
                                        <div className="flex gap-2 items-center">
                                            <span className="font-bold text-xs w-28">Class (<span className="font-serif italic font-bold text-sm">✓</span>)  :</span>
                                            <div className="flex border border-black">
                                                {['V', 'VI', 'VII', 'VIII', 'IX', 'X'].map((cls, i) => (
                                                    <div key={cls} className={`w-9 h-7 flex items-center justify-center font-bold text-xs relative ${i > 0 ? 'border-l border-black' : ''}`}>
                                                        {cls}
                                                        {romanClass === cls && <span className="absolute -top-1 font-bold text-base text-black">✓</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Photo box */}
                                    <div className="w-[125px] h-[155px] border-2 border-black flex items-center justify-center text-center p-2 shrink-0 bg-white">
                                        <span className="text-[11px] font-semibold text-gray-700 leading-tight">
                                            Paste your recent passport size colour photograph here
                                        </span>
                                    </div>
                                </div>

                                {/* Lower Section: Full Width Student Details */}
                                <div className="flex flex-col gap-3.5 mt-1 w-full">
                                    <div className="flex items-end gap-2">
                                        <span className="font-bold text-xs whitespace-nowrap">Name of the Student:</span>
                                        <div className="border-b-2 border-black flex-1 font-bold text-base px-2 pb-0.5 tracking-wide">
                                            {student.name?.toUpperCase()}
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-8">
                                        <div className="flex items-end gap-2 flex-1">
                                            <span className="font-bold text-xs whitespace-nowrap">Reporting Time:</span>
                                            <div className="border-b-2 border-black flex-1 font-bold text-sm px-2 pb-0.5">
                                                {formatReportingTime(student.reportingTime) || '-'}
                                            </div>
                                        </div>
                                        <div className="flex items-end gap-2 flex-1">
                                            <span className="font-bold text-xs whitespace-nowrap">Time Slot:</span>
                                            <div className="border-b-2 border-black flex-1 font-bold text-sm px-2 pb-0.5">
                                                {student.timeSlot || '-'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-8">
                                        <div className="flex items-end gap-2 flex-[1.4]">
                                            <span className="font-bold text-xs whitespace-nowrap">Exam Venue:</span>
                                            <div className="border-b-2 border-black flex-1 font-bold text-xs px-2 pb-0.5 truncate">
                                                {student.examVenue || centreName || '-'}
                                            </div>
                                        </div>
                                        <div className="flex items-end gap-2 flex-1">
                                            <span className="font-bold text-xs whitespace-nowrap">Signature of PEC Official:</span>
                                            <div className="border-b-2 border-black flex-1 px-2 pb-0.5 min-h-[22px]"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Disclaimer Footer */}
                                <div className="mt-4 border-t-2 border-black pt-2 text-center">
                                    <p className="font-bold text-xs uppercase tracking-wide">
                                        Without Admit Card Entry not permitted inside the Examination Hall.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PNTSEAdmitCard;
