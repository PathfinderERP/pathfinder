import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useTheme } from '../../context/ThemeContext';
import { toast, ToastContainer } from 'react-toastify';
import axios from 'axios';
import { hasPermission } from '../../config/permissions';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { FaSync, FaSearch, FaFileExcel, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const PettyCashCentre = () => {
    const [centres, setCentres] = useState([]);
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [loading, setLoading] = useState(false);

    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'pettyCashManagement', 'pettyCashCentre', 'create');

    const fetchCentres = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/finance/petty-cash/centres`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCentres(response.data);
        } catch (error) {
            toast.error("Failed to fetch petty cash details");
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${import.meta.env.VITE_API_URL}/finance/petty-cash/sync`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Centres synced successfully");
            fetchCentres();
        } catch (error) {
            toast.error("Sync failed");
        }
    };


    const exportToExcel = () => {
        if (filteredCentres.length === 0) {
            toast.info("No data to export");
            return;
        }

        const dataToExport = filteredCentres.map(item => ({
            "Centre Name": item.centre?.centreName,
            "Centre Code": item.centre?.enterCode,
            "Email": item.centre?.email,
            "Phone": item.centre?.phoneNumber,
            "Total Deposit": item.totalDeposit,
            "Total Expenditure": item.totalExpenditure,
            "Remaining Balance": item.remainingBalance
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Petty Cash Centres");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const excelData = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(excelData, `Petty_Cash_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Report exported to Excel");
    };

    const filteredCentres = centres
        .filter(item =>
            item.centre?.centreName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.centre?.enterCode?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        // Reverse order - last activity/updated first as requested
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const totalPages = Math.ceil(filteredCentres.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedCentres = filteredCentres.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        fetchCentres();
    }, []);

    return (
        <Layout activePage="Petty Cash Management">
            <div className={`flex-1 p-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#0f1215] text-white' : 'bg-gray-50 text-gray-900'}`}>
                <ToastContainer theme={isDarkMode ? "dark" : "light"} />
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Petty Cash Centre Management</h2>
                        <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-xs font-bold uppercase tracking-widest mt-1`}>Real-time Liquidity Tracking & Centre Funding</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={exportToExcel}
                            className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-bold text-sm"
                        >
                            <FaFileExcel /> Export Excel
                        </button>
                        {canCreate && (
                            <button
                                onClick={handleSync}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-colors font-bold text-sm"
                            >
                                <FaSync className={loading ? "animate-spin" : ""} /> Sync
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Bar */}
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-4 rounded-xl border mb-6 flex flex-col md:flex-row gap-4 items-center transition-all`}>
                    <div className="relative flex-1 w-full text-gray-400">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Filter by centre name or code..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className={`w-full border rounded-lg pl-10 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:border-blue-500 ${isDarkMode ? 'bg-white/5 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <span className={`text-xs font-bold uppercase whitespace-nowrap ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Show:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className={`border rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                        >
                            <option value={10}>10 Items</option>
                            <option value={25}>25 Items</option>
                            <option value={50}>50 Items</option>
                        </select>
                    </div>
                </div>

                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl border overflow-hidden transition-all`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'} transition-all`}>
                                    <th className="p-4 font-black text-[10px] tracking-widest uppercase">NAME</th>
                                    <th className="p-4">CODE</th>
                                    <th className="p-4">EMAIL</th>
                                    <th className="p-4">PHONE NUMBER</th>
                                    <th className="p-4">PETTY CASH DEPOSIT</th>
                                    <th className="p-4">PETTY CASH EXPENDITURE</th>
                                    <th className="p-4">PETTY CASH REMAINING</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {loading ? (
                                    <tr><td colSpan="7" className="p-10 text-center text-gray-500">Loading centres...</td></tr>
                                ) : paginatedCentres.length === 0 ? (
                                    <tr><td colSpan="7" className="p-10 text-center text-gray-500">No centres found matching your search.</td></tr>
                                ) : (
                                    paginatedCentres.map((item) => (
                                        <tr key={item._id} className={`transition-all border-b ${isDarkMode ? 'border-gray-800 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'}`}>
                                            <td className={`p-4 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.centre?.centreName}</td>
                                            <td className={`p-4 font-mono text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.centre?.enterCode}</td>
                                            <td className={`p-4 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.centre?.email}</td>
                                            <td className={`p-4 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.centre?.phoneNumber}</td>
                                            <td className="p-4 text-green-400 font-bold">₹ {item.totalDeposit.toLocaleString()}</td>
                                            <td className="p-4 text-red-400 font-bold">₹ {item.totalExpenditure.toLocaleString()}</td>
                                            <td className={`p-4 font-bold ${isDarkMode ? 'text-cyan-400 bg-cyan-400/5' : 'text-cyan-600 bg-cyan-50'}`}>₹ {item.remainingBalance.toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination Controls */}
                {!loading && filteredCentres.length > 0 && (
                    <div className={`mt-6 flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                            Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredCentres.length)} of {filteredCentres.length} Centres
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className={`p-2.5 border rounded-lg disabled:opacity-30 transition-all ${isDarkMode ? 'bg-white/5 border-gray-700 text-gray-400 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                            >
                                <FaChevronLeft />
                            </button>

                            <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, i) => {
                                    const pageNum = i + 1;
                                    if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-10 h-10 rounded-lg text-xs font-black transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : (isDarkMode ? 'bg-white/5 border border-gray-700 text-gray-400 hover:bg-gray-800' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                        return <span key={pageNum} className="text-gray-600">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className={`p-2.5 border rounded-lg disabled:opacity-30 transition-all ${isDarkMode ? 'bg-white/5 border-gray-700 text-gray-400 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                            >
                                <FaChevronRight />
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
};

export default PettyCashCentre;
