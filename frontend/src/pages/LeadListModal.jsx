import React, { useState } from "react";
import { FaTimes, FaSearch, FaHistory } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";

const LeadListModal = ({ title, leads, onClose }) => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedLead, setExpandedLead] = useState(null);

    const filteredLeads = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phoneNumber?.includes(searchTerm)
    );

    const formatDateTime = (dateString) => {
        if (!dateString) return { date: '-', time: '-' };
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
    };

    return (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/80' : 'bg-white/70'}`}>
            <div className={`w-full max-w-6xl h-[90vh] rounded-[4px] border shadow-2xl flex flex-col transition-all overflow-hidden animate-fadeIn ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-cyan-500/10' : 'bg-white border-gray-200'}`}>

                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h2 className={`text-2xl font-black uppercase tracking-tighter italic flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {title}
                        </h2>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest mt-1 inline-block ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
                            {filteredLeads.length} STUDENTS FOUND
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-[4px] transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className={`p-6 border-b transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100'}`}>
                    <div className="relative group w-full md:w-96">
                        <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-gray-600 group-focus-within:text-cyan-400' : 'text-gray-400 group-focus-within:text-cyan-600'}`} />
                        <input
                            type="text"
                            placeholder="SEARCH BY NAME OR PHONE..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={`w-full pl-12 pr-4 py-2.5 rounded-[4px] border text-[10px] font-black uppercase tracking-widest focus:outline-none transition-all ${isDarkMode ? 'bg-[#0f1215] border-gray-800 text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-[#131619] text-gray-500' : 'bg-gray-50 text-gray-400'} text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                            <tr>
                                <th className="p-6">STUDENT DATA VECTOR</th>
                                <th className="p-6 text-center">STATUS</th>
                                <th className="p-6 text-center">FOLLOW-UPS</th>
                                <th className="p-6 text-center">LAST FEEDBACK</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                            {filteredLeads.map(lead => {
                                const isEx = expandedLead === lead._id;
                                const lastFollowUp = lead.followUps && lead.followUps.length > 0 ? lead.followUps[lead.followUps.length - 1] : null;

                                return (
                                    <React.Fragment key={lead._id}>
                                        <tr
                                            onClick={() => setExpandedLead(isEx ? null : lead._id)}
                                            className={`transition-all cursor-pointer ${isEx ? (isDarkMode ? 'bg-cyan-500/5' : 'bg-cyan-50/50') : (isDarkMode ? 'hover:bg-cyan-500/10' : 'hover:bg-gray-50')}`}
                                        >
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-[4px] flex items-center justify-center font-black text-lg border transition-all ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-600 border-cyan-200'}`}>
                                                        {lead.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className={`font-black uppercase tracking-tight text-[11px] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{lead.name}</h4>
                                                        <p className="text-[9px] text-gray-500 font-bold tracking-widest mt-0.5">{lead.phoneNumber}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`text-[9px] font-black px-3 py-1 rounded-[4px] border uppercase ${lead.leadType === 'HOT LEAD' ? (isDarkMode ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-green-50 text-green-600 border-green-200') :
                                                    lead.leadType === 'NEGATIVE LEAD' ? (isDarkMode ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-red-50 text-red-600 border-red-200') :
                                                        (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-200')
                                                    }`}>
                                                    {lead.leadType || 'NEW LEAD'}
                                                </span>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {lead.followUps?.length || 0}
                                                </span>
                                            </td>
                                            <td className="p-6 text-center">
                                                {lastFollowUp ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-[10px] font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{lastFollowUp.feedback}</span>
                                                        <span className="text-[9px] text-gray-500">{formatDateTime(lastFollowUp.date).date}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] text-gray-500 italic">NO FEEDBACK</span>
                                                )}
                                            </td>
                                        </tr>
                                        {isEx && (
                                            <tr>
                                                <td colSpan="4" className={`p-10 transition-all ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                                                    <div className="space-y-6">
                                                        <h5 className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>FOLLOW-UP HISTORY</h5>
                                                        {lead.followUps && lead.followUps.length > 0 ? (
                                                            <div className="grid grid-cols-1 gap-4">
                                                                {[...lead.followUps].reverse().map((followUp, idx) => (
                                                                    <div key={idx} className={`p-4 rounded-[4px] border flex justify-between items-center ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                                                        <div>
                                                                            <div className="flex items-center gap-3">
                                                                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                                    ENTRY #{lead.followUps.length - idx}
                                                                                </span>
                                                                                <span className={`text-[10px] font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                                                                    {formatDateTime(followUp.date).date} | {formatDateTime(followUp.date).time}
                                                                                </span>
                                                                            </div>
                                                                            <p className={`mt-2 text-sm italic ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                                                "{followUp.remarks || followUp.feedback}"
                                                                            </p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                                                                {followUp.feedback}
                                                                            </span>
                                                                            {followUp.nextFollowUpDate && (
                                                                                <div className="mt-2 text-[10px] text-cyan-500 font-bold uppercase">
                                                                                    NEXT: {formatDateTime(followUp.nextFollowUpDate).date}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className={`p-8 text-center border border-dashed rounded-[4px] ${isDarkMode ? 'border-gray-800 text-gray-600' : 'border-gray-300 text-gray-400'}`}>
                                                                NO FOLLOW-UPS RECORDED
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: ${isDarkMode ? '#0f1215' : '#f3f4f6'}; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#d1d5db'}; border-radius: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? '#374151' : '#9ca3af'}; }
                    .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
                    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                `}</style>
            </div>
        </div>
    );
};

export default LeadListModal;
