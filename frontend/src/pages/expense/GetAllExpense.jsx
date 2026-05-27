import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { FaPlus, FaSearch, FaCheck, FaDownload, FaEraser } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { hasPermission } from "../../config/permissions";
import { useTheme } from "../../context/ThemeContext";

/** Date used for From/To filters: business expense date, with fallbacks. */
const getExpenseFilterDate = (expense) => {
    const raw = expense.expenseDate || expense.hrApprovedDate || expense.createdAt || expense.updatedAt;
    return raw ? new Date(raw) : null;
};

const getSalaryFinanceStatusLabel = (expense) => {
    if (expense.financeStatus === "Approved") return "Approved";
    if (expense.financeStatus === "Rejected") return "Rejected";
    if (expense.paidAmount > 0) return "Partially Paid";
    return "Pending";
};

const getExpenseStatusLabel = (expense) => {
    if (expense.expenseType !== "Salary") return "N/A";
    return getSalaryFinanceStatusLabel(expense);
};

const expenseMatchesSearch = (expense, term) => {
    if (!term.trim()) return true;
    const lower = term.toLowerCase().trim();
    const haystack = [
        expense.name,
        expense.category?.name,
        expense.months,
        expense.salaryPeriod,
        expense.approvedBy?.name,
        expense.approvedBy?.email,
        expense.createdBy?.name,
        expense.employeeId?.name,
        expense.departmentId?.departmentName,
        expense.hrApprovedBy?.name,
        expense.financeApprovedBy?.name,
        expense.givenBy,
        expense.expenseType,
        expense.financeStatus,
        expense.reason,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    return haystack.includes(lower);
};

const expenseMatchesName = (expense, name) => {
    if (!name.trim()) return true;
    const lower = name.toLowerCase().trim();
    if (expense.expenseType === "Salary") {
        return (expense.employeeId?.name || "").toLowerCase().includes(lower);
    }
    return (expense.name || "").toLowerCase().includes(lower);
};

const expenseMatchesDateRange = (expense, from, to) => {
    if (!from && !to) return true;
    const d = getExpenseFilterDate(expense);
    if (!d || Number.isNaN(d.getTime())) return false;
    if (from) {
        const fromD = new Date(from);
        fromD.setHours(0, 0, 0, 0);
        if (d < fromD) return false;
    }
    if (to) {
        const toD = new Date(to);
        toD.setHours(23, 59, 59, 999);
        if (d > toD) return false;
    }
    return true;
};

const buildMonthPeriodLabel = (expense) => {
    if (expense.expenseType === "Salary") {
        const parts = [expense.months, expense.salaryPeriod].filter(Boolean);
        return parts.length ? parts.join(" · ") : "—";
    }
    return expense.category?.name || "—";
};

const buildNameEmployeeLabel = (expense) => {
    if (expense.expenseType === "Salary") {
        const emp = expense.employeeId?.name || "—";
        const dept = expense.departmentId?.departmentName;
        return dept ? `${emp} (${dept})` : emp;
    }
    return expense.name || "—";
};

const buildApprovedByLabel = (expense) => {
    if (expense.expenseType === "Salary") {
        const hr = expense.hrApprovedBy?.name || "—";
        const fin = expense.financeApprovedBy?.name;
        const parts = [`HR: ${hr}`];
        if (fin) parts.push(`Finance: ${fin}`);
        if (expense.givenBy) parts.push(`Given: ${expense.givenBy}`);
        return parts.join(" | ");
    }
    return expense.approvedBy?.name || expense.approvedBy?.email || "—";
};

const buildDateLabel = (expense, formatDate) => {
    if (expense.expenseType === "Salary") {
        const init = formatDate(expense.hrApprovedDate);
        const appr = expense.financeStatus === "Approved" ? formatDate(expense.financeApprovedDate) : null;
        return appr ? `Init: ${init}; Appr: ${appr}` : `Init: ${init}`;
    }
    return formatDate(expense.expenseDate);
};

const GetAllExpense = () => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [nameFilter, setNameFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
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
        const remaining = expense.remainingAmount !== undefined ? expense.remainingAmount : expense.amount;
        setApprovalData({ reason: "", givenBy: "", amountPaid: String(remaining) });
        setShowApproveModal(true);
    };

    const submitApproval = async () => {
        const remaining = selectedExpense.remainingAmount !== undefined ? selectedExpense.remainingAmount : selectedExpense.amount;
        const amtToPay = Number(approvalData.amountPaid);
        if (!amtToPay || amtToPay <= 0) {
            toast.error("Please enter a valid amount to pay");
            return;
        }
        if (amtToPay > remaining) {
            toast.error(`Amount to pay cannot exceed the remaining balance of ₹${remaining}`);
            return;
        }

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
                givenBy: approvalData.givenBy, // In reality this might be an ID if linked to User
                amountPaid: amtToPay
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

    const formatDate = (value) => {
        if (!value) return "-";
        const date = new Date(value);
        return date.toLocaleDateString();
    };

    const filteredExpenses = useMemo(() => {
        return expenses.filter((expense) => {
            if (!expenseMatchesSearch(expense, searchTerm)) return false;
            if (!expenseMatchesName(expense, nameFilter)) return false;
            if (!expenseMatchesDateRange(expense, fromDate, toDate)) return false;
            if (typeFilter !== "all" && (expense.expenseType || "General") !== typeFilter) return false;
            if (statusFilter !== "all" && getExpenseStatusLabel(expense) !== statusFilter) return false;
            return true;
        });
    }, [expenses, searchTerm, nameFilter, fromDate, toDate, typeFilter, statusFilter]);

    const hasActiveFilters =
        Boolean(searchTerm || nameFilter || fromDate || toDate || typeFilter !== "all" || statusFilter !== "all");

    const clearFilters = () => {
        setSearchTerm("");
        setNameFilter("");
        setFromDate("");
        setToDate("");
        setTypeFilter("all");
        setStatusFilter("all");
    };

    const handleExportToExcel = () => {
        if (filteredExpenses.length === 0) {
            toast.warn("No data to export for the current filters.");
            return;
        }

        const exportRows = filteredExpenses.map((expense) => {
            const isSalary = expense.expenseType === "Salary";
            const amount = isSalary
                ? expense.originalAmount !== undefined
                    ? expense.originalAmount
                    : expense.amount
                : expense.amount;

            return {
                Type: expense.expenseType || "General",
                "Name / Employee": buildNameEmployeeLabel(expense),
                "Month / Period": buildMonthPeriodLabel(expense),
                Amount: amount ?? "",
                "Paid Amount": expense.paidAmount || 0,
                "Remaining Amount": expense.remainingAmount ?? "",
                Status: getExpenseStatusLabel(expense),
                "Approved By (HR/Gen)": buildApprovedByLabel(expense),
                Date: buildDateLabel(expense, formatDate),
            };
        });

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportRows);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blobData = new Blob([excelBuffer], { type: "application/octet-stream" });
        const dateStamp = new Date().toISOString().split("T")[0];
        saveAs(blobData, `All_Expenses_${dateStamp}.xlsx`);
        toast.success(`Exported ${filteredExpenses.length} record(s) to Excel.`);
    };

    const inputClass = `w-full rounded-lg border py-2.5 px-3 text-sm outline-none focus:border-cyan-500 ${
        isDarkMode
            ? "bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
            : "bg-white border-slate-300 text-slate-800 placeholder-slate-400"
    }`;

    const labelClass = `block text-xs font-semibold mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`;

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
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handleExportToExcel}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                            <FaDownload /> Export Excel
                        </button>
                        {canCreate && (
                            <Link
                                to="/finance/expense/create"
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 py-3 text-white transition hover:bg-cyan-700"
                            >
                                <FaPlus /> Add Expense
                            </Link>
                        )}
                    </div>
                </div>

                <div
                    className={`mb-6 rounded-xl border p-4 shadow-sm ${
                        isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                    }`}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <h2 className="text-sm font-semibold">Filters</h2>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                Showing {filteredExpenses.length} of {expenses.length}
                            </span>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                                        isDarkMode
                                            ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                                            : "border-slate-300 text-slate-600 hover:bg-slate-100"
                                    }`}
                                >
                                    <FaEraser /> Clear filters
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <div className="xl:col-span-2">
                            <label className={labelClass}>Search</label>
                            <div className="relative">
                                <FaSearch
                                    className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${
                                        isDarkMode ? "text-slate-400" : "text-slate-400"
                                    }`}
                                />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Type, category, month, approver..."
                                    className={`${inputClass} pl-9`}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Name / Employee</label>
                            <input
                                type="text"
                                value={nameFilter}
                                onChange={(e) => setNameFilter(e.target.value)}
                                placeholder="Filter by name..."
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>From date</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>To date</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Type</label>
                            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputClass}>
                                <option value="all">All types</option>
                                <option value="General">General</option>
                                <option value="Salary">Salary</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className={inputClass}
                            >
                                <option value="all">All statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Partially Paid">Partially Paid</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                                <option value="N/A">N/A (General)</option>
                            </select>
                        </div>
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
                                        {hasActiveFilters
                                            ? "No expenses match the current filters."
                                            : "No expenses found."}
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
                                        <td className="px-4 py-4 text-sm font-medium">
                                            {expense.expenseType === 'Salary' ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className={`font-bold ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                                                        ₹{expense.originalAmount !== undefined ? expense.originalAmount : expense.amount}
                                                    </span>
                                                    {expense.paidAmount > 0 && (
                                                        <span className="text-[11px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded w-max">
                                                            Paid: ₹{expense.paidAmount}
                                                        </span>
                                                    )}
                                                    {expense.remainingAmount > 0 && expense.paidAmount > 0 && (
                                                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded w-max">
                                                            Rem: ₹{expense.remainingAmount}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className={`font-bold ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                                                    {expense.amount ? `₹${expense.amount}` : "—"}
                                                </span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-4 text-sm">
                                            {expense.expenseType === 'Salary' ? (
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                    expense.financeStatus === 'Approved'
                                                        ? 'bg-green-100 text-green-800'
                                                        : expense.financeStatus === 'Rejected'
                                                        ? 'bg-red-100 text-red-800'
                                                        : expense.paidAmount > 0
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {expense.financeStatus === 'Approved'
                                                        ? 'Approved'
                                                        : expense.financeStatus === 'Rejected'
                                                        ? 'Rejected'
                                                        : expense.paidAmount > 0
                                                        ? 'Partially Paid'
                                                        : 'Pending'}
                                                </span>
                                            ) : (
                                                <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>N/A</span>
                                            )}
                                        </td>

                                        {/* Approved By */}
                                        <td className="px-4 py-4 text-sm">
                                            {expense.expenseType === 'Salary' ? (
                                                <div className="flex flex-col gap-1">
                                                    <div>
                                                        <span className="font-semibold text-xs text-purple-500">HR Init: </span>
                                                        <span className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                                                            {expense.hrApprovedBy?.name || "—"}
                                                        </span>
                                                    </div>
                                                    {expense.payments && expense.payments.length > 0 ? (
                                                        <div className="mt-1 flex flex-col gap-1 border-t border-dashed border-slate-700/50 pt-1">
                                                            <span className="font-bold text-[10px] uppercase text-slate-500">Payments:</span>
                                                            {expense.payments.map((pmt, index) => (
                                                                <div key={index} className="text-xs bg-slate-800/20 dark:bg-slate-900/50 p-1.5 rounded border border-slate-700/30">
                                                                    <div className="font-semibold text-slate-300">
                                                                        ₹{pmt.amountPaid} <span className="text-[10px] font-normal text-slate-400">by {pmt.paidBy?.name || "Finance"}</span>
                                                                    </div>
                                                                    {pmt.givenBy && <div className="text-[10px] text-slate-400"><span className="font-semibold">Given:</span> {pmt.givenBy}</div>}
                                                                    {pmt.reason && <div className="text-[10px] text-slate-400 italic">"{pmt.reason}"</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : expense.financeStatus === 'Approved' ? (
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
                                                    ) : null}
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
                             <div className="mb-4 grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">
                                 <div>
                                     <label className={`block text-[10px] uppercase font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Requested</label>
                                     <div className="font-bold text-sm text-slate-500">₹{selectedExpense?.originalAmount !== undefined ? selectedExpense.originalAmount : selectedExpense?.amount}</div>
                                 </div>
                                 <div>
                                     <label className={`block text-[10px] uppercase font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Paid</label>
                                     <div className="font-bold text-sm text-green-500">₹{selectedExpense?.paidAmount || 0}</div>
                                 </div>
                                 <div>
                                     <label className={`block text-[10px] uppercase font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Remaining</label>
                                     <div className="font-bold text-base text-blue-500">₹{selectedExpense?.remainingAmount !== undefined ? selectedExpense.remainingAmount : selectedExpense?.amount}</div>
                                 </div>
                             </div>

                             <div className="mb-4">
                                 <label className={`block text-sm mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Amount to Pay (₹)</label>
                                 <input
                                     type="number"
                                     value={approvalData.amountPaid || ""}
                                     onChange={(e) => setApprovalData({...approvalData, amountPaid: e.target.value})}
                                     max={selectedExpense?.remainingAmount !== undefined ? selectedExpense.remainingAmount : selectedExpense?.amount}
                                     min="1"
                                     className={`w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-400 ${
                                         isDarkMode ? "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400" : "bg-white border-slate-300 text-slate-800"
                                     }`}
                                     placeholder="Enter payment amount..."
                                 />
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

