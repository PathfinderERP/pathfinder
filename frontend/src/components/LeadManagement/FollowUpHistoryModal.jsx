import React from "react";
import { FaTimes, FaCalendarAlt, FaComment, FaClock, FaUser } from "react-icons/fa";

const FollowUpHistoryModal = ({ lead, onClose }) => {
    if (!lead) return null;

    // Sort follow-ups by date descending (newest first)
    const sortedFollowUps = [...(lead.followUps || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="fixed inset-0 bg-black/90 z-[70] overflow-y-auto backdrop-blur-md">
            <div className="min-h-screen p-6 md:p-10 relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="fixed top-6 right-6 z-50 bg-gray-800 text-gray-400 hover:text-white p-3 rounded-full hover:bg-gray-700 transition-colors shadow-lg border border-gray-700"
                >
                    <FaTimes size={24} />
                </button>

                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-white mb-2">Follow Up History</h2>
                    <p className="text-cyan-400 text-xl font-medium">{lead.name}</p>
                    <p className="text-gray-500 mt-1">Total Follow-ups: {lead.followUps?.length || 0}</p>
                </div>

                {/* Content - Timeline / Grid */}
                {sortedFollowUps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <FaComment size={48} className="mb-4 opacity-20" />
                        <p className="text-xl">No follow-up history available</p>
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 relative">
                        {/* Central Line (decoration, optional) */}
                        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500/20 via-cyan-500/50 to-transparent transform -translate-x-1/2 rounded-full"></div>

                        {sortedFollowUps.map((followUp, index) => (
                            <div
                                key={index}
                                className={`relative bg-[#1a1f24] border border-gray-800 rounded-2xl p-6 shadow-xl hover:shadow-cyan-500/10 transition-all hover:border-cyan-500/30 group ${index % 2 === 0 ? 'md:mr-auto' : 'md:ml-auto'
                                    }`}
                            >
                                {/* Connector Dot (Desktop only) */}
                                <div className={`hidden md:block absolute top-8 w-4 h-4 rounded-full border-2 border-[#1a1f24] ${index % 2 === 0
                                    ? '-right-[calc(1.5rem+12px+2px)] bg-cyan-500' // gap/2 + line width/2
                                    : '-left-[calc(1.5rem+12px+2px)] bg-cyan-500'
                                    }`}></div>

                                {/* Card Header */}
                                <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-3">
                                    <div className="flex items-center gap-2 text-cyan-400">
                                        <FaCalendarAlt />
                                        <span className="font-semibold">
                                            {new Date(followUp.date).toLocaleDateString("en-US", {
                                                day: 'numeric', month: 'short', year: 'numeric'
                                            })}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-1">
                                            {new Date(followUp.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="px-3 py-1 rounded-full bg-gray-800 text-xs text-gray-300 border border-gray-700">
                                        {followUp.updatedBy || "Admin"}
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Feedback</p>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                                            <p className="text-white text-lg font-medium">{followUp.feedback}</p>
                                        </div>
                                    </div>

                                    {followUp.remarks && (
                                        <div className="bg-black/20 p-3 rounded-lg border border-gray-800/50">
                                            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Remarks</p>
                                            <p className="text-gray-300 text-sm leading-relaxed">{followUp.remarks}</p>
                                        </div>
                                    )}

                                    {followUp.nextFollowUpDate && (
                                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-800 text-orange-400">
                                            <FaClock />
                                            <p className="text-sm font-medium">
                                                Next Call: {new Date(followUp.nextFollowUpDate).toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FollowUpHistoryModal;
