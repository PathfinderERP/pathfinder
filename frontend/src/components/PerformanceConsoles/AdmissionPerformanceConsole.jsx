import React, { useState, useEffect } from 'react';
import { FaFileExcel, FaUsers, FaUserTie, FaSearch, FaFilter } from 'react-icons/fa';
import * as XLSX from 'xlsx';

const AdmissionPerformanceConsole = ({ mainTheme = 'light', filters = {} }) => {
    const isDarkMode = mainTheme === 'dark';
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchReport();
    }, [filters]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({ ...filters });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admission/performance-report?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setReportData(data);
            }
        } catch (error) {
            console.error("Error fetching admission report:", error);
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        const exportData = reportData.map(item => ({
            'Name': item.name,
            'Role': item.role,
            'Centres': item.centres,
            'Normal Admissions': item.normalAdmissions,
            'Board Admissions': item.boardAdmissions,
            'Total Admissions': item.totalAdmissions
        }));

        if (exportData.length === 0) return alert("No data to export");
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Admission Report");
        XLSX.writeFile(workbook, `Admission_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredData = reportData.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                    <h5 className={`text-sm font-black uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <FaUsers className="text-cyan-500" /> ADMISSION PERFORMANCE REPORT
                    </h5>
                    
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64 group">
                            <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-gray-600 group-focus-within:text-cyan-500' : 'text-gray-400 group-focus-within:text-cyan-500'}`} />
                            <input
                                type="text"
                                placeholder="SEARCH USER..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-12 pr-4 py-2.5 rounded-[2px] border text-[10px] font-black uppercase tracking-widest outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 shadow-sm'}`}
                            />
                        </div>
                        <button
                            onClick={exportToExcel}
                            className={`px-6 py-2.5 rounded-[2px] bg-green-600 text-black hover:bg-green-500 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-green-500/20`}
                        >
                            <FaFileExcel size={14} /> EXPORT EXCEL
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className={`${isDarkMode ? 'bg-black/20' : 'bg-gray-50'}`}>
                                <th className={`p-4 text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-500'}`}>User</th>
                                <th className={`p-4 text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-500'}`}>Role</th>
                                <th className={`p-4 text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-500'}`}>Centres</th>
                                <th className={`p-4 text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-500'}`}>Normal</th>
                                <th className={`p-4 text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-500'}`}>Board</th>
                                <th className={`p-4 text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-500'}`}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-10 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Loading Report...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length > 0 ? (
                                filteredData.map((row, idx) => (
                                    <tr key={idx} className={`border-b transition-colors ${isDarkMode ? 'border-gray-800/50 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50/50'}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${isDarkMode ? 'bg-cyan-500/10 text-cyan-500' : 'bg-cyan-50 text-cyan-600'}`}>
                                                    {row.name.charAt(0)}
                                                </div>
                                                <span className={`text-[11px] font-black uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{row.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-[2px] text-[9px] uppercase font-black ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                                {row.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{row.centres}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-sm font-black ${row.normalAdmissions > 0 ? 'text-cyan-500' : 'text-gray-500'}`}>{row.normalAdmissions}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-sm font-black ${row.boardAdmissions > 0 ? 'text-orange-500' : 'text-gray-500'}`}>{row.boardAdmissions}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{row.totalAdmissions}</span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-10 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No records found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdmissionPerformanceConsole;
