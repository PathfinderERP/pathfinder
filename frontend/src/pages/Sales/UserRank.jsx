import React, { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import {
    FaSync, FaTrophy, FaUser, FaHandsHelping, FaGraduationCap,
    FaCloudUploadAlt, FaPen, FaPhoneAlt, FaRupeeSign, FaMedal,
    FaCalendarAlt, FaFilter, FaArrowUp, FaArrowDown, FaDownload
} from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const METRICS = [
    {
        key: "counselling",
        label: "Counselling",
        icon: FaHandsHelping,
        color: "purple",
        gradient: "from-purple-500 to-violet-600",
        bg: "bg-purple-500/10",
        text: "text-purple-500",
        border: "border-purple-500/20",
        activeBg: "bg-purple-500",
        unit: "sessions"
    },
    {
        key: "admissions",
        label: "Admissions",
        icon: FaGraduationCap,
        color: "blue",
        gradient: "from-blue-500 to-cyan-600",
        bg: "bg-blue-500/10",
        text: "text-blue-500",
        border: "border-blue-500/20",
        activeBg: "bg-blue-500",
        unit: "admissions"
    },
    // {
    //     key: "leadUploads",
    //     label: "Lead Uploads",
    //     icon: FaCloudUploadAlt,
    //     color: "emerald",
    //     gradient: "from-emerald-500 to-teal-600",
    //     bg: "bg-emerald-500/10",
    //     text: "text-emerald-500",
    //     border: "border-emerald-500/20",
    //     activeBg: "bg-emerald-500",
    //     unit: "leads"
    // },
    // {
    //     key: "leadManual",
    //     label: "Manual Leads",
    //     icon: FaPen,
    //     color: "orange",
    //     gradient: "from-orange-500 to-amber-600",
    //     bg: "bg-orange-500/10",
    //     text: "text-orange-500",
    //     border: "border-orange-500/20",
    //     activeBg: "bg-orange-500",
    //     unit: "leads"
    // },
    {
        key: "followUps",
        label: "Follow Ups",
        icon: FaPhoneAlt,
        color: "pink",
        gradient: "from-pink-500 to-rose-600",
        bg: "bg-pink-500/10",
        text: "text-pink-500",
        border: "border-pink-500/20",
        activeBg: "bg-pink-500",
        unit: "calls"
    },
    {
        key: "revenue",
        label: "Revenue Generated",
        icon: FaRupeeSign,
        color: "yellow",
        gradient: "from-yellow-500 to-amber-500",
        bg: "bg-yellow-500/10",
        text: "text-yellow-500",
        border: "border-yellow-500/20",
        activeBg: "bg-yellow-500",
        unit: "₹"
    }
];

const ROLE_BADGES = {
    superAdmin: { label: "Super Admin", style: "bg-red-500/15 text-red-400 border border-red-500/20" },
    admin: { label: "Admin", style: "bg-orange-500/15 text-orange-400 border border-orange-500/20" },
    centerIncharge: { label: "CI", style: "bg-purple-500/15 text-purple-400 border border-purple-500/20" },
    zonalManager: { label: "ZM", style: "bg-blue-500/15 text-blue-400 border border-blue-500/20" },
    counsellor: { label: "Counsellor", style: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20" },
    telecaller: { label: "Telecaller", style: "bg-pink-500/15 text-pink-400 border border-pink-500/20" },
    marketing: { label: "Marketing", style: "bg-green-500/15 text-green-400 border border-green-500/20" },
    hr: { label: "HR", style: "bg-amber-500/15 text-amber-400 border border-amber-500/20" },
    default: { label: "Staff", style: "bg-gray-500/15 text-gray-400 border border-gray-500/20" }
};

const getRoleBadge = (role) => ROLE_BADGES[role] || { label: role || "Staff", style: ROLE_BADGES.default.style };

const getMedalStyle = (rank) => {
    if (rank === 1) return { bg: "bg-yellow-400/20 border-yellow-400/40", text: "text-yellow-400", icon: "🥇" };
    if (rank === 2) return { bg: "bg-gray-300/20 border-gray-300/40", text: "text-gray-300", icon: "🥈" };
    if (rank === 3) return { bg: "bg-orange-400/20 border-orange-400/40", text: "text-orange-400", icon: "🥉" };
    return { bg: "", text: "text-gray-500", icon: null };
};

const formatValue = (key, value) => {
    if (key === "revenue") return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
    return Number(value).toLocaleString("en-IN");
};

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const fmt = (d) => d.toISOString().split("T")[0];

const UserRank = () => {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const apiUrl = import.meta.env.VITE_API_URL;

    const [activeMetric, setActiveMetric] = useState("admissions");
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fromDate, setFromDate] = useState(fmt(firstOfMonth));
    const [toDate, setToDate] = useState(fmt(today));
    const [search, setSearch] = useState("");

    const fetchRankings = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({ metric: activeMetric, fromDate, toDate });
            const res = await fetch(`${apiUrl}/sales/user-rank?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setRankings(data.rankings || []);
            } else {
                toast.error(data.message || "Failed to fetch rankings");
            }
        } catch (err) {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    }, [activeMetric, fromDate, toDate, apiUrl]);

    useEffect(() => {
        fetchRankings();
    }, [fetchRankings]);

    const filtered = rankings.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.role || "").toLowerCase().includes(search.toLowerCase())
    );

    const activeMetricDef = METRICS.find(m => m.key === activeMetric);

    const handleExport = () => {
        const rows = filtered.map(r => ({
            Rank: r.rank,
            Name: r.name,
            Role: r.role,
            Counselling: r.counselling,
            Admissions: r.admissions,
            // "Lead Uploads": r.leadUploads,
            // "Manual Leads": r.leadManual,
            "Follow Ups": r.followUps,
            "Revenue (₹)": r.revenue
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "User Rankings");
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buf]), `user_rank_${activeMetric}_${fromDate}_to_${toDate}.xlsx`);
    };

    const card = isDark ? "bg-[#1a1f24] border-gray-700/50" : "bg-white border-gray-200";
    const subText = isDark ? "text-gray-400" : "text-gray-500";
    const mainText = isDark ? "text-white" : "text-gray-900";
    const inputCls = `px-3 py-2 rounded-lg border text-[12px] font-medium outline-none transition-all ${isDark ? "bg-[#131619] border-gray-700 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-200 text-gray-800 focus:border-cyan-500"}`;

    return (
        <Layout>
            <div className={`min-h-screen ${isDark ? "bg-[#0d1117]" : "bg-gray-50"} p-6`}>

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 shadow-lg shadow-yellow-500/30">
                                <FaTrophy className="text-white" size={18} />
                            </div>
                            <h1 className={`text-2xl font-black tracking-tight ${mainText}`}>User Rank</h1>
                        </div>
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${subText} ml-12`}>
                            Individual Performance Leaderboard
                        </p>
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                    >
                        <FaDownload size={12} /> Export Excel
                    </button>
                </div>

                {/* ── Metric Tabs ─────────────────────────────────────── */}
                <div className={`p-4 rounded-xl border ${card} shadow-sm mb-5`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${subText} mb-3`}>
                        Select Ranking Category
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {METRICS.map(m => {
                            const Icon = m.icon;
                            const isActive = activeMetric === m.key;
                            return (
                                <button
                                    key={m.key}
                                    onClick={() => setActiveMetric(m.key)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-black uppercase tracking-widest transition-all ${isActive
                                        ? `${m.activeBg} text-white border-transparent shadow-lg`
                                        : `${isDark ? "bg-[#131619] border-gray-700 text-gray-400 hover:border-gray-500" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"}`
                                        }`}
                                >
                                    <Icon size={12} />
                                    {m.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Filters Row ─────────────────────────────────────── */}
                <div className={`p-4 rounded-xl border ${card} shadow-sm mb-5 flex flex-wrap items-end gap-4`}>
                    <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${subText} mb-1.5`}>From Date</p>
                        <div className="flex items-center gap-2">
                            <FaCalendarAlt size={11} className={subText} />
                            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={inputCls} />
                        </div>
                    </div>
                    <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${subText} mb-1.5`}>To Date</p>
                        <div className="flex items-center gap-2">
                            <FaCalendarAlt size={11} className={subText} />
                            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={inputCls} />
                        </div>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <p className={`text-[9px] font-black uppercase tracking-widest ${subText} mb-1.5`}>Search User</p>
                        <input
                            type="text"
                            placeholder="Name or role..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className={`${inputCls} w-full`}
                        />
                    </div>
                    <button
                        onClick={fetchRankings}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-black uppercase tracking-widest transition-all ${isDark ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white" : "bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-500 hover:text-white"
                            }`}
                    >
                        <FaSync size={11} className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>

                {/* ── Summary Cards ─────────────────────────────────── */}
                {!loading && filtered.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                        {METRICS.map(m => {
                            const total = filtered.reduce((s, r) => s + (r[m.key] || 0), 0);
                            const Icon = m.icon;
                            return (
                                <div
                                    key={m.key}
                                    onClick={() => setActiveMetric(m.key)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all ${card} ${activeMetric === m.key ? `ring-2 ring-${m.color}-500/50` : "hover:scale-[1.02]"}`}
                                >
                                    <div className={`inline-flex p-2 rounded-lg ${m.bg} mb-2`}>
                                        <Icon size={14} className={m.text} />
                                    </div>
                                    <p className={`text-[9px] font-black uppercase tracking-widest ${subText} mb-0.5`}>{m.label}</p>
                                    <p className={`text-lg font-black ${mainText}`}>
                                        {m.key === "revenue" ? `₹${Math.ceil(total).toLocaleString("en-IN")}` : total.toLocaleString("en-IN")}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Rankings Table ─────────────────────────────────── */}
                <div className={`rounded-xl border ${card} shadow-sm overflow-hidden`}>
                    {/* Table Header */}
                    <div className={`px-5 py-4 border-b ${isDark ? "border-gray-700/50" : "border-gray-200"} flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                            {activeMetricDef && (
                                <div className={`p-2 rounded-lg ${activeMetricDef.bg}`}>
                                    <activeMetricDef.icon size={14} className={activeMetricDef.text} />
                                </div>
                            )}
                            <div>
                                <h3 className={`text-[13px] font-black ${mainText}`}>
                                    {activeMetricDef?.label} Leaderboard
                                </h3>
                                <p className={`text-[9px] font-bold uppercase tracking-widest ${subText}`}>
                                    {fromDate} → {toDate} · {filtered.length} active users
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className={`w-10 h-10 rounded-full border-2 border-t-transparent animate-spin ${activeMetricDef ? `border-${activeMetricDef.color}-500` : "border-cyan-500"}`} />
                            <p className={`text-[11px] font-bold uppercase tracking-widest ${subText}`}>Loading Rankings…</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <FaTrophy size={36} className="text-gray-600 opacity-40" />
                            <p className={`text-[12px] font-bold ${subText}`}>No activity found for selected period</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`text-[9px] font-black uppercase tracking-widest ${subText} ${isDark ? "bg-[#131619]" : "bg-gray-50"} border-b ${isDark ? "border-gray-700/50" : "border-gray-200"}`}>
                                        <th className="px-5 py-3 w-16">Rank</th>
                                        <th className="px-5 py-3">User</th>
                                        <th className="px-5 py-3 text-right">Counselling</th>
                                        <th className="px-5 py-3 text-right">Admissions</th>
                                        {/* <th className="px-5 py-3 text-right">Uploads</th>
                                        <th className="px-5 py-3 text-right">Manual Leads</th> */}
                                        <th className="px-5 py-3 text-right">Follow Ups</th>
                                        <th className="px-5 py-3 text-right">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((user) => {
                                        const medal = getMedalStyle(user.rank);
                                        const badge = getRoleBadge(user.role);
                                        const isTopThree = user.rank <= 3;
                                        return (
                                            <tr
                                                key={user.userId}
                                                className={`border-b transition-colors ${isDark ? "border-gray-800 hover:bg-[#131619]" : "border-gray-100 hover:bg-gray-50"} ${isTopThree ? (isDark ? "bg-[#1a1f24]/60" : "bg-yellow-50/40") : ""}`}
                                            >
                                                {/* Rank */}
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        {medal.icon ? (
                                                            <span className="text-xl leading-none">{medal.icon}</span>
                                                        ) : (
                                                            <span className={`text-[13px] font-black w-6 text-center ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                                                {user.rank}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* User Info */}
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white bg-gradient-to-br ${activeMetricDef?.gradient || "from-gray-500 to-gray-600"} shrink-0`}>
                                                            {(user.name || "?")[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className={`text-[12px] font-black ${mainText}`}>{user.name}</p>
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] ${badge.style}`}>
                                                                {badge.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Metrics */}
                                                {[
                                                    { key: "counselling", m: METRICS[0] },
                                                    { key: "admissions", m: METRICS[1] },
                                                    // { key: "leadUploads", m: METRICS[2] },
                                                    // { key: "leadManual", m: METRICS[3] },
                                                    { key: "followUps", m: METRICS[2] },
                                                    { key: "revenue", m: METRICS[3] }
                                                ].map(({ key, m }) => {
                                                    const val = user[key] || 0;
                                                    const isActive = activeMetric === key;
                                                    return (
                                                        <td key={key} className="px-5 py-3.5 text-right">
                                                            <span className={`text-[12px] font-black transition-all ${isActive ? m.text : (isDark ? "text-gray-300" : "text-gray-700")} ${isActive && val > 0 ? `px-2 py-0.5 rounded-md ${m.bg}` : ""}`}>
                                                                {formatValue(key, val)}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default UserRank;
