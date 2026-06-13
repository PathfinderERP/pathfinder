import React, { useState } from 'react';
import { FaStar, FaTimes, FaPhoneAlt, FaEnvelope, FaClock, FaCalendarAlt, FaHistory, FaTimesCircle, FaCheckCircle, FaExclamationCircle, FaCommentAlt, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const FollowUpActivityModal = ({ isOpen, onClose, title, data, isDarkMode, onAddFollowUp }) => {
    const [expandedLeads, setExpandedLeads] = useState({});
    if (!isOpen) return null;

    const getStatusStyles = (status) => {
        switch (status?.toUpperCase()) {
            case 'HOT LEAD':
                return {
                    bg: isDarkMode ? 'bg-red-500/10' : 'bg-red-50',
                    text: 'text-red-500',
                    border: 'border-red-500/20',
                    icon: <FaCheckCircle className="text-red-500" />
                };
            case 'WARM LEAD':
                return {
                    bg: isDarkMode ? 'bg-orange-500/10' : 'bg-orange-50',
                    text: 'text-orange-500',
                    border: 'border-orange-500/20',
                    icon: <FaStar className="text-orange-500" />
                };
            case 'NEUTRAL LEAD':
                return {
                    bg: isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50',
                    text: 'text-purple-500',
                    border: 'border-purple-500/20',
                    icon: <FaHistory className="text-purple-500" />
                };
            case 'COLD LEAD':
                return {
                    bg: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50',
                    text: 'text-blue-500',
                    border: 'border-blue-500/20',
                    icon: <FaExclamationCircle className="text-blue-500" />
                };
            case 'INVALID LEAD':
                return {
                    bg: isDarkMode ? 'bg-gray-500/10' : 'bg-gray-50',
                    text: 'text-gray-400',
                    border: 'border-gray-500/20',
                    icon: <FaTimesCircle className="text-gray-400" />
                };
            default:
                return {
                    bg: isDarkMode ? 'bg-gray-500/10' : 'bg-gray-50',
                    text: 'text-gray-400',
                    border: 'border-gray-500/20',
                    icon: <FaHistory className="text-gray-400" />
                };
        }
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/70' : 'bg-white/60'}`}>
            <div className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[2px] border shadow-2xl scale-in ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h2 className={`text-xl font-black italic uppercase tracking-tighter flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <div className="w-2 h-8 bg-cyan-500 rounded-full"></div>
                            {title}
                        </h2>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">Detailed breakdown of recorded activities</p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-[2px] transition-all hover:rotate-90 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {data.length === 0 ? (
                        <div className="py-20 text-center">
                            <FaHistory className={`mx-auto mb-4 text-4xl ${isDarkMode ? 'text-gray-800' : 'text-gray-200'}`} />
                            <p className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>No activities found for this category</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {data.map((item, index) => {
                                const styles = getStatusStyles(item.status);
                                return (
                                    <div key={index} className={`group p-5 rounded-[2px] border transition-all hover:scale-[1.01] ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-cyan-500/30' : 'bg-white border-gray-100 hover:shadow-lg'}`}>
                                        <div className="flex flex-col lg:flex-row justify-between gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-3 py-1 rounded-[2px] text-[9px] font-black uppercase tracking-widest border ${styles.bg} ${styles.text} ${styles.border} flex items-center gap-2`}>
                                                        {styles.icon}
                                                        {item.status || 'UNCATEGORIZED'}
                                                    </span>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                                        <FaClock className="inline mr-1" />
                                                        {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} - {new Date(item.time).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <h3 className={`text-lg font-black italic tracking-tight uppercase ${isDarkMode ? 'text-white group-hover:text-cyan-400' : 'text-gray-900'}`}>
                                                    {item.leadName}
                                                </h3>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                                        <FaPhoneAlt className="text-cyan-500" />
                                                        {item.phoneNumber || 'N/A'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                                        <FaEnvelope className="text-cyan-500" />
                                                        {item.email || 'N/A'}
                                                    </div>
                                                </div>

                                                <div className={`p-4 rounded-[2px] border-l-2 border-cyan-500 ${isDarkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'}`}>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Feedback</p>
                                                    <p className={`text-xs font-medium leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.feedback}</p>
                                                    {item.remarks && (
                                                        <>
                                                            <div className="h-[1px] bg-gray-800 my-2"></div>
                                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Remarks</p>
                                                            <p className={`text-xs font-medium italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.remarks}</p>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Collapsible Follow-up History */}
                                                {item.history && Array.isArray(item.history) && item.history.length > 0 && (
                                                    <div className="mt-4 pt-3 border-t border-dashed border-gray-800/20 dark:border-gray-700/30">
                                                        <button
                                                            onClick={() => {
                                                                const leadId = item.leadId;
                                                                setExpandedLeads(prev => ({
                                                                    ...prev,
                                                                    [leadId]: !prev[leadId]
                                                                }));
                                                            }}
                                                            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                                                isDarkMode 
                                                                    ? 'text-cyan-500 hover:text-cyan-400' 
                                                                    : 'text-cyan-600 hover:text-cyan-700'
                                                            }`}
                                                        >
                                                            <FaHistory size={11} />
                                                            {expandedLeads[item.leadId] ? 'Hide' : 'View'} Follow-up History ({item.history.length})
                                                            {expandedLeads[item.leadId] ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                                                        </button>
                                                        
                                                        {expandedLeads[item.leadId] && (
                                                            <div className="mt-4 space-y-3 pl-3 border-l-2 border-dashed border-gray-200 dark:border-gray-800">
                                                                {[...item.history]
                                                                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                                    .map((hist, histIdx) => {
                                                                        const histStyles = getStatusStyles(hist.status);
                                                                        return (
                                                                            <div key={histIdx} className="relative flex flex-col md:flex-row md:items-center justify-between gap-2 p-3 rounded-[2px] bg-gray-50/50 dark:bg-[#0a0a0b]/40 border border-gray-100 dark:border-gray-900">
                                                                                {/* Dot timeline indicator */}
                                                                                <div className="absolute -left-[18px] top-4 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#131619] bg-cyan-500"></div>
                                                                                
                                                                                <div className="flex-1 space-y-1">
                                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                                        <span className={`px-2 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest border ${histStyles.bg} ${histStyles.text} ${histStyles.border} flex items-center gap-1`}>
                                                                                            {histStyles.icon}
                                                                                            {hist.status || 'UNCATEGORIZED'}
                                                                                        </span>
                                                                                        <span className="text-[9px] font-bold text-gray-400">
                                                                                            {new Date(hist.date).toLocaleDateString()} - {new Date(hist.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                        </span>
                                                                                    </div>
                                                                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{hist.feedback}</p>
                                                                                    {hist.remarks && (
                                                                                        <p className="text-[11px] font-medium italic text-gray-500 dark:text-gray-400">Remarks: {hist.remarks}</p>
                                                                                    )}
                                                                                </div>
                                                                                
                                                                                <div className="flex flex-col items-start md:items-end gap-1 min-w-[100px] text-left md:text-right">
                                                                                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Handled By</span>
                                                                                    <span className="text-[10px] font-black text-cyan-500 uppercase">{hist.updatedBy || 'System'}</span>
                                                                                    {hist.callDuration && (
                                                                                        <span className="text-[9px] font-bold text-emerald-500">{hist.callDuration}</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col justify-between items-end gap-4 min-w-[120px]">
                                                <div className="text-right">
                                                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Handled By</p>
                                                    <p className="text-[11px] font-black text-cyan-500 uppercase tracking-widest">{item.updatedBy}</p>
                                                </div>

                                                {item.callDuration && (
                                                    <div className={`px-4 py-2 rounded-full flex items-center gap-2 border ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                                        <FaPhoneAlt className="animate-pulse" size={10} />
                                                        <span className="text-[10px] font-black tracking-widest">{item.callDuration}</span>
                                                    </div>
                                                )}

                                                {title?.includes('Scheduled') && item.leadId && onAddFollowUp && (
                                                    <button
                                                        onClick={() => onAddFollowUp({ _id: item.leadId })}
                                                        className={`mt-auto px-4 py-2 rounded-[2px] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-105 shadow-lg ${isDarkMode ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-cyan-500/20' : 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-cyan-500/30'}`}
                                                    >
                                                        <FaCommentAlt size={10} /> Add Follow Up
                                                    </button>
                                                )}
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
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Total Entries: {data.length}
                    </p>
                    <button
                        onClick={onClose}
                        className={`px-8 py-2.5 rounded-[2px] text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 ${isDarkMode ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200'}`}
                    >
                        Close Portal
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#333' : '#d1d5db'}; border-radius: 4px; }
            `}</style>
        </div>
    );
};

export default FollowUpActivityModal;
