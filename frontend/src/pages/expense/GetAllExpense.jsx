import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import {
    FaPlus,
    FaSearch,
    FaCheck,
    FaDownload,
    FaEraser,
    FaFilter,
    FaFileImport,
    FaFileExport,
    FaSpinner,
    FaTimes,
    FaEye,
    FaEdit,
    FaTrash,
    FaRupeeSign
} from "react-icons/fa";
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
        if (expense.givenBy) parts.push(`Approved By: ${expense.givenBy}`);
        return parts.join(" | ");
    }
    const creator = expense.createdBy?.name || "—";
    const fin = expense.financeApprovedBy?.name;
    const parts = [`Creator: ${creator}`];
    if (fin) parts.push(`Finance: ${fin}`);
    if (expense.givenBy) parts.push(`Approved By: ${expense.givenBy}`);
    return parts.join(" | ");
};

const buildDateLabel = (expense, formatDate) => {
    if (expense.expenseType === "Salary") {
        const init = formatDate(expense.hrApprovedDate);
        const appr = expense.financeStatus === "Approved" ? formatDate(expense.financeApprovedDate) : null;
        return appr ? `Init: ${init}; Appr: ${appr}` : `Init: ${init}`;
    }
    const init = formatDate(expense.expenseDate);
    const appr = expense.financeStatus === "Approved" ? formatDate(expense.financeApprovedDate) : null;
    return appr ? `Created: ${init}; Appr: ${appr}` : `Created: ${init}`;
};

const getTypeBadgeClass = (expenseType, isDarkMode) => {
    if (expenseType === "Salary") {
        return isDarkMode ? "bg-purple-500/15 text-purple-300 border border-purple-500/30" : "bg-purple-100 text-purple-800 border border-purple-200";
    }
    return isDarkMode ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" : "bg-blue-100 text-blue-800 border border-blue-200";
};

const getStatusBadgeClass = (expense, isDarkMode) => {
    if (expense.financeStatus === "Approved") {
        return isDarkMode ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-green-100 text-green-800 border border-green-200";
    }
    if (expense.financeStatus === "Rejected") {
        return isDarkMode ? "bg-red-500/15 text-red-300 border border-red-500/30" : "bg-red-100 text-red-800 border border-red-200";
    }
    if (expense.paidAmount > 0) {
        return isDarkMode ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" : "bg-amber-100 text-amber-800 border border-amber-200";
    }
    return isDarkMode ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30" : "bg-yellow-100 text-yellow-800 border border-yellow-200";
};

const getDatePresetRange = (preset) => {
    const now = new Date();
    let from = null;
    let to = null;

    switch (preset) {
        case "today": {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            const end = new Date(now);
            end.setHours(23, 59, 59, 999);
            from = start;
            to = end;
            break;
        }
        case "yesterday": {
            const start = new Date(now);
            start.setDate(now.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            const end = new Date(now);
            end.setDate(now.getDate() - 1);
            end.setHours(23, 59, 59, 999);
            from = start;
            to = end;
            break;
        }
        case "this-month": {
            const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            from = start;
            to = end;
            break;
        }
        case "last-month": {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            from = start;
            to = end;
            break;
        }
        case "this-year": {
            const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            from = start;
            to = end;
            break;
        }
        case "last-year": {
            const start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
            from = start;
            to = end;
            break;
        }
        default:
            break;
    }
    return { from, to };
};

const formatDateToYYYYMMDD = (date) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const GetAllExpense = () => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [datePreset, setDatePreset] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [nameFilter, setNameFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [modeOfPaymentFilter, setModeOfPaymentFilter] = useState("all");
    const [createdByFilter, setCreatedByFilter] = useState("all");
    const [categories, setCategories] = useState([]);
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";

    const getCategoryName = (expense) => {
        if (!expense) return "—";
        if (expense.category?.name) return expense.category.name;
        const catId = expense.category?._id || expense.category;
        if (catId) {
            const matched = categories.find((c) => c._id === catId);
            if (matched) return matched.name;
        }
        return "—";
    };

    // Bulk upload states
    const [importing, setImporting] = useState(false);
    const [importErrors, setImportErrors] = useState([]);
    const [showErrorsModal, setShowErrorsModal] = useState(false);
    const fileInputRef = useRef(null);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewExpense, setViewExpense] = useState(null);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editExpense, setEditExpense] = useState(null);
    const [editFormData, setEditFormData] = useState({
        name: "",
        category: "",
        months: "",
        week: "",
        amount: "",
        accountNumber: "",
        ifscCode: "",
        modeOfPayment: "Bank",
    });

    // Bulk Action States
    const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
    const [showBulkEditModal, setShowBulkEditModal] = useState(false);
    const [bulkEditFormData, setBulkEditFormData] = useState({
        category: "",
        months: "",
        week: "",
        modeOfPayment: "",
        financeStatus: "",
        amount: "",
        reason: "",
        givenBy: "",
    });
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [bulkUpdating, setBulkUpdating] = useState(false);

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [pageInput, setPageInput] = useState("1");

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, "financeFees", "expense", "create") || hasPermission(user, "financeFees", "addExpense", "create");
    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchExpenses();
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
            setCategories([]);
        }
    };

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

    const handleViewClick = (expense) => {
        setViewExpense(expense);
        setShowViewModal(true);
    };

    const handleEditClick = (expense) => {
        setEditExpense(expense);
        setEditFormData({
            name: expense.name || "",
            category: expense.category?._id || expense.category || "",
            months: expense.months || "",
            week: expense.week || "",
            amount: expense.originalAmount !== undefined ? expense.originalAmount : expense.amount || "",
            accountNumber: expense.accountNumber === "N/A" ? "" : expense.accountNumber || "",
            ifscCode: expense.ifscCode === "N/A" ? "" : expense.ifscCode || "",
            modeOfPayment: expense.modeOfPayment || "Bank",
        });
        setShowEditModal(true);
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editFormData.name.trim()) {
            toast.error("Expense Name is required");
            return;
        }
        if (!editFormData.category) {
            toast.error("Category is required");
            return;
        }
        if (!editFormData.months) {
            toast.error("Month is required");
            return;
        }
        if (!editFormData.week) {
            toast.error("Week is required");
            return;
        }
        if (!editFormData.amount || Number(editFormData.amount) <= 0) {
            toast.error("Amount is required");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const payload = {
                ...editFormData,
                amount: Number(editFormData.amount),
                accountNumber: editFormData.accountNumber.trim() || "N/A",
                ifscCode: editFormData.ifscCode.trim() || "N/A",
            };
            const response = await axios.put(`${API_URL}/finance/expense/${editExpense._id}`, payload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success(response.data?.message || "Expense updated successfully");
            setShowEditModal(false);
            fetchExpenses();
        } catch (err) {
            console.error("Update expense error:", err);
            toast.error(err.response?.data?.message || "Failed to update expense");
        }
    };

    const handleDeleteClick = async (expense) => {
        if (window.confirm(`Are you sure you want to delete the expense: "${expense.name || "Salary Expense"}"?`)) {
            try {
                const token = localStorage.getItem("token");
                const response = await axios.delete(`${API_URL}/finance/expense/${expense._id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                toast.success(response.data?.message || "Expense deleted successfully");
                fetchExpenses();
            } catch (err) {
                console.error("Delete expense error:", err);
                toast.error(err.response?.data?.message || "Failed to delete expense");
            }
        }
    };

    const handleDownloadTemplate = () => {
        const todayStr = new Date().toISOString().split("T")[0];
        const headers = ["Expense Name", "Category", "Month", "Current Date", "Expense Date", "Amount", "Bank Account No.", "IFSC Code"];
        const sampleRow = {
            "Expense Name": "Office Stationery",
            Category: "Office Expenses",
            Month: "May",
            "Current Date": todayStr,
            "Expense Date": todayStr,
            Amount: 1500,
            "Bank Account No.": "1234567890",
            "IFSC Code": "ABCD0123456",
        };

        const worksheet = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blobData = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blobData, "Expense_Bulk_Import_Template.xlsx");
        toast.success("Template downloaded successfully.");
    };

    const handleImportFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImporting(true);
        setImportErrors([]);

        try {
            const ab = await file.arrayBuffer();
            const wb = XLSX.read(ab, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

            if (!rows.length) {
                toast.warn("No rows found in the file.");
                setImporting(false);
                return;
            }

            const token = localStorage.getItem("token");
            const response = await axios.post(`${API_URL}/finance/expense/bulk-import`, rows, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            toast.success(response.data?.message || "Import completed successfully!");
            if (fileInputRef.current) fileInputRef.current.value = "";
            fetchExpenses(); // refresh list
        } catch (error) {
            console.error("Bulk import error:", error);
            const errData = error.response?.data;
            if (errData?.errors && Array.isArray(errData.errors)) {
                setImportErrors(errData.errors);
                setShowErrorsModal(true);
                toast.error("Import failed with validation errors.");
            } else {
                toast.error(errData?.message || "Error processing import file.");
            }
        } finally {
            setImporting(false);
        }
    };
    const formatDate = (value) => {
        if (!value) return "-";
        const date = new Date(value);
        return date.toLocaleDateString();
    };

    const creatorOptions = useMemo(() => {
        const map = new Map();
        expenses.forEach((e) => {
            if (e.createdBy) {
                const id = typeof e.createdBy === "object" ? e.createdBy._id : e.createdBy;
                const name = typeof e.createdBy === "object" ? e.createdBy.name || e.createdBy.email || "Unknown" : `User (${e.createdBy})`;
                if (id && !map.has(id.toString())) {
                    map.set(id.toString(), name);
                }
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [expenses]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter((expense) => {
            if (!expenseMatchesSearch(expense, searchTerm)) return false;
            if (!expenseMatchesName(expense, nameFilter)) return false;
            if (!expenseMatchesDateRange(expense, fromDate, toDate)) return false;
            if (typeFilter !== "all") {
                if (typeFilter === "Salary") {
                    if (expense.expenseType !== "Salary") return false;
                } else {
                    const expCatId = expense.category?._id?.toString() || expense.category?.toString();
                    if (expense.expenseType === "Salary" || expCatId !== typeFilter) return false;
                }
            }
            if (statusFilter !== "all" && getExpenseStatusLabel(expense) !== statusFilter) return false;
            if (modeOfPaymentFilter !== "all" && (expense.modeOfPayment || "Bank") !== modeOfPaymentFilter) return false;
            if (createdByFilter !== "all") {
                const creatorId = expense.createdBy?._id?.toString() || expense.createdBy?.toString();
                if (creatorId !== createdByFilter) return false;
            }
            return true;
        });
    }, [expenses, searchTerm, nameFilter, fromDate, toDate, typeFilter, statusFilter, modeOfPaymentFilter, createdByFilter]);

    const totalExpenditureAmount = useMemo(() => {
        return filteredExpenses.reduce((sum, expense) => {
            const isSalary = expense.expenseType === "Salary";
            const amt = parseFloat(isSalary ? (expense.originalAmount !== undefined ? expense.originalAmount : expense.amount) : expense.amount) || 0;
            return sum + amt;
        }, 0);
    }, [filteredExpenses]);

    const thisMonthExpenditure = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        return expenses.reduce((sum, expense) => {
            const d = getExpenseFilterDate(expense);
            if (d && !Number.isNaN(d.getTime())) {
                if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
                    const isSalary = expense.expenseType === "Salary";
                    const amt = parseFloat(isSalary ? (expense.originalAmount !== undefined ? expense.originalAmount : expense.amount) : expense.amount) || 0;
                    return sum + amt;
                }
            }
            return sum;
        }, 0);
    }, [expenses]);

    const thisMonthRecordsCount = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        return expenses.filter((expense) => {
            const d = getExpenseFilterDate(expense);
            return d && !Number.isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        }).length;
    }, [expenses]);

    const allTimeExpenditure = useMemo(() => {
        return expenses.reduce((sum, expense) => {
            const isSalary = expense.expenseType === "Salary";
            const amt = parseFloat(isSalary ? (expense.originalAmount !== undefined ? expense.originalAmount : expense.amount) : expense.amount) || 0;
            return sum + amt;
        }, 0);
    }, [expenses]);

    const isAllSelected = useMemo(() => {
        if (filteredExpenses.length === 0) return false;
        return filteredExpenses.every((e) => selectedExpenseIds.includes(e._id));
    }, [filteredExpenses, selectedExpenseIds]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = filteredExpenses.map((item) => item._id);
            setSelectedExpenseIds(allIds);
        } else {
            setSelectedExpenseIds([]);
        }
    };

    const handleSelectExpense = (id) => {
        setSelectedExpenseIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((i) => i !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handlePresetChange = (preset) => {
        setDatePreset(preset);
        if (preset === "all") {
            setFromDate("");
            setToDate("");
            return;
        }
        const { from, to } = getDatePresetRange(preset);
        setFromDate(formatDateToYYYYMMDD(from));
        setToDate(formatDateToYYYYMMDD(to));
    };

    const handleBulkDelete = async () => {
        if (selectedExpenseIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedExpenseIds.length} selected expense(s)? This action cannot be undone.`)) {
            return;
        }

        setBulkDeleting(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(
                `${API_URL}/finance/expense/bulk-delete`,
                { ids: selectedExpenseIds },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            toast.success(response.data?.message || `Successfully deleted ${selectedExpenseIds.length} expense(s)`);
            setSelectedExpenseIds([]);
            fetchExpenses();
        } catch (err) {
            console.error("Bulk delete expense error:", err);
            toast.error(err.response?.data?.message || "Failed to delete selected expenses");
        } finally {
            setBulkDeleting(false);
        }
    };

    const handleBulkEditSubmit = async (e) => {
        e.preventDefault();
        if (selectedExpenseIds.length === 0) return;

        const hasFields = Object.values(bulkEditFormData).some((val) => val !== "" && val !== null && val !== undefined);
        if (!hasFields) {
            toast.warn("Please select or enter at least one field to update.");
            return;
        }

        setBulkUpdating(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(
                `${API_URL}/finance/expense/bulk-edit`,
                { ids: selectedExpenseIds, updateData: bulkEditFormData },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            toast.success(response.data?.message || `Successfully updated ${selectedExpenseIds.length} expense(s)`);
            setShowBulkEditModal(false);
            setSelectedExpenseIds([]);
            setBulkEditFormData({
                category: "",
                months: "",
                week: "",
                modeOfPayment: "",
                financeStatus: "",
                amount: "",
                reason: "",
                givenBy: "",
            });
            fetchExpenses();
        } catch (err) {
            console.error("Bulk edit expense error:", err);
            toast.error(err.response?.data?.message || "Failed to bulk update expenses");
        } finally {
            setBulkUpdating(false);
        }
    };
    useEffect(() => {
        setCurrentPage(1);
        setPageInput("1");
    }, [searchTerm, nameFilter, fromDate, toDate, typeFilter, statusFilter, modeOfPaymentFilter, createdByFilter]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedExpenses = useMemo(() => {
        return filteredExpenses.slice(startIndex, endIndex);
    }, [filteredExpenses, startIndex, endIndex]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            setPageInput(newPage.toString());
        }
    };

    const handlePageInputChange = (e) => {
        setPageInput(e.target.value);
    };

    const handlePageInputSubmit = (e) => {
        e.preventDefault();
        const pageNum = parseInt(pageInput, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
        } else {
            setPageInput(currentPage.toString());
            toast.error(`Please enter a page number between 1 and ${totalPages}`);
        }
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(parseInt(e.target.value, 10));
        setCurrentPage(1);
        setPageInput("1");
    };

    const hasActiveFilters = Boolean(
        searchTerm ||
        nameFilter ||
        fromDate ||
        toDate ||
        datePreset !== "all" ||
        typeFilter !== "all" ||
        statusFilter !== "all" ||
        modeOfPaymentFilter !== "all" ||
        createdByFilter !== "all",
    );

    const clearFilters = () => {
        setSearchTerm("");
        setNameFilter("");
        setDatePreset("all");
        setFromDate("");
        setToDate("");
        setTypeFilter("all");
        setStatusFilter("all");
        setModeOfPaymentFilter("all");
        setCreatedByFilter("all");
    };

    const handleExportToExcel = () => {
        if (filteredExpenses.length === 0) {
            toast.warn("No data to export for the current filters.");
            return;
        }

        const exportRows = filteredExpenses.map((expense) => {
            const isSalary = expense.expenseType === "Salary";
            const amount = isSalary ? (expense.originalAmount !== undefined ? expense.originalAmount : expense.amount) : expense.amount;

            return {
                Type: expense.expenseType || "General",
                "Name / Employee": buildNameEmployeeLabel(expense),
                "Bank Account No.": expense.accountNumber || "—",
                "IFSC Code": expense.ifscCode || "—",
                "Month / Period": buildMonthPeriodLabel(expense),
                "Current Date": expense.currentDate ? new Date(expense.currentDate).toLocaleDateString('en-GB') : "—",
                "Expense Date": expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString('en-GB') : "—",
                Amount: amount ?? "",
                "Paid Amount": expense.paidAmount || 0,
                "Remaining Amount": expense.remainingAmount ?? "",
                Status: getExpenseStatusLabel(expense),
                "Mode of Payment": expense.modeOfPayment || "Bank",
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

    const inputClass = `w-full rounded-lg border py-2.5 px-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 ${isDarkMode
        ? "bg-[#131619] border-slate-600 text-slate-100 placeholder-slate-500"
        : "bg-white border-slate-300 text-slate-800 placeholder-slate-400"
        }`;

    const labelClass = `block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`;

    const cardClass = isDarkMode ? "bg-[#1a1f24] border-slate-700/80" : "bg-white border-slate-200 shadow-sm";

    const thClass = `px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap align-top ${isDarkMode ? "text-slate-400 bg-[#131619]" : "text-slate-500 bg-slate-50"
        }`;

    const tdClass = "px-4 py-3 text-sm align-top";

    const renderApprovedBy = (expense) => {
        const isSalary = expense.expenseType === "Salary";
        const initiatorLabel = isSalary ? "HR Init" : "Created By";
        const initiatorUser = isSalary ? expense.hrApprovedBy : expense.createdBy;

        return (
            <div className="space-y-1.5 min-w-[180px]">
                <div className="leading-snug">
                    <span className={`text-[10px] font-bold uppercase ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}>{initiatorLabel}</span>
                    <span className={`block mt-0.5 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{initiatorUser?.name || "—"}</span>
                </div>

                {expense.payments?.length > 0 ? (
                    <div className={`space-y-1 pt-1.5 border-t border-dashed ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                        <span className={`text-[10px] font-bold uppercase ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Payments</span>
                        {expense.payments.map((pmt, index) => (
                            <div
                                key={index}
                                className={`rounded-md px-2 py-1.5 text-xs ${isDarkMode ? "bg-[#131619] border border-slate-700" : "bg-slate-50 border border-slate-200"
                                    }`}
                            >
                                <div className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                                    ₹{pmt.amountPaid}
                                    <span className={`ml-1 font-normal ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                        by {pmt.paidBy?.name || "Finance"}
                                    </span>
                                </div>
                                {pmt.givenBy && <div className={isDarkMode ? "text-slate-400" : "text-slate-500"}>Approved By: {pmt.givenBy}</div>}
                            </div>
                        ))}
                    </div>
                ) : expense.financeStatus === "Approved" ? (
                    <div className={`space-y-1 pt-1.5 border-t border-dashed ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                        <div className="leading-snug">
                            <span className={`text-[10px] font-bold uppercase ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>Finance</span>
                            <span className={`block mt-0.5 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                                {expense.financeApprovedBy?.name || "—"}
                            </span>
                        </div>
                        {expense.givenBy && (
                            <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Approved by: {expense.givenBy}</div>
                        )}
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <Layout activePage="Finance">
            <div className={`min-h-screen p-4 sm:p-6 lg:p-8 ${isDarkMode ? "bg-[#131619] text-slate-100" : "bg-slate-50 text-slate-900"}`}>
                <ToastContainer theme={theme} position="top-right" />

                <div className="mx-auto max-w-[1600px] space-y-6">
                    {/* Page header */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">All Expenses</h1>
                            <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                Browse finance expense records with filters, approval details, and Excel export.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
                            {canCreate && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleDownloadTemplate}
                                        className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${isDarkMode
                                            ? "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                                            }`}
                                    >
                                        <FaFileExport /> Download Template
                                    </button>

                                    <div className="relative">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept=".xlsx, .xls"
                                            onChange={handleImportFile}
                                            className="hidden"
                                            id="bulk-import-file-input"
                                            disabled={importing}
                                        />
                                        <label
                                            htmlFor="bulk-import-file-input"
                                            className={`inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 cursor-pointer ${importing ? "opacity-50 cursor-not-allowed" : ""
                                                }`}
                                        >
                                            {importing ? (
                                                <>
                                                    <FaSpinner className="animate-spin" /> Importing...
                                                </>
                                            ) : (
                                                <>
                                                    <FaFileImport /> Bulk Import
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={handleExportToExcel}
                                disabled={loading}
                                className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${isDarkMode
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    }`}
                            >
                                <FaDownload /> Export Excel
                            </button>
                            {canCreate && (
                                <Link
                                    to="/finance/expense/create"
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
                                >
                                    <FaPlus /> Add Expense
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Expenditure Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl">
                        {/* Card 1: Total Expenditure */}
                        <div className={`p-5 rounded-xl border flex items-center justify-between transition-all ${isDarkMode ? "bg-[#1a1f24] border-slate-700/80" : "bg-white border-slate-200 shadow-sm"}`}>
                            <div>
                                <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    Total Expenditure (All Time)
                                </p>
                                <h3 className={`text-2xl sm:text-3xl font-black mt-1.5 ${isDarkMode ? "text-indigo-400" : "text-indigo-700"}`}>
                                    ₹{Math.round(allTimeExpenditure).toLocaleString('en-IN')}
                                </h3>
                                <p className="text-[11px] font-semibold text-indigo-500/80 mt-1">
                                    {expenses.length} total expense record(s)
                                </p>
                            </div>
                            <div className={`p-4 rounded-xl ml-6 ${isDarkMode ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
                                <FaRupeeSign size={26} />
                            </div>
                        </div>

                        {/* Card 2: This Month's Expenditure */}
                        <div className={`p-5 rounded-xl border flex items-center justify-between transition-all ${isDarkMode ? "bg-[#1a1f24] border-slate-700/80" : "bg-white border-slate-200 shadow-sm"}`}>
                            <div>
                                <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    This Month's Expenditure
                                </p>
                                <h3 className={`text-2xl sm:text-3xl font-black mt-1.5 ${isDarkMode ? "text-cyan-400" : "text-cyan-700"}`}>
                                    ₹{Math.round(thisMonthExpenditure).toLocaleString('en-IN')}
                                </h3>
                                <p className="text-[11px] font-semibold text-cyan-500/80 mt-1">
                                    {thisMonthRecordsCount} expense record(s) this month
                                </p>
                            </div>
                            <div className={`p-4 rounded-xl ml-6 ${isDarkMode ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600"}`}>
                                <FaRupeeSign size={26} />
                            </div>
                        </div>

                        {/* Card 3: Filtered Expenditure */}
                        <div className={`p-5 rounded-xl border flex items-center justify-between transition-all ${isDarkMode ? "bg-[#1a1f24] border-slate-700/80" : "bg-white border-slate-200 shadow-sm"}`}>
                            <div>
                                <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    Filtered Expenditure
                                </p>
                                <h3 className={`text-2xl sm:text-3xl font-black mt-1.5 ${isDarkMode ? "text-emerald-400" : "text-emerald-700"}`}>
                                    ₹{Math.round(totalExpenditureAmount).toLocaleString('en-IN')}
                                </h3>
                                <p className="text-[11px] font-semibold text-emerald-500/80 mt-1">
                                    {filteredExpenses.length} expense record(s) matching filters
                                </p>
                            </div>
                            <div className={`p-4 rounded-xl ml-6 ${isDarkMode ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                                <FaRupeeSign size={26} />
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className={`rounded-xl border p-4 sm:p-5 ${cardClass}`}>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <FaFilter className={isDarkMode ? "text-cyan-400" : "text-cyan-600"} />
                                <h2 className="text-sm font-semibold">Filters</h2>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                                        }`}
                                >
                                    Showing {filteredExpenses.length} of {expenses.length}
                                </span>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${isDarkMode
                                            ? "border-slate-600 text-slate-300 hover:bg-slate-800"
                                            : "border-slate-300 text-slate-600 hover:bg-slate-100"
                                            }`}
                                    >
                                        <FaEraser /> Clear filters
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Search</label>
                                <div className="relative">
                                    <FaSearch
                                        className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"
                                            }`}
                                    />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search by type, category, month, approver, employee..."
                                        className={`${inputClass} pl-9`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
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
                                    <label className={labelClass}>Date Filter</label>
                                    <select
                                        value={datePreset}
                                        onChange={(e) => handlePresetChange(e.target.value)}
                                        className={inputClass}
                                    >
                                        <option value="all">All Time</option>
                                        <option value="today">Today</option>
                                        <option value="yesterday">Yesterday</option>
                                        <option value="this-month">This Month</option>
                                        <option value="last-month">Last Month</option>
                                        <option value="this-year">This Year</option>
                                        <option value="last-year">Last Year</option>
                                        <option value="custom">Custom Range</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>From date</label>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => {
                                            setFromDate(e.target.value);
                                            setDatePreset("custom");
                                        }}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>To date</label>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => {
                                            setToDate(e.target.value);
                                            setDatePreset("custom");
                                        }}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Type</label>
                                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputClass}>
                                        <option value="all">All types</option>
                                        <option value="Salary">Salary</option>
                                        {categories.map((cat) => (
                                            <option key={cat._id} value={cat._id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Status</label>
                                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
                                        <option value="all">All statuses</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Partially Paid">Partially Paid</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Rejected">Rejected</option>
                                        <option value="N/A">N/A (General)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Mode of Payment</label>
                                    <select
                                        value={modeOfPaymentFilter}
                                        onChange={(e) => setModeOfPaymentFilter(e.target.value)}
                                        className={inputClass}
                                    >
                                        <option value="all">All modes</option>
                                        <option value="Bank">Bank</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Bank+Cash">Bank+Cash</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Created By</label>
                                    <select value={createdByFilter} onChange={(e) => setCreatedByFilter(e.target.value)} className={inputClass}>
                                        <option value="all">All creators</option>
                                        {creatorOptions.map((creator) => (
                                            <option key={creator.id} value={creator.id}>
                                                {creator.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className={`overflow-hidden rounded-xl border ${cardClass}`}>
                        <div
                            className={`flex items-center justify-between border-b px-4 py-3 sm:px-5 ${isDarkMode ? "border-slate-700 bg-[#131619]/50" : "border-slate-200 bg-slate-50"}`}
                        >
                            <h3 className="text-sm font-semibold">Expense records</h3>
                            <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                {filteredExpenses.length} record{filteredExpenses.length !== 1 ? "s" : ""}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-[1100px] w-full border-collapse text-left">
                                <thead>
                                    <tr className={`border-b ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                                        <th className={`${thClass} w-10 text-center`}>
                                            <input
                                                type="checkbox"
                                                checked={isAllSelected}
                                                onChange={handleSelectAll}
                                                className="rounded border-slate-400 text-cyan-600 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                                                title="Select All"
                                            />
                                        </th>
                                        <th className={thClass}>Type</th>
                                        <th className={thClass}>Name / Employee</th>
                                        <th className={thClass}>Bank Account No.</th>
                                        <th className={thClass}>IFSC Code</th>
                                        <th className={thClass}>Month / Period</th>
                                        <th className={thClass}>Amount</th>
                                        {/* <th className={thClass}>Status</th> */}
                                        <th className={`${thClass} min-w-[200px]`}>Approved By (HR/Gen)</th>
                                        <th className={thClass}>Mode of Payment</th>
                                        <th className={thClass}>Date</th>
                                        <th className={`${thClass} w-28 text-center`}>Action</th>
                                    </tr>
                                </thead>
                                <tbody className={isDarkMode ? "text-slate-200" : "text-slate-700"}>
                                    {loading ? (
                                        <tr>
                                            <td
                                                colSpan="12"
                                                className={`px-4 py-12 text-center text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                                            >
                                                Loading expenses...
                                            </td>
                                        </tr>
                                    ) : filteredExpenses.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan="12"
                                                className={`px-4 py-12 text-center text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                                            >
                                                {hasActiveFilters ? "No expenses match the current filters." : "No expenses found."}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedExpenses.map((expense) => (
                                            <tr
                                                key={expense._id}
                                                className={`border-b transition-colors ${selectedExpenseIds.includes(expense._id)
                                                    ? isDarkMode
                                                        ? "bg-cyan-950/40 border-cyan-700/60"
                                                        : "bg-cyan-50/60 border-cyan-200"
                                                    : isDarkMode
                                                        ? "border-slate-700/80 hover:bg-slate-800/40"
                                                        : "border-slate-100 hover:bg-slate-50"
                                                    }`}
                                            >
                                                <td className={`${tdClass} text-center`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedExpenseIds.includes(expense._id)}
                                                        onChange={() => handleSelectExpense(expense._id)}
                                                        className="rounded border-slate-400 text-cyan-600 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                                                    />
                                                </td>
                                                <td className={tdClass}>
                                                    <span
                                                        className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${getTypeBadgeClass(expense.expenseType, isDarkMode)}`}
                                                    >
                                                        {expense.expenseType === "Salary" ? "Salary" : getCategoryName(expense)}
                                                    </span>
                                                </td>

                                                <td className={tdClass}>
                                                    {expense.expenseType === "Salary" ? (
                                                        <div className="min-w-[140px]">
                                                            <div className={`font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                                                                {expense.employeeId?.name || "—"}
                                                            </div>
                                                            {expense.departmentId?.departmentName && (
                                                                <div className={`mt-0.5 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                                    {expense.departmentId.departmentName}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span>{expense.name || "—"}</span>
                                                    )}
                                                </td>

                                                <td className={tdClass}>
                                                    <span className="font-medium tabular-nums">{expense.accountNumber || "—"}</span>
                                                </td>

                                                <td className={tdClass}>
                                                    <span className="font-medium">{expense.ifscCode || "—"}</span>
                                                </td>

                                                <td className={tdClass}>
                                                    {expense.expenseType === "Salary" ? (
                                                        <div className="min-w-[120px]">
                                                            {expense.months && (
                                                                <div className={`font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                                                                    {expense.months}
                                                                </div>
                                                            )}
                                                            {expense.salaryPeriod && (
                                                                <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                                    {expense.salaryPeriod}
                                                                </div>
                                                            )}
                                                            {!expense.months && !expense.salaryPeriod && "—"}
                                                        </div>
                                                    ) : (
                                                        <div className="min-w-[120px]">
                                                            {expense.months || expense.week ? (
                                                                <div className={`font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                                                                    {[expense.months, expense.week].filter(Boolean).join(" · ")}
                                                                </div>
                                                            ) : (
                                                                "—"
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className={tdClass}>
                                                    <div className="space-y-1 min-w-[100px]">
                                                        <div className={`font-bold tabular-nums ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                                                            ₹{expense.originalAmount !== undefined ? expense.originalAmount : expense.amount || 0}
                                                        </div>
                                                        {expense.paidAmount > 0 && (
                                                            <div
                                                                className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ${isDarkMode ? "bg-emerald-500/15 text-emerald-300" : "bg-green-50 text-green-700"}`}
                                                            >
                                                                Paid: ₹{expense.paidAmount}
                                                            </div>
                                                        )}
                                                        {expense.remainingAmount > 0 && expense.paidAmount > 0 && (
                                                            <div
                                                                className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ${isDarkMode ? "bg-amber-500/15 text-amber-300" : "bg-amber-50 text-amber-700"}`}
                                                            >
                                                                Rem: ₹{expense.remainingAmount}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>


                                                <td className={tdClass}>{renderApprovedBy(expense)}</td>

                                                <td className={tdClass}>
                                                    <span
                                                        className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${expense.modeOfPayment === "Cash"
                                                            ? isDarkMode
                                                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                                                : "bg-amber-100 text-amber-800 border border-amber-200"
                                                            : expense.modeOfPayment === "Bank+Cash"
                                                                ? isDarkMode
                                                                    ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                                                                    : "bg-purple-100 text-purple-800 border border-purple-200"
                                                                : isDarkMode
                                                                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                                                                    : "bg-blue-100 text-blue-800 border border-blue-200"
                                                            }`}
                                                    >
                                                        {expense.modeOfPayment || "Bank"}
                                                    </span>
                                                </td>

                                                <td className={tdClass}>
                                                    <div
                                                        className={`space-y-0.5 text-xs min-w-[110px] ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                                                    >
                                                        <div>
                                                            <span className={isDarkMode ? "text-slate-500" : "text-slate-400"}>
                                                                {expense.expenseType === "Salary" ? "Init: " : "Created: "}
                                                            </span>
                                                            {formatDate(
                                                                expense.expenseType === "Salary" ? expense.hrApprovedDate : expense.expenseDate,
                                                            )}
                                                        </div>
                                                        {expense.financeStatus === "Approved" && expense.financeApprovedDate && (
                                                            <div>
                                                                <span className={isDarkMode ? "text-slate-500" : "text-slate-400"}>Appr: </span>
                                                                {formatDate(expense.financeApprovedDate)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className={`${tdClass}`}>
                                                    <div className="flex items-center justify-center gap-1.5 flex-wrap min-w-[220px]">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewClick(expense)}
                                                            className="inline-flex items-center gap-1 rounded bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 text-[11px] font-bold transition-all"
                                                            title="View details"
                                                        >
                                                            <FaEye size={10} /> View
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditClick(expense)}
                                                            className="inline-flex items-center gap-1 rounded bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 text-[11px] font-bold transition-all"
                                                            title="Edit expense"
                                                        >
                                                            <FaEdit size={10} /> Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteClick(expense)}
                                                            className="inline-flex items-center gap-1 rounded bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 text-[11px] font-bold transition-all"
                                                            title="Delete expense"
                                                        >
                                                            <FaTrash size={10} /> Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar */}
                        {filteredExpenses.length > 0 && (
                            <div
                                className={`px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-t ${isDarkMode ? "bg-[#111318] border-slate-700/80 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                                    }`}
                            >
                                {/* Items Per Page Selector */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium opacity-80">Show</span>
                                    <select
                                        value={itemsPerPage}
                                        onChange={handleItemsPerPageChange}
                                        className={`rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none border transition focus:ring-2 focus:ring-cyan-500/20 ${isDarkMode ? "bg-[#1a1f24] border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800"
                                            }`}
                                    >
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={500}>500</option>
                                    </select>
                                    <span className="text-xs font-medium opacity-80">entries</span>
                                </div>

                                {/* Navigation Controls */}
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border disabled:opacity-40 disabled:cursor-not-allowed ${isDarkMode
                                            ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                                            : "bg-white border-slate-300 hover:bg-slate-100 text-slate-700"
                                            }`}
                                    >
                                        Previous
                                    </button>

                                    <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1.5 text-xs font-semibold">
                                        <span>Page</span>
                                        <input
                                            type="text"
                                            value={pageInput}
                                            onChange={handlePageInputChange}
                                            className={`w-12 text-center py-1 rounded-md border text-xs font-bold outline-none ${isDarkMode ? "bg-[#1a1f24] border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800"
                                                }`}
                                        />
                                        <span>of {totalPages}</span>
                                    </form>

                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border disabled:opacity-40 disabled:cursor-not-allowed ${isDarkMode
                                            ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                                            : "bg-white border-slate-300 hover:bg-slate-100 text-slate-700"
                                            }`}
                                    >
                                        Next
                                    </button>
                                </div>

                                {/* Entries Summary */}
                                <div className="text-xs font-medium opacity-80">
                                    Showing <span className="font-bold opacity-100">{startIndex + 1}</span> to{" "}
                                    <span className="font-bold opacity-100">{Math.min(endIndex, filteredExpenses.length)}</span> of{" "}
                                    <span className="font-bold opacity-100">{filteredExpenses.length}</span> entries
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Import Errors Modal */}
                    {showErrorsModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                            <div
                                className={`w-full max-w-2xl rounded-xl p-6 shadow-2xl ${isDarkMode ? "bg-[#1a1f24] text-slate-100 border border-slate-700" : "bg-white text-slate-800"
                                    }`}
                            >
                                <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-200 dark:border-slate-700">
                                    <h3 className="text-lg font-black text-red-500 uppercase tracking-wider flex items-center gap-2">
                                        Import Validation Errors
                                    </h3>
                                    <button
                                        onClick={() => setShowErrorsModal(false)}
                                        className={`transition p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
                                            }`}
                                    >
                                        <FaTimes size={18} />
                                    </button>
                                </div>
                                <div className="max-h-96 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {importErrors.map((err, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-3 rounded-lg border text-sm font-semibold flex items-center gap-2 ${isDarkMode ? "bg-red-950/20 border-red-900/50 text-red-300" : "bg-red-50 border-red-200 text-red-800"
                                                }`}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                                            <span>{err}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={() => setShowErrorsModal(false)}
                                        className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-red-600/20 transition-all"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View Details Modal */}
                    {showViewModal && viewExpense && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                            <div
                                className={`w-full max-w-lg rounded-xl p-6 shadow-2xl ${isDarkMode ? "bg-[#1a1f24] text-slate-100 border border-slate-700" : "bg-white text-slate-800"
                                    }`}
                            >
                                <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-200 dark:border-slate-700">
                                    <h3 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">Expense Details</h3>
                                    <button
                                        onClick={() => setShowViewModal(false)}
                                        className={`transition p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500"
                                            }`}
                                    >
                                        <FaTimes size={18} />
                                    </button>
                                </div>
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                                            >
                                                Expense Type
                                            </label>
                                            <div className="font-semibold text-sm">{viewExpense.expenseType}</div>
                                        </div>
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                                            >
                                                {viewExpense.expenseType === "Salary" ? "Employee" : "Expense Name"}
                                            </label>
                                            <div className="font-semibold text-sm">
                                                {viewExpense.expenseType === "Salary" ? viewExpense.employeeId?.name || "—" : viewExpense.name || "—"}
                                            </div>
                                        </div>
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                                            >
                                                Category
                                            </label>
                                            <div className="font-semibold text-sm">{getCategoryName(viewExpense)}</div>
                                        </div>
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                                            >
                                                Period
                                            </label>
                                            <div className="font-semibold text-sm">
                                                {viewExpense.expenseType === "Salary"
                                                    ? [viewExpense.months, viewExpense.salaryPeriod].filter(Boolean).join(" · ")
                                                    : [viewExpense.months, viewExpense.week].filter(Boolean).join(" · ")}
                                            </div>
                                        </div>
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                                            >
                                                Amount
                                            </label>
                                            <div className="font-bold text-sm text-cyan-500">
                                                ₹{viewExpense.originalAmount !== undefined ? viewExpense.originalAmount : viewExpense.amount}
                                            </div>
                                        </div>
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                                            >
                                                Status
                                            </label>
                                            <div className="font-semibold text-sm">{getSalaryFinanceStatusLabel(viewExpense)}</div>
                                        </div>
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                                            >
                                                Bank Account No.
                                            </label>
                                            <div className="font-semibold text-sm">{viewExpense.accountNumber || "—"}</div>
                                        </div>
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                                            >
                                                IFSC Code
                                            </label>
                                            <div className="font-semibold text-sm">{viewExpense.ifscCode || "—"}</div>
                                        </div>
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                                            >
                                                Mode of Payment
                                            </label>
                                            <div className="font-semibold text-sm">{viewExpense.modeOfPayment || "Bank"}</div>
                                        </div>
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                                            >
                                                Created By
                                            </label>
                                            <div className="font-semibold text-sm">{viewExpense.createdBy?.name || "—"}</div>
                                        </div>
                                    </div>
                                    {viewExpense.payments && viewExpense.payments.length > 0 && (
                                        <div className="mt-4 border-t pt-4 dark:border-slate-700">
                                            <label
                                                className={`block text-xs uppercase tracking-wider mb-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
                                            >
                                                Payments Log
                                            </label>
                                            <div className="space-y-2">
                                                {viewExpense.payments.map((p, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`p-2.5 rounded-lg border text-xs ${isDarkMode ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                                                    >
                                                        <div className="flex justify-between font-semibold">
                                                            <span>₹{p.amountPaid}</span>
                                                            <span className="opacity-70">
                                                                {p.paidDate ? new Date(p.paidDate).toLocaleDateString() : ""}
                                                            </span>
                                                        </div>
                                                        {p.givenBy && (
                                                            <div className="mt-0.5">
                                                                <span className="opacity-60">Given By:</span> {p.givenBy}
                                                            </div>
                                                        )}
                                                        {p.reason && (
                                                            <div className="mt-0.5">
                                                                <span className="opacity-60">Reason:</span> {p.reason}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={() => setShowViewModal(false)}
                                        className={`px-5 py-2.5 rounded-lg text-sm font-bold border transition ${isDarkMode
                                            ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                                            : "border-slate-300 text-slate-600 hover:bg-slate-100"
                                            }`}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit Expense Modal */}
                    {showEditModal && editExpense && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                            <form
                                onSubmit={handleEditSubmit}
                                className={`w-full max-w-lg rounded-xl p-6 shadow-2xl ${isDarkMode ? "bg-[#1a1f24] text-slate-100 border border-slate-700" : "bg-white text-slate-800"
                                    }`}
                            >
                                <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-200 dark:border-slate-700">
                                    <h3 className="text-lg font-black uppercase tracking-wider">Edit Expense</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className={`transition p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500"
                                            }`}
                                    >
                                        <FaTimes size={18} />
                                    </button>
                                </div>
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                    <div>
                                        <label
                                            className={`block text-xs uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                                        >
                                            Expense Name <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={editFormData.name}
                                            onChange={handleEditInputChange}
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                                            >
                                                Category <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                name="category"
                                                value={editFormData.category}
                                                onChange={handleEditInputChange}
                                                className={inputClass}
                                                required
                                            >
                                                <option value="">— Select —</option>
                                                {categories.map((c) => (
                                                    <option key={c._id} value={c._id}>
                                                        {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                                            >
                                                Amount (₹) <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                name="amount"
                                                value={editFormData.amount}
                                                onChange={handleEditInputChange}
                                                className={inputClass}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                                            >
                                                Month <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                name="months"
                                                value={editFormData.months}
                                                onChange={handleEditInputChange}
                                                className={inputClass}
                                                required
                                            >
                                                <option value="">— Select —</option>
                                                {[
                                                    "January",
                                                    "February",
                                                    "March",
                                                    "April",
                                                    "May",
                                                    "June",
                                                    "July",
                                                    "August",
                                                    "September",
                                                    "October",
                                                    "November",
                                                    "December",
                                                ].map((m) => (
                                                    <option key={m} value={m}>
                                                        {m}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                                            >
                                                Week <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                name="week"
                                                value={editFormData.week}
                                                onChange={handleEditInputChange}
                                                className={inputClass}
                                                required
                                            >
                                                <option value="">— Select —</option>
                                                {["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"].map((w) => (
                                                    <option key={w} value={w}>
                                                        {w}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                                            >
                                                Bank Account No.
                                            </label>
                                            <input
                                                type="text"
                                                name="accountNumber"
                                                value={editFormData.accountNumber}
                                                onChange={handleEditInputChange}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label
                                                className={`block text-xs uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                                            >
                                                IFSC Code
                                            </label>
                                            <input
                                                type="text"
                                                name="ifscCode"
                                                value={editFormData.ifscCode}
                                                onChange={handleEditInputChange}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label
                                                className={`block text-xs uppercase tracking-wider mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                                            >
                                                Mode of Payment <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                name="modeOfPayment"
                                                value={editFormData.modeOfPayment}
                                                onChange={handleEditInputChange}
                                                className={inputClass}
                                                required
                                            >
                                                <option value="Bank">Bank</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Bank+Cash">Bank+Cash</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className={`px-5 py-2.5 rounded-lg text-sm font-bold border transition ${isDarkMode
                                            ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                                            : "border-slate-300 text-slate-600 hover:bg-slate-100"
                                            }`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg text-sm shadow-lg shadow-cyan-500/20 transition"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Floating Bulk Action Bar */}
                    {selectedExpenseIds.length > 0 && (
                        <div
                            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-md transition-all ${isDarkMode
                                ? "bg-[#1a1f24]/95 border-cyan-500/30 text-white shadow-cyan-500/10"
                                : "bg-white/95 border-cyan-200 text-slate-900 shadow-slate-300"
                                }`}
                        >
                            <div className="flex items-center gap-2 pr-2 border-r border-gray-600/30">
                                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-wider">{selectedExpenseIds.length} Selected</span>
                            </div>
                            <button
                                onClick={() => setShowBulkEditModal(true)}
                                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
                            >
                                <FaEdit /> Bulk Edit
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={bulkDeleting}
                                className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all hover:scale-105"
                            >
                                <FaTrash /> {bulkDeleting ? "Deleting..." : "Bulk Delete"}
                            </button>
                            <button
                                onClick={() => setSelectedExpenseIds([])}
                                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold uppercase rounded-xl transition-all"
                            >
                                Clear
                            </button>
                        </div>
                    )}



                    {/* Bulk Edit Modal */}
                    {showBulkEditModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div
                                className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${isDarkMode ? "bg-[#1a1f24] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
                                    }`}
                            >
                                <div
                                    className={`flex items-center justify-between p-5 border-b ${isDarkMode ? "border-gray-800" : "border-gray-100"}`}
                                >
                                    <div>
                                        <h3 className="text-lg font-bold">Bulk Edit Expenses</h3>
                                        <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">
                                            Updating {selectedExpenseIds.length} selected record(s)
                                        </p>
                                    </div>
                                    <button onClick={() => setShowBulkEditModal(false)} className="p-2 rounded-lg hover:bg-gray-700/20 text-gray-400">
                                        <FaTimes />
                                    </button>
                                </div>
                                <form onSubmit={handleBulkEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                                    <p className="text-xs text-amber-400 font-medium">
                                        Only fields you select or change will be updated across all selected expenses.
                                    </p>

                                    <div>
                                        <label className={labelClass}>Category</label>
                                        <select
                                            value={bulkEditFormData.category}
                                            onChange={(e) => setBulkEditFormData((prev) => ({ ...prev, category: e.target.value }))}
                                            className={inputClass}
                                        >
                                            <option value="">-- Leave Unchanged --</option>
                                            {categories.map((c) => (
                                                <option key={c._id} value={c._id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>Month</label>
                                            <select
                                                value={bulkEditFormData.months}
                                                onChange={(e) => setBulkEditFormData((prev) => ({ ...prev, months: e.target.value }))}
                                                className={inputClass}
                                            >
                                                <option value="">-- Leave Unchanged --</option>
                                                {[
                                                    "January",
                                                    "February",
                                                    "March",
                                                    "April",
                                                    "May",
                                                    "June",
                                                    "July",
                                                    "August",
                                                    "September",
                                                    "October",
                                                    "November",
                                                    "December",
                                                ].map((m) => (
                                                    <option key={m} value={m}>
                                                        {m}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Week</label>
                                            <select
                                                value={bulkEditFormData.week}
                                                onChange={(e) => setBulkEditFormData((prev) => ({ ...prev, week: e.target.value }))}
                                                className={inputClass}
                                            >
                                                <option value="">-- Leave Unchanged --</option>
                                                {["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"].map((w) => (
                                                    <option key={w} value={w}>
                                                        {w}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>Mode of Payment</label>
                                            <select
                                                value={bulkEditFormData.modeOfPayment}
                                                onChange={(e) => setBulkEditFormData((prev) => ({ ...prev, modeOfPayment: e.target.value }))}
                                                className={inputClass}
                                            >
                                                <option value="">-- Leave Unchanged --</option>
                                                <option value="Bank">Bank</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Bank+Cash">Bank+Cash</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Finance Status</label>
                                            <select
                                                value={bulkEditFormData.financeStatus}
                                                onChange={(e) => setBulkEditFormData((prev) => ({ ...prev, financeStatus: e.target.value }))}
                                                className={inputClass}
                                            >
                                                <option value="">-- Leave Unchanged --</option>
                                                <option value="Pending">Pending</option>
                                                <option value="Approved">Approved</option>
                                                <option value="Rejected">Rejected</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Set Amount (Optional)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="Leave empty to keep current amounts"
                                            value={bulkEditFormData.amount}
                                            onChange={(e) => setBulkEditFormData((prev) => ({ ...prev, amount: e.target.value }))}
                                            className={inputClass}
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4 border-t border-inherit">
                                        <button
                                            type="button"
                                            onClick={() => setShowBulkEditModal(false)}
                                            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-xs font-bold uppercase"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={bulkUpdating}
                                            className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2"
                                        >
                                            {bulkUpdating ? "Applying..." : "Apply Bulk Updates"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default GetAllExpense;
