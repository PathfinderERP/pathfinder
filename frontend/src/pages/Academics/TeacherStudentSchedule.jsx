import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import {
    FaArrowLeft, FaCalendarAlt, FaClock, FaUserGraduate, FaSearch,
    FaPhone, FaBook, FaSync, FaCheck, FaTimes, FaFilter,
    FaChevronDown, FaChevronUp, FaBan, FaInfoCircle, FaBookmark
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const STATUS_CONFIG = {
    pending: {
        badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        label: "Pending",
    },
    confirmed: {
        badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        label: "Confirmed",
    },
    cancelled: {
        badge: "bg-red-500/20 text-red-400 border-red-500/30",
        label: "Cancelled",
    },
};

export default function TeacherStudentSchedule() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [bookings, setBookings] = useState([]);
    const [grouped, setGrouped] = useState({});
    const [loading, setLoading] = useState(false);

    // Filters
    const [filterDay, setFilterDay] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");
    const [searchTerm, setSearchTerm] = useState("");

    // Expanded day sections
    const [expandedDays, setExpandedDays] = useState(() => {
        const obj = {};
        DAYS.forEach(d => (obj[d] = true));
        return obj;
    });

    // Updating status
    const [updatingId, setUpdatingId] = useState(null);

    // Detail modal
    const [detailBooking, setDetailBooking] = useState(null);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/academics/teacher-booking/for-teacher`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBookings(data.bookings || []);
                setGrouped(data.grouped || {});
            } else {
                toast.error("Failed to fetch bookings");
            }
        } catch {
            toast.error("Error fetching bookings");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const updateStatus = async (bookingId, newStatus) => {
        setUpdatingId(bookingId);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/academics/teacher-booking/${bookingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                toast.success(`Booking ${newStatus}`);
                fetchBookings();
            } else {
                toast.error("Failed to update status");
            }
        } catch {
            toast.error("Server error");
        } finally {
            setUpdatingId(null);
        }
    };

    const toggleDay = (day) => setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));

    // Filter logic
    const getFilteredForDay = (day) => {
        return (grouped[day] || []).filter(b => {
            const matchStatus = filterStatus === "All" || b.status === filterStatus;
            const matchSearch = !searchTerm.trim() ||
                b.students?.some(s =>
                    s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.phoneNumber?.includes(searchTerm) ||
                    s.course?.toLowerCase().includes(searchTerm.toLowerCase())
                ) ||
                b.bookedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchStatus && matchSearch;
        });
    };

    const activeDays = filterDay === "All" ? DAYS : [filterDay];

    const totalStudents = bookings.reduce((acc, b) => acc + (b.students?.length || 0), 0);
    const pendingCount = bookings.filter(b => b.status === "pending").length;
    const confirmedCount = bookings.filter(b => b.status === "confirmed").length;

    // Styles
    const card = `rounded border p-5 transition-all duration-200 ${isDark ? "bg-[#151921] border-gray-800" : "bg-white border-gray-100 shadow-sm"}`;

    return (
        <Layout activePage="Academics">
            <div className={`p-4 md:p-8 min-h-screen ${isDark ? "bg-[#0f1115] text-white" : "bg-[#f4f7fe] text-gray-900"}`}>

                {/* ── Header ── */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate("/academics/teacher-routine")}
                            className={`p-2.5 rounded border transition-all ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300" : "bg-white border-gray-200 hover:bg-gray-100 text-gray-600"}`}>
                            <FaArrowLeft />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-1.5 h-8 bg-emerald-500 rounded shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                                <h1 className="text-3xl font-extrabold tracking-tight">
                                    Students <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">Schedule</span>
                                </h1>
                            </div>
                            <p className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                <FaCalendarAlt className="text-emerald-500" /> All students booked for your sessions
                            </p>
                        </div>
                    </div>
                    <button onClick={fetchBookings}
                        className={`p-2.5 rounded border transition-all ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300" : "bg-white border-gray-200 hover:bg-gray-100 text-gray-600"}`}
                        title="Refresh">
                        <FaSync className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                {/* ── Stats Row ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: "Total Bookings", value: bookings.length, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                        { label: "Total Students", value: totalStudents, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
                        { label: "Pending", value: pendingCount, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                        { label: "Confirmed", value: confirmedCount, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                    ].map(stat => (
                        <div key={stat.label} className={`rounded border p-4 ${stat.bg}`}>
                            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* ── Filters ── */}
                <div className={`mb-8 p-5 rounded border flex flex-col md:flex-row gap-4 items-center ${isDark ? "bg-[#151921] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
                    {/* Search */}
                    <div className="relative flex-1">
                        <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search student, phone, course, telecaller..."
                            className={`w-full pl-12 pr-4 py-3 rounded border text-sm font-medium outline-none transition-all ${isDark ? "bg-gray-900 border-gray-700 text-white focus:border-emerald-500/50" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500"}`}
                        />
                    </div>

                    {/* Day filter */}
                    <div className="flex flex-wrap gap-2">
                        {["All", ...DAYS].map(d => (
                            <button key={d} onClick={() => setFilterDay(d)}
                                className={`px-3 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all border
                                    ${filterDay === d
                                        ? "bg-emerald-500 text-black border-emerald-500"
                                        : isDark ? "bg-gray-800 border-gray-700 text-gray-400 hover:text-white" : "bg-white border-gray-200 text-gray-500 hover:border-emerald-400"}`}>
                                {d === "All" ? "All" : d.slice(0, 3)}
                            </button>
                        ))}
                    </div>

                    {/* Status filter */}
                    <div className="flex flex-wrap gap-2">
                        {["All", "pending", "confirmed", "cancelled"].map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)}
                                className={`px-3 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all border
                                    ${filterStatus === s
                                        ? "bg-emerald-500 text-black border-emerald-500"
                                        : isDark ? "bg-gray-800 border-gray-700 text-gray-400 hover:text-white" : "bg-white border-gray-200 text-gray-500 hover:border-emerald-400"}`}>
                                {s === "All" ? "All Status" : s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Content ── */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {activeDays.map(day => {
                            const dayBookings = getFilteredForDay(day);
                            if (dayBookings.length === 0 && filterDay !== "All" && filterDay === day) {
                                return (
                                    <div key={day} className={`text-center py-16 rounded border ${isDark ? "bg-[#151921] border-gray-800" : "bg-white border-gray-200"}`}>
                                        <FaCalendarAlt className="mx-auto text-4xl opacity-20 mb-3" />
                                        <p className="text-sm font-black uppercase tracking-widest opacity-30">No bookings for {day}</p>
                                    </div>
                                );
                            }
                            if (dayBookings.length === 0) return null;

                            return (
                                <div key={day} className={card}>
                                    {/* Day Header */}
                                    <button
                                        onClick={() => toggleDay(day)}
                                        className="w-full flex items-center justify-between mb-4 group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-1 h-7 bg-emerald-500 rounded" />
                                            <h2 className="text-lg font-extrabold uppercase tracking-wider group-hover:text-emerald-400 transition-colors">{day}</h2>
                                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase border ${isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                                                {dayBookings.length} booking{dayBookings.length !== 1 ? "s" : ""}
                                            </span>
                                            <span className={`text-[10px] font-bold opacity-50`}>
                                                {dayBookings.reduce((acc, b) => acc + (b.students?.length || 0), 0)} students
                                            </span>
                                        </div>
                                        {expandedDays[day] ? <FaChevronUp className="opacity-40" /> : <FaChevronDown className="opacity-40" />}
                                    </button>

                                    {expandedDays[day] && (
                                        <div className="space-y-4">
                                            {dayBookings.map(booking => (
                                                <div key={booking._id} className={`rounded border-2 p-4 transition-all ${isDark
                                                    ? "bg-gray-900/40 border-gray-800 hover:border-emerald-500/20"
                                                    : "bg-gray-50 border-gray-100 hover:border-emerald-200"}`}>

                                                    {/* Booking Header Row */}
                                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            {/* Time */}
                                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-black ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                                                                <FaClock className="text-emerald-500 text-[10px]" />
                                                                <span className="font-mono">{booking.startTime} – {booking.endTime}</span>
                                                            </div>
                                                            {/* Subject */}
                                                            {booking.subject && (
                                                                <span className={`px-2.5 py-1 rounded text-[10px] font-black border ${isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                                                                    {booking.subject}
                                                                </span>
                                                            )}
                                                            {/* Class */}
                                                            {booking.className && (
                                                                <span className={`text-[10px] font-bold opacity-60`}>{booking.className}</span>
                                                            )}
                                                            {/* Status badge */}
                                                            <span className={`px-2.5 py-1 rounded border text-[10px] font-black uppercase ${STATUS_CONFIG[booking.status]?.badge}`}>
                                                                {STATUS_CONFIG[booking.status]?.label}
                                                            </span>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-2">
                                                            {booking.status === "pending" && (
                                                                <>
                                                                    <button
                                                                        onClick={() => updateStatus(booking._id, "confirmed")}
                                                                        disabled={updatingId === booking._id}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-50">
                                                                        <FaCheck className="text-[9px]" /> Confirm
                                                                    </button>
                                                                    <button
                                                                        onClick={() => updateStatus(booking._id, "cancelled")}
                                                                        disabled={updatingId === booking._id}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/10 text-red-400 text-[10px] font-black uppercase border border-red-500/20 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50">
                                                                        <FaBan className="text-[9px]" /> Cancel
                                                                    </button>
                                                                </>
                                                            )}
                                                            {booking.status === "cancelled" && (
                                                                <button
                                                                    onClick={() => updateStatus(booking._id, "pending")}
                                                                    disabled={updatingId === booking._id}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase border border-amber-500/20 hover:bg-amber-500 hover:text-black transition-all disabled:opacity-50">
                                                                    <FaSync className="text-[9px]" /> Reopen
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setDetailBooking(booking)}
                                                                className={`p-2 rounded border text-[10px] transition-all ${isDark ? "border-gray-700 text-gray-400 hover:bg-gray-800" : "border-gray-200 text-gray-400 hover:bg-gray-100"}`}
                                                                title="View details">
                                                                <FaInfoCircle />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Telecaller info */}
                                                    <div className={`flex items-center gap-2 mb-4 text-[11px] font-bold opacity-60`}>
                                                        <FaBookmark className="text-[9px]" />
                                                        Booked by: {booking.bookedBy?.name || "—"}
                                                        {booking.bookedBy?.employeeId && <span className="opacity-60">({booking.bookedBy.employeeId})</span>}
                                                        {booking.notes && <span className="italic ml-2 opacity-70">· "{booking.notes}"</span>}
                                                    </div>

                                                    {/* Students Grid */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {booking.students?.map((s, i) => (
                                                            <div key={i} className={`rounded border p-3 ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"}`}>
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className={`w-7 h-7 rounded flex items-center justify-center text-xs font-black ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                                                                        {s.studentName?.charAt(0)?.toUpperCase()}
                                                                    </div>
                                                                    <span className="font-extrabold text-sm truncate">{s.studentName}</span>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    {s.phoneNumber && (
                                                                        <div className="flex items-center gap-1.5 text-[11px]">
                                                                            <FaPhone className={`text-[9px] ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                                                                            <span className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>{s.phoneNumber}</span>
                                                                        </div>
                                                                    )}
                                                                    {s.className && (
                                                                        <div className="flex items-center gap-1.5 text-[11px]">
                                                                            <FaBook className={`text-[9px] ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                                                                            <span className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>{s.className}</span>
                                                                        </div>
                                                                    )}
                                                                    {s.course && (
                                                                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                                                                            {s.course}
                                                                        </span>
                                                                    )}
                                                                    {s.notes && (
                                                                        <p className={`text-[10px] italic opacity-60 mt-1`}>{s.notes}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Empty state */}
                        {activeDays.every(d => getFilteredForDay(d).length === 0) && (
                            <div className={`text-center py-24 rounded border ${isDark ? "bg-[#151921] border-gray-800" : "bg-white border-gray-200"}`}>
                                <FaUserGraduate className="mx-auto text-5xl opacity-20 mb-4" />
                                <p className="text-sm font-black uppercase tracking-widest opacity-30">No bookings found</p>
                                <p className="text-xs opacity-20 mt-2">Try adjusting your filters</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════════════ DETAIL MODAL ══════════════════ */}
                {detailBooking && (
                    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4"
                        onClick={() => setDetailBooking(null)}>
                        <div className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded border shadow-2xl ${isDark ? "bg-[#151921] border-gray-800" : "bg-white border-gray-200"}`}
                            onClick={e => e.stopPropagation()}>

                            <div className={`flex items-center justify-between p-6 border-b ${isDark ? "border-gray-800" : "border-gray-100"}`}>
                                <div>
                                    <h2 className="text-xl font-extrabold uppercase flex items-center gap-2">
                                        <FaInfoCircle className="text-emerald-500" /> Booking Details
                                    </h2>
                                    <p className={`text-xs font-bold mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                        {detailBooking.day} · {detailBooking.startTime} – {detailBooking.endTime}
                                    </p>
                                </div>
                                <button onClick={() => setDetailBooking(null)} className="p-2 rounded hover:bg-gray-800/30 transition-all">
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Info grid */}
                                <div className={`p-4 rounded border ${isDark ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"}`}>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div><span className="font-black opacity-50 uppercase">Day:</span> <span className="font-bold">{detailBooking.day}</span></div>
                                        <div><span className="font-black opacity-50 uppercase">Time:</span> <span className="font-bold font-mono">{detailBooking.startTime} – {detailBooking.endTime}</span></div>
                                        <div><span className="font-black opacity-50 uppercase">Subject:</span> <span className="font-bold">{detailBooking.subject || "—"}</span></div>
                                        <div><span className="font-black opacity-50 uppercase">Class:</span> <span className="font-bold">{detailBooking.className || "—"}</span></div>
                                        <div><span className="font-black opacity-50 uppercase">Status:</span>
                                            <span className={`ml-1 px-2 py-0.5 rounded text-[10px] font-black border ${STATUS_CONFIG[detailBooking.status]?.badge}`}>
                                                {STATUS_CONFIG[detailBooking.status]?.label}
                                            </span>
                                        </div>
                                        <div><span className="font-black opacity-50 uppercase">Booked By:</span> <span className="font-bold">{detailBooking.bookedBy?.name || "—"}</span></div>
                                    </div>
                                    {detailBooking.notes && (
                                        <p className={`mt-3 text-xs italic opacity-70 border-t pt-3 ${isDark ? "border-gray-700" : "border-emerald-100"}`}>
                                            "{detailBooking.notes}"
                                        </p>
                                    )}
                                </div>

                                {/* Students list */}
                                <div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                        Students ({detailBooking.students?.length || 0})
                                    </p>
                                    <div className="space-y-2">
                                        {detailBooking.students?.map((s, i) => (
                                            <div key={i} className={`flex flex-wrap gap-3 items-center text-xs rounded p-3 border ${isDark ? "bg-white/5 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                                                <span className="font-black">{i + 1}. {s.studentName}</span>
                                                {s.phoneNumber && <span className="flex items-center gap-1 opacity-60"><FaPhone className="text-[9px]" />{s.phoneNumber}</span>}
                                                {s.className && <span className="flex items-center gap-1 opacity-60"><FaBook className="text-[9px]" />{s.className}</span>}
                                                {s.course && <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">{s.course}</span>}
                                                {s.notes && <span className="opacity-50 italic">{s.notes}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Quick status change from modal */}
                                {detailBooking.status === "pending" && (
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => { updateStatus(detailBooking._id, "confirmed"); setDetailBooking(null); }}
                                            className="flex-1 py-3 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                            <FaCheck /> Confirm Booking
                                        </button>
                                        <button
                                            onClick={() => { updateStatus(detailBooking._id, "cancelled"); setDetailBooking(null); }}
                                            className="flex-1 py-3 rounded bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-black text-[11px] uppercase tracking-widest transition-all border border-red-500/20 flex items-center justify-center gap-2">
                                            <FaBan /> Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
