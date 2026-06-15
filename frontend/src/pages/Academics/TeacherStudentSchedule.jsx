import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import {
    FaArrowLeft, FaCalendarAlt, FaClock, FaUserGraduate, FaSearch,
    FaPhone, FaBook, FaSync, FaCheck, FaTimes, FaFilter,
    FaChevronDown, FaChevronUp, FaBan, FaInfoCircle, FaBookmark, FaUserTie
} from "react-icons/fa";

const fmt = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};

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
    const [loading, setLoading] = useState(false);

    // Filters
    const [filterDay, setFilterDay] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");
    const [filterDate, setFilterDate] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterTeacher, setFilterTeacher] = useState("All");

    // Expanded teacher sections
    const [expandedTeachers, setExpandedTeachers] = useState({});

    // Updating status
    const [updatingId, setUpdatingId] = useState(null);

    // Detail modal
    const [detailBooking, setDetailBooking] = useState(null);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/academics/teacher-booking/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const allBookings = data.bookings || [];
                setBookings(allBookings);
                // Auto-expand all teachers on first load
                const teacherIds = [...new Set(allBookings.map(b => b.teacherId?._id))];
                const expanded = {};
                teacherIds.forEach(id => { if (id) expanded[id] = true; });
                setExpandedTeachers(prev => ({ ...expanded, ...prev }));
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
                if (detailBooking?._id === bookingId) setDetailBooking(null);
            } else {
                toast.error("Failed to update status");
            }
        } catch {
            toast.error("Server error");
        } finally {
            setUpdatingId(null);
        }
    };

    const toggleTeacher = (id) =>
        setExpandedTeachers(prev => ({ ...prev, [id]: !prev[id] }));

    // Build grouped data: { teacherId -> { teacher, bookings: [] } }
    const grouped = {};
    bookings.forEach(b => {
        const tid = b.teacherId?._id || "unknown";
        if (!grouped[tid]) {
            grouped[tid] = {
                teacher: b.teacherId,
                bookings: []
            };
        }
        grouped[tid].bookings.push(b);
    });

    // All unique teacher names for filter dropdown
    const teacherOptions = Object.values(grouped).map(g => ({
        id: g.teacher?._id,
        name: g.teacher?.name || "Unknown"
    }));

    // Apply filters
    const filteredGrouped = Object.entries(grouped).filter(([tid, g]) => {
        if (filterTeacher !== "All" && tid !== filterTeacher) return false;
        return true;
    }).map(([tid, g]) => {
        const filteredBookings = g.bookings.filter(b => {
            const matchDay = filterDay === "All" || b.day === filterDay;
            const matchStatus = filterStatus === "All" || b.status === filterStatus;
            const matchDate = !filterDate || (b.scheduleDate && b.scheduleDate.startsWith(filterDate));
            const search = searchTerm.toLowerCase().trim();
            const matchSearch = !search ||
                b.students?.some(s =>
                    s.studentName?.toLowerCase().includes(search) ||
                    s.phoneNumber?.includes(search) ||
                    s.course?.toLowerCase().includes(search)
                ) ||
                b.bookedBy?.name?.toLowerCase().includes(search) ||
                b.day?.toLowerCase().includes(search);
            return matchDay && matchStatus && matchDate && matchSearch;
        });
        return [tid, { ...g, bookings: filteredBookings }];
    }).filter(([, g]) => g.bookings.length > 0);

    // Stats
    const totalStudents = bookings.reduce((acc, b) => acc + (b.students?.length || 0), 0);
    const pendingCount = bookings.filter(b => b.status === "pending").length;
    const confirmedCount = bookings.filter(b => b.status === "confirmed").length;

    // Styles
    const card = `rounded border p-5 transition-all duration-200 ${isDark ? "bg-[#151921] border-gray-800" : "bg-white border-gray-100 shadow-sm"}`;
    const selectCls = `px-3 py-2.5 rounded border text-sm font-medium outline-none transition-all ${isDark ? "bg-gray-900 border-gray-700 text-white focus:border-emerald-500/50" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500"}`;

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
                                <FaCalendarAlt className="text-emerald-500" /> All student bookings allotted to teachers
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
                <div className={`mb-8 p-5 rounded border flex flex-col gap-4 ${isDark ? "bg-[#151921] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
                    <div className="flex flex-col md:flex-row gap-4 items-center">
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
                        {/* Teacher filter */}
                        <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} className={selectCls}>
                            <option value="All">All Teachers</option>
                            {teacherOptions.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        {/* Date filter */}
                        <div className="relative">
                            <FaCalendarAlt className={`absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 text-sm pointer-events-none`} />
                            <input
                                type="date"
                                value={filterDate}
                                onChange={e => setFilterDate(e.target.value)}
                                className={`${selectCls} pl-10 pr-3`}
                                title="Filter by schedule date"
                            />
                        </div>
                        {filterDate && (
                            <button onClick={() => setFilterDate("")}
                                className="flex items-center gap-1 px-3 py-2 rounded text-[10px] font-black uppercase border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all">
                                <FaTimes className="text-[9px]" /> Clear Date
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        {/* Day filters */}
                        <span className={`text-[10px] font-black uppercase tracking-widest mr-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}>Day:</span>
                        {["All", ...DAYS].map(d => (
                            <button key={d} onClick={() => setFilterDay(d)}
                                className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all border
                                    ${filterDay === d
                                        ? "bg-emerald-500 text-black border-emerald-500"
                                        : isDark ? "bg-gray-800 border-gray-700 text-gray-400 hover:text-white" : "bg-white border-gray-200 text-gray-500 hover:border-emerald-400"}`}>
                                {d === "All" ? "All" : d.slice(0, 3)}
                            </button>
                        ))}

                        <div className="w-px h-5 bg-gray-700/30 mx-2" />

                        {/* Status filters */}
                        <span className={`text-[10px] font-black uppercase tracking-widest mr-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}>Status:</span>
                        {["All", "pending", "confirmed", "cancelled"].map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all border
                                    ${filterStatus === s
                                        ? "bg-emerald-500 text-black border-emerald-500"
                                        : isDark ? "bg-gray-800 border-gray-700 text-gray-400 hover:text-white" : "bg-white border-gray-200 text-gray-500 hover:border-emerald-400"}`}>
                                {s === "All" ? "All" : s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Content ── */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    </div>
                ) : filteredGrouped.length === 0 ? (
                    <div className={`text-center py-24 rounded border ${isDark ? "bg-[#151921] border-gray-800" : "bg-white border-gray-200"}`}>
                        <FaUserGraduate className="mx-auto text-5xl opacity-20 mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest opacity-30">No Bookings Found</p>
                        <p className="text-xs opacity-20 mt-2">
                            {bookings.length === 0
                                ? "No students have been booked yet. Telecallers can book from Lead Management → Teacher Schedule."
                                : "Try adjusting your filters"}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {filteredGrouped.map(([tid, g]) => (
                            <div key={tid} className={card}>
                                {/* Teacher Header */}
                                <button
                                    onClick={() => toggleTeacher(tid)}
                                    className="w-full flex items-center justify-between mb-0 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded border-2 flex items-center justify-center font-black ${isDark ? "border-gray-700 bg-gray-800 text-emerald-400" : "border-emerald-200 bg-emerald-50 text-emerald-600"}`}>
                                            {g.teacher?.name?.charAt(0) || "?"}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-extrabold text-base uppercase group-hover:text-emerald-400 transition-colors">
                                                {g.teacher?.name || "Unknown Teacher"}
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-0.5">
                                                {g.teacher?.employeeId && <span className="text-[10px] font-bold opacity-50">{g.teacher.employeeId}</span>}
                                                {g.teacher?.subject && <span className="text-[10px] font-bold text-emerald-400">{g.teacher.subject}</span>}
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded text-[10px] font-black uppercase border ${isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                                            {g.bookings.length} booking{g.bookings.length !== 1 ? "s" : ""}
                                        </span>
                                        <span className="text-[10px] font-bold opacity-50">
                                            {g.bookings.reduce((acc, b) => acc + (b.students?.length || 0), 0)} students
                                        </span>
                                    </div>
                                    {expandedTeachers[tid] ? <FaChevronUp className="opacity-40" /> : <FaChevronDown className="opacity-40" />}
                                </button>

                                {expandedTeachers[tid] && (
                                    <div className="mt-5 space-y-4">
                                        {/* Group bookings by day */}
                                        {DAYS.map(day => {
                                            const dayBookings = g.bookings.filter(b => b.day === day);
                                            if (dayBookings.length === 0) return null;
                                            return (
                                                <div key={day}>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-1 h-5 bg-emerald-500 rounded" />
                                                        <span className="text-xs font-black uppercase tracking-widest text-emerald-400">{day}</span>
                                                        <span className={`text-[10px] font-bold opacity-40`}>({dayBookings.length})</span>
                                                    </div>

                                                    <div className="space-y-3 pl-3">
                                                        {dayBookings.map(booking => (
                                                            <div key={booking._id}
                                                                className={`rounded border-2 p-4 transition-all ${isDark
                                                                    ? "bg-gray-900/40 border-gray-800 hover:border-emerald-500/20"
                                                                    : "bg-gray-50 border-gray-100 hover:border-emerald-200"}`}>

                                                                {/* Booking header */}
                                                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-black ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                                                                            <FaClock className="text-emerald-500 text-[10px]" />
                                                                            <span className="font-mono">{booking.startTime} – {booking.endTime}</span>
                                                                        </div>
                                                                        {booking.scheduleDate && (
                                                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-black ${isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                                                                                <FaCalendarAlt className="text-[10px]" />
                                                                                <span>{fmt(booking.scheduleDate)}</span>
                                                                            </div>
                                                                        )}
                                                                        <span className={`px-2.5 py-1 rounded border text-[10px] font-black uppercase ${STATUS_CONFIG[booking.status]?.badge}`}>
                                                                            {STATUS_CONFIG[booking.status]?.label}
                                                                        </span>
                                                                        <span className={`text-[10px] font-bold opacity-50`}>
                                                                            <FaBookmark className="inline text-[9px] mr-1" />
                                                                            By: {booking.bookedBy?.name || "—"}
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

                                                                {/* Booking notes */}
                                                                {booking.notes && (
                                                                    <p className="text-[11px] italic opacity-60 mb-3">"{booking.notes}"</p>
                                                                )}

                                                                {/* Students grid */}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                    {booking.students?.map((s, i) => (
                                                                        <div key={i} className={`rounded border p-3 ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"}`}>
                                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                                <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                                                                                    {s.studentName?.charAt(0)?.toUpperCase()}
                                                                                </div>
                                                                                <span className="font-extrabold text-sm truncate">{s.studentName}</span>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                {s.phoneNumber && (
                                                                                    <div className="flex items-center gap-1.5 text-[11px]">
                                                                                        <FaPhone className={`text-[9px] ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                                                                                        <span className={isDark ? "text-gray-400" : "text-gray-500"}>{s.phoneNumber}</span>
                                                                                    </div>
                                                                                )}
                                                                                {s.className && (
                                                                                    <div className="flex items-center gap-1.5 text-[11px]">
                                                                                        <FaBook className={`text-[9px] ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                                                                                        <span className={isDark ? "text-gray-400" : "text-gray-500"}>{s.className}</span>
                                                                                    </div>
                                                                                )}
                                                                                {s.course && (
                                                                                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                                                                                        {s.course}
                                                                                    </span>
                                                                                )}
                                                                                {s.notes && (
                                                                                    <p className="text-[10px] italic opacity-60 mt-1">{s.notes}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
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
                                        {detailBooking.teacherId?.name} · {detailBooking.day} · {detailBooking.startTime} – {detailBooking.endTime}
                                    </p>
                                </div>
                                <button onClick={() => setDetailBooking(null)} className="p-2 rounded hover:bg-gray-800/30 transition-all">
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className={`p-4 rounded border ${isDark ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"}`}>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div><span className="font-black opacity-50 uppercase">Teacher:</span> <span className="font-bold">{detailBooking.teacherId?.name || "—"}</span></div>
                                        <div><span className="font-black opacity-50 uppercase">Day:</span> <span className="font-bold">{detailBooking.day}</span></div>
                                        <div><span className="font-black opacity-50 uppercase">Time:</span> <span className="font-bold font-mono">{detailBooking.startTime} – {detailBooking.endTime}</span></div>
                                        <div><span className="font-black opacity-50 uppercase">Status:</span>
                                            <span className={`ml-1 px-2 py-0.5 rounded text-[10px] font-black border ${STATUS_CONFIG[detailBooking.status]?.badge}`}>
                                                {STATUS_CONFIG[detailBooking.status]?.label}
                                            </span>
                                        </div>
                                        <div><span className="font-black opacity-50 uppercase">Booked By:</span> <span className="font-bold">{detailBooking.bookedBy?.name || "—"}</span></div>
                                        <div><span className="font-black opacity-50 uppercase">Students:</span> <span className="font-bold">{detailBooking.students?.length || 0}</span></div>
                                    </div>
                                    {detailBooking.notes && (
                                        <p className={`mt-3 text-xs italic opacity-70 border-t pt-3 ${isDark ? "border-gray-700" : "border-emerald-100"}`}>
                                            "{detailBooking.notes}"
                                        </p>
                                    )}
                                </div>

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

                                {detailBooking.status === "pending" && (
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => updateStatus(detailBooking._id, "confirmed")}
                                            className="flex-1 py-3 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                            <FaCheck /> Confirm Booking
                                        </button>
                                        <button
                                            onClick={() => updateStatus(detailBooking._id, "cancelled")}
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
