import React, { useState, useEffect } from "react";
import { 
    FaTimes, 
    FaUserGraduate, 
    FaGraduationCap, 
    FaWalking, 
    FaCheckCircle, 
    FaExclamationTriangle, 
    FaArrowRight, 
    FaSpinner, 
    FaUsers, 
    FaPhoneAlt, 
    FaMapMarkerAlt, 
    FaBook 
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const BulkCounselingModal = ({
    isOpen,
    onClose,
    selectedLeadIds = [],
    isAllFilteredSelected = false,
    filters = {},
    totalLeads = 0,
    leads = [],
    isDarkMode = true,
    onSuccess
}) => {
    const navigate = useNavigate();

    // Local states
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [walkInDone, setWalkInDone] = useState(false);
    const [isWalkingIn, setIsWalkingIn] = useState(false);
    const [selectedCourseType, setSelectedCourseType] = useState(null); // 'normal' | 'board'
    const [isConverting, setIsConverting] = useState(false);

    // Sync selected leads
    useEffect(() => {
        if (isOpen) {
            const matched = leads.filter(l => selectedLeadIds.includes(l._id));
            setSelectedStudents(matched);

            // Check if all selected leads are already walk-in
            const allWalkIn = matched.length > 0 && matched.every(l => l.isWalkIn || l.source?.toLowerCase() === 'walk in');
            setWalkInDone(allWalkIn);
            setSelectedCourseType(null);
        }
    }, [isOpen, selectedLeadIds, leads, isAllFilteredSelected]);

    if (!isOpen) return null;

    const displayCount = isAllFilteredSelected ? totalLeads : selectedLeadIds.length;
    const pendingWalkInCount = selectedStudents.filter(l => !l.isWalkIn && l.source?.toLowerCase() !== 'walk in').length;

    // Handle marking selected leads as Walk-In
    const handleMarkWalkIn = async () => {
        if (selectedLeadIds.length === 0 && !isAllFilteredSelected) return;
        setIsWalkingIn(true);
        try {
            const token = localStorage.getItem("token");
            const body = isAllFilteredSelected
                ? { filters, isAllFilteredSelected: true }
                : { leadIds: selectedLeadIds };

            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/bulk-walk-in`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(data.message || "Students marked as Walk-In successfully!");
                // Update local state to reflect walk-in status
                setSelectedStudents(prev => prev.map(s => ({
                    ...s,
                    isWalkIn: true,
                    source: "Walk In"
                })));
                setWalkInDone(true);
            } else {
                toast.error(data.message || "Failed to mark students as Walk-In");
            }
        } catch (error) {
            console.error("Bulk Walk-In error:", error);
            toast.error("Error marking students as Walk-In");
        } finally {
            setIsWalkingIn(false);
        }
    };

    // Handle converting selected leads to Counselling
    const handleConvertToCounseling = async () => {
        if (!walkInDone) {
            toast.warn("Please click the Walk In button first before proceeding with counselling.");
            return;
        }

        if (!selectedCourseType) {
            toast.warn("Please choose either Normal Course or Board Course Counselling.");
            return;
        }

        setIsConverting(true);
        try {
            const token = localStorage.getItem("token");
            const body = {
                courseType: selectedCourseType
            };
            if (isAllFilteredSelected) {
                body.filters = filters;
                body.isAllFilteredSelected = true;
            } else {
                body.leadIds = selectedLeadIds;
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/bulk-counseling`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || "Converted to Counselling successfully!");
                if (onSuccess) onSuccess();
                onClose();

                // Direct navigation to the counselling page
                if (data.targetUrl) {
                    navigate(data.targetUrl);
                } else if (selectedCourseType === 'board') {
                    navigate("/board-admissions?tab=Counselling");
                } else {
                    navigate("/admissions");
                }
            } else {
                toast.error(data.message || "Failed to convert students to counselling");
            }
        } catch (error) {
            console.error("Bulk counselling conversion error:", error);
            toast.error("Error converting students to counselling");
        } finally {
            setIsConverting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden transition-all ${
                isDarkMode ? 'bg-[#12161b] border-gray-800 text-white' : 'bg-white border-gray-200 text-slate-900 shadow-xl'
            }`}>
                {/* Header */}
                <div className={`p-5 flex items-center justify-between border-b ${isDarkMode ? 'border-gray-800/80 bg-[#161b22]' : 'border-gray-200 bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                            <FaUsers size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black uppercase tracking-wider">
                                    Bulk Counselling Conversion
                                </h3>
                                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                    {displayCount} Students Selected
                                </span>
                            </div>
                            <p className={`text-[11px] font-semibold ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                Bring selected students from Lead Management directly to Counselling
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isConverting || isWalkingIn}
                        className={`p-2 rounded-lg transition-colors ${
                            isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Selected Students Preview */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                Selected Students ({displayCount})
                            </span>
                            {isAllFilteredSelected && (
                                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                                    All {totalLeads} filter matching records
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {selectedStudents.map((student) => {
                                const isWalkIn = student.isWalkIn || student.source?.toLowerCase() === 'walk in';
                                const centreName = student.centre?.centreName || (typeof student.centre === 'string' ? student.centre : "Main");
                                const courseName = student.course?.courseName || student.courseText || "Regular Course";
                                const className = student.className?.name || (typeof student.className === 'string' ? student.className : "");

                                return (
                                    <div
                                        key={student._id}
                                        className={`p-3 rounded-lg border transition-all flex flex-col justify-between gap-2 ${
                                            isDarkMode 
                                                ? 'bg-[#181d24] border-gray-800/80 hover:border-gray-700' 
                                                : 'bg-slate-50 border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-black truncate capitalize">
                                                    {student.name}
                                                </h4>
                                                <p className={`text-[10px] font-semibold flex items-center gap-1.5 mt-0.5 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                                    <FaPhoneAlt size={9} />
                                                    <span>{student.phoneNumber || "No Mobile"}</span>
                                                </p>
                                            </div>
                                            {isWalkIn ? (
                                                <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-black tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                                    <FaCheckCircle size={8} /> WALK-IN
                                                </span>
                                            ) : (
                                                <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-black tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                                    <FaWalking size={9} /> NOT WALK-IN
                                                </span>
                                            )}
                                        </div>

                                        <div className={`pt-2 border-t text-[9px] font-semibold flex items-center justify-between gap-2 ${
                                            isDarkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-slate-500'
                                        }`}>
                                            <span className="truncate flex items-center gap-1">
                                                <FaMapMarkerAlt size={9} className="text-gray-500 shrink-0" />
                                                {centreName}
                                            </span>
                                            <span className="truncate flex items-center gap-1">
                                                <FaBook size={9} className="text-gray-500 shrink-0" />
                                                {courseName} {className ? `(${className})` : ''}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step 1: Walk In Mandatory Step */}
                    <div className={`p-4 rounded-xl border transition-all ${
                        walkInDone 
                            ? (isDarkMode ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200')
                            : (isDarkMode ? 'bg-amber-500/5 border-amber-500/30' : 'bg-amber-50/50 border-amber-200')
                    }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                                        walkInDone ? 'bg-emerald-500 text-black' : 'bg-amber-500 text-black'
                                    }`}>
                                        {walkInDone ? "✓" : "1"}
                                    </span>
                                    <h4 className="text-xs font-black uppercase tracking-wider">
                                        Step 1: Walk In Requirement
                                    </h4>
                                    {walkInDone && (
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400">
                                            Verified
                                        </span>
                                    )}
                                </div>
                                <p className={`text-[11px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                                    {walkInDone ? (
                                        "All selected students are tagged as Walk-In. You may now choose the course type."
                                    ) : (
                                        <span>
                                            Without clicking on <strong className="text-amber-500 uppercase font-black">Walk In</strong>, you cannot convert them to counselling.
                                        </span>
                                    )}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleMarkWalkIn}
                                disabled={isWalkingIn || isConverting}
                                className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider shrink-0 flex items-center justify-center gap-2 transition-all ${
                                    walkInDone
                                        ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300')
                                        : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 active:scale-95'
                                }`}
                            >
                                {isWalkingIn ? (
                                    <>
                                        <FaSpinner className="animate-spin" size={13} />
                                        <span>Marking Walk In...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaWalking size={14} />
                                        <span>{walkInDone ? "Re-tag Walk In" : isAllFilteredSelected ? `Click Walk In (${totalLeads} Records)` : `Click Walk In (${pendingWalkInCount} Pending)`}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Step 2: Choose Course Type (Board or Normal) */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                                walkInDone ? 'bg-cyan-500 text-black' : 'bg-gray-700 text-gray-400'
                            }`}>
                                2
                            </span>
                            <h4 className="text-xs font-black uppercase tracking-wider">
                                Step 2: Choose Course Counselling Pipeline
                            </h4>
                        </div>

                        {!walkInDone && (
                            <div className={`p-3 rounded-lg border flex items-center gap-2 text-[11px] font-semibold ${
                                isDarkMode ? 'bg-gray-800/40 border-gray-800 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'
                            }`}>
                                <FaExclamationTriangle className="text-amber-500 shrink-0" size={12} />
                                <span>Please click on the <strong>Walk In</strong> button above to unlock the course selection.</span>
                            </div>
                        )}

                        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-opacity ${
                            !walkInDone ? 'opacity-40 pointer-events-none' : 'opacity-100'
                        }`}>
                            {/* Option 1: Normal Course Counselling */}
                            <button
                                type="button"
                                disabled={!walkInDone}
                                onClick={() => setSelectedCourseType('normal')}
                                className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all group relative overflow-hidden ${
                                    selectedCourseType === 'normal'
                                        ? 'bg-cyan-500/15 border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500'
                                        : (isDarkMode ? 'bg-[#181d24] border-gray-800 hover:border-gray-700' : 'bg-slate-50 border-gray-200 hover:border-gray-300')
                                }`}
                            >
                                <div className={`p-3 rounded-lg text-black transition-colors ${
                                    selectedCourseType === 'normal' ? 'bg-cyan-500' : 'bg-cyan-500/30 text-cyan-300'
                                }`}>
                                    <FaUserGraduate size={20} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h5 className={`text-xs font-black uppercase tracking-wider ${
                                            selectedCourseType === 'normal' ? 'text-cyan-400' : (isDarkMode ? 'text-white' : 'text-slate-900')
                                        }`}>
                                            Normal Course Counselling
                                        </h5>
                                        {selectedCourseType === 'normal' && (
                                            <span className="w-4 h-4 rounded-full bg-cyan-500 text-black flex items-center justify-center text-[10px] font-black">
                                                ✓
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-[10px] font-semibold mt-1 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                        Direct pipeline for classroom, foundational & competitive course admissions.
                                    </p>
                                    <span className="inline-block mt-2 text-[9px] font-bold text-cyan-400 tracking-wider">
                                        Redirects to: Admissions Desk
                                    </span>
                                </div>
                            </button>

                            {/* Option 2: Board Course Counselling */}
                            <button
                                type="button"
                                disabled={!walkInDone}
                                onClick={() => setSelectedCourseType('board')}
                                className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all group relative overflow-hidden ${
                                    selectedCourseType === 'board'
                                        ? 'bg-indigo-500/15 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
                                        : (isDarkMode ? 'bg-[#181d24] border-gray-800 hover:border-gray-700' : 'bg-slate-50 border-gray-200 hover:border-gray-300')
                                }`}
                            >
                                <div className={`p-3 rounded-lg text-white transition-colors ${
                                    selectedCourseType === 'board' ? 'bg-indigo-600' : 'bg-indigo-500/30 text-indigo-300'
                                }`}>
                                    <FaGraduationCap size={20} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h5 className={`text-xs font-black uppercase tracking-wider ${
                                            selectedCourseType === 'board' ? 'text-indigo-400' : (isDarkMode ? 'text-white' : 'text-slate-900')
                                        }`}>
                                            Board Course Counselling
                                        </h5>
                                        {selectedCourseType === 'board' && (
                                            <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-black">
                                                ✓
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-[10px] font-semibold mt-1 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                        Dedicated pipeline for board exam pattern programs & board registrations.
                                    </p>
                                    <span className="inline-block mt-2 text-[9px] font-bold text-indigo-400 tracking-wider">
                                        Redirects to: Board Admissions
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className={`p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
                    isDarkMode ? 'border-gray-800/80 bg-[#161b22]' : 'border-gray-200 bg-slate-50'
                }`}>
                    <div className="text-[11px] font-semibold text-gray-400 text-center sm:text-left">
                        {!walkInDone ? (
                            <span className="text-amber-400 flex items-center gap-1.5">
                                <FaExclamationTriangle size={11} />
                                1. Click "Walk In" button above
                            </span>
                        ) : !selectedCourseType ? (
                            <span className="text-cyan-400 flex items-center gap-1.5">
                                <FaArrowRight size={10} />
                                2. Select Normal or Board Course
                            </span>
                        ) : (
                            <span className="text-emerald-400 flex items-center gap-1.5">
                                <FaCheckCircle size={11} />
                                Ready to convert {displayCount} {displayCount === 1 ? 'student' : 'students'} to {selectedCourseType === 'board' ? 'Board' : 'Normal'} Counselling
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isConverting || isWalkingIn}
                            className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${
                                isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-slate-700'
                            }`}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleConvertToCounseling}
                            disabled={!walkInDone || !selectedCourseType || isConverting || isWalkingIn}
                            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                !walkInDone || !selectedCourseType
                                    ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-700'
                                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 active:scale-95 cursor-pointer'
                            }`}
                        >
                            {isConverting ? (
                                <>
                                    <FaSpinner className="animate-spin" size={13} />
                                    <span>Converting Students...</span>
                                </>
                            ) : (
                                <>
                                    <span>Counselling</span>
                                    <FaArrowRight size={12} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkCounselingModal;
