import React, { useState, useEffect, useMemo, useRef } from "react";
import Layout from "../../../components/Layout";
import {
    FaBuilding, FaUsers, FaMoneyBillWave,
    FaArrowLeft, FaCheck, FaSearch, FaFilter,
    FaChevronDown, FaChevronUp, FaTimes, FaPaperPlane
} from "react-icons/fa";

const SALARY_MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const PAYOUT_WEEKS = ["Week 1", "Week 2", "Week 3", "Week 4", "Full Month"];
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";

/* ─── MultiSelect Component ───────────────────────────────── */
const MultiSelect = ({ label, options, selectedValues, onChange, placeholder, isDark, card, border, text, sub, inputBg }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggleOption = (value) => {
        if (value === "all") {
            if (selectedValues.includes("all")) {
                onChange([]);
            } else {
                onChange(["all"]);
            }
        } else {
            let next = selectedValues.filter(v => v !== "all");
            if (next.includes(value)) {
                next = next.filter(v => v !== value);
            } else {
                next.push(value);
            }
            if (next.length === 0 || next.length === options.length) {
                onChange(["all"]);
            } else {
                onChange(next);
            }
        }
    };

    const isAllSelected = selectedValues.includes("all") || selectedValues.length === 0;

    const displayLabel = () => {
        if (isAllSelected) return `All ${placeholder}s`;
        if (selectedValues.length === 1) {
            const found = options.find(o => o.value === selectedValues[0]);
            return found ? found.label : selectedValues[0];
        }
        return `${selectedValues.length} ${placeholder}s Selected`;
    };

    return (
        <div ref={containerRef} style={{ position: "relative", display: "inline-block", minWidth: 200 }}>
            <span style={{ fontSize: "0.78rem", color: sub, display: "block", marginBottom: 4, fontWeight: 600 }}>{label}</span>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: inputBg,
                    border: `1px solid ${border}`,
                    borderRadius: 8,
                    color: text,
                    padding: "9px 12px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    outline: "none",
                    textAlign: "left",
                    height: 38,
                    boxSizing: "border-box"
                }}>
                <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginRight: 8 }}>
                    {displayLabel()}
                </span>
                <span style={{ fontSize: "0.6rem", color: sub }}>▼</span>
            </button>

            {isOpen && (
                <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 999,
                    marginTop: 6,
                    background: card,
                    border: `1px solid ${border}`,
                    borderRadius: 8,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                    maxHeight: 250,
                    overflowY: "auto",
                    padding: "8px 0"
                }}>
                    <label style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 14px",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        color: text,
                        userSelect: "none",
                        background: isAllSelected ? (isDark ? "#33415555" : "#f1f5f9") : "transparent"
                    }}>
                        <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={() => handleToggleOption("all")}
                            style={{ cursor: "pointer", accentColor: "#6366f1" }}
                        />
                        <span style={{ fontWeight: 600 }}>All {placeholder}s</span>
                    </label>
                    <div style={{ height: 1, background: border, margin: "4px 0" }} />
                    {options.map(opt => {
                        const isChecked = !isAllSelected && selectedValues.includes(opt.value);
                        return (
                            <label key={opt.value} style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "8px 14px",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                color: text,
                                userSelect: "none",
                                background: isChecked ? (isDark ? "#33415555" : "#f1f5f9") : "transparent"
                            }}>
                                <input
                                    type="checkbox"
                                    checked={isAllSelected || isChecked}
                                    disabled={isAllSelected}
                                    onChange={() => handleToggleOption(opt.value)}
                                    style={{ cursor: "pointer", accentColor: "#6366f1" }}
                                />
                                <span>{opt.label}</span>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/* ─── helpers ─────────────────────────────────────────────── */
const fmt = (n) =>
    n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "N/A";

const ROLE_COLORS = {
    teacher: { bg: "#e0f2fe", text: "#0369a1", dark_bg: "#0c4a6e20", dark_text: "#38bdf8" },
    hod: { bg: "#fef9c3", text: "#92400e", dark_bg: "#78350f20", dark_text: "#fbbf24" },
    accounts: { bg: "#f0fdf4", text: "#166534", dark_bg: "#14532d20", dark_text: "#4ade80" },
    admin: { bg: "#faf5ff", text: "#6b21a8", dark_bg: "#3b0764 20", dark_text: "#c084fc" },
    default: { bg: "#f1f5f9", text: "#475569", dark_bg: "#1e293b40", dark_text: "#94a3b8" },
};

const roleBadge = (role, isDarkMode) => {
    const key = role ? role.toLowerCase() : "default";
    const c = ROLE_COLORS[key] || ROLE_COLORS.default;
    return {
        background: isDarkMode ? c.dark_bg : c.bg,
        color: isDarkMode ? c.dark_text : c.text,
        padding: "2px 10px",
        borderRadius: "9999px",
        fontSize: "0.72rem",
        fontWeight: 700,
        textTransform: "capitalize",
        letterSpacing: "0.04em",
        display: "inline-block",
    };
};

/* ─── component ───────────────────────────────────────────── */
const SalaryExpenseHub = () => {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const API = import.meta.env.VITE_API_URL;

    /* steps: 2 = Employees  |  3 = Approval */
    const [step, setStep] = useState(2);

    /* data */
    const [centers, setCenters] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [deptOptions, setDeptOptions] = useState([]);
    const [salaryHistory, setSalaryHistory] = useState([]);

    /* selected */
    const [selectedCenter, setSelectedCenter] = useState({ _id: "all", centreName: "All Centres" });
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    /* filters (step 2) */
    const [search, setSearch] = useState("");
    const [selectedCenterIds, setSelectedCenterIds] = useState(["all"]);
    const [selectedDeptFilters, setSelectedDeptFilters] = useState(["all"]);
    const [staffTypeFilter, setStaffTypeFilter] = useState("all");
    const [centerSearch, setCenterSearch] = useState("");
    const [expandedDept, setExpandedDept] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());

    /* approval form */
    const [approvalData, setApprovalData] = useState({ salaryMonth: "", salaryPeriod: "", amount: "" });

    /* bulk selection */
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkForm, setBulkForm] = useState({ salaryMonth: "", salaryPeriod: "", monthMode: "same" });
    const [bulkMonths, setBulkMonths] = useState({});
    const [bulkAmounts, setBulkAmounts] = useState({});
    const [bulkSubmitting, setBulkSubmitting] = useState(false);

    const [loading, setLoading] = useState(false);

    /* ── fetch centers and employees ── */
    useEffect(() => {
        fetchCenters();
        fetchEmployees({ _id: "all", centreName: "All Centres" });
    }, []);

    const fetchCenters = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/hr/salary/centers`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await res.json();
            if (res.ok && data.success) setCenters(data.centers);
            else toast.error(data.message || "Failed to load centers");
        } catch { toast.error("Network error loading centers"); }
        setLoading(false);
    };

    /* ── fetch all employees for a center ── */
    const fetchEmployees = async (center) => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/hr/salary/all-employees/${center._id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setEmployees(data.employees);
                setDeptOptions(data.departments || []);
                setSelectedCenter(center);
                setSearch("");
                setSelectedCenterIds([center._id]);
                setSelectedDeptFilters(["all"]);
                setStaffTypeFilter("all");
                setExpandedDept(null);
                setSelectedIds(new Set());
                setShowBulkModal(false);
                setStep(2);
            } else toast.error(data.message || "Failed to load employees");
        } catch { toast.error("Network error loading employees"); }
        setLoading(false);
    };

    /* ── fetch salary history ── */
    const fetchHistory = async (emp) => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/hr/salary/history/${emp._id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSalaryHistory(data.history || []);
                setSelectedEmployee(emp);
                setApprovalData({ salaryMonth: "", salaryPeriod: "", amount: emp.currentSalary ? String(emp.currentSalary) : "" });
                setStep(3);
            } else toast.error(data.message || "Failed to load salary history");
        } catch { toast.error("Network error loading history"); }
        setLoading(false);
    };

    /* ── submit approval ── */
    const submitApproval = async () => {
        if (!approvalData.salaryMonth || !approvalData.salaryPeriod || !approvalData.amount) {
            toast.error("Please fill all fields");
            return;
        }
        try {
            const res = await fetch(`${API}/hr/salary/approve`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    employeeId: selectedEmployee._id,
                    centerId: selectedCenter._id,
                    salaryMonth: approvalData.salaryMonth,
                    salaryPeriod: approvalData.salaryPeriod,
                    amount: approvalData.amount
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Salary submitted for finance approval ✓");
                setApprovalData({ salaryMonth: "", salaryPeriod: "", amount: selectedEmployee.currentSalary ? String(selectedEmployee.currentSalary) : "" });
                fetchHistory(selectedEmployee);
            } else toast.error(data.message || "Submit failed");
        } catch { toast.error("Error submitting approval"); }
    };

    /* ── goBack ── */
    const goBack = () => {
        if (step === 3) { setStep(2); setSalaryHistory([]); setSelectedEmployee(null); }
    };

    const toggleEmployeeSelect = (empId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(empId)) next.delete(empId);
            else next.add(empId);
            return next;
        });
    };

    const toggleDeptSelect = (deptEmps) => {
        const ids = deptEmps.map((e) => e._id);
        const allSelected = ids.every((id) => selectedIds.has(id));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allSelected) ids.forEach((id) => next.delete(id));
            else ids.forEach((id) => next.add(id));
            return next;
        });
    };

    const toggleSelectAllFiltered = () => {
        const ids = filtered.map((e) => e._id);
        const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allSelected) ids.forEach((id) => next.delete(id));
            else ids.forEach((id) => next.add(id));
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const selectedEmployees = useMemo(
        () => employees.filter((e) => selectedIds.has(e._id)),
        [employees, selectedIds]
    );

    const openBulkModal = () => {
        if (selectedEmployees.length === 0) {
            toast.error("Select at least one employee");
            return;
        }
        const amounts = {};
        const months = {};
        selectedEmployees.forEach((emp) => {
            amounts[emp._id] = emp.currentSalary ? String(emp.currentSalary) : "";
            months[emp._id] = "";
        });
        setBulkAmounts(amounts);
        setBulkMonths(months);
        setBulkForm({ salaryMonth: "", salaryPeriod: "", monthMode: "same" });
        setShowBulkModal(true);
    };

    const submitBulkApproval = async () => {
        if (!bulkForm.salaryPeriod) {
            toast.error("Please select payout week");
            return;
        }
        if (bulkForm.monthMode === "same" && !bulkForm.salaryMonth) {
            toast.error("Please select salary month");
            return;
        }
        if (bulkForm.monthMode === "different" && selectedEmployees.some((emp) => !bulkMonths[emp._id])) {
            toast.error("Please select month for every selected employee");
            return;
        }

        const payloadEmployees = selectedEmployees.map((emp) => ({
            employeeId: emp._id,
            amount: bulkAmounts[emp._id],
            salaryMonth: bulkForm.monthMode === "different" ? bulkMonths[emp._id] : undefined,
        }));

        const invalid = payloadEmployees.find((e) => !e.amount || Number(e.amount) <= 0);
        if (invalid) {
            toast.error("Enter a valid amount for every selected employee");
            return;
        }

        setBulkSubmitting(true);
        try {
            const res = await fetch(`${API}/hr/salary/approve-bulk`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({
                    centerId: selectedCenter._id,
                    salaryMonth: bulkForm.monthMode === "same" ? bulkForm.salaryMonth : undefined,
                    salaryPeriod: bulkForm.salaryPeriod,
                    employees: payloadEmployees,
                }),
            });
            const data = await res.json();

            if (data.success) {
                const failCount = data.failed?.length || 0;
                if (failCount > 0) {
                    toast.warn(`${data.created?.length || 0} submitted, ${failCount} failed`);
                } else {
                    toast.success(data.message || "Bulk salary requests submitted ✓");
                }
                setShowBulkModal(false);
                clearSelection();
            } else {
                toast.error(data.message || "Bulk submit failed");
            }
        } catch {
            toast.error("Error submitting bulk salary requests");
        }
        setBulkSubmitting(false);
    };

    /* ── filtered + grouped employees ── wefwef*/
    const filtered = useMemo(() => {
        return employees.filter(e => {
            const isAllCenters = selectedCenterIds.includes("all") || selectedCenterIds.length === 0;
            const matchCenter = isAllCenters || selectedCenterIds.includes(e.centreId);

            const isAllDepts = selectedDeptFilters.includes("all") || selectedDeptFilters.length === 0;
            const matchDept = isAllDepts || selectedDeptFilters.includes(e.departmentName);

            let matchStaffType = true;
            const userRole = (e.role || "").toLowerCase();
            if (staffTypeFilter === "teacher") {
                matchStaffType = userRole === "teacher";
            } else if (staffTypeFilter === "hod") {
                matchStaffType = userRole === "hod";
            } else if (staffTypeFilter === "staff") {
                matchStaffType = userRole !== "teacher" && userRole !== "hod";
            }

            const q = search.trim().toLowerCase();
            const matchSearch = !q ||
                (e.name || "").toLowerCase().includes(q) ||
                (e.employeeId || "").toLowerCase().includes(q) ||
                (e.email || "").toLowerCase().includes(q) ||
                (e.role || "").toLowerCase().includes(q) ||
                (e.departmentName || "").toLowerCase().includes(q) ||
                (e.centreName || "").toLowerCase().includes(q);

            return matchCenter && matchDept && matchStaffType && matchSearch;
        });
    }, [employees, search, selectedCenterIds, selectedDeptFilters, staffTypeFilter]);

    const grouped = useMemo(() => {
        const map = {};
        filtered.forEach(e => {
            const key = e.departmentName || "Other Department";
            if (!map[key]) map[key] = [];
            map[key].push(e);
        });
        return map;
    }, [filtered]);

    /* ── theme colours ── */
    const card = isDark ? "#1e293b" : "#ffffff";
    const bg = isDark ? "#0f172a" : "#f8fafc";
    const border = isDark ? "#334155" : "#e2e8f0";
    const text = isDark ? "#e2e8f0" : "#0f172a";
    const sub = isDark ? "#94a3b8" : "#64748b";
    const accent = "#6366f1";
    const accent2 = "#818cf8";
    const inputBg = isDark ? "#0f172a" : "#f1f5f9";

    /* ════════════════════════════════════════════════════════ */
    return (
        <Layout>
            <div style={{ minHeight: "100vh", background: bg, padding: "28px 24px", fontFamily: "'Inter', sans-serif" }}>

                {/* ── Header breadcrumb ── */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                    {step === 3 && (
                        <button onClick={goBack} style={{
                            background: isDark ? "#1e293b" : "#e2e8f0",
                            border: "none", borderRadius: 8, padding: "8px 14px",
                            cursor: "pointer", color: text, display: "flex", alignItems: "center", gap: 6,
                            fontWeight: 600, fontSize: "0.85rem"
                        }}>
                            <FaArrowLeft size={12} /> Back
                        </button>
                    )}
                    <div>
                        <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: text }}>
                            {step === 2 && `Employees — ${selectedCenter?.centreName}`}
                            {step === 3 && `Salary Approval — ${selectedEmployee?.name}`}
                        </h1>
                        {/* breadcrumb trail */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: "0.78rem", color: sub }}>
                            <span style={{ cursor: step > 2 ? "pointer" : "default", color: step > 2 ? accent2 : sub }}
                                onClick={() => step > 2 && setStep(2)}>Employees</span>
                            {step === 3 && <><span>›</span><span>{selectedEmployee?.name}</span></>}
                        </div>
                    </div>
                </div>

                {/* ── Loading ── */}
                {loading && (
                    <div style={{ textAlign: "center", padding: 60 }}>
                        <div style={{
                            width: 44, height: 44, border: `4px solid ${border}`,
                            borderTopColor: accent, borderRadius: "50%", animation: "spin 0.8s linear infinite",
                            margin: "0 auto 14px"
                        }} />
                        <p style={{ color: sub, margin: 0 }}>Loading…</p>
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    </div>
                )}



                {/* ════ STEP 2 — Employees (search + filter + grouped) ════ */}
                {!loading && step === 2 && (
                    <div>
                        {/* Search + Filter bar */}
                        <div style={{
                            display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22,
                            background: card, border: `1px solid ${border}`, borderRadius: 4,
                            padding: "14px 18px", alignItems: "center"
                        }}>
                            {/* Search */}
                            <div style={{ position: "relative", flex: "1 1 220px" }}>
                                <FaSearch size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: sub }} />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by name, ID, email, role…"
                                    style={{
                                        width: "100%", paddingLeft: 34, paddingRight: search ? 34 : 12,
                                        paddingTop: 9, paddingBottom: 9,
                                        background: inputBg, border: `1px solid ${border}`,
                                        borderRadius: 8, color: text, fontSize: "0.87rem",
                                        outline: "none", boxSizing: "border-box"
                                    }}
                                />
                                {search && (
                                    <FaTimes onClick={() => setSearch("")} size={12}
                                        style={{
                                            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                                            color: sub, cursor: "pointer"
                                        }} />
                                )}
                            </div>

                            {/* Center multi-select */}
                            <MultiSelect
                                label="Centers"
                                placeholder="Centre"
                                options={centers.map(c => ({ value: c._id, label: c.centreName }))}
                                selectedValues={selectedCenterIds}
                                onChange={setSelectedCenterIds}
                                isDark={isDark}
                                card={card}
                                border={border}
                                text={text}
                                sub={sub}
                                inputBg={inputBg}
                            />

                            {/* Department multi-select */}
                            <MultiSelect
                                label="Departments"
                                placeholder="Department"
                                options={deptOptions.map(d => ({ value: d, label: d }))}
                                selectedValues={selectedDeptFilters}
                                onChange={setSelectedDeptFilters}
                                isDark={isDark}
                                card={card}
                                border={border}
                                text={text}
                                sub={sub}
                                inputBg={inputBg}
                            />

                            {/* Staff Type filter */}
                            <div style={{ display: "flex", flexDirection: "column", minWidth: 160 }}>
                                <span style={{ fontSize: "0.78rem", color: sub, marginBottom: 4, fontWeight: 600 }}>Staff Type</span>
                                <select
                                    value={staffTypeFilter}
                                    onChange={e => setStaffTypeFilter(e.target.value)}
                                    style={{
                                        background: inputBg, border: `1px solid ${border}`,
                                        borderRadius: 8, color: text, padding: "9px 12px",
                                        fontSize: "0.85rem", cursor: "pointer", outline: "none",
                                        height: 38
                                    }}>
                                    <option value="all">All Staff Types</option>
                                    <option value="staff">Normal Staff</option>
                                    <option value="teacher">Teachers</option>
                                    <option value="hod">HODs</option>
                                </select>
                            </div>

                            {/* Select all + count */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto", flexWrap: "wrap" }}>
                                <label style={{
                                    display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                                    fontSize: "0.82rem", color: sub, whiteSpace: "nowrap"
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={filtered.length > 0 && filtered.every((e) => selectedIds.has(e._id))}
                                        onChange={toggleSelectAllFiltered}
                                        style={{ width: 16, height: 16, accentColor: accent, cursor: "pointer" }}
                                    />
                                    Select all
                                </label>
                                <div style={{
                                    background: `${accent}18`, color: accent2,
                                    padding: "5px 14px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 700,
                                    whiteSpace: "nowrap"
                                }}>
                                    {filtered.length} employee{filtered.length !== 1 ? "s" : ""}
                                </div>
                                {selectedIds.size > 0 && (
                                    <div style={{
                                        background: "#10b98120", color: "#34d399",
                                        padding: "5px 14px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 700
                                    }}>
                                        {selectedIds.size} selected
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bulk action bar */}
                        {selectedIds.size > 0 && (
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                                flexWrap: "wrap", marginBottom: 18, padding: "14px 18px",
                                background: `linear-gradient(135deg, ${accent}22, ${accent2}18)`,
                                border: `1px solid ${accent}44`, borderRadius: 12
                            }}>
                                <div style={{ color: text, fontSize: "0.9rem", fontWeight: 600 }}>
                                    {selectedIds.size} employee{selectedIds.size !== 1 ? "s" : ""} selected for bulk salary request
                                </div>
                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    <button
                                        type="button"
                                        onClick={clearSelection}
                                        style={{
                                            background: "transparent", border: `1px solid ${border}`,
                                            borderRadius: 8, padding: "8px 14px", cursor: "pointer",
                                            color: sub, fontWeight: 600, fontSize: "0.82rem"
                                        }}
                                    >
                                        Clear selection
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openBulkModal}
                                        style={{
                                            background: `linear-gradient(135deg, ${accent}, ${accent2})`,
                                            color: "#fff", border: "none", borderRadius: 8,
                                            padding: "8px 16px", cursor: "pointer", fontWeight: 700,
                                            fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 8
                                        }}
                                    >
                                        <FaPaperPlane size={12} /> Request salary for selected
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Grouped sections */}
                        {Object.keys(grouped).length === 0 ? (
                            <div style={{ textAlign: "center", padding: 60, color: sub }}>
                                No employees match your search.
                            </div>
                        ) : (
                            Object.entries(grouped).map(([deptName, emps]) => {
                                const isExpanded = expandedDept === null || expandedDept === deptName;
                                return (
                                    <div key={deptName} style={{
                                        background: card, border: `1px solid ${border}`,
                                        borderRadius: 14, marginBottom: 16, overflow: "hidden"
                                    }}>
                                        {/* Section header */}
                                        <div
                                            style={{
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                padding: "14px 20px",
                                                borderBottom: isExpanded ? `1px solid ${border}` : "none",
                                                background: isDark ? "#1e293b" : "#f8fafc"
                                            }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={emps.length > 0 && emps.every((e) => selectedIds.has(e._id))}
                                                    onChange={(e) => { e.stopPropagation(); toggleDeptSelect(emps); }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ width: 16, height: 16, accentColor: accent, cursor: "pointer" }}
                                                />
                                                <div
                                                    onClick={() => setExpandedDept(expandedDept === deptName ? null : deptName)}
                                                    style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flex: 1 }}
                                                >
                                                    <FaUsers size={16} color={accent} />
                                                    <span style={{ fontWeight: 700, fontSize: "0.95rem", color: text }}>
                                                        {deptName}
                                                    </span>
                                                    <span style={{
                                                        background: `${accent}20`, color: accent2,
                                                        borderRadius: 20, padding: "2px 10px",
                                                        fontSize: "0.75rem", fontWeight: 700
                                                    }}>{emps.length}</span>
                                                </div>
                                            </div>
                                            <div onClick={() => setExpandedDept(expandedDept === deptName ? null : deptName)} style={{ cursor: "pointer", padding: 4 }}>
                                                {isExpanded ? <FaChevronUp size={13} color={sub} /> : <FaChevronDown size={13} color={sub} />}
                                            </div>
                                        </div>

                                        {/* Employee Table */}
                                        {isExpanded && (
                                            <div style={{ overflowX: "auto" }}>
                                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                                                    <thead>
                                                        <tr style={{ background: isDark ? "#0f172a" : "#f1f5f9" }}>
                                                            <th style={{ padding: "10px 16px", width: 44 }} />
                                                            {["Employee", "ID", "Email", "Mobile", "Department", "Centre", "Current Salary", "Action"].map(h => (
                                                                <th key={h} style={{
                                                                    padding: "10px 16px", textAlign: "left",
                                                                    color: sub, fontWeight: 700, fontSize: "0.75rem",
                                                                    textTransform: "uppercase", letterSpacing: "0.05em",
                                                                    whiteSpace: "nowrap"
                                                                }}>{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {emps.map((emp, i) => {
                                                            const isSelected = selectedIds.has(emp._id);
                                                            return (
                                                                <tr key={emp._id}
                                                                    style={{
                                                                        borderTop: `1px solid ${border}`,
                                                                        background: isSelected
                                                                            ? (isDark ? "#312e8120" : "#eef2ff")
                                                                            : i % 2 === 0 ? "transparent" : (isDark ? "#0f172a30" : "#f8fafc50"),
                                                                        transition: "background 0.15s"
                                                                    }}
                                                                    onMouseEnter={e => {
                                                                        if (!isSelected) e.currentTarget.style.background = isDark ? "#334155" : "#e0e7ff";
                                                                    }}
                                                                    onMouseLeave={e => {
                                                                        e.currentTarget.style.background = isSelected
                                                                            ? (isDark ? "#312e8120" : "#eef2ff")
                                                                            : i % 2 === 0 ? "transparent" : (isDark ? "#0f172a30" : "#f8fafc50");
                                                                    }}
                                                                >
                                                                    <td style={{ padding: "12px 16px", width: 44 }}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            onChange={() => toggleEmployeeSelect(emp._id)}
                                                                            style={{ width: 16, height: 16, accentColor: accent, cursor: "pointer" }}
                                                                        />
                                                                    </td>
                                                                    {/* Name + avatar */}
                                                                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                                                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                                            <div style={{
                                                                                width: 34, height: 34, borderRadius: "50%",
                                                                                background: `linear-gradient(135deg, ${accent}, ${accent2})`,
                                                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                                                color: "#fff", fontWeight: 800, fontSize: "0.85rem",
                                                                                flexShrink: 0
                                                                            }}>{(emp.name || "?")[0].toUpperCase()}</div>
                                                                            <span style={{ fontWeight: 600, color: text }}>{emp.name || "—"}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: "12px 16px", color: sub, whiteSpace: "nowrap" }}>
                                                                        {emp.employeeId || "—"}
                                                                    </td>
                                                                    <td style={{ padding: "12px 16px", color: sub }}>
                                                                        {emp.email || "—"}
                                                                    </td>
                                                                    <td style={{ padding: "12px 16px", color: sub, whiteSpace: "nowrap" }}>
                                                                        {emp.mobNum || "—"}
                                                                    </td>
                                                                    <td style={{ padding: "12px 16px" }}>
                                                                        <span style={roleBadge(emp.role, isDark)}>
                                                                            {emp.departmentName || emp.role || "—"}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: "12px 16px", color: text, whiteSpace: "nowrap" }}>
                                                                        {emp.centreName || "—"}
                                                                    </td>
                                                                    <td style={{ padding: "12px 16px", fontWeight: 700, color: text, whiteSpace: "nowrap" }}>
                                                                        {fmt(emp.currentSalary)}
                                                                    </td>
                                                                    <td style={{ padding: "12px 16px" }}>
                                                                        <button
                                                                            onClick={() => fetchHistory(emp)}
                                                                            style={{
                                                                                background: `linear-gradient(135deg, ${accent}, ${accent2})`,
                                                                                color: "#fff", border: "none", borderRadius: 8,
                                                                                padding: "7px 14px", cursor: "pointer",
                                                                                fontWeight: 600, fontSize: "0.78rem",
                                                                                display: "flex", alignItems: "center", gap: 6,
                                                                                whiteSpace: "nowrap"
                                                                            }}>
                                                                            <FaMoneyBillWave size={12} /> Approve Salary
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* ════ STEP 3 — Salary Approval ════ */}
                {!loading && step === 3 && selectedEmployee && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                        {/* Left — Employee info + Approval form */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                            {/* Employee card */}
                            <div style={{
                                background: card, border: `1px solid ${border}`,
                                borderRadius: 14, padding: "20px 22px"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: "50%",
                                        background: `linear-gradient(135deg, ${accent}, ${accent2})`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        color: "#fff", fontWeight: 800, fontSize: "1.4rem"
                                    }}>{(selectedEmployee.name || "?")[0].toUpperCase()}</div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: "1.05rem", color: text }}>{selectedEmployee.name}</div>
                                        <div style={{ fontSize: "0.82rem", color: sub }}>{selectedEmployee.employeeId}</div>
                                        <span style={roleBadge(selectedEmployee.role, isDark)}>{selectedEmployee.role}</span>
                                    </div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    {[
                                        ["Email", selectedEmployee.email],
                                        ["Mobile", selectedEmployee.mobNum],
                                        ["Center", selectedCenter?.centreName],
                                        ["Current Salary", fmt(selectedEmployee.currentSalary)],
                                    ].map(([l, v]) => (
                                        <div key={l} style={{
                                            background: inputBg, borderRadius: 10,
                                            padding: "10px 14px"
                                        }}>
                                            <div style={{ fontSize: "0.72rem", color: sub, fontWeight: 600, marginBottom: 2 }}>{l}</div>
                                            <div style={{ fontWeight: 700, color: text, fontSize: "0.88rem" }}>{v || "—"}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Approval form */}
                            <div style={{
                                background: card, border: `1px solid ${border}`,
                                borderRadius: 14, padding: "20px 22px"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                    <FaCheck color={accent} size={15} />
                                    <h3 style={{ margin: 0, fontWeight: 800, color: text, fontSize: "1rem" }}>HR Salary Approval</h3>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.8rem", color: sub, fontWeight: 600, marginBottom: 6 }}>
                                            Salary Month (For work done in)
                                        </label>
                                        <select
                                            value={approvalData.salaryMonth}
                                            onChange={e => setApprovalData(p => ({ ...p, salaryMonth: e.target.value }))}
                                            style={{
                                                width: "100%", background: inputBg,
                                                border: `1px solid ${border}`, borderRadius: 8,
                                                color: text, padding: "10px 12px", fontSize: "0.87rem", outline: "none"
                                            }}>
                                            <option value="">— Select Month —</option>
                                            {SALARY_MONTHS.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: "0.8rem", color: sub, fontWeight: 600, marginBottom: 6 }}>
                                            Payout Week (Accounts release week)
                                        </label>
                                        <select
                                            value={approvalData.salaryPeriod}
                                            onChange={e => setApprovalData(p => ({ ...p, salaryPeriod: e.target.value }))}
                                            style={{
                                                width: "100%", background: inputBg,
                                                border: `1px solid ${border}`, borderRadius: 8,
                                                color: text, padding: "10px 12px", fontSize: "0.87rem", outline: "none"
                                            }}>
                                            <option value="">— Select Week —</option>
                                            {PAYOUT_WEEKS.map(w => (
                                                <option key={w} value={w}>{w}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: "block", fontSize: "0.8rem", color: sub, fontWeight: 600, marginBottom: 6 }}>
                                            Amount (₹)
                                        </label>
                                        <input
                                            type="number"
                                            value={approvalData.amount}
                                            onChange={e => setApprovalData(p => ({ ...p, amount: e.target.value }))}
                                            placeholder="Enter salary amount"
                                            style={{
                                                width: "100%", background: inputBg,
                                                border: `1px solid ${border}`, borderRadius: 8,
                                                color: text, padding: "10px 12px", fontSize: "0.87rem",
                                                outline: "none", boxSizing: "border-box"
                                            }}
                                        />
                                        {selectedEmployee.currentSalary > 0 && (
                                            <div style={{ fontSize: "0.75rem", color: sub, marginTop: 4 }}>
                                                Auto-filled from Employee Management: {fmt(selectedEmployee.currentSalary)}
                                            </div>
                                        )}
                                    </div>

                                    <button onClick={submitApproval} style={{
                                        background: `linear-gradient(135deg, ${accent}, ${accent2})`,
                                        color: "#fff", border: "none", borderRadius: 10,
                                        padding: "12px 0", fontWeight: 700, fontSize: "0.9rem",
                                        cursor: "pointer", width: "100%",
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                                    }}>
                                        <FaCheck size={13} /> Submit for Finance Approval
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right — Salary history */}
                        <div style={{
                            background: card, border: `1px solid ${border}`,
                            borderRadius: 14, padding: "20px 22px", overflowY: "auto", maxHeight: 600
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                <FaMoneyBillWave color={accent} size={15} />
                                <h3 style={{ margin: 0, fontWeight: 800, color: text, fontSize: "1rem" }}>Payment History</h3>
                            </div>

                            {salaryHistory.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "40px 0", color: sub }}>
                                    <FaMoneyBillWave size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
                                    <p style={{ margin: 0 }}>No salary payments recorded yet.</p>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {salaryHistory.map((h, i) => {
                                        const isApproved = h.financeStatus?.toLowerCase() === "approved";
                                        const isRejected = h.financeStatus?.toLowerCase() === "rejected";
                                        const isPartiallyPaid = !isApproved && !isRejected && h.paidAmount > 0;
                                        const reqAmount = h.originalAmount !== undefined ? h.originalAmount : h.amount;
                                        return (
                                            <div key={i} style={{
                                                background: inputBg, borderRadius: 10,
                                                padding: "12px 16px", display: "flex",
                                                justifyContent: "space-between", alignItems: "center"
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: text }}>
                                                        {h.months ? `${h.months} — ` : ""}{h.salaryPeriod}
                                                    </div>
                                                    <div style={{ fontSize: "0.75rem", color: sub, display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                                                        <div>Requested: {fmt(reqAmount)}</div>
                                                        {h.paidAmount > 0 && <div style={{ color: "#16a34a", fontWeight: 600 }}>Paid: {fmt(h.paidAmount)}</div>}
                                                        {h.remainingAmount > 0 && h.paidAmount > 0 && <div style={{ color: "#d97706", fontWeight: 600 }}>Remaining: {fmt(h.remainingAmount)}</div>}
                                                        <div style={{ fontSize: "0.7rem", marginTop: 2 }}>
                                                            {h.createdAt ? new Date(h.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                                    <span style={{ fontWeight: 800, color: text, fontSize: "0.92rem" }}>
                                                        {fmt(h.remainingAmount !== undefined && h.remainingAmount > 0 ? h.remainingAmount : reqAmount)}
                                                    </span>
                                                    <span style={{
                                                        fontSize: "0.7rem", fontWeight: 700, borderRadius: 20, padding: "2px 10px",
                                                        background: isApproved ? "#f0fdf4" : isRejected ? "#fef2f2" : isPartiallyPaid ? "#fffbeb" : "#fef9c3",
                                                        color: isApproved ? "#16a34a" : isRejected ? "#dc2626" : isPartiallyPaid ? "#d97706" : "#ca8a04",
                                                        textTransform: "capitalize"
                                                    }}>
                                                        {isApproved ? "approved" : isRejected ? "rejected" : isPartiallyPaid ? "partially paid" : (h.financeStatus || "pending")}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Bulk salary request modal */}
                {showBulkModal && (
                    <div style={{
                        position: "fixed", inset: 0, zIndex: 1000,
                        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
                        display: "flex", alignItems: "center", justifyContent: "center", padding: 16
                    }}>
                        <div style={{
                            background: card, border: `1px solid ${border}`, borderRadius: 16,
                            width: "100%", maxWidth: 720, maxHeight: "90vh", overflow: "hidden",
                            display: "flex", flexDirection: "column", boxShadow: "0 24px 48px rgba(0,0,0,0.35)"
                        }}>
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "18px 22px", borderBottom: `1px solid ${border}`
                            }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: text }}>
                                        Bulk Salary Request
                                    </h2>
                                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: sub }}>
                                        {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? "s" : ""} · {selectedCenter?.centreName}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowBulkModal(false)}
                                    style={{ background: "transparent", border: "none", cursor: "pointer", color: sub, padding: 6 }}
                                >
                                    <FaTimes size={18} />
                                </button>
                            </div>

                            <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>
                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ display: "block", fontSize: "0.8rem", color: sub, fontWeight: 600, marginBottom: 6 }}>
                                        Salary Month Mode
                                    </label>
                                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: 8, color: text, fontSize: "0.85rem", cursor: "pointer" }}>
                                            <input
                                                type="radio"
                                                name="bulkMonthMode"
                                                value="same"
                                                checked={bulkForm.monthMode === "same"}
                                                onChange={(e) => setBulkForm((p) => ({ ...p, monthMode: e.target.value }))}
                                                style={{ accentColor: accent }}
                                            />
                                            Same month for everyone
                                        </label>
                                        <label style={{ display: "flex", alignItems: "center", gap: 8, color: text, fontSize: "0.85rem", cursor: "pointer" }}>
                                            <input
                                                type="radio"
                                                name="bulkMonthMode"
                                                value="different"
                                                checked={bulkForm.monthMode === "different"}
                                                onChange={(e) => setBulkForm((p) => ({ ...p, monthMode: e.target.value }))}
                                                style={{ accentColor: accent }}
                                            />
                                            Different month per employee
                                        </label>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.8rem", color: sub, fontWeight: 600, marginBottom: 6 }}>
                                            Salary Month (work done in)
                                        </label>
                                        <select
                                            value={bulkForm.salaryMonth}
                                            onChange={(e) => setBulkForm((p) => ({ ...p, salaryMonth: e.target.value }))}
                                            disabled={bulkForm.monthMode !== "same"}
                                            style={{
                                                width: "100%", background: inputBg, border: `1px solid ${border}`,
                                                borderRadius: 8, color: text, padding: "10px 12px", fontSize: "0.87rem", outline: "none",
                                                opacity: bulkForm.monthMode === "same" ? 1 : 0.6,
                                                cursor: bulkForm.monthMode === "same" ? "pointer" : "not-allowed"
                                            }}
                                        >
                                            <option value="">— Select Month —</option>
                                            {SALARY_MONTHS.map((m) => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.8rem", color: sub, fontWeight: 600, marginBottom: 6 }}>
                                            Payout Week
                                        </label>
                                        <select
                                            value={bulkForm.salaryPeriod}
                                            onChange={(e) => setBulkForm((p) => ({ ...p, salaryPeriod: e.target.value }))}
                                            style={{
                                                width: "100%", background: inputBg, border: `1px solid ${border}`,
                                                borderRadius: 8, color: text, padding: "10px 12px", fontSize: "0.87rem", outline: "none"
                                            }}
                                        >
                                            <option value="">— Select Week —</option>
                                            {PAYOUT_WEEKS.map((w) => (
                                                <option key={w} value={w}>{w}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div style={{
                                    border: `1px solid ${border}`, borderRadius: 10, overflow: "hidden"
                                }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                                        <thead>
                                            <tr style={{ background: isDark ? "#0f172a" : "#f1f5f9" }}>
                                                <th style={{ padding: "10px 14px", textAlign: "left", color: sub, fontSize: "0.72rem" }}>Employee</th>
                                                <th style={{ padding: "10px 14px", textAlign: "left", color: sub, fontSize: "0.72rem" }}>Department</th>
                                                <th style={{ padding: "10px 14px", textAlign: "left", color: sub, fontSize: "0.72rem", width: 160 }}>Month</th>
                                                <th style={{ padding: "10px 14px", textAlign: "right", color: sub, fontSize: "0.72rem", width: 140 }}>Amount (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedEmployees.map((emp) => (
                                                <tr key={emp._id} style={{ borderTop: `1px solid ${border}` }}>
                                                    <td style={{ padding: "10px 14px", color: text, fontWeight: 600 }}>
                                                        {emp.name}
                                                        <div style={{ fontSize: "0.72rem", color: sub, fontWeight: 400 }}>{emp.employeeId}</div>
                                                    </td>
                                                    <td style={{ padding: "10px 14px", color: sub }}>{emp.departmentName || "—"}</td>
                                                    <td style={{ padding: "10px 14px" }}>
                                                        {bulkForm.monthMode === "same" ? (
                                                            <div style={{ color: text, fontSize: "0.82rem" }}>
                                                                {bulkForm.salaryMonth || "—"}
                                                            </div>
                                                        ) : (
                                                            <select
                                                                value={bulkMonths[emp._id] || ""}
                                                                onChange={(e) => setBulkMonths((p) => ({ ...p, [emp._id]: e.target.value }))}
                                                                style={{
                                                                    width: "100%", background: inputBg, border: `1px solid ${border}`,
                                                                    borderRadius: 6, color: text, padding: "8px 10px",
                                                                    fontSize: "0.82rem", outline: "none"
                                                                }}
                                                            >
                                                                <option value="">Select</option>
                                                                {SALARY_MONTHS.map((m) => (
                                                                    <option key={m} value={m}>{m}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "10px 14px" }}>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={bulkAmounts[emp._id] || ""}
                                                            onChange={(e) => setBulkAmounts((p) => ({ ...p, [emp._id]: e.target.value }))}
                                                            placeholder="Amount"
                                                            style={{
                                                                width: "100%", background: inputBg, border: `1px solid ${border}`,
                                                                borderRadius: 6, color: text, padding: "8px 10px",
                                                                fontSize: "0.85rem", outline: "none", textAlign: "right"
                                                            }}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div style={{
                                display: "flex", justifyContent: "flex-end", gap: 10,
                                padding: "16px 22px", borderTop: `1px solid ${border}`
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setShowBulkModal(false)}
                                    disabled={bulkSubmitting}
                                    style={{
                                        background: "transparent", border: `1px solid ${border}`,
                                        borderRadius: 8, padding: "10px 18px", cursor: "pointer",
                                        color: sub, fontWeight: 600, fontSize: "0.85rem"
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={submitBulkApproval}
                                    disabled={bulkSubmitting}
                                    style={{
                                        background: `linear-gradient(135deg, ${accent}, ${accent2})`,
                                        color: "#fff", border: "none", borderRadius: 8,
                                        padding: "10px 20px", cursor: bulkSubmitting ? "not-allowed" : "pointer",
                                        fontWeight: 700, fontSize: "0.85rem", opacity: bulkSubmitting ? 0.7 : 1,
                                        display: "flex", alignItems: "center", gap: 8
                                    }}
                                >
                                    <FaPaperPlane size={12} />
                                    {bulkSubmitting ? "Submitting…" : `Submit ${selectedEmployees.length} request(s)`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default SalaryExpenseHub;
