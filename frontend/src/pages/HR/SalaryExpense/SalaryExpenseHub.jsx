import React, { useState, useEffect, useMemo } from "react";
import Layout from "../../../components/Layout";
import {
    FaBuilding, FaUsers, FaUser, FaMoneyBillWave,
    FaArrowLeft, FaCheck, FaSearch, FaFilter,
    FaChevronDown, FaChevronUp, FaTimes
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";

/* ─── helpers ─────────────────────────────────────────────── */
const fmt = (n) =>
    n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "N/A";

const ROLE_COLORS = {
    teacher:  { bg: "#e0f2fe", text: "#0369a1", dark_bg: "#0c4a6e20", dark_text: "#38bdf8" },
    hod:      { bg: "#fef9c3", text: "#92400e", dark_bg: "#78350f20", dark_text: "#fbbf24" },
    accounts: { bg: "#f0fdf4", text: "#166534", dark_bg: "#14532d20", dark_text: "#4ade80" },
    admin:    { bg: "#faf5ff", text: "#6b21a8", dark_bg: "#3b0764 20", dark_text: "#c084fc" },
    default:  { bg: "#f1f5f9", text: "#475569", dark_bg: "#1e293b40", dark_text: "#94a3b8" },
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

        /* steps: 1 = Centers  |  2 = Employees  |  3 = Approval */
    const [step, setStep] = useState(1);

    /* data */
    const [centers,   setCenters]   = useState([]);
    const [employees, setEmployees] = useState([]);
    const [deptOptions, setDeptOptions] = useState([]);
    const [salaryHistory, setSalaryHistory] = useState([]);

    /* selected */
    const [selectedCenter,   setSelectedCenter]   = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    /* filters (step 2) */
    const [search,     setSearch]     = useState("");
    const [centerSearch, setCenterSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("all");
    const [expandedDept, setExpandedDept] = useState(null);   // for grouped accordion

    /* approval form */
    const [approvalData, setApprovalData] = useState({ salaryMonth: "", salaryPeriod: "", amount: "" });

    const [loading, setLoading] = useState(false);

    /* ── fetch centers ── */
    useEffect(() => { fetchCenters(); }, []);

    const fetchCenters = async () => {
        setLoading(true);
        try {
            const res  = await fetch(`${API}/hr/salary/centers`, {
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
            const res  = await fetch(`${API}/hr/salary/all-employees/${center._id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setEmployees(data.employees);
                setDeptOptions(data.departments || []);
                setSelectedCenter(center);
                setSearch("");
                setDeptFilter("all");
                setExpandedDept(null);
                setStep(2);
            } else toast.error(data.message || "Failed to load employees");
        } catch { toast.error("Network error loading employees"); }
        setLoading(false);
    };

    /* ── fetch salary history ── */
    const fetchHistory = async (emp) => {
        setLoading(true);
        try {
            const res  = await fetch(`${API}/hr/salary/history/${emp._id}`, {
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
            const res  = await fetch(`${API}/hr/salary/approve`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    employeeId:   selectedEmployee._id,
                    centerId:     selectedCenter._id,
                    salaryMonth:  approvalData.salaryMonth,
                    salaryPeriod: approvalData.salaryPeriod,
                    amount:       approvalData.amount
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
        else if (step === 2) { setStep(1); setEmployees([]); setSelectedCenter(null); }
    };

    /* ── filtered + grouped employees ── */
    const filtered = useMemo(() => {
        return employees.filter(e => {
            const matchDept = deptFilter === "all" || e.departmentName === deptFilter;
            const q = search.trim().toLowerCase();
            const matchSearch = !q ||
                (e.name || "").toLowerCase().includes(q) ||
                (e.employeeId || "").toLowerCase().includes(q) ||
                (e.email || "").toLowerCase().includes(q) ||
                (e.role || "").toLowerCase().includes(q) ||
                (e.departmentName || "").toLowerCase().includes(q);
            return matchDept && matchSearch;
        });
    }, [employees, search, deptFilter]);

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
    const card   = isDark ? "#1e293b" : "#ffffff";
    const bg     = isDark ? "#0f172a" : "#f8fafc";
    const border = isDark ? "#334155" : "#e2e8f0";
    const text   = isDark ? "#e2e8f0" : "#0f172a";
    const sub    = isDark ? "#94a3b8" : "#64748b";
    const accent = "#6366f1";
    const accent2 = "#818cf8";
    const inputBg = isDark ? "#0f172a" : "#f1f5f9";

    /* ════════════════════════════════════════════════════════ */
    return (
        <Layout>
            <div style={{ minHeight: "100vh", background: bg, padding: "28px 24px", fontFamily: "'Inter', sans-serif" }}>

                {/* ── Header breadcrumb ── */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                    {step > 1 && (
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
                            {step === 1 && "Salary Expense — Select Center"}
                            {step === 2 && `Employees — ${selectedCenter?.centreName}`}
                            {step === 3 && `Salary Approval — ${selectedEmployee?.name}`}
                        </h1>
                        {/* breadcrumb trail */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: "0.78rem", color: sub }}>
                            <span style={{ cursor: step > 1 ? "pointer" : "default", color: step > 1 ? accent2 : sub }}
                                onClick={() => step > 1 && setStep(1)}>Centers</span>
                            {step >= 2 && <><span>›</span><span style={{ cursor: step > 2 ? "pointer" : "default", color: step > 2 ? accent2 : sub }}
                                onClick={() => step > 2 && setStep(2)}>{selectedCenter?.centreName}</span></>}
                            {step === 3 && <><span>›</span><span>{selectedEmployee?.name}</span></>}
                        </div>
                    </div>
                </div>

                {/* ── Loading ── */}
                {loading && (
                    <div style={{ textAlign: "center", padding: 60 }}>
                        <div style={{ width: 44, height: 44, border: `4px solid ${border}`,
                            borderTopColor: accent, borderRadius: "50%", animation: "spin 0.8s linear infinite",
                            margin: "0 auto 14px" }} />
                        <p style={{ color: sub, margin: 0 }}>Loading…</p>
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    </div>
                )}

                {/* ════ STEP 1 — Centers ════ */}
                {!loading && step === 1 && (
                    <div>
                        {/* Center search bar */}
                        <div style={{
                            position: "relative", marginBottom: 22, maxWidth: 400,
                            background: card, border: `1px solid ${border}`, borderRadius: 12,
                            padding: "8px 12px", display: "flex", alignItems: "center"
                        }}>
                            <FaSearch size={13} style={{ marginLeft: 6, marginRight: 10, color: sub }} />
                            <input
                                value={centerSearch}
                                onChange={e => setCenterSearch(e.target.value)}
                                placeholder="Search centers by name..."
                                style={{
                                    width: "100%", background: "transparent", border: "none",
                                    color: text, fontSize: "0.87rem", outline: "none"
                                }}
                            />
                            {centerSearch && (
                                <FaTimes onClick={() => setCenterSearch("")} size={12}
                                    style={{ color: sub, cursor: "pointer", marginRight: 6 }} />
                            )}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 18 }}>
                            {centers.filter(c => (c.centreName || "").toLowerCase().includes(centerSearch.toLowerCase())).length === 0 ? (
                                <p style={{ color: sub, gridColumn: "1/-1", textAlign: "center", padding: 40 }}>
                                    No matching centers found.
                                </p>
                            ) : centers.filter(c => (c.centreName || "").toLowerCase().includes(centerSearch.toLowerCase())).map(c => (
                                <div key={c._id} onClick={() => fetchEmployees(c)}
                                    style={{
                                        background: card, border: `1px solid ${border}`, borderRadius: 14,
                                        padding: "22px 20px", cursor: "pointer", transition: "all 0.2s",
                                        display: "flex", flexDirection: "column", gap: 10
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 6px 24px ${accent}33`; e.currentTarget.style.borderColor = accent; }}
                                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = border; }}>
                                    <div style={{
                                        width: 46, height: 46, borderRadius: 12,
                                        background: `linear-gradient(135deg, ${accent}, ${accent2})`,
                                        display: "flex", alignItems: "center", justifyContent: "center"
                                    }}>
                                        <FaBuilding color="#fff" size={20} />
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: "0.97rem", color: text }}>{c.centreName}</div>
                                    <div style={{ fontSize: "0.77rem", color: sub }}>Click to view employees</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ════ STEP 2 — Employees (search + filter + grouped) ════ */}
                {!loading && step === 2 && (
                    <div>
                        {/* Search + Filter bar */}
                        <div style={{
                            display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22,
                            background: card, border: `1px solid ${border}`, borderRadius: 12,
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
                                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                                            color: sub, cursor: "pointer" }} />
                                )}
                            </div>

                            {/* Department filter */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <FaFilter size={13} color={sub} />
                                <span style={{ fontSize: "0.82rem", color: sub, whiteSpace: "nowrap" }}>Department:</span>
                                <select
                                    value={deptFilter}
                                    onChange={e => setDeptFilter(e.target.value)}
                                    style={{
                                        background: inputBg, border: `1px solid ${border}`,
                                        borderRadius: 8, color: text, padding: "8px 12px",
                                        fontSize: "0.85rem", cursor: "pointer", outline: "none"
                                    }}>
                                    <option value="all">All Departments</option>
                                    {deptOptions.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Count badge */}
                            <div style={{ marginLeft: "auto", background: `${accent}18`, color: accent2,
                                padding: "5px 14px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 700,
                                whiteSpace: "nowrap" }}>
                                {filtered.length} employee{filtered.length !== 1 ? "s" : ""}
                            </div>
                        </div>

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
                                            onClick={() => setExpandedDept(expandedDept === deptName ? null : deptName)}
                                            style={{
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                padding: "14px 20px", cursor: "pointer",
                                                borderBottom: isExpanded ? `1px solid ${border}` : "none",
                                                background: isDark ? "#1e293b" : "#f8fafc"
                                            }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                                            {isExpanded ? <FaChevronUp size={13} color={sub} /> : <FaChevronDown size={13} color={sub} />}
                                        </div>

                                        {/* Employee Table */}
                                        {isExpanded && (
                                            <div style={{ overflowX: "auto" }}>
                                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                                                    <thead>
                                                        <tr style={{ background: isDark ? "#0f172a" : "#f1f5f9" }}>
                                                            {["Employee", "ID", "Email", "Mobile", "Department", "Current Salary", "Action"].map(h => (
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
                                                        {emps.map((emp, i) => (
                                                            <tr key={emp._id}
                                                                style={{
                                                                    borderTop: `1px solid ${border}`,
                                                                    background: i % 2 === 0 ? "transparent" : (isDark ? "#0f172a30" : "#f8fafc50"),
                                                                    transition: "background 0.15s"
                                                                }}
                                                                onMouseEnter={e => e.currentTarget.style.background = isDark ? "#334155" : "#e0e7ff"}
                                                                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : (isDark ? "#0f172a30" : "#f8fafc50")}
                                                            >
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
                                                        ))}
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
                                            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
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
                                            <option value="Week 1">Week 1</option>
                                            <option value="Week 2">Week 2</option>
                                            <option value="Week 3">Week 3</option>
                                            <option value="Week 4">Week 4</option>
                                            <option value="Full Month">Full Month</option>
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
                                    {salaryHistory.map((h, i) => (
                                        <div key={i} style={{
                                            background: inputBg, borderRadius: 10,
                                            padding: "12px 16px", display: "flex",
                                            justifyContent: "space-between", alignItems: "center"
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: text }}>
                                                    {h.months ? `${h.months} — ` : ""}{h.salaryPeriod}
                                                </div>
                                                <div style={{ fontSize: "0.75rem", color: sub }}>
                                                    {h.createdAt ? new Date(h.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                                <span style={{ fontWeight: 800, color: text, fontSize: "0.92rem" }}>{fmt(h.amount)}</span>
                                                <span style={{
                                                    fontSize: "0.7rem", fontWeight: 700, borderRadius: 20, padding: "2px 10px",
                                                    background: h.financeStatus === "approved" ? "#f0fdf4" : h.financeStatus === "rejected" ? "#fef2f2" : "#fef9c3",
                                                    color: h.financeStatus === "approved" ? "#16a34a" : h.financeStatus === "rejected" ? "#dc2626" : "#ca8a04"
                                                }}>
                                                    {h.financeStatus || "pending"}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default SalaryExpenseHub;
