import React from 'react';
import { FaTimes, FaPhoneAlt, FaEnvelope, FaClock, FaHistory, FaBuilding, FaUser, FaCheckCircle } from 'react-icons/fa';

const DailyTrackingDetailsModal = ({ isOpen, onClose, title, data, loading, isDarkMode }) => {
    if (!isOpen) return null;

    const getTagStyles = (tag) => {
        // If it starts with ₹, it's a collection amount
        if (tag?.startsWith('₹')) {
            return {
                bg: isDarkMode ? 'bg-cyan-500/10' : 'bg-cyan-50',
                text: isDarkMode ? 'text-cyan-400 font-extrabold' : 'text-cyan-600 font-extrabold',
                border: isDarkMode ? 'border-cyan-500/20' : 'border-cyan-200'
            };
        }
        
        switch (tag?.toUpperCase()) {
            case 'HOT LEAD':
            case 'HOT':
                return {
                    bg: isDarkMode ? 'bg-red-500/10' : 'bg-red-50',
                    text: isDarkMode ? 'text-red-400 font-bold' : 'text-red-600 font-bold',
                    border: isDarkMode ? 'border-red-500/20' : 'border-red-200'
                };
            case 'WARM LEAD':
            case 'WARM':
                return {
                    bg: isDarkMode ? 'bg-orange-500/10' : 'bg-orange-50',
                    text: isDarkMode ? 'text-orange-400 font-bold' : 'text-orange-600 font-bold',
                    border: isDarkMode ? 'border-orange-500/20' : 'border-orange-200'
                };
            case 'COLD LEAD':
            case 'COLD':
                return {
                    bg: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50',
                    text: isDarkMode ? 'text-blue-400 font-bold' : 'text-blue-600 font-bold',
                    border: isDarkMode ? 'border-blue-500/20' : 'border-blue-200'
                };
            case 'NORMAL ADM':
            case 'BOARD ADM':
                return {
                    bg: isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50',
                    text: isDarkMode ? 'text-purple-400 font-bold' : 'text-purple-600 font-bold',
                    border: isDarkMode ? 'border-purple-500/20' : 'border-purple-200'
                };
            case 'WALK-IN':
                return {
                    bg: isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50',
                    text: isDarkMode ? 'text-indigo-400 font-bold' : 'text-indigo-600 font-bold',
                    border: isDarkMode ? 'border-indigo-500/20' : 'border-indigo-200'
                };
            default:
                return {
                    bg: isDarkMode ? 'bg-gray-500/10' : 'bg-gray-50',
                    text: isDarkMode ? 'text-gray-300' : 'text-gray-600',
                    border: isDarkMode ? 'border-gray-500/20' : 'border-gray-200'
                };
        }
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/70' : 'bg-white/60'}`}>
            <div className={`w-full max-w-4xl h-[85vh] flex flex-col rounded-[2px] border shadow-2xl scale-in ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h2 className={`text-xl font-black italic uppercase tracking-tighter flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <div className="w-2 h-8 bg-cyan-500 rounded-full animate-pulse"></div>
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
                    {loading ? (
                        <div className="py-20 text-center flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading activities...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="py-20 text-center">
                            <FaHistory className={`mx-auto mb-4 text-4xl ${isDarkMode ? 'text-gray-800' : 'text-gray-200'}`} />
                            <p className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>No activities found for this category</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {data.map((item, index) => {
                                const styles = getTagStyles(item.tag);
                                return (
                                    <div key={index} className={`group p-5 rounded-[2px] border transition-all hover:scale-[1.01] ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-cyan-500/30' : 'bg-white border-gray-100 hover:shadow-lg'}`}>
                                        <div className="flex flex-col lg:flex-row justify-between gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-3 py-1 rounded-[2px] text-[9px] font-black uppercase tracking-widest border ${styles.bg} ${styles.text} ${styles.border} flex items-center gap-2`}>
                                                        <FaCheckCircle size={10} />
                                                        {item.tag || 'UNCATEGORIZED'}
                                                    </span>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        <FaClock className="inline mr-1" />
                                                        {new Date(item.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} - {new Date(item.dateTime).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <h3 className={`text-lg font-black italic tracking-tight uppercase ${isDarkMode ? 'text-white group-hover:text-cyan-400' : 'text-gray-900'}`}>
                                                    {item.name}
                                                </h3>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                                        <FaPhoneAlt className="text-cyan-500 shrink-0" />
                                                        {item.phone || 'N/A'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 truncate">
                                                        <FaEnvelope className="text-cyan-500 shrink-0" />
                                                        <span className="truncate">{item.email || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                                        <FaBuilding className="text-cyan-500 shrink-0" />
                                                        {item.centreName || 'N/A'}
                                                    </div>
                                                </div>

                                                <div className={`p-4 rounded-[2px] border-l-2 border-cyan-500 ${isDarkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'}`}>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Description / Remarks</p>
                                                    <p className={`text-xs font-medium leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.feedback}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col justify-between items-end gap-4 min-w-[150px]">
                                                <div className="text-right">
                                                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Handled By</p>
                                                    <p className="text-[11px] font-black text-cyan-500 uppercase tracking-widest flex items-center gap-1.5 justify-end">
                                                        <FaUser size={10} className="inline" />
                                                        {item.handledBy}
                                                    </p>
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

export default DailyTrackingDetailsModal;
