import React, { useState, useEffect, useMemo, useCallback } from "react";
import Layout from "../../../components/Layout";
import Pagination from "../../../components/common/Pagination";
import { useTheme } from "../../../context/ThemeContext";
import {
    FaSearch,
    FaFilter,
    FaCalendarAlt,
    FaUsers,
    FaCheckCircle,
    FaHourglassHalf,
    FaBalanceScale,
    FaFileExcel,
    FaEye,
    FaTimes,
    FaSync,
    FaBuilding,
    FaUserTie,
    FaIdBadge,
    FaCheck,
    FaTimesCircle
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { downloadExcel } from "../../../utils/exportUtils";

const MONTHS = [
    { value: 0, label: "January" },
    { value: 1, label: "February" },
    { value: 2, label: "March" },
    { value: 3, label: "April" },
    { value: 4, label: "May" },
    { value: 5, label: "June" },
    { value: 6, label: "July" },
    { value: 7, label: "August" },
    { value: 8, label: "September" },
    { value: 9, label: "October" },
    { value: 10, label: "November" },
    { value: 11, label: "December" }
];

const EmployeeLeaveBalances = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";

    // Data States
    const [employees, setEmployees] = useState([]);
    const [summary, setSummary] = useState({
        totalAllocated: 0,
        totalUsed: 0,
        totalPending: 0,
        totalAvailable: 0
    });
    const [totalEmployees, setTotalEmployees] = useState(0);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [availableFYs, setAvailableFYs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [selectedFY, setSelectedFY] = useState("");
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCentre, setSelectedCentre] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("");

    // Master Data for dropdowns
    const [centresList, setCentresList] = useState([]);
    const [departmentsList, setDepartmentsList] = useState([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Detail Modal State
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employeeDetails, setEmployeeDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Export Loading
    const [exporting, setExporting] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL;

    // Fetch Master Data (Centres & Departments)
    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };
                const [cRes, dRes] = await Promise.all([
                    fetch(`${apiUrl}/centre`, { headers }),
                    fetch(`${apiUrl}/department`, { headers })
                ]);
                if (cRes.ok) {
                    const cData = await cRes.json();
                    setCentresList(Array.isArray(cData) ? cData : []);
                }
                if (dRes.ok) {
                    const dData = await dRes.json();
                    setDepartmentsList(Array.isArray(dData) ? dData : []);
                }
            } catch (err) {
                console.error("Error fetching master data for filters:", err);
            }
        };
        fetchMasters();
    }, [apiUrl]);

    // Fetch Employee Leave Balances
    const fetchBalances = useCallback(async (page = currentPage, limit = itemsPerPage) => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams();

            if (selectedFY) queryParams.append("financialYear", selectedFY);
            if (selectedMonth !== "" && selectedMonth !== null) queryParams.append("month", selectedMonth.toString());
            if (selectedCentre) queryParams.append("centre", selectedCentre);
            if (selectedDepartment) queryParams.append("department", selectedDepartment);
            if (searchTerm && searchTerm.trim()) queryParams.append("search", searchTerm.trim());
            queryParams.append("page", page.toString());
            queryParams.append("limit", limit.toString());

            const response = await fetch(`${apiUrl}/hr/attendance/employee-leave-balances?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setEmployees(data.employees || []);
                setTotalEmployees(data.totalEmployees || 0);
                if (data.summary) setSummary(data.summary);
                if (data.leaveTypes) setLeaveTypes(data.leaveTypes);
                if (data.availableFinancialYears && data.availableFinancialYears.length > 0) {
                    setAvailableFYs(data.availableFinancialYears);
                }
                if (!selectedFY && data.financialYear) {
                    setSelectedFY(data.financialYear);
                }
            } else {
                toast.error("Failed to load employee leave balances");
            }
        } catch (error) {
            console.error("Error fetching leave balances:", error);
            toast.error("Network error while loading leave balances");
        } finally {
            setLoading(false);
        }
    }, [apiUrl, selectedFY, selectedMonth, selectedCentre, selectedDepartment, searchTerm, currentPage, itemsPerPage]);

    // Initial and Filter Trigger
    useEffect(() => {
        fetchBalances(currentPage, itemsPerPage);
    }, [fetchBalances, currentPage, itemsPerPage]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchBalances(1, itemsPerPage);
    };

    const handleResetFilters = () => {
        setSearchTerm("");
        setSelectedCentre("");
        setSelectedDepartment("");
        setSelectedMonth(new Date().getMonth());
        setCurrentPage(1);
    };

    // Open Details Modal for Employee
    const handleOpenDetails = async (emp) => {
        setSelectedEmployee(emp);
        setIsDetailsModalOpen(true);
        setDetailsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams();
            if (selectedFY) queryParams.append("financialYear", selectedFY);
            if (selectedMonth !== "" && selectedMonth !== null) queryParams.append("month", selectedMonth.toString());

            const res = await fetch(`${apiUrl}/hr/attendance/employee-leave-balances/${emp._id}?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setEmployeeDetails(data);
            } else {
                toast.error("Failed to load employee leave details");
            }
        } catch (err) {
            console.error("Error loading employee details:", err);
            toast.error("Network error loading details");
        } finally {
            setDetailsLoading(false);
        }
    };

    // Export to Excel
    const handleExportExcel = async () => {
        try {
            setExporting(true);
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams();
            if (selectedFY) queryParams.append("financialYear", selectedFY);
            if (selectedMonth !== "" && selectedMonth !== null) queryParams.append("month", selectedMonth.toString());
            if (selectedCentre) queryParams.append("centre", selectedCentre);
            if (selectedDepartment) queryParams.append("department", selectedDepartment);
            if (searchTerm && searchTerm.trim()) queryParams.append("search", searchTerm.trim());
            queryParams.append("page", "1");
            queryParams.append("limit", "2000"); // export all matched

            const response = await fetch(`${apiUrl}/hr/attendance/employee-leave-balances?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                toast.error("Failed to fetch data for export");
                return;
            }

            const data = await response.json();
            const exportRows = (data.employees || []).map((emp, index) => {
                const row = {
                    "SL No": index + 1,
                    "Financial Year": data.financialYear || selectedFY,
                    "Employee ID": emp.employeeId,
                    "Employee Name": emp.name,
                    "Department": emp.department,
                    "Designation": emp.designation,
                    "Centre": emp.primaryCentre,
                    "Reporting Manager": emp.manager?.name || "N/A"
                };

                // Add columns for each leave type
                (emp.leaveBalances || []).forEach(lb => {
                    row[`${lb.leaveTypeName} (Quota)`] = lb.totalQuota;
                    row[`${lb.leaveTypeName} (Used)`] = lb.usedDays;
                    row[`${lb.leaveTypeName} (Pending)`] = lb.pendingDays;
                    row[`${lb.leaveTypeName} (Available)`] = lb.availableDays;
                });

                row["Total Quota"] = emp.totalAllocated;
                row["Total Used"] = emp.totalUsed;
                row["Total Pending"] = emp.totalPending;
                row["Total Available"] = emp.totalAvailable;

                return row;
            });

            if (exportRows.length === 0) {
                toast.info("No records available to export");
                return;
            }

            downloadExcel(exportRows, "Employee_Leave_Balances_FY_" + (data.financialYear || selectedFY || "Current"));
            toast.success("Excel exported successfully!");
        } catch (err) {
            console.error("Export error:", err);
            toast.error("Failed to export Excel");
        } finally {
            setExporting(false);
        }
    };

    // Helper for leave balance badge styling
    const getBadgeStyle = (available, quota) => {
        if (available === 0) {
            return isDarkMode
                ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                : "bg-rose-50 text-rose-700 border-rose-200";
        }
        const ratio = quota > 0 ? available / quota : 1;
        if (ratio <= 0.3) {
            return isDarkMode
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                : "bg-amber-50 text-amber-700 border-amber-200";
        }
        return isDarkMode
            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
            : "bg-emerald-50 text-emerald-700 border-emerald-200";
    };

    return (
        <Layout>
            <div className={`min-h-screen p-4 sm:p-6 lg:p-8 transition-colors ${isDarkMode ? 'bg-[#0f1115] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
                <ToastContainer />

                {/* Header & Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-500 mb-1">
                            <span>HR &amp; Manpower</span>
                            <span>/</span>
                            <span>Attendance Management</span>
                            <span>/</span>
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Leave Balances</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider flex items-center gap-2">
                            <FaBalanceScale className="text-cyan-500" />
                            Employee Leave Balances
                        </h1>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Live leave quota analysis by Financial Year (April 1 – March 31) for active personnel.
                        </p>
                    </div>

                    {/* Top Action Bar (Financial Year & Month Selectors + Export + Refresh) */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Financial Year Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">FY:</span>
                            <select
                                value={selectedFY}
                                onChange={(e) => {
                                    setSelectedFY(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className={`px-3 py-2 rounded-[4px] border text-xs font-black tracking-wider uppercase focus:outline-none transition-all ${
                                    isDarkMode
                                        ? 'bg-[#181b20] border-gray-800 text-cyan-400 focus:border-cyan-500'
                                        : 'bg-white border-gray-200 text-cyan-700 focus:border-cyan-500 shadow-sm'
                                }`}
                            >
                                {availableFYs.map(fy => (
                                    <option key={fy} value={fy}>FY {fy}</option>
                                ))}
                            </select>
                        </div>

                        {/* Month Selector for Monthly Leaves */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">Month:</span>
                            <select
                                value={selectedMonth}
                                onChange={(e) => {
                                    setSelectedMonth(parseInt(e.target.value, 10));
                                    setCurrentPage(1);
                                }}
                                className={`px-3 py-2 rounded-[4px] border text-xs font-black tracking-wider uppercase focus:outline-none transition-all ${
                                    isDarkMode
                                        ? 'bg-[#181b20] border-gray-800 text-white focus:border-cyan-500'
                                        : 'bg-white border-gray-200 text-gray-800 focus:border-cyan-500 shadow-sm'
                                }`}
                            >
                                {MONTHS.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={handleExportExcel}
                            disabled={exporting || loading}
                            className={`flex items-center gap-2 px-4 py-2 rounded-[4px] border text-xs font-black uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                isDarkMode
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black'
                                    : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-600 hover:text-white shadow-sm'
                            }`}
                        >
                            <FaFileExcel />
                            {exporting ? "Exporting..." : "Export Excel"}
                        </button>

                        {/* Refresh Button */}
                        <button
                            onClick={() => fetchBalances(currentPage, itemsPerPage)}
                            disabled={loading}
                            title="Refresh"
                            className={`p-2 rounded-[4px] border text-xs font-bold transition-all ${
                                isDarkMode
                                    ? 'bg-[#181b20] border-gray-800 text-gray-300 hover:text-white hover:border-gray-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 shadow-sm'
                            }`}
                        >
                            <FaSync className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Filter and Search Box */}
                <div className={`p-4 rounded-[4px] border mb-6 ${isDarkMode ? 'bg-[#14171c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Search Input */}
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                            <input
                                type="text"
                                placeholder="SEARCH NAME, EMP ID, EMAIL..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-9 pr-3 py-2 rounded-[4px] border text-xs font-bold tracking-wider focus:outline-none transition-all uppercase ${
                                    isDarkMode
                                        ? 'bg-[#101216] border-gray-800 text-white focus:border-cyan-500'
                                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'
                                }`}
                            />
                        </div>

                        {/* Centre Dropdown */}
                        <div>
                            <select
                                value={selectedCentre}
                                onChange={(e) => {
                                    setSelectedCentre(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className={`w-full px-3 py-2 rounded-[4px] border text-xs font-bold tracking-wider uppercase focus:outline-none transition-all ${
                                    isDarkMode
                                        ? 'bg-[#101216] border-gray-800 text-white focus:border-cyan-500'
                                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'
                                }`}
                            >
                                <option value="">ALL CENTRES</option>
                                {centresList.map(c => (
                                    <option key={c._id} value={c.centreName || c._id}>{c.centreName}</option>
                                ))}
                            </select>
                        </div>

                        {/* Department Dropdown */}
                        <div>
                            <select
                                value={selectedDepartment}
                                onChange={(e) => {
                                    setSelectedDepartment(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className={`w-full px-3 py-2 rounded-[4px] border text-xs font-bold tracking-wider uppercase focus:outline-none transition-all ${
                                    isDarkMode
                                        ? 'bg-[#101216] border-gray-800 text-white focus:border-cyan-500'
                                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'
                                }`}
                            >
                                <option value="">ALL DEPARTMENTS</option>
                                {departmentsList.map(d => (
                                    <option key={d._id} value={d._id}>{d.departmentName}</option>
                                ))}
                            </select>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[4px] text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                            >
                                Filter
                            </button>
                            {(searchTerm || selectedCentre || selectedDepartment) && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className={`px-3 py-2 rounded-[4px] border text-xs font-bold transition-all ${
                                        isDarkMode
                                            ? 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white'
                                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Data Table */}
                <div className={`rounded-[4px] border overflow-hidden ${isDarkMode ? 'bg-[#14171c] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-wider border-b ${
                                    isDarkMode ? 'bg-[#181b20] border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'
                                }`}>
                                    <th className="p-3">Employee</th>
                                    <th className="p-3">Centre &amp; Dept</th>
                                    <th className="p-3">Reporting Manager</th>
                                    {leaveTypes.map(lt => (
                                        <th key={lt._id} className="p-3 text-center">
                                            <div>{lt.name}</div>
                                            <div className="text-[8px] font-bold lowercase opacity-60">
                                                {lt.cycle === 'monthly' ? `(${MONTHS[selectedMonth]?.label})` : `(FY ${selectedFY})`}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="p-3 text-center">Overall (Avail / Quota)</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/40 text-xs">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5 + leaveTypes.length} className="text-center py-12">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Calculating leave balances for FY {selectedFY}...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : employees.length === 0 ? (
                                    <tr>
                                        <td colSpan={5 + leaveTypes.length} className="text-center py-12">
                                            <div className="text-gray-500 text-sm font-bold uppercase tracking-wider">
                                                No active employees found matching the filters
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    employees.map((emp) => (
                                        <tr
                                            key={emp._id}
                                            className={`transition-colors ${
                                                isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/80'
                                            }`}
                                        >
                                            {/* Employee Column */}
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    {emp.profileImage ? (
                                                        <img
                                                            src={emp.profileImage}
                                                            alt={emp.name}
                                                            className="w-8 h-8 rounded-full object-cover border border-cyan-500/20"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-xs font-black text-cyan-400 border border-cyan-500/20">
                                                            {(emp.name || "E").charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-black text-sm uppercase tracking-wide flex items-center gap-1.5">
                                                            {emp.name}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-gray-500 tracking-wider flex items-center gap-2">
                                                            <span>{emp.employeeId}</span>
                                                            {emp.designation && emp.designation !== "N/A" && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="text-cyan-500">{emp.designation}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Centre & Dept */}
                                            <td className="p-3 whitespace-nowrap">
                                                <div className="font-bold text-[11px] uppercase tracking-wide">
                                                    {emp.primaryCentre}
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-bold uppercase">
                                                    {emp.department}
                                                </div>
                                            </td>

                                            {/* Reporting Manager */}
                                            <td className="p-3 whitespace-nowrap">
                                                {emp.manager ? (
                                                    <div>
                                                        <div className="font-bold text-[11px] uppercase text-cyan-400">
                                                            {emp.manager.name}
                                                        </div>
                                                        <div className="text-[9px] text-gray-500">
                                                            {emp.manager.employeeId}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500 italic text-[11px]">Unassigned</span>
                                                )}
                                            </td>

                                            {/* Dynamic Leave Types */}
                                            {leaveTypes.map(lt => {
                                                const b = (emp.leaveBalances || []).find(x => x.leaveTypeId === lt._id) || {
                                                    totalQuota: lt.days,
                                                    usedDays: 0,
                                                    pendingDays: 0,
                                                    availableDays: lt.days
                                                };
                                                const badgeCls = getBadgeStyle(b.availableDays, b.totalQuota);

                                                return (
                                                    <td key={lt._id} className="p-3 text-center whitespace-nowrap">
                                                        <span
                                                            className={`inline-block px-2.5 py-1 rounded-[3px] border text-[11px] font-black tracking-wider ${badgeCls}`}
                                                            title={`Quota: ${b.totalQuota} | Approved: ${b.usedDays} | Pending: ${b.pendingDays} | Available: ${b.availableDays}`}
                                                        >
                                                            {b.availableDays} / {b.totalQuota}
                                                        </span>
                                                        {(b.usedDays > 0 || b.pendingDays > 0) && (
                                                            <div className="text-[9px] text-gray-500 font-semibold mt-0.5">
                                                                {b.usedDays > 0 && <span>{b.usedDays} appv</span>}
                                                                {b.usedDays > 0 && b.pendingDays > 0 && <span> • </span>}
                                                                {b.pendingDays > 0 && <span className="text-amber-400">{b.pendingDays} pend</span>}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            {/* Overall Balance */}
                                            <td className="p-3 text-center whitespace-nowrap">
                                                <div className="font-black text-sm text-cyan-400">
                                                    {emp.totalAvailable} <span className="text-xs text-gray-500 font-bold">/ {emp.totalAllocated}</span>
                                                </div>
                                                <div className="text-[9px] text-gray-500 font-semibold">
                                                    {(emp.totalUsed || 0) + (emp.totalPending || 0)} deducted ({Math.round(emp.totalAllocated > 0 ? (((emp.totalUsed || 0) + (emp.totalPending || 0)) / emp.totalAllocated) * 100 : 0)}%)
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="p-3 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => handleOpenDetails(emp)}
                                                    className={`px-3 py-1.5 rounded-[4px] border text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition-all hover:scale-105 ${
                                                        isDarkMode
                                                            ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black'
                                                            : 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-600 hover:text-white'
                                                    }`}
                                                >
                                                    <FaEye /> View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-gray-800/40">
                        <Pagination
                            currentPage={currentPage}
                            totalItems={totalEmployees}
                            itemsPerPage={itemsPerPage}
                            onPageChange={(p) => setCurrentPage(p)}
                            onItemsPerPageChange={(limit) => {
                                setItemsPerPage(limit);
                                setCurrentPage(1);
                            }}
                            theme={isDarkMode ? 'dark' : 'light'}
                        />
                    </div>
                </div>

                {/* Employee Leave Details Modal */}
                {isDetailsModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                        <div className={`w-full max-w-4xl max-h-[90vh] rounded-[6px] border flex flex-col overflow-hidden shadow-2xl ${
                            isDarkMode ? 'bg-[#14171c] border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
                        }`}>
                            {/* Modal Header */}
                            <div className="p-4 sm:p-5 border-b border-gray-800/40 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-lg border border-cyan-500/20">
                                        <FaUserTie />
                                    </div>
                                    <div>
                                        <h2 className="text-base sm:text-lg font-black uppercase tracking-wider">
                                            {selectedEmployee?.name} — Leave Quota Breakdown
                                        </h2>
                                        <p className="text-xs text-gray-500 font-bold tracking-wider">
                                            Financial Year: <span className="text-cyan-400 font-black">FY {selectedFY}</span> • Employee ID: <span className="text-gray-300 font-black">{selectedEmployee?.employeeId}</span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsDetailsModalOpen(false)}
                                    className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
                                {detailsLoading ? (
                                    <div className="py-16 text-center">
                                        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Loading leave ledger...</span>
                                    </div>
                                ) : employeeDetails ? (
                                    <>
                                        {/* Employee Profile Summary */}
                                        <div className={`p-4 rounded-[4px] border grid grid-cols-2 sm:grid-cols-4 gap-3 ${
                                            isDarkMode ? 'bg-[#101216] border-gray-800' : 'bg-gray-50 border-gray-200'
                                        }`}>
                                            <div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Department</span>
                                                <p className="text-xs font-black uppercase tracking-wide">{employeeDetails.employee?.department?.departmentName || "N/A"}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Designation</span>
                                                <p className="text-xs font-black uppercase tracking-wide">{employeeDetails.employee?.designation?.designation || "N/A"}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Primary Centre</span>
                                                <p className="text-xs font-black uppercase tracking-wide">{employeeDetails.employee?.primaryCentre?.centreName || "N/A"}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reporting Manager</span>
                                                <p className="text-xs font-black uppercase tracking-wide text-cyan-400">{employeeDetails.employee?.manager?.name || "Unassigned"}</p>
                                            </div>
                                        </div>

                                        {/* Leave Types Breakdown Grid */}
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                                                <FaBalanceScale className="text-cyan-500" />
                                                Category-wise Quota &amp; Balances (FY {selectedFY})
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                {(employeeDetails.leaveBalances || []).map((lb) => {
                                                    const totalDeducted = (lb.usedDays || 0) + (lb.pendingDays || 0);
                                                    const pct = lb.totalQuota > 0 ? Math.round((totalDeducted / lb.totalQuota) * 100) : 0;
                                                    const badgeCls = getBadgeStyle(lb.availableDays, lb.totalQuota);

                                                    return (
                                                        <div
                                                            key={lb.leaveTypeId}
                                                            className={`p-3.5 rounded-[4px] border flex flex-col justify-between ${
                                                                isDarkMode ? 'bg-[#101216] border-gray-800' : 'bg-gray-50 border-gray-200'
                                                            }`}
                                                        >
                                                            <div>
                                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                                    <span className="text-xs font-black uppercase tracking-wide">{lb.leaveTypeName}</span>
                                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
                                                                        {lb.cycle}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-baseline gap-1 my-2">
                                                                    <span className="text-2xl font-black">{lb.availableDays}</span>
                                                                    <span className="text-xs font-bold text-gray-500">/ {lb.totalQuota} Available</span>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <div className="w-full bg-gray-700/30 h-1.5 rounded-full overflow-hidden mb-2">
                                                                    <div
                                                                        className={`h-full ${pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                                        style={{ width: `${Math.min(100, pct)}%` }}
                                                                    ></div>
                                                                </div>
                                                                <div className="flex justify-between text-[10px] font-semibold text-gray-400">
                                                                    <span>Approved: {lb.usedDays}d</span>
                                                                    {lb.pendingDays > 0 && <span className="text-amber-400">Pending: {lb.pendingDays}d</span>}
                                                                    <span>{pct}% deducted</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Leave Applications History */}
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                                                <FaCalendarAlt className="text-cyan-500" />
                                                Leave Applications in FY {selectedFY}
                                            </h3>
                                            {(employeeDetails.leaveRequests || []).length === 0 ? (
                                                <div className={`p-6 rounded-[4px] border text-center text-xs font-bold uppercase tracking-wider text-gray-500 ${
                                                    isDarkMode ? 'bg-[#101216] border-gray-800' : 'bg-gray-50 border-gray-200'
                                                }`}>
                                                    No leave applications recorded in this Financial Year
                                                </div>
                                            ) : (
                                                <div className={`rounded-[4px] border overflow-hidden ${
                                                    isDarkMode ? 'bg-[#101216] border-gray-800' : 'bg-gray-50 border-gray-200'
                                                }`}>
                                                    <table className="w-full text-left text-xs">
                                                        <thead className={`border-b text-[10px] font-black uppercase tracking-wider ${
                                                            isDarkMode ? 'bg-[#181b20] border-gray-800 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-600'
                                                        }`}>
                                                            <tr>
                                                                <th className="p-2.5">Leave Type</th>
                                                                <th className="p-2.5">From - To</th>
                                                                <th className="p-2.5 text-center">Days</th>
                                                                <th className="p-2.5">Reason</th>
                                                                <th className="p-2.5 text-center">Status</th>
                                                                <th className="p-2.5">Reviewed By</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-800/40">
                                                            {employeeDetails.leaveRequests.map(req => (
                                                                <tr key={req._id}>
                                                                    <td className="p-2.5 font-bold uppercase tracking-wide">
                                                                        {req.leaveType?.name || "Leave"}
                                                                    </td>
                                                                    <td className="p-2.5 whitespace-nowrap text-gray-400">
                                                                        {new Date(req.startDate).toLocaleDateString('en-GB')} – {new Date(req.endDate).toLocaleDateString('en-GB')}
                                                                    </td>
                                                                    <td className="p-2.5 text-center font-black">
                                                                        {req.days}
                                                                    </td>
                                                                    <td className="p-2.5 text-gray-400 max-w-[200px] truncate" title={req.reason}>
                                                                        {req.reason || "—"}
                                                                    </td>
                                                                    <td className="p-2.5 text-center">
                                                                        <span className={`px-2 py-0.5 rounded-[3px] text-[10px] font-black uppercase tracking-wider border ${
                                                                            req.status === 'Approved'
                                                                                ? isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                                : req.status === 'Rejected'
                                                                                ? isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                                                                                : isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                        }`}>
                                                                            {req.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-2.5 text-gray-400 whitespace-nowrap">
                                                                        {req.reviewedBy?.name || "Pending"}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : null}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-gray-800/40 flex justify-end">
                                <button
                                    onClick={() => setIsDetailsModalOpen(false)}
                                    className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-[4px] text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default EmployeeLeaveBalances;
