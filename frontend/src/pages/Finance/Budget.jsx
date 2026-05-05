import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { FaSearch, FaSync, FaWallet, FaBuilding, FaEnvelope, FaPhone } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "../../context/ThemeContext";

const Budget = () => {
    const { isDarkMode } = useTheme();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [centres, setCentres] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/finance/budget/centres`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setCentres(data);
            } else {
                toast.error(data.message || "Failed to fetch centres");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Network error. Please try again.");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchData();
    };

    const handleBudgetClick = (centreId) => {
        navigate(`/finance/budget/${centreId}`);
    };

    const filteredCentres = centres.filter(centre =>
        centre.centreName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        centre.enterCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (centre.email && centre.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <Layout activePage="Finance & Fees">
            <div className={`p-4 md:p-10 max-w-[1700px] mx-auto min-h-screen pb-20 transition-all duration-500 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <h1 className={`text-4xl font-black italic uppercase tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Bud<span className="text-blue-500">get</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Allocation and management of centre-wise budgets</p>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className={`p-6 rounded-[2rem] border flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="relative w-full md:w-96 group">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name, code or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full border pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all text-xs font-medium ${isDarkMode ? 'bg-white/5 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={handleRefresh}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10' : 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 shadow-sm'} ${isRefreshing ? 'opacity-50' : ''}`}
                        >
                            <FaSync className={isRefreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                        <div className="flex-1 md:flex-none h-12 flex items-center px-6 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                            {filteredCentres.length} Centres Loaded
                        </div>
                    </div>
                </div>

                {/* Add Budget Table */}
                <div className={`rounded-[2rem] border shadow-2xl overflow-hidden mt-8 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                        <h2 className="text-[10px] font-black uppercase tracking-[3px] text-gray-500">Budget vs Actuals Overview</h2>
                        <span className="text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20">
                            Current Month: {centres[0]?.currentMonth || "..."}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className={`text-[10px] font-black text-gray-500 uppercase tracking-widest ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                                    <th className="px-8 py-6 text-left">Center Name</th>
                                    <th className="px-8 py-6 text-left">Code</th>
                                    <th className="px-8 py-6 text-left">Planned Budget</th>
                                    <th className="px-8 py-6 text-left">Actual Income</th>
                                    <th className="px-8 py-6 text-left">Actual Expense</th>
                                    <th className="px-8 py-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-32 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-gray-500 text-xs font-bold uppercase tracking-[4px] animate-pulse mt-4">Initializing Budget Data...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCentres.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">No matching centres found</td>
                                    </tr>
                                ) : (
                                    filteredCentres.map((centre) => (
                                        <tr key={centre._id} className={`transition-all group ${isDarkMode ? 'hover:bg-white/5 bg-transparent' : 'hover:bg-blue-500/[0.02] bg-white'}`}>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-all duration-300 shadow-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100 border border-gray-200'}`}>
                                                        <FaBuilding size={16} />
                                                    </div>
                                                    <span className={`font-black text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{centre.centreName}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`font-mono text-xs px-3 py-1 rounded-lg border ${isDarkMode ? 'bg-gray-900/50 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>{centre.enterCode}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`font-black tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    ₹{(centre.budgetAmount || 0).toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-green-500 font-bold tabular-nums">
                                                    ₹{(centre.actualIncome || 0).toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-red-500 font-bold tabular-nums">
                                                ₹{(centre.actualExpense || 0).toLocaleString()}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button
                                                    onClick={() => handleBudgetClick(centre._id)}
                                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 hover:translate-y-[-2px]"
                                                >
                                                    Budget <FaWallet />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Budget;
