import React from 'react';
import { FaTimes, FaCheckCircle, FaExclamationTriangle, FaCheck, FaUser, FaBuilding } from 'react-icons/fa';

const RedFlagDetailsModal = ({ isOpen, onClose, title, data, isDarkMode, onResolve }) => {
    if (!isOpen) return null;

    // Group the data by user + role
    const groupedData = Object.values(data.reduce((acc, flag) => {
        const userId = flag.user?._id || flag.user || 'unknown';
        const role = flag.role || 'unknown';
        const key = `${userId}_${role}`;
        if (!acc[key]) {
            acc[key] = {
                user: flag.user,
                role: flag.role,
                centre: flag.centre,
                centreName: flag.centreName,
                severity: flag.severity,
                createdAt: flag.createdAt,
                issuesList: [flag]
            };
        } else {
            acc[key].issuesList.push(flag);
            // Elevate severity to the highest active severity
            const severityRank = { 'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3 };
            const currRank = severityRank[flag.severity] || 0;
            const existingRank = severityRank[acc[key].severity] || 0;
            if (currRank > existingRank) {
                acc[key].severity = flag.severity;
            }
            if (new Date(flag.createdAt) > new Date(acc[key].createdAt)) {
                acc[key].createdAt = flag.createdAt;
            }
        }
        return acc;
    }, {}));

    const getSeverityStyles = (severity) => {
        switch (severity) {
            case 'Critical':
                return {
                    pillBg: 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                };
            case 'High':
                return {
                    pillBg: 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                };
            case 'Medium':
                return {
                    pillBg: 'bg-yellow-500 text-white shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                };
            case 'Low':
            default:
                return {
                    pillBg: 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                };
        }
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/70' : 'bg-white/60'}`}>
            <div className={`w-full max-w-5xl h-[85vh] flex flex-col rounded-3xl border shadow-2xl scale-in ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center rounded-t-3xl ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h2 className={`text-xl font-black italic uppercase tracking-tighter flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <div className="w-2 h-8 bg-cyan-500 rounded-full animate-pulse"></div>
                            {title}
                        </h2>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">Detailed breakdown of active red flags</p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-xl transition-all hover:rotate-90 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {groupedData.length === 0 ? (
                        <div className="py-20 text-center">
                            <FaCheckCircle className={`mx-auto mb-4 text-5xl text-green-500`} />
                            <p className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>No flags found for this category</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {groupedData.map((group, index) => {
                                const severityStyles = getSeverityStyles(group.severity);
                                return (
                                    <div key={index} className={`group p-6 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-cyan-500/20' : 'bg-white border-gray-100 hover:shadow-lg'}`}>
                                        
                                        {/* User Header */}
                                        <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                                            <div className="flex items-center gap-3">
                                                {/* User Avatar */}
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                                    {group.user?.profileImage ? (
                                                        <img src={group.user.profileImage} alt="" className="w-full h-full rounded-xl object-cover" />
                                                    ) : (
                                                        <FaUser size={20} />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className={`text-base font-black italic uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        {group.user?.name || 'Unknown User'}
                                                    </h3>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>
                                                        {group.role?.toUpperCase()} - {group.centre?.centreName || group.centreName || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right flex flex-col items-end gap-1.5">
                                                <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${severityStyles.pillBg}`}>
                                                    {group.severity}
                                                </span>
                                                <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">
                                                    #{group.user?.employeeId || 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Issues List */}
                                        <div className="mt-5 space-y-4">
                                            {group.issuesList.map((item, idx) => {
                                                const isVirtual = item.isVirtual || item._id?.startsWith('virtual_') || false;
                                                const percent = item.targetValue > 0 
                                                    ? Math.min(100, Math.max(0, (item.metricValue / item.targetValue) * 100))
                                                    : 0;
                                                return (
                                                    <div key={idx} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#0e1113] border-gray-800/60' : 'bg-gray-50 border-gray-100'}`}>
                                                        <div className="flex justify-between items-start gap-4 flex-wrap">
                                                            <div className="flex-1 min-w-[200px]">
                                                                <p className={`text-xs font-black uppercase tracking-wide ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                                                    {item.issue}
                                                                </p>
                                                                
                                                                {/* Progress Bar (if not teacher/non-metric) */}
                                                                {item.role !== 'teacher' && item.targetValue > 0 && (
                                                                    <div className="mt-3">
                                                                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                                                            <div 
                                                                                className={`h-1.5 rounded-full transition-all duration-500 ${
                                                                                    item.severity === 'Critical' ? 'bg-red-500' :
                                                                                    item.severity === 'High' ? 'bg-orange-500' :
                                                                                    item.severity === 'Medium' ? 'bg-yellow-500' :
                                                                                    'bg-green-500'
                                                                                }`}
                                                                                style={{ width: `${percent}%` }}
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-4 shrink-0">
                                                                <div className="text-right">
                                                                    <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                        Current Metric
                                                                    </p>
                                                                    <p className={`text-[11px] font-black uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                        {item.role === 'teacher' ? (
                                                                            `${item.metricValue} Correct`
                                                                        ) : (
                                                                            `${item.metricValue} / ${item.targetValue}`
                                                                        )}
                                                                    </p>
                                                                </div>

                                                                <div className="min-w-[100px] flex justify-end">
                                                                    {item.isResolved ? (
                                                                        <span className="text-green-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-1">
                                                                            <FaCheckCircle size={10} /> Resolved
                                                                        </span>
                                                                    ) : isVirtual ? (
                                                                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                                            Live Metric
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => onResolve(item._id)}
                                                                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200'}`}
                                                                        >
                                                                            <FaCheck size={10} /> Resolve
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Issue Info Footer */}
                                                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200/20 dark:border-gray-800/20 text-[9px] font-black uppercase tracking-widest text-gray-500">
                                                            <span>
                                                                {isVirtual ? 'LIVE METRIC' : 'MANUAL FLAG'}
                                                            </span>
                                                            <span>
                                                                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(item.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 border-t flex justify-between items-center rounded-b-3xl ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Total Groups: {groupedData.length}
                    </p>
                    <button
                        onClick={onClose}
                        className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 ${isDarkMode ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200'}`}
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

export default RedFlagDetailsModal;
