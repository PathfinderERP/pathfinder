import React from 'react';
import { FaTimes, FaCity, FaGraduationCap, FaPhoneAlt, FaUsers, FaChevronRight } from 'react-icons/fa';

const CentreAnalysisModal = ({ isOpen, onClose, isDarkMode, data }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2px] border shadow-2xl animate-in fade-in zoom-in duration-200 ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                }`}>
                {/* Header */}
                <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'bg-[#0a0a0b] border-gray-800' : 'bg-gray-50 border-gray-100'
                    }`}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-[2px] border border-cyan-500/20">
                            <FaCity size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic uppercase tracking-tighter">Centre-Wise Analysis</h2>
                            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                Detailed Lead & Follow-up Breakdown
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-800 text-gray-500 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-900'
                            }`}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data.map((centre, index) => (
                            <div
                                key={centre._id || index}
                                className={`p-5 rounded-[2px] border group transition-all hover:border-cyan-500/30 ${isDarkMode ? 'bg-[#0a0a0b] border-gray-800' : 'bg-gray-50 border-gray-200'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-black uppercase italic tracking-tighter text-cyan-500 truncate max-w-[80%]">
                                        {centre.centreName}
                                    </h3>
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-[2px] ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500 border border-gray-100'
                                        }`}>
                                        RANK #{index + 1}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className={`p-4 rounded-[2px] border ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100'}`}>
                                        <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Leads</p>
                                        <div className="flex items-center gap-2">
                                            <FaUsers size={12} className="text-cyan-500" />
                                            <span className="text-lg font-black tracking-tighter">{centre.totalLeads}</span>
                                        </div>
                                    </div>
                                    <div className={`p-4 rounded-[2px] border ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100'}`}>
                                        <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Follow-ups</p>
                                        <div className="flex items-center gap-2">
                                            <FaPhoneAlt size={10} className="text-emerald-500" />
                                            <span className="text-lg font-black tracking-tighter">{centre.totalFollowUps}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <FaGraduationCap /> Class Breakdown
                                    </p>
                                    <div className="space-y-2">
                                        {centre.classBreakdown?.sort((a, b) => b.leads - a.leads).slice(0, 3).map((cls, idx) => (
                                            <div key={idx} className="flex items-center justify-between">
                                                <span className={`text-[10px] font-bold truncate max-w-[120px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {cls.className}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-1.5 w-20 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                                        <div
                                                            className="h-full bg-cyan-500"
                                                            style={{ width: `${(cls.leads / centre.totalLeads) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[10px] font-black text-cyan-500 min-w-[20px] text-right">{cls.leads}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {centre.classBreakdown?.length > 3 && (
                                            <button className="text-[9px] font-black uppercase text-gray-500 hover:text-cyan-500 transition-colors flex items-center gap-1">
                                                +{centre.classBreakdown.length - 3} More Classes <FaChevronRight size={8} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-4 border-t text-center ${isDarkMode ? 'bg-[#0a0a0b] border-gray-800' : 'bg-gray-50 border-gray-100'
                    }`}>
                    <p className={`text-[9px] font-bold uppercase tracking-[0.3em] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        Analytics based on the selected date filters
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CentreAnalysisModal;
