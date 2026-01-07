import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { FaSearch, FaSync, FaWallet, FaBuilding, FaEnvelope, FaPhone } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Budget = () => {
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
            <div className="p-4 space-y-6">
                <ToastContainer position="top-right" theme="dark" />

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                <FaWallet size={24} />
                            </span>
                            Budget
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">Allocation and management of centre-wise budgets</p>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="bg-[#1a1f24] p-4 rounded-2xl border border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
                    <div className="relative w-full md:w-96 group">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name, code or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-900/50 border border-gray-700 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={handleRefresh}
                            className={`flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all text-xs font-bold uppercase tracking-widest ${isRefreshing ? 'opacity-50' : ''}`}
                        >
                            <FaSync className={isRefreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                        <div className="flex-1 md:flex-none h-12 flex items-center px-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                            {filteredCentres.length} Centres Loaded
                        </div>
                    </div>
                </div>

                {/* Add Budget Table */}
                <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
                    <div className="p-4 border-b border-gray-800 bg-gray-900/30 flex justify-between items-center">
                        <h2 className="text-xs font-black uppercase tracking-[3px] text-gray-400">Budget vs Actuals Overview</h2>
                        <span className="text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                            Current Month: {centres[0]?.currentMonth || "..."}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-900/50 border-b border-gray-800">
                                    <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Center Name</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Code</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Planned Budget</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 text-green-500/70">Actual Income</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 text-red-500/70">Actual Expense</th>
                                    <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-gray-500 text-xs font-bold uppercase tracking-[4px] animate-pulse mt-2">Initializing Budget Data...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCentres.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">No matching centres found</td>
                                    </tr>
                                ) : (
                                    filteredCentres.map((centre) => (
                                        <tr key={centre._id} className="hover:bg-blue-500/5 transition-all group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-800 group-hover:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-all duration-300 shadow-lg">
                                                        <FaBuilding size={16} />
                                                    </div>
                                                    <span className="text-white font-black text-sm tracking-tight">{centre.centreName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-gray-400 font-mono text-xs bg-gray-800/50 px-2 py-1 rounded border border-gray-700">{centre.enterCode}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-white font-black tabular-nums">
                                                    ₹{(centre.budgetAmount || 0).toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-green-400 font-bold tabular-nums">
                                                    ₹{(centre.actualIncome || 0).toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-red-400 font-bold tabular-nums">
                                                ₹{(centre.actualExpense || 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button
                                                    onClick={() => handleBudgetClick(centre._id)}
                                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 hover:translate-y-[-2px]"
                                                >
                                                    Budget
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
