import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { FaPlus, FaEdit, FaArrowLeft, FaWallet, FaCalendarAlt, FaTimes, FaCheck } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BudgetDetails = () => {
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
                setBudgets(data);
                // Also fetch centre info if not already available
                // For now, we'll assume the first budget record or a separate fetch
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
                    ...formData
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
            toast.error("Network error");
        }
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 space-y-6">
                <ToastContainer position="top-right" theme="dark" />

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/finance/budget")}
                            className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl transition-all"
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                <span className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                    <FaWallet size={24} />
                                </span>
                                Budget
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">Detailed monthly budget allocation</p>
                        </div>
                    </div>
                </div>

                {/* Table Container */}
                <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-gray-800 bg-gray-900/30 flex justify-between items-center">
                        <h2 className="text-sm font-black uppercase tracking-[3px] text-gray-400">Cash Centre Budget</h2>
                        <button
                            onClick={handleAddClick}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all text-xs font-black shadow-lg shadow-blue-500/20 shadow-xl active:scale-95"
                        >
                            <FaPlus />
                            Add new Budget
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-900/50 border-b border-gray-800">
                                    <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Year</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Month</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Financial Year</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Budget</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Expense</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Income</th>
                                    <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-20 text-center">
                                            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                        </td>
                                    </tr>
                                ) : budgets.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">No budget records found</td>
                                    </tr>
                                ) : (
                                    budgets.map((b) => (
                                        <tr key={b._id} className="hover:bg-blue-500/5 transition-all">
                                            <td className="px-6 py-5 text-white font-bold">{b.year}</td>
                                            <td className="px-6 py-5 text-gray-300 font-medium">{b.month}</td>
                                            <td className="px-6 py-5">
                                                <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border border-gray-700">
                                                    {b.financialYear}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-white font-black tabular-nums">₹{b.budgetAmount.toLocaleString()}</td>
                                            <td className="px-6 py-5 text-red-400 font-black tabular-nums">₹{b.expense.toLocaleString()}</td>
                                            <td className="px-6 py-5 text-green-400 font-black tabular-nums">₹{b.income.toLocaleString()}</td>
                                            <td className="px-6 py-5 text-right">
                                                <button
                                                    onClick={() => handleEditClick(b)}
                                                    className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors"
                                                >
                                                    Edit
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
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#1a1f24] w-full max-w-lg rounded-3xl border border-gray-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                                <h3 className="text-xl font-black text-white tracking-tight">
                                    {isEditing ? "Edit Cash Centre Budget" : "Add Cash Centre Budget"}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors">
                                    <FaTimes />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[2px] text-gray-500">Year</label>
                                        <input
                                            type="number"
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-800 text-white px-4 py-4 rounded-2xl focus:outline-none focus:border-blue-500 transition-all font-bold"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[2px] text-gray-500">Month</label>
                                        <select
                                            value={formData.month}
                                            onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-800 text-white px-4 py-4 rounded-2xl focus:outline-none focus:border-blue-500 transition-all font-bold appearance-none"
                                        >
                                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[2px] text-gray-500">Financial Year</label>
                                        <select
                                            value={formData.financialYear}
                                            onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-800 text-white px-4 py-4 rounded-2xl focus:outline-none focus:border-blue-500 transition-all font-bold appearance-none"
                                        >
                                            {financialYears.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[2px] text-gray-500">Budget</label>
                                        <input
                                            type="number"
                                            value={formData.budgetAmount}
                                            onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-800 text-white px-4 py-4 rounded-2xl focus:outline-none focus:border-blue-500 transition-all font-bold"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                                >
                                    <FaCheck />
                                    {isEditing ? "Update Budget" : "Add Budget"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default BudgetDetails;
