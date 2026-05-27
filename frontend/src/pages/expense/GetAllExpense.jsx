import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { FaPlus, FaSearch, FaCheck } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { hasPermission } from "../../config/permissions";
import { useTheme } from "../../context/ThemeContext";

const GetAllExpense = () => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";

    // Approval Modal State
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [approvalData, setApprovalData] = useState({
        reason: "",
        givenBy: ""
    });

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, "financeFees", "expense", "create");
    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${API_URL}/finance/expense`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.data?.expences) {
                setExpenses(response.data.expences);
            } else if (Array.isArray(response.data)) {
                setExpenses(response.data);
            } else {
                setExpenses([]);
            }
        } catch (error) {
            console.error("Fetch expenses error:", error);
            toast.error("Unable to load expenses.");
        } finally {
            setLoading(false);
        }
    };

    const handleApproveClick = (expense) => {
        setSelectedExpense(expense);
        setApprovalData({ reason: "", givenBy: "" });
        setShowApproveModal(true);
    };

    const submitApproval = async () => {
        try {
            const token = localStorage.getItem("token");
            
            const payload = {
                ...selectedExpense, // Send back existing data
                category: selectedExpense.category?._id,
                approvedBy: selectedExpense.approvedBy?._id,
                createdBy: selectedExpense.createdBy?._id,
                employeeId: selectedExpense.employeeId?._id,
                hrApprovedBy: selectedExpense.hrApprovedBy?._id,
                financeStatus: "Approved",
                financeApprovedBy: user._id,
                financeApprovedDate: new Date(),
                reason: approvalData.reason,
                givenBy: approvalData.givenBy // In reality this might be an ID if linked to User
            };

            const response = await axios.put(`${API_URL}/finance/expense/${selectedExpense._id}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success("Expense approved successfully!");
                setShowApproveModal(false);
                fetchExpenses();
            } else {
                toast.error(response.data.message || "Failed to approve");
            }
        } catch (error) {
            console.error("Approval error:", error);
            toast.error("Error approving expense");
        }
    };

    const filteredExpenses = expenses.filter((expense) => {
        const lowerSearch = searchTerm.toLowerCase();
        return (
            expense.name?.toLowerCase().includes(lowerSearch) ||
            expense.category?.name?.toLowerCase().includes(lowerSearch) ||
            expense.months?.toLowerCase().includes(lowerSearch) ||
            expense.approvedBy?.name?.toLowerCase().includes(lowerSearch) ||
            expense.createdBy?.name?.toLowerCase().includes(lowerSearch) ||
            expense.employeeId?.name?.toLowerCase().includes(lowerSearch)
        );
    });

    const formatDate = (value) => {
        if (!value) return "-";
        const date = new Date(value);
        return date.toLocaleDateString();
    };

    return (
        <Layout activePage="Finance">
            <div className={`p-6 min-h-screen ${isDarkMode ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
                <ToastContainer theme={theme} position="top-right" />

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">All Expenses</h1>
                        <p className={`text-sm mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            Browse all finance expense records with category and approval details.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-[280px]">
                            <FaSearch className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-400" : "text-slate-400"}`} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search expenses..."
                                className={`w-full rounded-lg border py-3 pl-10 pr-4 text-sm outline-none focus:border-cyan-500 ${
                                    isDarkMode
                                        ? "bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
                                        : "bg-white border-slate-300 text-slate-800 placeholder-slate-400"
                                }`}
                            />
                        </div>
                        {canCreate && (
                            <Link
                                to="/finance/expense/create"
                                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-3 text-white transition hover:bg-cyan-700"
                            >
                                <FaPlus /> Add Expense
                            </Link>
                        )}
                    </div>
                </div>

                <div className={`overflow-x-auto rounded-xl border shadow-sm ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                    <table className="min-w-full text-left">
                        <thead className={isDarkMode ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-600"}>
                            <tr>
                                <th className="px-4 py-4 text-sm font-semibold">Type</th>
                                <th className="px-4 py-4 text-sm font-semibold">Name / Employee</th>
                                <th className="px-4 py-4 text-sm font-semibold">Month / Period</th>
                                <th className="px-4 py-4 text-sm font-semibold">Amount</th>
                                <th className="px-4 py-4 text-sm font-semibold">Status</th>
                                <th className="px-4 py-4 text-sm font-semibold">Approved By (HR/Gen)</th>
                                <th className="px-4 py-4 text-sm font-semibold">Date</th>
                                <th className="px-4 py-4 text-sm font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody className={isDarkMode ? "text-slate-200" : "text-slate-700"}>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className={`px-4 py-8 text-center ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                        Loading expenses...
                                    </td>
                                </tr>
                            ) : filteredExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className={`px-4 py-8 text-center ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                        No expenses found.
                                    </td>
                                </tr>
                            ) : (
                                filteredExpenses.map((expense) => (
                                    <tr key={expense._id} className={`border-t ${isDarkMode ? "border-slate-700" : "border-slate-100"}`}>

                                        {/* Type badge */}
                                        <td className="px-4 py-4 text-sm font-medium">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                expense.expenseType === 'Salary'
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {expense.expenseType || 'General'}
                                            </span>
                                        </td>

                                        {/* Name / Employee */}
                                        <td className="px-4 py-4 text-sm">
                                            {expense.expenseType === 'Salary' ? (
                                                <div className="flex flex-col">
                                                    <span className={`font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                                                        {expense.employeeId?.name || "—"}
                                                    </span>
                                                    {expense.departmentId?.departmentName && (
                                                        <span className={`text-xs font-medium mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                            {expense.departmentId.departmentName}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span>{expense.name || "—"}</span>
                                            )}
                                        </td>

                                        {/* Month / Period / Category */}
                                        <td className="px-4 py-4 text-sm">
                                            {expense.expenseType === 'Salary' ? (
                                                <div className="flex flex-col gap-0.5">
                                                    {expense.months && (
                                                        <span className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                                                            {expense.months}
                                                        </span>
                                                    )}
                                                    {expense.salaryPeriod && (
                                                        <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                            {expense.salaryPeriod}
                                                        </span>
                                                    )}
                                                    {!expense.months && !expense.salaryPeriod && "—"}
                                                </div>
                                            ) : (
                                                expense.category?.name || "—"
                                            )}
                                        </td>

                                        {/* Amount */}
                                        <td className={`px-4 py-4 text-sm font-bold ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                                            {expense.amount ? `₹${expense.amount}` : "—"}
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-4 text-sm">
                                            {expense.expenseType === 'Salary' ? (
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                    expense.financeStatus === 'Approved'
                                                        ? 'bg-green-100 text-green-800'
                                                        : expense.financeStatus === 'Rejected'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {expense.financeStatus || "Pending"}
                                                </span>
                                            ) : (
                                                <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>N/A</span>
                                            )}
                                        </td>

                                        {/* Approved By */}
                                        <td className="px-4 py-4 text-sm">
                                            {expense.expenseType === 'Salary' ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <div>
                                                        <span className="font-semibold text-xs text-purple-500">HR Init: </span>
                                                        <span className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                                                            {expense.hrApprovedBy?.name || "—"}
                                                        </span>
                                                    </div>
                                                    {expense.financeStatus === 'Approved' && (
                                                        <>
                                                            <div>
                                                                <span className="font-semibold text-xs text-green-500">Fin Appr: </span>
                                                                <span className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                                                                    {expense.financeApprovedBy?.name || "—"}
                                                                </span>
                                                            </div>
                                                            {expense.givenBy && (
                                                                <div>
                                                                    <span className="font-semibold text-xs text-blue-500">Given By: </span>
                                                                    <span className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                                                                        {expense.givenBy}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {expense.reason && (
                                                                <div className={`text-xs italic mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                                    "{expense.reason}"
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                                                    {expense.approvedBy?.name || expense.approvedBy?.email || "—"}
                                                </span>
                                            )}
                                        </td>

                                        {/* Date */}
                                        <td className="px-4 py-4 text-sm">
                                            {expense.expenseType === 'Salary' ? (
                                                <div className={`flex flex-col gap-0.5 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                                                    <div><span className={isDarkMode ? "text-slate-500" : "text-slate-400"}>Init: </span>{formatDate(expense.hrApprovedDate)}</div>
                                                    {expense.financeStatus === 'Approved' && (
                                                        <div><span className={isDarkMode ? "text-slate-500" : "text-slate-400"}>Appr: </span>{formatDate(expense.financeApprovedDate)}</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                                                    {formatDate(expense.expenseDate)}
                                                </span>
                                            )}
                                        </td>

                                        {/* Action */}
                                        <td className="px-4 py-4 text-sm">
                                            {expense.expenseType === 'Salary' && expense.financeStatus === 'Pending' && (
                                                <button
                                                    onClick={() => handleApproveClick(expense)}
                                                    className="text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-semibold transition"
                                                >
                                                    <FaCheck /> Approve
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Approval Modal */}
                {showApproveModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className={`rounded-xl p-6 w-96 shadow-2xl ${isDarkMode ? "bg-slate-800 text-slate-100" : "bg-white text-slate-800"}`}>
                            <h2 className={`text-xl font-bold mb-4 border-b pb-3 ${isDarkMode ? "border-slate-600" : "border-slate-200"}`}>
                                Approve Salary Expense
                            </h2>

                            <div className="mb-4">
                                <label className={`block text-sm mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Employee</label>
                                <div className="font-semibold">{selectedExpense?.employeeId?.name}</div>
                            </div>
                            <div className="mb-4">
                                <label className={`block text-sm mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Salary Month</label>
                                <div className="font-semibold">{selectedExpense?.months || "—"}</div>
                            </div>
                            <div className="mb-4">
                                <label className={`block text-sm mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Payout Week</label>
                                <div className="font-semibold">{selectedExpense?.salaryPeriod || "—"}</div>
                            </div>
                            <div className="mb-4">
                                <label className={`block text-sm mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Amount</label>
                                <div className="font-bold text-lg text-green-500">₹{selectedExpense?.amount}</div>
                            </div>

                            <div className="mb-4">
                                <label className={`block text-sm mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Reason (Optional)</label>
                                <input
                                    type="text"
                                    value={approvalData.reason}
                                    onChange={(e) => setApprovalData({...approvalData, reason: e.target.value})}
                                    className={`w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-400 ${
                                        isDarkMode ? "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400" : "bg-white border-slate-300 text-slate-800"
                                    }`}
                                    placeholder="Enter reason..."
                                />
                            </div>
                            <div className="mb-6">
                                <label className={`block text-sm mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Given By (Optional)</label>
                                <input
                                    type="text"
                                    value={approvalData.givenBy}
                                    onChange={(e) => setApprovalData({...approvalData, givenBy: e.target.value})}
                                    className={`w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-400 ${
                                        isDarkMode ? "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400" : "bg-white border-slate-300 text-slate-800"
                                    }`}
                                    placeholder="Enter name of person giving..."
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowApproveModal(false)}
                                    className={`px-4 py-2 border rounded-lg text-sm font-medium transition ${
                                        isDarkMode ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-300 text-slate-600 hover:bg-slate-100"
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitApproval}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 flex items-center gap-2 transition"
                                >
                                    <FaCheck /> Approve
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default GetAllExpense;

