import React from 'react';
import { FaTimes, FaChartLine } from 'react-icons/fa';

const LeadConversionReportModal = ({ isOpen, onClose, conversionStats, isDarkMode }) => {
    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[80] p-4 overflow-y-auto backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/70' : 'bg-white/60'}`}>
            <div className={`w-full max-w-4xl rounded-lg border shadow-2xl transition-all overflow-hidden scale-in ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-cyan-500/10' : 'bg-white border-gray-200 shadow-lg'}`}>

                {/* Header */}
                <div className={`px-8 py-5 border-b flex justify-between items-center transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <span className="p-2 bg-cyan-500/10 text-cyan-500 rounded-[2px]">
                            <FaChartLine size={16} />
                        </span>
                        <div>
                            <h3 className={`text-lg font-black uppercase tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Lead Conversion Report
                            </h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                                Summary of leads converted to counselling and final admission
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`transition-all p-2 rounded-lg active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Table Content */}
                <div className={`p-8 ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`}>
                    <div className="overflow-x-auto custom-scrollbar border rounded-[2px] overflow-hidden border-gray-200 dark:border-gray-800">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b ${isDarkMode ? 'border-gray-800 bg-[#131619]' : 'border-gray-150 bg-gray-50'}`}>
                                    <th className={`px-6 py-4 text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Lead Type</th>
                                    <th className={`px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Leads</th>
                                    <th className={`px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Converted to Counselling</th>
                                    <th className={`px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Counselling %</th>
                                    <th className={`px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Converted to Admitted</th>
                                    <th className={`px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Admission %</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                                {['HOT LEAD', 'WARM LEAD', 'COLD LEAD', 'NEUTRAL LEAD', 'INVALID LEAD'].map(type => {
                                    const record = (conversionStats || []).find(r => r._id === type) || { total: 0, counselled: 0, admitted: 0 };
                                    const counselPercent = record.total > 0 ? ((record.counselled / record.total) * 100).toFixed(1) : "0.0";
                                    const admitPercent = record.total > 0 ? ((record.admitted / record.total) * 100).toFixed(1) : "0.0";

                                    const typeColors = {
                                        "HOT LEAD": "text-red-500 font-extrabold",
                                        "WARM LEAD": "text-orange-500 font-extrabold",
                                        "COLD LEAD": "text-blue-500 font-extrabold",
                                        "NEUTRAL LEAD": "text-purple-500 font-extrabold",
                                        "INVALID LEAD": "text-gray-500 font-extrabold"
                                    };

                                    return (
                                        <tr key={type} className={`hover:bg-cyan-500/[0.02] transition-colors ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`}>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${typeColors[type] || 'text-gray-500'}`}>{type}</span>
                                            </td>
                                            <td className={`px-6 py-4 text-center text-[11px] font-black italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{record.total}</td>
                                            <td className={`px-6 py-4 text-center text-[11px] font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{record.counselled}</td>
                                            <td className="px-6 py-4 text-center text-[10px] font-black">
                                                <span className={`px-2.5 py-0.5 rounded-[2px] ${isDarkMode ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border border-cyan-200 text-cyan-600'}`}>
                                                    {counselPercent}%
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-center text-[11px] font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{record.admitted}</td>
                                            <td className="px-6 py-4 text-center text-[10px] font-black">
                                                <span className={`px-2.5 py-0.5 rounded-[2px] ${isDarkMode ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border border-emerald-200 text-emerald-600'}`}>
                                                    {admitPercent}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Overall Summary Row */}
                                <tr className={`font-black ${isDarkMode ? 'bg-[#131619]' : 'bg-cyan-500/[0.03]'}`}>
                                    <td className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>OVERALL SUMMARY</td>
                                    <td className={`px-6 py-4 text-center text-[11px] font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        { (conversionStats || []).reduce((sum, r) => sum + r.total, 0) }
                                    </td>
                                    <td className={`px-6 py-4 text-center text-[11px] font-black ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                        { (conversionStats || []).reduce((sum, r) => sum + r.counselled, 0) }
                                    </td>
                                    <td className={`px-6 py-4 text-center text-[10px] font-black ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                        { (() => {
                                            const total = (conversionStats || []).reduce((sum, r) => sum + r.total, 0);
                                            const counselled = (conversionStats || []).reduce((sum, r) => sum + r.counselled, 0);
                                            return total > 0 ? ((counselled / total) * 100).toFixed(1) : "0.0";
                                        })() }%
                                    </td>
                                    <td className={`px-6 py-4 text-center text-[11px] font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                        { (conversionStats || []).reduce((sum, r) => sum + r.admitted, 0) }
                                    </td>
                                    <td className={`px-6 py-4 text-center text-[10px] font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                        { (() => {
                                            const total = (conversionStats || []).reduce((sum, r) => sum + r.total, 0);
                                            const admitted = (conversionStats || []).reduce((sum, r) => sum + r.admitted, 0);
                                            return total > 0 ? ((admitted / total) * 100).toFixed(1) : "0.0";
                                        })() }%
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LeadConversionReportModal;
