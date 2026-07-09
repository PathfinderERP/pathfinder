import React, { useRef, useState } from 'react';
import { FaPrint, FaTimes, FaDownload, FaSpinner } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
            const canvas = await html2canvas(element, { 
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            if (!canvas || canvas.width === 0 || canvas.height === 0) {
                throw new Error("Generated canvas has 0 width or height.");
            }

            const imgData = canvas.toDataURL('image/png');
            
            // Safe constructor instantiation supporting both ESM/CJS formats
            const JsPDFConstructor = jsPDF.jsPDF || jsPDF;
            const pdf = new JsPDFConstructor('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            // If the scaled height exceeds A4 height, we scale by height instead
            let finalWidth = pdfWidth;
            let finalHeight = pdfHeight;
            if (pdfHeight > pdf.internal.pageSize.getHeight()) {
                finalHeight = pdf.internal.pageSize.getHeight();
                finalWidth = (canvas.width * finalHeight) / canvas.height;
            }

            // Center horizontally if scaled by height
            const xOffset = (pdfWidth - finalWidth) / 2;
            const yOffset = 10; // small top margin

            pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
            pdf.save(`PNTSE_Admit_Card_${student?.rollNo || student?.name?.replace(/\s+/g, '_')}.pdf`);
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
    
    // Attempt to pad roll number or use empty boxes if none
    const rollBoxes = Array(6).fill('');
    if (student.rollNo) {
        const rollStr = student.rollNo.toString().replace(/[^a-zA-Z0-9]/g, ''); // just taking alphanumeric
        const rollChars = rollStr.substring(rollStr.length - 6).padStart(6, ' ').split('');
        for(let i=0; i<6; i++) {
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
                    <div ref={printRef} className="w-[800px] bg-white text-black p-8 font-sans">
                        {/* Define print specific styles inside */}
                        <style type="text/css" media="print">
                            {`
                                @page { size: A4 portrait; margin: 10mm; }
                                body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            `}
                        </style>
                        
                        <div className="border-4 border-black p-4 relative h-full flex flex-col">
                            {/* Admit Card Sidebar text */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 bg-black text-white text-3xl font-extrabold tracking-[0.3em] py-2 px-12 uppercase" style={{ transformOrigin: 'left top', marginTop: '150px', left: '30px' }}>
                                ADMIT CARD
                            </div>
 
                            <div className="ml-16 pl-4 pr-6 flex-1">
                                {/* Header / Logo area */}
                                <div className="text-center mb-6">
                                    <div className="flex justify-center items-center mb-2 gap-2">
                                        <div className="w-12 h-12 bg-black flex items-center justify-center border-2 border-black">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" className="w-8 h-8 text-white" fill="white" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z"/></svg>
                                        </div>
                                        <div>
                                            <h1 className="text-4xl font-extrabold tracking-tight m-0 leading-none">PATHFINDER<sup className="text-xl">&reg;</sup></h1>
                                            <p className="text-sm font-bold tracking-widest text-gray-800 m-0">Where Aspiration Meets Success</p>
                                        </div>
                                    </div>
                                    <h2 className="text-xl font-bold mt-4 uppercase">
                                        PATHFINDER NATIONAL TALENT SEARCH<br/>EXAMINATION (PNTSE)
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

                                        {/* Row 2: Exam Date */}
                                        <div className="flex gap-4 items-center">
                                            <span className="font-bold text-sm w-32">Examination Date:</span>
                                            <div className="flex gap-1">
                                                <div className="flex"><div className="w-8 h-8 border border-black text-center text-gray-400 flex items-center justify-center font-bold">D</div><div className="w-8 h-8 border border-black border-l-0 text-center text-gray-400 flex items-center justify-center font-bold">D</div></div>
                                                <div className="flex"><div className="w-8 h-8 border border-black text-center text-gray-400 flex items-center justify-center font-bold">M</div><div className="w-8 h-8 border border-black border-l-0 text-center text-gray-400 flex items-center justify-center font-bold">M</div></div>
                                                <div className="flex"><div className="w-8 h-8 border border-black text-center text-gray-400 flex items-center justify-center font-bold">Y</div><div className="w-8 h-8 border border-black border-l-0 text-center text-gray-400 flex items-center justify-center font-bold">Y</div><div className="w-8 h-8 border border-black border-l-0 text-center text-gray-400 flex items-center justify-center font-bold">Y</div><div className="w-8 h-8 border border-black border-l-0 text-center text-gray-400 flex items-center justify-center font-bold">Y</div></div>
                                            </div>
                                        </div>

                                        {/* Row 3: Class */}
                                        <div className="flex gap-4 items-center">
                                            <span className="font-bold text-sm w-32">Class (<span className="font-serif italic font-bold text-lg">✓</span>)  :</span>
                                            <div className="flex border border-black">
                                                {['V', 'VI', 'VII', 'VIII', 'IX', 'X'].map((cls, i) => (
                                                    <div key={cls} className={`px-2 py-1 flex items-center justify-center font-bold ${i > 0 ? 'border-l border-black' : ''}`}>
                                                        {cls}
                                                        {romanClass === cls && <span className="absolute ml-4 font-bold text-xl">✓</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Details block */}
                                        <div className="flex flex-col gap-4 mt-4 w-full">
                                            <div className="flex items-end gap-2">
                                                <span className="font-bold text-sm whitespace-nowrap">Name of the Student:</span>
                                                <div className="border-b border-black flex-1 font-bold text-lg px-2 pb-0.5">{student.name.toUpperCase()}</div>
                                            </div>
                                            
                                            <div className="flex gap-4">
                                                <div className="flex items-end gap-2 flex-1">
                                                    <span className="font-bold text-sm whitespace-nowrap">Reporting Time:</span>
                                                    <div className="border-b border-black flex-1 px-2 pb-0.5 min-w-[100px]"></div>
                                                </div>
                                                <div className="flex items-end gap-2 flex-1">
                                                    <span className="font-bold text-sm whitespace-nowrap">Time Slot:</span>
                                                    <div className="border-b border-black flex-1 px-2 pb-0.5 min-w-[100px]"></div>
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <div className="flex items-end gap-2 flex-[1.5]">
                                                    <span className="font-bold text-sm whitespace-nowrap">Exam Venue:</span>
                                                    <div className="border-b border-black flex-1 px-2 pb-0.5 min-w-[100px]"></div>
                                                </div>
                                                <div className="flex items-end gap-2 flex-1">
                                                    <span className="font-bold text-sm whitespace-nowrap">Signature of PEC Official:</span>
                                                    <div className="border-b border-black flex-1 px-2 pb-0.5 min-w-[80px]"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Photo box */}
                                    <div className="w-[140px] shrink-0 mt-8">
                                        <div className="w-[140px] h-[180px] border border-black flex items-center justify-center text-center p-4">
                                            <span className="text-sm font-semibold text-gray-700">Paste your recent passport size colour photograph here</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 border-t border-black pt-2 text-center">
                                    <p className="font-bold text-sm">Without Admit Card Entry not permitted inside the Examination Hall.</p>
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
