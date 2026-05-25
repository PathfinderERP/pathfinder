import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { FaPlus, FaSearch } from "react-icons/fa";
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

    const filteredExpenses = expenses.filter((expense) => {
        const lowerSearch = searchTerm.toLowerCase();
        return (
            expense.name?.toLowerCase().includes(lowerSearch) ||
            expense.category?.name?.toLowerCase().includes(lowerSearch) ||
            expense.months?.toLowerCase().includes(lowerSearch) ||
            expense.approvedBy?.name?.toLowerCase().includes(lowerSearch) ||
            expense.createdBy?.name?.toLowerCase().includes(lowerSearch)
        );
    });

    const formatDate = (value) => {
        if (!value) return "-";
        const date = new Date(value);
        return date.toLocaleDateString();
    };

    return (
        <Layout activePage="Finance">
            <div className={`p-6 min-h-screen ${isDarkMode ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900"}`}>
                <ToastContainer theme={theme} position="top-right" />

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">All Expenses</h1>
                        <p className="text-sm text-slate-400">Browse all finance expense records with category and approval details.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-[280px]">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search expenses..."
                                className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-cyan-500"
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

                <div className={`${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"} overflow-x-auto rounded-xl border shadow-sm`}>
                    <table className="min-w-full text-left">
                        <thead className={`${isDarkMode ? "bg-slate-900 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                            <tr>
                                <th className="px-4 py-4 text-sm font-semibold">Name</th>
                                <th className="px-4 py-4 text-sm font-semibold">Category</th>
                                <th className="px-4 py-4 text-sm font-semibold">Month</th>
                                <th className="px-4 py-4 text-sm font-semibold">Expense Date</th>
                                <th className="px-4 py-4 text-sm font-semibold">Approved By</th>
                                <th className="px-4 py-4 text-sm font-semibold">Approved Date</th>
                                <th className="px-4 py-4 text-sm font-semibold">Created By</th>
                                <th className="px-4 py-4 text-sm font-semibold">Created On</th>
                            </tr>
                        </thead>
                        <tbody className={`${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700"}`}>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                                        Loading expenses...
                                    </td>
                                </tr>
                            ) : filteredExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                                        No expenses found.
                                    </td>
                                </tr>
                            ) : (
                                filteredExpenses.map((expense) => (
                                    <tr key={expense._id} className="border-t border-slate-200">
                                        <td className="px-4 py-4 text-sm font-medium">{expense.name || "-"}</td>
                                        <td className="px-4 py-4 text-sm">{expense.category?.name || "-"}</td>
                                        <td className="px-4 py-4 text-sm">{expense.months || "-"}</td>
                                        <td className="px-4 py-4 text-sm">{formatDate(expense.expenseDate)}</td>
                                        <td className="px-4 py-4 text-sm">{expense.approvedBy?.name || expense.approvedBy?.email || "-"}</td>
                                        <td className="px-4 py-4 text-sm">{formatDate(expense.approvedDate)}</td>
                                        <td className="px-4 py-4 text-sm">{expense.createdBy?.name || expense.createdBy?.email || "-"}</td>
                                        <td className="px-4 py-4 text-sm">{formatDate(expense.createdAt)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default GetAllExpense;
