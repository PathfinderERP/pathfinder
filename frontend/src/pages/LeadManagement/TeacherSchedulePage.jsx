import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import {
    FaArrowLeft, FaCalendarAlt, FaClock, FaUserTie, FaSearch,
    FaPlus, FaTimes, FaUserGraduate, FaPhone, FaBook,
    FaChevronLeft, FaChevronRight, FaCheck, FaSync,
    FaBookmark, FaBan, FaLock
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const emptyStudent = { studentName: "", phoneNumber: "", email: "", className: "", course: "", notes: "" };
const emptyBooking = { teacherId: "", centreId: "", day: "", startTime: "", endTime: "", notes: "", scheduleDate: "", students: [] };

// Returns YYYY-MM-DD of the next (or today) occurrence of a given day name
const getNextDayDate = (dayName) => {
    const dayIndex = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
    const today = new Date();
    const todayDay = today.getDay();
    const target = dayIndex[dayName] ?? 1;
    let diff = target - todayDay;
    if (diff < 0) diff += 7;
    const result = new Date(today);
    result.setDate(today.getDate() + diff);
    return result.toISOString().split("T")[0];
};

export default function TeacherSchedulePage() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [grouped, setGrouped] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDay, setFilterDay] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Book slot modal
    const [showModal, setShowModal] = useState(false);
    const [modalSlot, setModalSlot] = useState(null);
    const [bookingForm, setBookingForm] = useState(emptyBooking);
    const [students, setStudents] = useState([{ ...emptyStudent }]);
    const [submitting, setSubmitting] = useState(false);

    // View bookings modal
    const [showBookingsModal, setShowBookingsModal] = useState(false);
    const [viewSlot, setViewSlot] = useState(null);

    const fetchSchedule = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/academics/teacher-booking/for-telecaller`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setGrouped(data);
            } else {
                toast.error("Failed to fetch teacher schedules");
            }
        } catch {
            toast.error("Error fetching schedules");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

    const openBookModal = (teacher, day, freeSlot) => {
        setModalSlot({ teacher, day, slot: freeSlot });
        setBookingForm({
            teacherId: teacher._id,
            day,
            startTime: freeSlot.startTime,
            endTime: freeSlot.endTime,
            notes: "",
            scheduleDate: getNextDayDate(day),
        });
        setStudents([{ ...emptyStudent }]);
        setShowModal(true);
    };

    const openViewBookings = (teacher, day, freeSlot) => {
        setViewSlot({ teacher, day, slot: freeSlot });
        setShowBookingsModal(true);
    };

    const updateStudent = (idx, field, value) =>
        setStudents(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
    const addStudentRow = () => setStudents(prev => [...prev, { ...emptyStudent }]);
    const removeStudentRow = (idx) => setStudents(prev => prev.filter((_, i) => i !== idx));

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validStudents = students.filter(s => s.studentName.trim());
        if (validStudents.length === 0) {
            toast.error("Please add at least one student with a name");
            return;
        }
        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/academics/teacher-booking`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...bookingForm, students: validStudents })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Booking created successfully!");
                setShowModal(false);
                fetchSchedule();
            } else {
                toast.error(data.message || "Booking failed");
            }
        } catch {
            toast.error("Server error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteBooking = async (bookingId) => {
        if (!window.confirm("Cancel this booking?")) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/academics/teacher-booking/${bookingId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success("Booking cancelled");
                setShowBookingsModal(false);
                fetchSchedule();
            }
        } catch {
            toast.error("Failed to cancel booking");
        }
    };

    // Filter & paginate
    const filtered = grouped.filter(item => {
        const search = searchTerm.toLowerCase();
        return !search ||
            item.teacher.name?.toLowerCase().includes(search) ||
            item.teacher.employeeId?.toLowerCase().includes(search) ||
            item.teacher.subject?.toLowerCase().includes(search);
    });

    const days = filterDay === "All" ? DAYS : [filterDay];
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Styles
    const card = `rounded border p-5 transition-all duration-200 ${isDark ? "bg-[#151921] border-gray-800" : "bg-white border-gray-100 shadow-sm"}`;
    const inputCls = `w-full px-4 py-2.5 rounded border text-sm font-medium transition-all outline-none ${isDark ? "bg-gray-900 border-gray-700 text-white focus:border-amber-500/50" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500/30"}`;
    const labelCls = `block text-[10px] font-black uppercase tracking-widest mb-1.5 ${isDark ? "text-gray-500" : "text-gray-400"}`;

    // Format duration display
    const fmtDuration = (mins) => {
        if (!mins) return "";
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
    };

    return (
        <Layout activePage="Lead Management">
            <div className={`p-4 md:p-8 min-h-screen ${isDark ? "bg-[#0f1115] text-white" : "bg-[#f4f7fe] text-gray-900"}`}>

                {/* ── Header ── */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate("/lead-management")}
                            className={`p-2.5 rounded border transition-all ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300" : "bg-white border-gray-200 hover:bg-gray-100 text-gray-600"}`}>
                            <FaArrowLeft />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-1.5 h-8 bg-amber-500 rounded shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                                <h1 className="text-3xl font-extrabold tracking-tight">
                                    Teacher <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Schedule</span>
                                </h1>
                            </div>
                            <p className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                <FaCalendarAlt className="text-amber-500" /> Book students into free teacher slots
                            </p>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 text-xs font-bold">
                            <div className={`w-3 h-3 rounded-full ${isDark ? "bg-red-500/40" : "bg-red-200"}`} />
                            <span className={isDark ? "text-gray-400" : "text-gray-500"}>Class (Busy)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold">
                            <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                            <span className={isDark ? "text-gray-400" : "text-gray-500"}>Free Slot (Bookable)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold">
                            <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                            <span className={isDark ? "text-gray-400" : "text-gray-500"}>Booked</span>
                        </div>
                        <button onClick={fetchSchedule}
                            className={`p-2.5 rounded border transition-all ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300" : "bg-white border-gray-200 hover:bg-gray-100 text-gray-600"}`}
                            title="Refresh">
                            <FaSync className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* ── Filters ── */}
                <div className={`mb-8 p-5 rounded border flex flex-col md:flex-row gap-4 items-center ${isDark ? "bg-[#151921] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
                    <div className="relative flex-1">
                        <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                        <input
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            placeholder="Search teacher by name, ID, or subject..."
                            className={`w-full pl-12 pr-4 py-3 rounded border text-sm font-medium outline-none transition-all ${isDark ? "bg-gray-900 border-gray-700 text-white focus:border-amber-500/50" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500"}`}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {["All", ...DAYS].map(d => (
                            <button key={d} onClick={() => { setFilterDay(d); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all border
                                    ${filterDay === d
                                        ? "bg-amber-500 text-black border-amber-500"
                                        : isDark ? "bg-gray-800 border-gray-700 text-gray-400 hover:text-white" : "bg-white border-gray-200 text-gray-500 hover:border-amber-400"}`}>
                                {d === "All" ? "All Days" : d.slice(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Teacher Cards ── */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                    </div>
                ) : paginated.length === 0 ? (
                    <div className={`text-center py-24 rounded border ${isDark ? "bg-[#151921] border-gray-800" : "bg-white border-gray-200"}`}>
                        <FaUserTie className="mx-auto text-5xl opacity-20 mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest opacity-30">No teachers found</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {paginated.map(item => (
                            <div key={item.teacher._id} className={card}>
                                {/* Teacher Header */}
                                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-800/30">
                                    <div className={`w-12 h-12 rounded border-2 flex items-center justify-center text-xl font-black ${isDark ? "border-gray-700 bg-gray-800 text-amber-500" : "border-amber-200 bg-amber-50 text-amber-500"}`}>
                                        {item.teacher.name?.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-extrabold text-lg uppercase">{item.teacher.name}</p>
                                        <div className="flex flex-wrap gap-3 mt-1">
                                            <span className="text-xs font-bold opacity-50">{item.teacher.employeeId}</span>
                                            {item.teacher.subject && <span className="text-xs font-bold text-amber-500">{item.teacher.subject}</span>}
                                            {item.teacher.email && <span className="text-xs opacity-40">{item.teacher.email}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Weekly Grid */}
                                <div className="overflow-x-auto">
                                    <div className="grid min-w-[700px]" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                                        {/* Day headers */}
                                        {days.map(d => (
                                            <div key={d} className={`p-3 text-center text-[10px] font-black uppercase tracking-widest border-b ${isDark ? "border-gray-800 text-gray-500" : "border-gray-100 text-gray-400"}`}>
                                                {d}
                                            </div>
                                        ))}

                                        {/* Day columns */}
                                        {days.map(day => {
                                            const dayData = item.days[day] || { classSessions: [], freeSlots: [] };
                                            const classes = dayData.classSessions || [];
                                            const freeSlots = dayData.freeSlots || [];

                                            return (
                                                <div key={day} className={`p-2 align-top border-l first:border-l-0 ${isDark ? "border-gray-800" : "border-gray-100"}`}>
                                                    <div className="flex flex-col gap-1.5">

                                                        {/* ── Class slots (BUSY) ── */}
                                                        {classes.map((cls, i) => (
                                                            <div key={cls._id || i}
                                                                className={`rounded border-2 p-2.5 ${isDark
                                                                    ? "bg-red-900/10 border-red-900/30"
                                                                    : "bg-red-50 border-red-100"}`}>
                                                                <div className="flex items-center gap-1 mb-1.5">
                                                                    <FaLock className={`text-[8px] ${isDark ? "text-red-500/60" : "text-red-400"}`} />
                                                                    <span className={`text-[9px] font-black font-mono ${isDark ? "text-red-400/70" : "text-red-400"}`}>
                                                                        {cls.startTime} – {cls.endTime}
                                                                    </span>
                                                                </div>
                                                                <p className={`text-[10px] font-bold truncate leading-tight ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                                                    {cls.className || cls.class || cls.subject || "Class"}
                                                                </p>
                                                                {cls.subject && cls.className && (
                                                                    <p className={`text-[9px] opacity-50 truncate`}>{cls.subject}</p>
                                                                )}
                                                                {cls.centre && (
                                                                    <p className={`text-[9px] opacity-40 truncate`}>{cls.centre}</p>
                                                                )}
                                                                <div className={`mt-1.5 text-center text-[8px] font-black uppercase tracking-widest ${isDark ? "text-red-500/50" : "text-red-400/70"}`}>
                                                                    Class — Busy
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* ── Free slots (BOOKABLE) ── */}
                                                        {freeSlots.length === 0 && classes.length === 0 && (
                                                            <div className={`rounded border-2 border-dashed py-4 text-center text-[9px] font-black uppercase tracking-widest opacity-20 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                                                                No Schedule
                                                            </div>
                                                        )}

                                                        {freeSlots.map((slot, i) => (
                                                            <div key={i}
                                                                className={`rounded border-2 p-2.5 transition-all ${slot.isBooked
                                                                    ? (isDark ? "bg-amber-500/8 border-amber-500/40" : "bg-amber-50 border-amber-200")
                                                                    : (isDark ? "bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-400/60" : "bg-emerald-50 border-emerald-200 hover:border-emerald-400")}`}>

                                                                {/* Time */}
                                                                <div className="flex items-center gap-1 mb-1.5">
                                                                    <FaClock className={`text-[8px] ${slot.isBooked ? "text-amber-500" : "text-emerald-500"}`} />
                                                                    <span className={`text-[9px] font-black font-mono ${slot.isBooked ? (isDark ? "text-amber-300" : "text-amber-600") : (isDark ? "text-emerald-300" : "text-emerald-600")}`}>
                                                                        {slot.startTime} – {slot.endTime}
                                                                    </span>
                                                                </div>

                                                                {/* Duration badge */}
                                                                <div className={`inline-block text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded mb-2 ${slot.isBooked
                                                                    ? "bg-amber-500/15 text-amber-400"
                                                                    : "bg-emerald-500/15 text-emerald-400"}`}>
                                                                    {fmtDuration(slot.durationMins)} free
                                                                </div>

                                                                {/* Booked indicator */}
                                                                {slot.isBooked && (
                                                                    <div className="flex items-center gap-1 mb-2">
                                                                        <FaBookmark className="text-[8px] text-amber-400" />
                                                                        <span className="text-[9px] font-black text-amber-400">
                                                                            {slot.totalStudentsBooked} student{slot.totalStudentsBooked !== 1 ? "s" : ""}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* Action buttons */}
                                                                <div className="flex gap-1">
                                                                    {slot.isBooked && (
                                                                        <button
                                                                            onClick={() => openViewBookings(item.teacher, day, slot)}
                                                                            className="flex-1 py-1 rounded text-[8px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-black transition-all">
                                                                            View
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => openBookModal(item.teacher, day, slot)}
                                                                        className="flex-1 py-1 rounded text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all flex items-center justify-center gap-0.5">
                                                                        <FaPlus className="text-[7px]" /> Book
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-3 mt-8">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                            className={`p-2 rounded border disabled:opacity-30 transition-all ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-white border-gray-200 hover:bg-gray-100"}`}>
                            <FaChevronLeft />
                        </button>
                        <span className="text-sm font-bold">{currentPage} / {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                            className={`p-2 rounded border disabled:opacity-30 transition-all ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-white border-gray-200 hover:bg-gray-100"}`}>
                            <FaChevronRight />
                        </button>
                    </div>
                )}

                {/* ══════════════════ BOOK SLOT MODAL ══════════════════ */}
                {showModal && modalSlot && (
                    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                        <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded border shadow-2xl ${isDark ? "bg-[#151921] border-gray-800" : "bg-white border-gray-200"}`}
                            onClick={e => e.stopPropagation()}>

                            <div className={`flex items-center justify-between p-6 border-b ${isDark ? "border-gray-800" : "border-gray-100"}`}>
                                <div>
                                    <h2 className="text-xl font-extrabold uppercase flex items-center gap-2">
                                        <FaBookmark className="text-emerald-500" /> Book Free Slot
                                    </h2>
                                    <p className={`text-xs font-bold mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                        {modalSlot.teacher.name} · {modalSlot.day} · {modalSlot.slot.startTime} – {modalSlot.slot.endTime}
                                        <span className="ml-2 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-black">
                                            {fmtDuration(modalSlot.slot.durationMins)} available
                                        </span>
                                    </p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-2 rounded hover:bg-gray-800/30 transition-all">
                                    <FaTimes />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Slot info card */}
                                <div className={`p-4 rounded border ${isDark ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"}`}>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div><span className="font-black opacity-50 uppercase">Teacher:</span> <span className="font-bold">{modalSlot.teacher.name}</span></div>
                                        <div><span className="font-black opacity-50 uppercase">Day:</span> <span className="font-bold">{modalSlot.day}</span></div>
                                        <div><span className="font-black opacity-50 uppercase">Free From:</span> <span className="font-bold font-mono">{modalSlot.slot.startTime}</span></div>
                                        <div><span className="font-black opacity-50 uppercase">Free Until:</span> <span className="font-bold font-mono">{modalSlot.slot.endTime}</span></div>
                                        <div><span className="font-black opacity-50 uppercase">Duration:</span> <span className="font-bold text-emerald-400">{fmtDuration(modalSlot.slot.durationMins)}</span></div>
                                    </div>
                                </div>

                                {/* Date Picker */}
                                <div>
                                    <label className={labelCls}>Schedule Date <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <FaCalendarAlt className={`absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 text-sm pointer-events-none`} />
                                        <input
                                            type="date"
                                            required
                                            value={bookingForm.scheduleDate}
                                            onChange={e => setBookingForm(f => ({ ...f, scheduleDate: e.target.value }))}
                                            className={`${inputCls} pl-12`}
                                        />
                                    </div>
                                    {bookingForm.scheduleDate && (() => {
                                        const d = new Date(bookingForm.scheduleDate + "T00:00:00");
                                        const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
                                        const selectedDay = dayNames[d.getDay()];
                                        const isWrongDay = selectedDay !== modalSlot.day;
                                        return isWrongDay ? (
                                            <p className="text-[10px] font-bold text-amber-400 mt-1.5 flex items-center gap-1">
                                                ⚠ Selected date falls on a {selectedDay}. Slot is for {modalSlot.day}.
                                            </p>
                                        ) : (
                                            <p className="text-[10px] font-bold text-emerald-400 mt-1.5">
                                                ✓ {d.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                                            </p>
                                        );
                                    })()}
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className={labelCls}>Booking Notes (Optional)</label>
                                    <textarea rows={2} value={bookingForm.notes}
                                        onChange={e => setBookingForm(f => ({ ...f, notes: e.target.value }))}
                                        placeholder="Add any notes about this booking..."
                                        className={inputCls} />
                                </div>

                                {/* Students section */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className={labelCls + " !mb-0"}>Student Allotments <span className="text-red-500">*</span></label>
                                        <button type="button" onClick={addStudentRow}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all">
                                            <FaPlus className="text-[8px]" /> Add Student
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {students.map((s, idx) => (
                                            <div key={idx} className={`p-4 rounded border relative ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Student {idx + 1}</span>
                                                    {students.length > 1 && (
                                                        <button type="button" onClick={() => removeStudentRow(idx)}
                                                            className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-all">
                                                            <FaTimes className="text-[10px]" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className={labelCls}>Name <span className="text-red-400">*</span></label>
                                                        <input value={s.studentName} onChange={e => updateStudent(idx, "studentName", e.target.value)}
                                                            placeholder="Full name" required className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className={labelCls}>Phone</label>
                                                        <input value={s.phoneNumber} onChange={e => updateStudent(idx, "phoneNumber", e.target.value)}
                                                            placeholder="Phone number" className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className={labelCls}>Class</label>
                                                        <input value={s.className} onChange={e => updateStudent(idx, "className", e.target.value)}
                                                            placeholder="e.g. Class 10" className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className={labelCls}>Course</label>
                                                        <input value={s.course} onChange={e => updateStudent(idx, "course", e.target.value)}
                                                            placeholder="e.g. JEE" className={inputCls} />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className={labelCls}>Notes</label>
                                                        <input value={s.notes} onChange={e => updateStudent(idx, "notes", e.target.value)}
                                                            placeholder="Any specific notes for this student" className={inputCls} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowModal(false)}
                                        className={`flex-1 py-3 rounded border font-black text-[11px] uppercase tracking-widest transition-all ${isDark ? "border-gray-700 text-gray-400 hover:bg-gray-800" : "border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={submitting}
                                        className="flex-1 py-3 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                        {submitting ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <FaCheck />}
                                        Confirm Booking
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ══════════════════ VIEW BOOKINGS MODAL ══════════════════ */}
                {showBookingsModal && viewSlot && (
                    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowBookingsModal(false)}>
                        <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded border shadow-2xl ${isDark ? "bg-[#151921] border-gray-800" : "bg-white border-gray-200"}`}
                            onClick={e => e.stopPropagation()}>

                            <div className={`flex items-center justify-between p-6 border-b ${isDark ? "border-gray-800" : "border-gray-100"}`}>
                                <div>
                                    <h2 className="text-xl font-extrabold uppercase flex items-center gap-2">
                                        <FaUserGraduate className="text-amber-500" /> Booked Students
                                    </h2>
                                    <p className={`text-xs font-bold mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                        {viewSlot.teacher.name} · {viewSlot.day} · {viewSlot.slot.startTime} – {viewSlot.slot.endTime}
                                    </p>
                                </div>
                                <button onClick={() => setShowBookingsModal(false)} className="p-2 rounded hover:bg-gray-800/30 transition-all">
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {(!viewSlot.slot.bookings || viewSlot.slot.bookings.length === 0) ? (
                                    <p className="text-center opacity-40 text-sm font-bold py-8">No bookings yet</p>
                                ) : viewSlot.slot.bookings.map(booking => (
                                    <div key={booking._id} className={`rounded border p-4 ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                                    booking.status === "confirmed" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                    : booking.status === "cancelled" ? "bg-red-500/20 text-red-400 border-red-500/30"
                                                    : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                                }`}>
                                                    {booking.status}
                                                </span>
                                                <span className="text-[10px] font-bold opacity-60">
                                                    By: {booking.bookedBy?.name || "—"}
                                                </span>
                                            </div>
                                            <button onClick={() => handleDeleteBooking(booking._id)}
                                                className="p-1.5 rounded text-red-400 hover:bg-red-500/10 transition-all border border-red-500/20 text-[10px]">
                                                <FaBan />
                                            </button>
                                        </div>

                                        {booking.notes && (
                                            <p className="text-xs mb-3 italic opacity-70">"{booking.notes}"</p>
                                        )}

                                        <div className="space-y-2">
                                            {booking.students?.map((s, i) => (
                                                <div key={i} className={`flex flex-wrap gap-3 items-center text-xs rounded p-2 ${isDark ? "bg-white/5" : "bg-black/5"}`}>
                                                    <span className="font-black">{s.studentName}</span>
                                                    {s.phoneNumber && <span className="flex items-center gap-1 opacity-60"><FaPhone className="text-[9px]" />{s.phoneNumber}</span>}
                                                    {s.className && <span className="flex items-center gap-1 opacity-60"><FaBook className="text-[9px]" />{s.className}</span>}
                                                    {s.course && <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">{s.course}</span>}
                                                    {s.notes && <span className="opacity-50 italic">{s.notes}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
