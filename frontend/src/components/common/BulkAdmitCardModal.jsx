import React, { useState, useRef, useEffect } from 'react';
import { FaDownload, FaTimes, FaSpinner, FaCheckCircle, FaExclamationTriangle, FaFileArchive, FaFilePdf, FaUsers } from 'react-icons/fa';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import PNTSEAdmitCardTemplate from '../PNTSE/PNTSEAdmitCardTemplate';
import PMOAdmitCardTemplate from '../PMO/PMOAdmitCardTemplate';
import { getAdmitCardFileName } from '../../utils/admitCardUtils';

const BulkAdmitCardModal = ({
    isOpen,
    onClose,
    type = 'PNTSE', // 'PNTSE' | 'PMO'
    allFilteredStudents = [],
    selectedStudents = []
}) => {
    const [scope, setScope] = useState(selectedStudents && selectedStudents.length > 0 ? 'selected' : 'filtered');
    const [format, setFormat] = useState('zip'); // 'zip' | 'combined'
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStatus, setCurrentStatus] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);
    const [resultSummary, setResultSummary] = useState(null);

    // Default to 'selected' whenever the modal opens if there are selected students
    useEffect(() => {
        if (isOpen) {
            if (selectedStudents && selectedStudents.length > 0) {
                setScope('selected');
            } else {
                setScope('filtered');
            }
            setIsCompleted(false);
            setProgress(0);
            setCurrentStatus('');
            setResultSummary(null);
        }
    }, [isOpen, selectedStudents?.length]);

    // Active student being rendered into offscreen container
    const [activeStudent, setActiveStudent] = useState(null);
    const offscreenRef = useRef(null);
    const isCancelledRef = useRef(false);

    if (!isOpen) return null;

    const studentsToProcess = scope === 'selected' && selectedStudents.length > 0
        ? selectedStudents
        : allFilteredStudents;

    const handleCancel = () => {
        isCancelledRef.current = true;
        setCurrentStatus('Cancelling bulk download...');
    };

    const handleClose = () => {
        if (isGenerating) {
            if (!window.confirm("A bulk download is currently in progress. Do you want to cancel and close?")) {
                return;
            }
            handleCancel();
        }
        setIsGenerating(false);
        setProgress(0);
        setCurrentStatus('');
        setIsCompleted(false);
        setActiveStudent(null);
        onClose();
    };

    const handleStartDownload = async () => {
        if (!studentsToProcess || studentsToProcess.length === 0) {
            alert("No students available to download.");
            return;
        }

        setIsGenerating(true);
        isCancelledRef.current = false;
        setProgress(0);
        setIsCompleted(false);
        setResultSummary(null);

        const total = studentsToProcess.length;
        let successCount = 0;
        let errorCount = 0;

        const JsPDFConstructor = jsPDF.jsPDF || jsPDF;
        const zip = format === 'zip' ? new JSZip() : null;
        let combinedPdf = format === 'combined' ? new JsPDFConstructor('p', 'mm', 'a4') : null;
        const usedFileNames = {};

        try {
            for (let i = 0; i < total; i++) {
                if (isCancelledRef.current) {
                    break;
                }

                const student = studentsToProcess[i];
                const studentName = student.name || `Student_${i + 1}`;
                const studentClass = student.class?.name || student.class || '';
                setCurrentStatus(`Generating admit card ${i + 1} of ${total}: ${studentName} (${studentClass ? `Class ${studentClass}` : '—'})`);

                // 1. Mount student data in offscreen DOM
                setActiveStudent(student);

                // 2. Allow React DOM reconciliation
                await new Promise((resolve) => setTimeout(resolve, 80));

                if (!offscreenRef.current) {
                    errorCount++;
                    continue;
                }

                try {
                    // 3. Rasterize HTML to PNG
                    const dataUrl = await toPng(offscreenRef.current, {
                        pixelRatio: 1.8,
                        backgroundColor: '#ffffff'
                    });

                    if (!dataUrl || dataUrl === 'data:,') {
                        throw new Error("Rendered image is blank.");
                    }

                    // 4. Create single-card image
                    await new Promise((resolveImg, rejectImg) => {
                        const img = new Image();
                        img.onload = () => {
                            try {
                                if (format === 'zip') {
                                    // Individual 1-page PDF
                                    const singlePdf = new JsPDFConstructor('p', 'mm', 'a4');
                                    const pdfWidth = singlePdf.internal.pageSize.getWidth();
                                    const pdfHeight = (img.height * pdfWidth) / img.width;

                                    const yOffset = 8;
                                    const maxAllowedHeight = singlePdf.internal.pageSize.getHeight() - (yOffset * 2);
                                    let finalWidth = pdfWidth;
                                    let finalHeight = pdfHeight;
                                    if (pdfHeight > maxAllowedHeight) {
                                        finalHeight = maxAllowedHeight;
                                        finalWidth = (img.width * finalHeight) / img.height;
                                    }

                                    const xOffset = (pdfWidth - finalWidth) / 2;
                                    singlePdf.addImage(dataUrl, 'PNG', xOffset, yOffset, finalWidth, finalHeight);

                                    // Unique file name according to student name with class
                                    let fileName = getAdmitCardFileName(student, type);
                                    if (usedFileNames[fileName]) {
                                        usedFileNames[fileName]++;
                                        const baseName = fileName.replace(/\.pdf$/i, '');
                                        const rollPart = student.rollNo ? `_${student.rollNo}` : `_${usedFileNames[fileName]}`;
                                        fileName = `${baseName}${rollPart}.pdf`;
                                    } else {
                                        usedFileNames[fileName] = 1;
                                    }

                                    const blob = singlePdf.output('blob');
                                    zip.file(fileName, blob);
                                } else {
                                    // Combined multi-page PDF
                                    if (successCount > 0) {
                                        combinedPdf.addPage();
                                    }
                                    const pdfWidth = combinedPdf.internal.pageSize.getWidth();
                                    const pdfHeight = (img.height * pdfWidth) / img.width;

                                    const yOffset = 8;
                                    const maxAllowedHeight = combinedPdf.internal.pageSize.getHeight() - (yOffset * 2);
                                    let finalWidth = pdfWidth;
                                    let finalHeight = pdfHeight;
                                    if (pdfHeight > maxAllowedHeight) {
                                        finalHeight = maxAllowedHeight;
                                        finalWidth = (img.width * finalHeight) / img.height;
                                    }

                                    const xOffset = (pdfWidth - finalWidth) / 2;
                                    combinedPdf.addImage(dataUrl, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
                                }
                                successCount++;
                                resolveImg();
                            } catch (e) {
                                rejectImg(e);
                            }
                        };
                        img.onerror = rejectImg;
                        img.src = dataUrl;
                    });
                } catch (cardErr) {
                    console.error(`Failed generating admit card for ${studentName}:`, cardErr);
                    errorCount++;
                }

                // Update progress percentage
                setProgress(Math.round(((i + 1) / total) * 90));
            }

            if (isCancelledRef.current) {
                setCurrentStatus('Download cancelled.');
                setIsGenerating(false);
                return;
            }

            const dateStr = new Date().toISOString().split('T')[0];

            if (format === 'zip') {
                setCurrentStatus('Finalizing and compressing ZIP archive...');
                setProgress(95);
                const zipBlob = await zip.generateAsync(
                    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
                    (metadata) => {
                        setProgress(95 + Math.round(metadata.percent * 0.05));
                    }
                );
                saveAs(zipBlob, `${type}_Admit_Cards_${dateStr}.zip`);
            } else {
                setCurrentStatus('Saving combined PDF document...');
                setProgress(98);
                combinedPdf.save(`${type}_Admit_Cards_Combined_${dateStr}.pdf`);
            }

            setProgress(100);
            setIsCompleted(true);
            setResultSummary({
                total,
                success: successCount,
                errors: errorCount,
                format: format === 'zip' ? 'ZIP Archive' : 'Combined PDF'
            });
            setCurrentStatus('Bulk download completed successfully!');
        } catch (err) {
            console.error("Bulk admit card generation failed:", err);
            alert(`Bulk generation encountered an error: ${err.message}`);
        } finally {
            setIsGenerating(false);
            setActiveStudent(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <FaDownload className="text-lg" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base">Bulk Admit Card Download</h3>
                            <p className="text-xs text-gray-400">{type} Examination</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                        title="Close"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6">
                    {/* If completed screen */}
                    {isCompleted && resultSummary ? (
                        <div className="text-center py-4 space-y-4">
                            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                                <FaCheckCircle className="text-3xl" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-white">Download Complete</h4>
                                <p className="text-xs text-gray-400 mt-1">
                                    Your admit cards have been generated and downloaded.
                                </p>
                            </div>
                            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-xs text-left space-y-2 max-w-sm mx-auto">
                                <div className="flex justify-between text-gray-300">
                                    <span>Format:</span>
                                    <span className="font-semibold text-white">{resultSummary.format}</span>
                                </div>
                                <div className="flex justify-between text-gray-300">
                                    <span>Total Processed:</span>
                                    <span className="font-semibold text-white">{resultSummary.total}</span>
                                </div>
                                <div className="flex justify-between text-gray-300">
                                    <span>Successfully Generated:</span>
                                    <span className="font-semibold text-emerald-400">{resultSummary.success}</span>
                                </div>
                                {resultSummary.errors > 0 && (
                                    <div className="flex justify-between text-gray-300">
                                        <span>Errors / Skipped:</span>
                                        <span className="font-semibold text-red-400">{resultSummary.errors}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-blue-500/25"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Scope Selector */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                    1. Select Student Scope
                                </label>
                                {selectedStudents.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setScope('selected')}
                                            disabled={isGenerating}
                                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                                scope === 'selected'
                                                    ? 'bg-blue-500/10 border-blue-500/50 text-white'
                                                    : 'bg-gray-800/50 border-gray-700/60 text-gray-400 hover:border-gray-600'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-semibold text-sm">Selected Students</span>
                                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">
                                                    {selectedStudents.length}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-400">Only manually checked rows</p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setScope('filtered')}
                                            disabled={isGenerating}
                                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                                scope === 'filtered'
                                                    ? 'bg-blue-500/10 border-blue-500/50 text-white'
                                                    : 'bg-gray-800/50 border-gray-700/60 text-gray-400 hover:border-gray-600'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-semibold text-sm">All Filtered</span>
                                                <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs font-bold">
                                                    {allFilteredStudents.length}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-400">All matching active filters</p>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <FaUsers className="text-blue-400 text-base" />
                                            <div>
                                                <p className="text-sm font-semibold text-white">All Filtered Students</p>
                                                <p className="text-xs text-gray-400">According to your active search & filters</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-bold">
                                            {allFilteredStudents.length} {allFilteredStudents.length === 1 ? 'Student' : 'Students'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Format Selector */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                    2. Choose Download Format
                                </label>
                                <div className="space-y-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormat('zip')}
                                        disabled={isGenerating}
                                        className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                                            format === 'zip'
                                                ? 'bg-blue-500/10 border-blue-500/50 text-white'
                                                : 'bg-gray-800/50 border-gray-700/60 text-gray-400 hover:border-gray-600'
                                        }`}
                                    >
                                        <FaFileArchive className={`text-xl mt-0.5 shrink-0 ${format === 'zip' ? 'text-blue-400' : 'text-gray-500'}`} />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-white">ZIP Archive (Individual PDFs)</span>
                                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
                                                    RECOMMENDED
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                                Each student gets a separate PDF named according to <span className="text-gray-200 font-medium">[StudentName]_[Class]_Admit_Card.pdf</span> inside a .zip file.
                                            </p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFormat('combined')}
                                        disabled={isGenerating}
                                        className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                                            format === 'combined'
                                                ? 'bg-blue-500/10 border-blue-500/50 text-white'
                                                : 'bg-gray-800/50 border-gray-700/60 text-gray-400 hover:border-gray-600'
                                        }`}
                                    >
                                        <FaFilePdf className={`text-xl mt-0.5 shrink-0 ${format === 'combined' ? 'text-blue-400' : 'text-gray-500'}`} />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-white">Combined PDF (All-in-One)</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                                Combines all admit cards into a single multi-page PDF (1 page per student), ready for batch printing.
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Progress View while Generating */}
                            {isGenerating && (
                                <div className="space-y-3 bg-gray-800/80 border border-gray-700/60 rounded-xl p-4">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-300 font-medium flex items-center gap-2">
                                            <FaSpinner className="animate-spin text-blue-400" />
                                            Processing...
                                        </span>
                                        <span className="font-bold text-blue-400">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2.5 rounded-full transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-gray-400 truncate" title={currentStatus}>
                                        {currentStatus}
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 pt-2">
                                {isGenerating ? (
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="w-full py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-semibold rounded-xl text-sm transition-all cursor-pointer"
                                    >
                                        Cancel Download
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleClose}
                                            className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-sm transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleStartDownload}
                                            disabled={studentsToProcess.length === 0}
                                            className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <FaDownload className="text-xs" />
                                            Download {studentsToProcess.length} {studentsToProcess.length === 1 ? 'Card' : 'Cards'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Offscreen DOM Node for PNG Rendering */}
            <div
                style={{
                    position: 'fixed',
                    left: '-9999px',
                    top: '0px',
                    width: '900px',
                    pointerEvents: 'none',
                    opacity: 1,
                    zIndex: -100
                }}
            >
                {activeStudent && (
                    type === 'PMO' ? (
                        <PMOAdmitCardTemplate ref={offscreenRef} student={activeStudent} />
                    ) : (
                        <PNTSEAdmitCardTemplate ref={offscreenRef} student={activeStudent} />
                    )
                )}
            </div>
        </div>
    );
};

export default BulkAdmitCardModal;
