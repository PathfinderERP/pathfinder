import React, { useState, useMemo } from 'react';
import { FaTimes, FaSearch, FaUser, FaPhoneAlt, FaEnvelope, FaBuilding, FaGraduationCap, FaAward, FaCalendarAlt } from 'react-icons/fa';

const ConversionDetailsModal = ({ isOpen, onClose, title, leads, isDarkMode }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredLeads = useMemo(() => {
        if (!leads) return [];
        return leads.filter(lead => {
            const q = searchQuery.trim().toLowerCase();
            if (!q) return true;
            return (
                (lead.name || '').toLowerCase().includes(q) ||
                (lead.phoneNumber || '').includes(q) ||
                (lead.email || '').toLowerCase().includes(q) ||
                (lead.schoolName || '').toLowerCase().includes(q)
            );
        });
    }, [leads, searchQuery]);

    const totalAdmissionAmount = useMemo(() => {
        if (!filteredLeads) return 0;
        return filteredLeads.reduce((sum, lead) => sum + (Number(lead.downPayment) || 0), 0);
    }, [filteredLeads]);

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/75' : 'bg-white/60'}`}>
            <div className={`w-full max-w-4xl max-h-[85vh] flex flex-col rounded-xl border shadow-2xl animate-scaleIn ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                
                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h2 className={`text-xl font-black italic uppercase tracking-tighter flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <div className="w-2.5 h-8 bg-purple-500 rounded-full"></div>
                            {title}
                        </h2>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">
                            List of leads matching your dashboard filters
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`px-3 py-1.5 rounded-lg border font-bold text-xs flex items-center gap-2 ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                            <span className="text-[9px] font-black uppercase tracking-widest">Total Amount:</span>
                            <span className="text-sm font-black italic tracking-tight">₹{Math.round(totalAdmissionAmount).toLocaleString("en-IN")}</span>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-lg transition-all hover:rotate-90 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            <FaTimes size={18} />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className={`px-6 py-3 border-b ${isDarkMode ? 'bg-[#0f1317] border-gray-800' : 'bg-gray-50/80 border-gray-100'}`}>
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or mobile..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={`w-full bg-[#131619] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-xs font-bold outline-none transition-all focus:border-purple-500 ${isDarkMode ? 'text-white placeholder-gray-600' : 'text-gray-800 placeholder-gray-400'}`}
                        />
                    </div>
                </div>

                {/* Leads List */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                    {filteredLeads.length === 0 ? (
                        <div className="py-20 text-center">
                            <FaSearch className={`mx-auto mb-4 text-4xl ${isDarkMode ? 'text-gray-800' : 'text-gray-300'}`} />
                            <p className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                No leads found
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredLeads.map((lead, idx) => {
                                const boardCourseFallback = lead.board?.boardCourse ? `${lead.board.boardCourse}${lead.className?.name ? ' Class ' + lead.className.name : ''} Board Course` : '';
                                const courseDisplay = lead.admittedCourseName || lead.course?.courseName || boardCourseFallback || lead.board?.name || '—';
                                return (
                                    <div
                                        key={lead._id || idx}
                                        className={`p-4 rounded-xl border transition-all hover:scale-[1.01] hover:shadow-lg ${isDarkMode ? 'bg-[#131619] border-gray-800/80 hover:border-purple-500/30' : 'bg-white border-gray-100'}`}
                                    >
                                        <div className="flex justify-between items-start gap-2 mb-3">
                                            <h3 className={`text-sm font-bold uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                {lead.name}
                                            </h3>
                                            <div className="flex gap-1.5 items-center shrink-0">
                                                {lead.downPayment > 0 && (
                                                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        Down Payment: ₹{Math.round(lead.downPayment).toLocaleString("en-IN")}
                                                    </span>
                                                )}
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${lead.leadType === "HOT LEAD" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"}`}>
                                                    {lead.leadType || "Lead"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-[11px] font-medium text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <FaPhoneAlt size={10} className="text-purple-500" />
                                                <span>{lead.phoneNumber || '—'}</span>
                                                {lead.secondPhoneNumber && <span className="text-gray-600">/ {lead.secondPhoneNumber}</span>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FaEnvelope size={10} className="text-purple-500" />
                                                <span className="truncate">{lead.email || '—'}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800/30 dark:border-gray-800/50">
                                                <div className="flex items-center gap-1.5">
                                                    <FaBuilding size={10} className="text-gray-500 shrink-0" />
                                                    <span className="truncate">{lead.centre?.centreName || '—'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <FaGraduationCap size={10} className="text-gray-500 shrink-0" />
                                                    <span className="truncate">{lead.className?.name || '—'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 col-span-2">
                                                    <FaAward size={10} className="text-purple-400 shrink-0" />
                                                    <span className={`truncate font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`} title={courseDisplay}>
                                                        {courseDisplay}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 col-span-2">
                                                    <FaCalendarAlt size={10} className="text-gray-500 shrink-0" />
                                                    <span>{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '—'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 border-t flex justify-between items-center ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Total Count: {filteredLeads.length}
                        </span>
                        {totalAdmissionAmount > 0 && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                Total Amount: ₹{Math.round(totalAdmissionAmount).toLocaleString("en-IN")}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all hover:scale-105 ${isDarkMode ? 'bg-purple-600 text-white hover:bg-purple-500' : 'bg-gray-900 text-white hover:bg-black'}`}
                    >
                        Close
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-scaleIn { animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#333' : '#d1d5db'}; border-radius: 4px; }
            `}</style>
        </div>
    );
};

export default ConversionDetailsModal;
