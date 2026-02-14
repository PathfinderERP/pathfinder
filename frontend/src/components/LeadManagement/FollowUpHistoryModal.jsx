import React from "react";
import { FaTimes, FaCalendarAlt, FaComment, FaClock, FaUser } from "react-icons/fa";

const FollowUpHistoryModal = ({ lead, onClose, isDarkMode }) => {
    if (!lead) return null;

    // Sort follow-ups by date descending (newest first)
    const sortedFollowUps = [...(lead.followUps || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className={`fixed inset-0 z-[70] overflow-y-auto backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/90' : 'bg-white/80'}`}>
            <div className="min-h-screen p-6 md:p-10 relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className={`fixed top-6 right-6 z-50 transition-all p-3 rounded-[4px] shadow-lg border active:scale-95 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-500 hover:bg-gray-100 border-gray-200 shadow-sm'}`}
                >
                    <FaTimes size={24} />
                </button>

                {/* Header */}
                <div className="text-center mb-16">
                    <h2 className={`text-4xl font-black uppercase tracking-tighter italic mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Follow Up History</h2>
                    <p className={`text-xl font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{lead.name}</p>
                    <div className="flex justify-center mt-4">
                        <span className={`px-4 py-1 rounded-[4px] border text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>
                            TOTAL FOLLOW UPS: {lead.followUps?.length || 0}
                        </span>
                    </div>
                </div>

                {/* Content - Timeline / Grid */}
                {sortedFollowUps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                        <FaComment size={48} className={`mb-4 ${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`} />
                        <p className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No Interaction History Found</p>
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 relative">
                        {/* Central Line */}
                        <div className={`hidden md:block absolute left-1/2 top-0 bottom-0 w-[1px] transform -translate-x-1/2 ${isDarkMode ? 'bg-cyan-500/20' : 'bg-cyan-500/10'}`}></div>

                        {sortedFollowUps.map((followUp, index) => (
                            <div
                                key={index}
                                className={`relative border rounded-[4px] p-8 shadow-2xl transition-all group ${index % 2 === 0 ? 'md:mr-auto' : 'md:ml-auto'} ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 hover:border-cyan-500/50' : 'bg-white border-gray-200 hover:border-cyan-500/50'}`}
                                style={{ width: '100%', maxWidth: '550px' }}
                            >
                                {/* Connector Dot (Desktop only) */}
                                <div className={`hidden md:block absolute top-10 w-3 h-3 rounded-full border transition-all ${isDarkMode ? 'border-[#1a1f24]' : 'border-white'} ${index % 2 === 0
                                    ? '-right-[calc(2rem + 6px)] bg-cyan-500' // adjusted to center line
                                    : '-left-[calc(2rem + 6px)] bg-cyan-500'
                                    }`}></div>

                                {/* Card Header */}
                                <div className={`flex justify-between items-start mb-6 border-b pb-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                    <div className={`flex items-center gap-3 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                        <FaCalendarAlt size={14} />
                                        <div className="flex flex-col">
                                            <span className="font-black text-[11px] uppercase tracking-widest">
                                                {new Date(followUp.date).toLocaleDateString("en-GB", {
                                                    day: '2-digit', month: 'short', year: 'numeric'
                                                }).toUpperCase()}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-500 font-mono tracking-tighter">
                                                TIME: {new Date(followUp.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-[4px] border text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-gray-800 text-cyan-400 border-gray-700' : 'bg-gray-50 text-cyan-600 border-gray-200'}`}>
                                        ASSIGNED AGENT: {followUp.updatedBy || "SYSTEM"}
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] mb-3">FEEDBACK</p>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 animate-pulse bg-cyan-500 mr-2`}></div>
                                                <p className={`text-lg font-black italic tracking-tighter leading-[1.3] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{followUp.feedback}</p>
                                            </div>
                                            {followUp.callDuration && (
                                                <div className={`flex items-center gap-2 font-black text-[10px] px-3 py-1 rounded-[4px] border flex-shrink-0 ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                    <FaClock size={10} />
                                                    <span>{followUp.callDuration}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {followUp.remarks && (
                                        <div className={`p-4 rounded-[4px] border border-dashed transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-2">REMARKS</p>
                                            <p className={`text-sm leading-relaxed font-medium italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>"{followUp.remarks}"</p>
                                        </div>
                                    )}

                                    {followUp.nextFollowUpDate && (
                                        <div className={`flex items-center gap-3 mt-6 pt-6 border-t font-black uppercase tracking-widest text-[9px] ${isDarkMode ? 'border-gray-800 text-orange-400' : 'border-gray-100 text-orange-600'}`}>
                                            <FaClock size={12} className="opacity-50" />
                                            <span>
                                                NEXT FOLLOW UP: {new Date(followUp.nextFollowUpDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-in { animation: fade-in 0.5s ease-out; }
            `}</style>
        </div>
    );
};

export default FollowUpHistoryModal;
