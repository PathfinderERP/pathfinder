import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { FaPlus, FaEdit, FaArrowLeft, FaWallet, FaCalendarAlt, FaTimes, FaCheck } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "../../context/ThemeContext";

const BudgetDetails = () => {
    const { isDarkMode } = useTheme();
    const { centreId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [budgets, setBudgets] = useState([]);
    const [centreInfo, setCentreInfo] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedBudget, setSelectedBudget] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        year: new Date().getFullYear(),
        month: "January",
        financialYear: "2025-2026",
        budgetAmount: 0
    });

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const financialYears = ["2023-2024", "2024-2025", "2025-2026", "2026-2027"];

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [centreId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/finance/budget/detail/${centreId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setBudgets(data.budgets || []);
                setCentreInfo(data.centre);
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Failed to load budget details");
        } finally {
            setLoading(false);
        }
    };

    const handleAddClick = () => {
        setIsEditing(false);
        setFormData({
            year: new Date().getFullYear(),
            month: months[new Date().getMonth()],
            financialYear: "2025-2026",
            budgetAmount: 0
        });
        setShowModal(true);
    };

    const handleEditClick = (budget) => {
        setIsEditing(true);
        setSelectedBudget(budget);
        setFormData({
            year: budget.year,
            month: budget.month,
            financialYear: budget.financialYear,
            budgetAmount: budget.budgetAmount
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/finance/budget`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    centreId,
                    ...formData,
                    ...(isEditing && { budgetId: selectedBudget?._id })
                })
            });

            if (response.ok) {
                toast.success(isEditing ? "Budget updated" : "Budget added");
                setShowModal(false);
                fetchData();
            } else {
                const data = await response.json();
                toast.error(data.message || "Operation failed");
            }
        } catch (error) {
            console.error("Submit error:", error);
            toast.error("Network error");
        }
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className={`p-4 md:p-10 max-w-[1700px] mx-auto min-h-screen pb-20 transition-all duration-500 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate("/finance/budget")}
                            className={`p-4 border rounded-2xl transition-all shadow-xl active:scale-95 ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400 hover:text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 shadow-sm'}`}
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className={`text-3xl md:text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                <span className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                                    <FaWallet size={24} />
                                </span>
                                Budget - <span className="text-blue-500">{centreInfo?.centreName || "Loading..."}</span>
                            </h1>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">
                                Detailed monthly records for {centreInfo?.centreName || "this centre"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Table Container */}
                <div className={`border rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className={`p-8 border-b flex justify-between items-center transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Monthly Fiscal Allocation</h2>
                        <button
                            onClick={handleAddClick}
                            className="flex items-center gap-3 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95"
                        >
                            <FaPlus />
                            New Allocation
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className={`text-[10px] font-black text-gray-500 uppercase tracking-widest ${isDarkMode ? 'bg-white/5 border-b border-gray-800' : 'bg-gray-50 border-b border-gray-100'}`}>
                                    <th className="px-8 py-6 text-left">Year</th>
                                    <th className="px-8 py-6 text-left">Month</th>
                                    <th className="px-8 py-6 text-left">Financial Year</th>
                                    <th className="px-8 py-6 text-left">Budget</th>
                                    <th className="px-8 py-6 text-left">Expense</th>
                                    <th className="px-8 py-6 text-left">Income</th>
                                    <th className="px-8 py-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-8 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Syncing Ledger...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : budgets.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-8 py-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs italic">No budget records found</td>
                                    </tr>
                                ) : (
                                    budgets.map((b) => (
                                        <tr key={b._id} className={`transition-all group ${isDarkMode ? 'hover:bg-white/5 bg-transparent' : 'hover:bg-blue-500/[0.02] bg-white'}`}>
                                            <td className={`px-8 py-6 font-black text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{b.year}</td>
                                            <td className={`px-8 py-6 font-bold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{b.month}</td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                                                    {b.financialYear}
                                                </span>
                                            </td>
                                            <td className={`px-8 py-6 font-black text-lg tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{b.budgetAmount.toLocaleString()}</td>
                                            <td className="px-8 py-6 text-red-500 font-black text-lg tabular-nums">₹{b.expense.toLocaleString()}</td>
                                            <td className="px-8 py-6 text-green-500 font-black text-lg tabular-nums">₹{b.income.toLocaleString()}</td>
                                            <td className="px-8 py-6 text-right">
                                                <button
                                                    onClick={() => handleEditClick(b)}
                                                    className="px-6 py-2.5 bg-blue-500/10 text-blue-500 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white shadow-lg shadow-blue-500/5 active:scale-95"
                                                >
                                                    Modify
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300 ${isDarkMode ? 'bg-black/80' : 'bg-gray-900/40'}`}>
                        <div className={`w-full max-w-lg rounded-[2.5rem] border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 transition-all ${isDarkMode ? 'bg-[#0f1215] border-gray-800' : 'bg-white border-gray-200'}`}>
                            <div className={`p-8 border-b flex justify-between items-center transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                <h3 className={`text-2xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {isEditing ? "Edit allocation" : "New allocation"}
                                </h3>
                                <button onClick={() => setShowModal(false)} className={`p-3 rounded-xl transition-all ${isDarkMode ? 'bg-white/5 text-gray-500 hover:text-white' : 'bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50'}`}>
                                    <FaTimes />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-10 space-y-8">
                                <div className="grid grid-cols-1 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">Calendar Year</label>
                                        <input
                                            type="number"
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                            className={`w-full border rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-all font-black text-sm tracking-widest ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">Monthly cycle</label>
                                        <select
                                            value={formData.month}
                                            onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                            className={`w-full border rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-all font-black text-sm tracking-widest appearance-none ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                        >
                                            {months.map(m => <option key={m} value={m} className={isDarkMode ? 'bg-[#1a1f24]' : ''}>{m}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">Fiscal Year</label>
                                        <select
                                            value={formData.financialYear}
                                            onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                                            className={`w-full border rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-all font-black text-sm tracking-widest appearance-none ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                        >
                                            {financialYears.map(fy => <option key={fy} value={fy} className={isDarkMode ? 'bg-[#1a1f24]' : ''}>{fy}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">Allocated Budget (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.budgetAmount}
                                            onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                                            className={`w-full border rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-all font-black text-base tracking-tight ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-[2rem] transition-all flex items-center justify-center gap-4 shadow-2xl shadow-blue-600/30 active:scale-[0.98] text-[11px] uppercase tracking-[0.2em]"
                                >
                                    <FaCheck size={14} />
                                    {isEditing ? "Commit Changes" : "Create Allocation"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout >
    );
};

export default BudgetDetails;
