import React, { useRef, useState } from 'react';
import { FaPrint, FaTimes, FaDownload, FaSpinner } from 'react-icons/fa';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

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
                        const pdfHeight = (img.height * pdfWidth) / img.width;
                        
                        let finalWidth = pdfWidth;
                        let finalHeight = pdfHeight;
                        if (pdfHeight > pdf.internal.pageSize.getHeight()) {
                            finalHeight = pdf.internal.pageSize.getHeight();
                            finalWidth = (img.width * finalHeight) / img.height;
                        }
            
                        const xOffset = (pdfWidth - finalWidth) / 2;
                        const yOffset = 10;
            
                        pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
                        pdf.save(`PMO_Admit_Card_${student?.rollNo || student?.name?.replace(/\s+/g, '_')}.pdf`);
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

    const getRomanClass = (className) => {
        if (!className) return '';
        const name = className.toString().toLowerCase();
        if (name.includes('3')) return 'III';
        if (name.includes('4')) return 'IV';
        if (name.includes('5')) return 'V';
        if (name.includes('6')) return 'VI';
        if (name.includes('7')) return 'VII';
        if (name.includes('8')) return 'VIII';
        if (name.includes('9')) return 'IX';
        if (name.includes('10')) return 'X';
        if (name.includes('11')) return 'XI';
        if (name.includes('12')) return 'XII';
        return className;
    };

    const studentClass = student.class?.name || student.class || '';
    const romanClass = getRomanClass(studentClass);
    const centreName = student.centre?.centreName || student.centre?.enterCode || student.centre || '';

    let examDay = ['D', 'D'];
    let examMonth = ['M', 'M'];
    let examYear = ['Y', 'Y', 'Y', 'Y'];
    let isExamDatePopulated = false;

    if (student.examDate) {
        try {
            const rawDate = String(student.examDate).trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
                // ISO YYYY-MM-DD format
                const [y, m, d] = rawDate.split('T')[0].split('-');
                examDay = d.padStart(2, '0').split('');
                examMonth = m.padStart(2, '0').split('');
                examYear = y.split('');
                isExamDatePopulated = true;
            } else if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(rawDate)) {
                // DD/MM/YYYY or DD-MM-YYYY format
                const parts = rawDate.split(/[\/-]/);
                examDay = parts[0].padStart(2, '0').split('');
                examMonth = parts[1].padStart(2, '0').split('');
                examYear = parts[2].split('');
                isExamDatePopulated = true;
            } else {
                const dateObj = new Date(rawDate);
                if (!isNaN(dateObj.getTime())) {
                    const dayStr = String(dateObj.getDate()).padStart(2, '0');
                    const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const yearStr = String(dateObj.getFullYear());

                    examDay = dayStr.split('');
                    examMonth = monthStr.split('');
                    examYear = yearStr.split('');
                    isExamDatePopulated = true;
                }
            }
        } catch (e) {
            console.error("Error parsing exam date:", e);
        }
    }

    const formatReportingTime = (timeStr) => {
        if (!timeStr) return '';
        const parts = timeStr.split(':');
        if (parts.length >= 2) {
            let hours = parseInt(parts[0], 10);
            const minutes = parts[1];
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            return `${hours}:${minutes} ${ampm}`;
        }
        return timeStr;
    };

    const rollBoxes = Array(7).fill('');
    if (student.rollNo) {
        const rollStr = student.rollNo.toString().replace(/[^a-zA-Z0-9]/g, '');
        const rollChars = rollStr.substring(rollStr.length - 7).padStart(7, ' ').split('');
        for(let i = 0; i < 7; i++) {
            rollBoxes[i] = rollChars[i];
        }
    }

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
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
                        >
                            {isDownloading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                            {isDownloading ? 'Generating PDF...' : 'Download PDF'}
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm"
                        >
                            <FaPrint /> Print
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* Printable Content Container */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-200 flex justify-center">
                    {/* The Document Page */}
                    <div 
                        ref={printRef}
                        className="bg-white text-black p-8 w-[210mm] min-h-[297mm] shadow-lg flex flex-col justify-between font-serif relative box-border"
                        style={{ border: '2px solid black' }}
                    >
                        <div>
                            {/* Inner Double Border Simulation */}
                            <div className="border border-black p-4 h-full relative">
                                
                                {/* Hall Ticket Label */}
                                <div className="absolute top-2 right-2 border-2 border-black px-2 py-0.5 font-bold text-xs uppercase tracking-wider">
                                    HALL TICKET
                                </div>

                                {/* Top Header */}
                                <div className="text-center mt-2">
                                    <div className="flex items-center justify-center gap-3">
                                        {/* Pathfinder Brand Logo SVG */}
                                        <div className="w-16 h-16 flex-shrink-0">
                                            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
                                                <polygon points="50,2 95,25 95,75 50,98 5,75 5,25" fill="#E65100" />
                                                <polygon points="50,6 91,27 91,73 50,94 9,73 9,27" fill="#F57C00" />
                                                <path d="M50,14 L82,30 L82,46 L50,62 L18,46 L18,30 Z" fill="#FFA726" />
                                                <path d="M50,17 L78,31 L78,43 L50,57 L22,43 L22,31 Z" fill="#FFE0B2" />
                                                <polygon points="50,10 85,28 85,34 50,52 15,34 15,28" fill="#FFFFFF" opacity="0.6"/>
                                                <path d="M15,72 Q13,74 15,76 L35,88 Q37,90 39,88 L75,68 Q77,66 75,64 L71,62 Z" fill="white" stroke="#E65100" strokeWidth="1.5"/>
                                                <path d="M15,62 Q13,64 15,66 L35,78 Q37,80 39,78 L75,58 Q77,56 75,54 L71,52 Z" fill="white" stroke="#E65100" strokeWidth="1.5"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <h1 className="text-4xl font-extrabold tracking-tight m-0 leading-none">PATHFINDER<sup className="text-xl">&reg;</sup></h1>
                                            <p className="text-sm font-bold tracking-widest text-gray-800 m-0">Where Aspiration Meets Success</p>
                                        </div>
                                    </div>
                                    <h2 className="text-xl font-bold mt-4 uppercase">
                                        PATHFINDER MATH OLYMPIAD (PMO)
                                    </h2>
                                </div>

                                <div className="flex mt-8 gap-4">
                                    <div className="flex-1 flex flex-col gap-6">
                                        {/* Row 1: Reg No and Centre */}
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <div className="flex gap-4 items-center">
                                                    <span className="font-bold text-sm w-32 leading-tight">
                                                        Registration Number<br/><span className="font-normal italic text-xs">(for Office Use Only)</span>
                                                    </span>
                                                    <div className="flex">
                                                        {rollBoxes.map((char, i) => (
                                                            <div key={i} className={`w-8 h-8 border border-black flex items-center justify-center font-bold text-lg ${i===1 ? 'border-r-0' : ''}`}>
                                                                {char}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex ml-[144px]">
                                                    <div className="bg-black text-white text-[10px] px-1 font-bold w-16 text-center mt-0.5">Centre Code</div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm">Name of Centre:</span>
                                                <div className="border border-black px-3 py-1 min-w-[150px] font-bold text-sm">
                                                    {centreName}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Student Name */}
                                        <div className="flex items-end gap-2">
                                            <span className="font-bold text-sm w-36">Name of the Student:</span>
                                            <div className="flex-1 border-b border-black font-bold text-base px-2 uppercase">
                                                {student.name || ''}
                                            </div>
                                        </div>

                                        {/* Row 3: Class & Board */}
                                        <div className="flex items-end gap-6">
                                            <div className="flex items-end gap-2">
                                                <span className="font-bold text-sm">Presently in Class:</span>
                                                <div className="border border-black px-3 py-0.5 font-bold text-sm min-w-[50px] text-center">
                                                    {romanClass || studentClass}
                                                </div>
                                            </div>

                                            <div className="flex items-end gap-2 flex-1">
                                                <span className="font-bold text-sm">Board:</span>
                                                <div className="flex-1 border-b border-black font-bold text-sm px-2">
                                                    {student.board?.boardCourse || student.board?.boardName || student.board || ''}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 4: School Name */}
                                        <div className="flex items-end gap-2">
                                            <span className="font-bold text-sm w-28">Name of School:</span>
                                            <div className="flex-1 border-b border-black font-bold text-sm px-2">
                                                {student.school || 'N/A'}
                                            </div>
                                        </div>

                                        {/* Row 5: Mobile & Email */}
                                        <div className="flex items-end gap-6">
                                            <div className="flex items-end gap-2 flex-1">
                                                <span className="font-bold text-sm">Mobile No:</span>
                                                <div className="flex-1 border-b border-black font-bold text-sm px-2">
                                                    {student.mobile || ''}
                                                </div>
                                            </div>
                                            {student.email && (
                                                <div className="flex items-end gap-2 flex-1">
                                                    <span className="font-bold text-sm">Email:</span>
                                                    <div className="flex-1 border-b border-black font-bold text-sm px-2">
                                                        {student.email}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                    </div>

                                    {/* Photo Box */}
                                    <div className="w-32 h-40 border-2 border-dashed border-gray-400 flex flex-col items-center justify-center p-2 text-center text-xs text-gray-500 font-sans flex-shrink-0">
                                        <span>Affix Recent Passport Size Photograph</span>
                                    </div>
                                </div>

                                {/* Exam Details Box */}
                                <div className="mt-8 border border-black p-4 bg-gray-50/50">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">Date of Exam:</span>
                                            <div className="flex items-center gap-1 font-mono font-bold text-sm">
                                                <div className="flex border border-black">
                                                    <span className="w-5 h-6 flex items-center justify-center border-r border-black">{examDay[0]}</span>
                                                    <span className="w-5 h-6 flex items-center justify-center">{examDay[1]}</span>
                                                </div>
                                                <span>/</span>
                                                <div className="flex border border-black">
                                                    <span className="w-5 h-6 flex items-center justify-center border-r border-black">{examMonth[0]}</span>
                                                    <span className="w-5 h-6 flex items-center justify-center">{examMonth[1]}</span>
                                                </div>
                                                <span>/</span>
                                                <div className="flex border border-black">
                                                    <span className="w-5 h-6 flex items-center justify-center border-r border-black">{examYear[0]}</span>
                                                    <span className="w-5 h-6 flex items-center justify-center border-r border-black">{examYear[1]}</span>
                                                    <span className="w-5 h-6 flex items-center justify-center border-r border-black">{examYear[2]}</span>
                                                    <span className="w-5 h-6 flex items-center justify-center">{examYear[3]}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">Reporting Time:</span>
                                            <span className="font-bold text-sm border-b border-black flex-1 px-1">
                                                {formatReportingTime(student.reportingTime) || '—'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">Exam Time:</span>
                                            <span className="font-bold text-sm border-b border-black flex-1 px-1">
                                                {student.timeSlot || '—'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">Exam Venue:</span>
                                            <span className="font-bold text-sm border-b border-black flex-1 px-1">
                                                {student.examVenue || centreName}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Instructions Section */}
                                <div className="mt-6 text-xs text-gray-800 space-y-1 leading-relaxed">
                                    <p className="font-bold underline uppercase">Instructions for the Candidates:</p>
                                    <ol className="list-decimal list-inside space-y-0.5">
                                        <li>Candidates must bring this Admit Card along with a valid School ID proof to the examination hall.</li>
                                        <li>Please report to the examination venue at least 30 minutes prior to the reporting time.</li>
                                        <li>Electronic gadgets, calculators, mobile phones, and smart watches are strictly prohibited inside the hall.</li>
                                        <li>Use only Blue or Black ballpoint pens to mark answers on the OMR sheet.</li>
                                        <li>No candidate will be allowed to leave the examination hall before the completion of the test.</li>
                                    </ol>
                                </div>

                                {/* Signatures Area */}
                                <div className="mt-16 flex justify-between items-end px-8 pb-4">
                                    <div className="text-center">
                                        <div className="w-48 border-b border-black mb-1"></div>
                                        <span className="font-bold text-xs uppercase">Candidate's Signature</span>
                                    </div>

                                    <div className="text-center">
                                        <div className="w-48 border-b border-black mb-1"></div>
                                        <span className="font-bold text-xs uppercase">Centre Head / Authorized Signatory</span>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Footer Corporate Tag */}
                        <div className="text-center text-[10px] text-gray-600 mt-2 font-sans">
                            Head Office: 47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026 | Helpline: 033 2455-1840 / 2454-4817
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PMOAdmitCard;
