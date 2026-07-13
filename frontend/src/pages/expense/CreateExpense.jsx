import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { FaPlus, FaTimes, FaMoneyBillWave, FaCalendarAlt, FaUser, FaTag, FaClock, FaFileImport, FaFileExport, FaSpinner } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { hasPermission } from "../../config/permissions";
import { useTheme } from "../../context/ThemeContext";

const MONTHS = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
];

const WEEKS = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

const EMPTY_FORM = {
    name: "",
    category: "",
    months: "",
    week: "",
    amount: "",
    expenseDate: "",
    accountNumber: "",
    ifscCode: "",
    modeOfPayment: "Bank",
};

const CreateExpense = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [canCreate, setCanCreate] = useState(false);

    const { theme } = useTheme();
    const isDarkMode = theme === "dark";

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        setCanCreate(hasPermission(user, "financeFees", "expense", "create") || hasPermission(user, "financeFees", "addExpense", "create"));
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${API_URL}/category`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.data?.categories) {
                setCategories(response.data.categories);
            } else if (Array.isArray(response.data)) {
                setCategories(response.data);
            } else {
                setCategories([]);
            }
        } catch (error) {
            console.error("Fetch categories error:", error);
            toast.error("Unable to load expense categories");
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.name.trim()) { toast.error("Expense Name is required."); return; }
        if (!formData.category) { toast.error("Category is required."); return; }
        if (!formData.months) { toast.error("Month is required."); return; }
        if (!formData.week) { toast.error("Week is required."); return; }
        if (!formData.amount || Number(formData.amount) <= 0) { toast.error("A valid Amount is required."); return; }

        const payload = {
            name: formData.name.trim(),
            category: formData.category,
            months: formData.months,
            week: formData.week,
            amount: Number(formData.amount),
            accountNumber: formData.accountNumber ? formData.accountNumber.trim() : "N/A",
            ifscCode: formData.ifscCode ? formData.ifscCode.trim() : "N/A",
            modeOfPayment: formData.modeOfPayment || "Bank",
            createdBy: user._id || user.id || "",
            ...(formData.expenseDate && { expenseDate: formData.expenseDate }),
        };

        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const response = await axios.post(`${API_URL}/finance/expense`, payload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success(response.data?.message || "Expense created successfully.");
            setFormData(EMPTY_FORM);
        } catch (error) {
            console.error("Create expense error:", error);
            toast.error(error.response?.data?.message || "Failed to create expense.");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = `w-full rounded-lg border px-4 py-3 outline-none transition-all duration-200 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 ${
        isDarkMode
            ? "bg-slate-900 border-slate-600 text-white placeholder-slate-500"
            : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
    }`;

    const labelClass = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${
        isDarkMode ? "text-slate-400" : "text-slate-500"
    }`;

    return (
        <Layout activePage="Finance">
            <div className={`p-6 min-h-screen ${isDarkMode ? "bg-[#0f1117] text-white" : "bg-slate-50 text-slate-900"}`}>
                <ToastContainer theme={theme} position="top-right" autoClose={3000} />

                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                                <FaMoneyBillWave className="text-2xl text-cyan-500" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight">Create Expense</h1>
                                <p className={`text-sm mt-0.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                                    Fields marked with <span className="text-red-400 font-bold">*</span> are required
                                </p>
                            </div>
                        </div>
                        <div className={`text-xs font-semibold px-3 py-2 rounded-lg border ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500"}`}>
                            Logged in as <span className="text-cyan-500">{user.name || user.email || "User"}</span>
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className={`border rounded-2xl shadow-xl p-8 ${isDarkMode ? "bg-slate-800/50 border-slate-700/50" : "bg-white border-slate-200"}`}>

                        {/* Section: Expense Info */}
                        <div className="mb-6">
                            <h2 className={`text-xs font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                                <span className="w-4 h-0.5 bg-cyan-500 inline-block rounded-full"></span>
                                Expense Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                {/* Expense Name — Required */}
                                <FieldWrapper>
                                    <label className={labelClass}>
                                        <FaTag className="inline mr-1 text-cyan-500" size={10} />
                                        Expense Name <RequiredBadge />
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Office Supplies, Rent..."
                                        className={inputClass}
                                        required
                                    />
                                </FieldWrapper>

                                {/* Category — Required */}
                                <FieldWrapper>
                                    <label className={labelClass}>
                                        <FaTag className="inline mr-1 text-cyan-500" size={10} />
                                        Category <RequiredBadge />
                                    </label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        className={inputClass}
                                        required
                                    >
                                        <option value="">— Select Category —</option>
                                        {categories.map((cat) => (
                                            <option key={cat._id} value={cat._id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </FieldWrapper>

                                {/* Month — Required */}
                                <FieldWrapper>
                                    <label className={labelClass}>
                                        <FaCalendarAlt className="inline mr-1 text-cyan-500" size={10} />
                                        Month <RequiredBadge />
                                    </label>
                                    <select
                                        name="months"
                                        value={formData.months}
                                        onChange={handleInputChange}
                                        className={inputClass}
                                        required
                                    >
                                        <option value="">— Select Month —</option>
                                        {MONTHS.map((m) => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </FieldWrapper>

                                {/* Week — Required */}
                                <FieldWrapper>
                                    <label className={labelClass}>
                                        <FaCalendarAlt className="inline mr-1 text-cyan-500" size={10} />
                                        Week <RequiredBadge />
                                    </label>
                                    <select
                                        name="week"
                                        value={formData.week}
                                        onChange={handleInputChange}
                                        className={inputClass}
                                        required
                                    >
                                        <option value="">— Select Week —</option>
                                        {WEEKS.map((w) => (
                                            <option key={w} value={w}>{w}</option>
                                        ))}
                                    </select>
                                </FieldWrapper>

                                {/* Amount — Required */}
                                <FieldWrapper>
                                    <label className={labelClass}>
                                        <FaMoneyBillWave className="inline mr-1 text-cyan-500" size={10} />
                                        Amount (₹) <RequiredBadge />
                                    </label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        placeholder="e.g. 5000"
                                        className={inputClass}
                                        required
                                    />
                                </FieldWrapper>

                                {/* Expense Date — Optional (default: today) */}
                                <FieldWrapper>
                                    <label className={labelClass}>
                                        <FaClock className="inline mr-1 text-slate-400" size={10} />
                                        Expense Date
                                        <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded ${isDarkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-400"}`}>defaults to today</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="expenseDate"
                                        value={formData.expenseDate}
                                        onChange={handleInputChange}
                                        className={inputClass}
                                    />
                                </FieldWrapper>

                                {/* Bank Account No. */}
                                <FieldWrapper>
                                    <label className={labelClass}>
                                        Bank Account No.
                                    </label>
                                    <input
                                        type="text"
                                        name="accountNumber"
                                        value={formData.accountNumber}
                                        onChange={handleInputChange}
                                        placeholder="Enter bank account number"
                                        className={inputClass}
                                    />
                                </FieldWrapper>

                                {/* IFSC Code */}
                                <FieldWrapper>
                                    <label className={labelClass}>
                                        IFSC Code
                                    </label>
                                    <input
                                        type="text"
                                        name="ifscCode"
                                        value={formData.ifscCode}
                                        onChange={handleInputChange}
                                        placeholder="Enter IFSC code"
                                        className={inputClass}
                                    />
                                </FieldWrapper>

                                {/* Mode of Payment — Required */}
                                <FieldWrapper>
                                    <label className={labelClass}>
                                        Mode of Payment <RequiredBadge />
                                    </label>
                                    <select
                                        name="modeOfPayment"
                                        value={formData.modeOfPayment}
                                        onChange={handleInputChange}
                                        className={inputClass}
                                        required
                                    >
                                        <option value="Bank">Bank</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Bank+Cash">Bank+Cash</option>
                                    </select>
                                </FieldWrapper>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className={`my-6 border-t ${isDarkMode ? "border-slate-700" : "border-slate-100"}`} />

                        {/* Section: Metadata Details */}
                        <div className="mb-6">
                            <h2 className={`text-xs font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                                <span className="w-4 h-0.5 bg-cyan-500 inline-block rounded-full"></span>
                                Metadata Details
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Created By — Auto filled */}
                                <FieldWrapper>
                                    <label className={labelClass}>
                                        <FaUser className="inline mr-1 text-slate-400" size={10} />
                                        Created By
                                        <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded ${isDarkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-400"}`}>auto-filled</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={user.name || user.email || "Current User"}
                                        disabled
                                        className={`w-full rounded-lg border px-4 py-3 outline-none cursor-not-allowed opacity-60 ${
                                            isDarkMode
                                                ? "bg-slate-900 border-slate-700 text-slate-400"
                                                : "bg-slate-50 border-slate-200 text-slate-500"
                                        }`}
                                    />
                                </FieldWrapper>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className={`my-6 border-t ${isDarkMode ? "border-slate-700" : "border-slate-100"}`} />

                        {/* Actions */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={!canCreate || loading}
                                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-cyan-500/20 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <FaPlus />
                                {loading ? "Saving..." : "Save Expense"}
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate("/finance/expenses")}
                                className={`inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-bold transition-all ${
                                    isDarkMode
                                        ? "border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                <FaTimes /> Reset
                            </button>

                            {!canCreate && (
                                <p className="text-xs text-amber-400 font-semibold ml-2">
                                    ⚠ You do not have permission to create expenses.
                                </p>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </Layout>
    );
};

const RequiredBadge = () => (
    <span className="ml-1 text-red-400 font-bold">*</span>
);

const FieldWrapper = ({ children, col = 1 }) => (
    <div className={col === 2 ? "md:col-span-2" : ""}>
        {children}
    </div>
);

export default CreateExpense;
