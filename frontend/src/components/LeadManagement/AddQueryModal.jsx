import React, { useState } from "react";
import { FaTimes, FaQuestionCircle, FaStar, FaHistory, FaCheckCircle, FaSpinner, FaUser, FaPhone, FaBuilding, FaBookOpen } from "react-icons/fa";
import { toast } from "react-toastify";

const AddQueryModal = ({ isOpen, onClose, lead, onSuccess, isDarkMode }) => {
    const [remarks, setRemarks] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !lead) return null;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/${lead._id}/add-query`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    remarks: remarks.trim()
                })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(data.message || "Query added! Lead marked as Priority and Pending.");
                setRemarks("");
                if (onSuccess) onSuccess(data.lead);
                onClose();
            } else {
                toast.error(data.message || "Failed to add query to lead");
            }
        } catch (error) {
            console.error("Error adding lead query:", error);
            toast.error("Error adding query to lead");
        } finally {
            setSubmitting(false);
        }
    };

    const previousFollowUpsCount = lead.followUps?.length || 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
            <div
                className={`w-full max-w-lg rounded-[4px] border shadow-2xl transition-all overflow-hidden ${
                    isDarkMode ? 'bg-[#12161a] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${
                    isDarkMode ? 'border-gray-800 bg-[#161c22]' : 'border-gray-200 bg-gray-50'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <FaQuestionCircle size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                                Add Lead Query
                            </h3>
                            <p className="text-[10px] text-gray-400 font-medium">
                                Mark as Priority and convert to Pending
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="text-gray-400 hover:text-white transition-colors p-1 rounded"
                    >
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Lead Info Summary Card */}
                    <div className={`p-3.5 rounded border ${
                        isDarkMode ? 'bg-[#181f26] border-gray-800' : 'bg-gray-50 border-gray-200'
                    }`}>
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <div className="text-[12px] font-black uppercase tracking-tight flex items-center gap-2">
                                    <FaUser size={10} className="text-cyan-500" />
                                    {lead.name}
                                </div>
                                <div className="text-[10px] font-bold text-cyan-500 flex items-center gap-2 mt-1">
                                    <FaPhone size={9} />
                                    {lead.phoneNumber || "No Phone"}
                                </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                New Query
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-800/40 text-[9px] font-bold text-gray-400">
                            <div className="flex items-center gap-1.5 truncate">
                                <FaBuilding size={9} className="shrink-0 text-gray-500" />
                                <span className="truncate">{lead.centre?.centreName || "No Centre"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate">
                                <FaBookOpen size={9} className="shrink-0 text-gray-500" />
                                <span className="truncate">{lead.course?.courseName || lead.courseText || "No Course"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notice on Conversions and History Safety */}
                    <div className={`p-3 rounded border text-[10px] space-y-2 ${
                        isDarkMode ? 'bg-amber-500/5 border-amber-500/20 text-amber-200/90' : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}>
                        <div className="flex items-center gap-2 font-black uppercase tracking-wider text-[9px] text-amber-400">
                            <FaCheckCircle size={11} /> Impact Summary
                        </div>
                        <ul className="space-y-1 pl-4 list-disc text-[10px] opacity-90">
                            <li>
                                Lead will appear as <strong className="font-black text-red-400">★ PRIORITY</strong>.
                            </li>
                            <li>
                                Status will be converted to <strong className="font-black text-yellow-400">PENDING</strong> so callers attend to it immediately.
                            </li>
                            <li>
                                <strong className="font-black text-emerald-400">
                                    Previous conversation ({previousFollowUpsCount} {previousFollowUpsCount === 1 ? 'call' : 'calls'}) will remain safe and NOT be deleted.
                                </strong>
                            </li>
                        </ul>
                    </div>

                    {/* Query Remarks Input */}
                    <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                            Query Details / Remarks <span className="text-gray-500 font-normal lowercase">(optional)</span>
                        </label>
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            rows={3}
                            placeholder="e.g. Student enquired about new batch timings / fees / syllabus..."
                            className={`w-full p-3 rounded-[3px] text-xs font-medium border transition-all resize-none outline-none focus:ring-1 focus:ring-amber-500 ${
                                isDarkMode
                                    ? 'bg-[#0f1316] border-gray-800 text-white placeholder-gray-600 focus:border-amber-500'
                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-amber-500'
                            }`}
                        />
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className={`px-4 py-2 rounded-[2px] text-[10px] font-black uppercase tracking-widest transition-all ${
                                isDarkMode
                                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-amber-500 hover:bg-amber-400 text-black px-5 py-2 rounded-[2px] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <FaSpinner className="animate-spin" size={12} />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <FaStar size={11} />
                                    Confirm & Add Query
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddQueryModal;
