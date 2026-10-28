import React, { useState, useEffect, useCallback } from 'react';
import {
    FaTimes, FaPhone, FaPhoneAlt, FaCalendarAlt, FaUser, FaBuilding,
    FaMapMarkerAlt, FaGraduationCap, FaSchool, FaRegClock, FaStickyNote,
    FaRegCalendarCheck, FaHistory, FaSync, FaEnvelope, FaIdCard, FaClock,
    FaArrowRight, FaCheckCircle
} from 'react-icons/fa';
import StudentFollowUpModal from '../common/StudentFollowUpModal';

const API_URL = import.meta.env.VITE_API_URL;

const FEEDBACK_COLORS = {
    'Foundation class 6':  { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/40' },
    'Foundation class 7':  { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
    'Foundation class 8':  { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/40' },
    'Foundation class 9':  { bg: 'bg-blue-500/20',   text: 'text-blue-300',   border: 'border-blue-500/40' },
    'Foundation class 10': { bg: 'bg-cyan-500/20',   text: 'text-cyan-300',   border: 'border-cyan-500/40' },
    'Interested':          { bg: 'bg-green-500/20',  text: 'text-green-300',  border: 'border-green-500/40' },
    'Not Interested':      { bg: 'bg-rose-500/20',   text: 'text-rose-300',   border: 'border-rose-500/40' },
    'Neet 2 year':         { bg: 'bg-fuchsia-500/20',text: 'text-fuchsia-300',border: 'border-fuchsia-500/40' },
    'Neet 1 year':         { bg: 'bg-pink-500/20',   text: 'text-pink-300',   border: 'border-pink-500/40' },
    'JEE 2 year':          { bg: 'bg-sky-500/20',    text: 'text-sky-300',    border: 'border-sky-500/40' },
    'JEE 1 year':          { bg: 'bg-teal-500/20',   text: 'text-teal-300',   border: 'border-teal-500/40' },
    'No Response':         { bg: 'bg-amber-500/20',  text: 'text-amber-300',  border: 'border-amber-500/40' },
    'Call Back Later':     { bg: 'bg-emerald-500/20',text: 'text-emerald-300',border: 'border-emerald-500/40' },
    'Other':               { bg: 'bg-gray-700/60',   text: 'text-gray-300',   border: 'border-gray-600/60' },
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

const formatDateOnly = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const formatDuration = (secs) => {
    if (secs === null || secs === undefined || secs === '' || isNaN(secs)) return null;
    const s = Number(secs);
    if (s <= 0) return null;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (m === 0) return `${rem}s`;
    return `${m}m ${rem > 0 ? `${rem}s` : ''}`;
};

const getRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now - then;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return '1 month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;
    return `${Math.floor(diffMonths / 12)} year(s) ago`;
};

const PNTSEStudentHistoryModal = ({ isOpen, onClose, student, zoneName, onFollowUpUpdated }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCallModal, setShowCallModal] = useState(false);

    const getHeaders = () => ({
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
    });

    const studentId = student?._id;

    const fetchHistory = useCallback(async () => {
        if (!studentId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/follow-up/PNTSE/${studentId}`, {
                headers: getHeaders()
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setHistory(data.followUps || []);
            }
        } catch (err) {
            console.error('Failed to load student history:', err);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        if (isOpen && studentId) {
            fetchHistory();
        }
    }, [isOpen, studentId, fetchHistory]);

    if (!isOpen || !student) return null;

    // Follow-up calculations
    const totalCalls = history.length;
    const totalSeconds = history.reduce((acc, h) => acc + (Number(h.callDuration) || 0), 0);
    const totalTalkTime = formatDuration(totalSeconds) || '0s';

    const sortedHistory = [...history].sort((a, b) => new Date(b.callDate || b.createdAt) - new Date(a.callDate || a.createdAt));
    const firstCall = sortedHistory[sortedHistory.length - 1];
    const latestCall = sortedHistory[0];

    const nextUpcoming = sortedHistory.find(h => h.nextFollowUpDate && new Date(h.nextFollowUpDate) >= new Date());

    const insertionDate = student.createdAt ? formatDateTime(student.createdAt) : '—';
    const relativeInserted = student.createdAt ? getRelativeTime(student.createdAt) : '';

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-gray-100">

                {/* ── Modal Header Banner ── */}
                <div className="px-6 py-5 bg-gradient-to-r from-purple-950/80 via-indigo-950/60 to-gray-900 border-b border-gray-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-purple-500/25 shrink-0 border border-purple-400/30">
                            {(student.name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                                    {student.name || 'Student History'}
                                </h2>
                                <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                    {student.rollNo || 'No Roll No'}
                                </span>
                                {(student.class?.name || student.class) && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                        {student.class?.name || student.class}
                                    </span>
                                )}
                                {student.course && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        {student.course}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                <span className="text-purple-400 font-semibold">PNTSE Student Comprehensive History</span>
                                <span>•</span>
                                <span>Complete Follow-Up Logs & Activity Timeline</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setShowCallModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                        >
                            <FaPhoneAlt size={11} />
                            <span>Call / Follow-Up</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-gray-800/80 hover:bg-rose-500/20 hover:text-rose-400 text-gray-400 flex items-center justify-center border border-gray-700 transition cursor-pointer"
                            title="Close"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* ── Scrollable Body ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                    {/* ── Data Insertion & Profile Details Card ── */}
                    <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 shadow-inner">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
                                <FaIdCard className="text-purple-400" />
                                <span>Student Profile & Insertion Details</span>
                            </div>
                            {/* Inserted Date Highlight */}
                            <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-xl">
                                <FaCalendarAlt className="text-purple-400 text-xs" />
                                <span className="text-xs text-gray-300 font-medium">
                                    Data Inserted:{' '}
                                    <strong className="text-white">{insertionDate}</strong>
                                    {relativeInserted && (
                                        <span className="text-purple-300 ml-1 font-semibold">({relativeInserted})</span>
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Profile Info Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
                            <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800/60">
                                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block mb-1">
                                    Primary Mobile
                                </span>
                                <span className="text-gray-100 font-semibold font-mono text-sm">
                                    {student.mobile || '—'}
                                </span>
                            </div>

                            <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800/60">
                                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block mb-1">
                                    Secondary Mobile
                                </span>
                                <span className="text-gray-300 font-mono">
                                    {student.secondaryMobile || '—'}
                                </span>
                            </div>

                            <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800/60">
                                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block mb-1">
                                    Centre
                                </span>
                                <span className="text-gray-200 font-medium">
                                    {student.centre?.centreName || student.centreName || '—'}
                                </span>
                            </div>

                            <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800/60">
                                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block mb-1">
                                    Zone
                                </span>
                                <span className="text-purple-300 font-medium">
                                    {zoneName || student.zoneName || '—'}
                                </span>
                            </div>

                            <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800/60">
                                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block mb-1">
                                    School Name
                                </span>
                                <span className="text-gray-200 font-medium truncate block" title={student.school}>
                                    {student.school || '—'}
                                </span>
                            </div>

                            <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800/60">
                                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block mb-1">
                                    Board / Session
                                </span>
                                <span className="text-gray-300 font-medium">
                                    {student.board?.boardName || student.board?.boardCourse || student.board || '—'}
                                    {student.session?.sessionName ? ` • ${student.session.sessionName}` : ''}
                                </span>
                            </div>

                            <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800/60">
                                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block mb-1">
                                    Fee Status
                                </span>
                                <span className={`font-semibold uppercase ${student.paymentType === 'paid' ? 'text-emerald-400' : 'text-gray-400'}`}>
                                    {student.paymentType || 'Free'}
                                </span>
                            </div>

                            <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800/60">
                                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block mb-1">
                                    Exam Attendance
                                </span>
                                <span className={`font-semibold ${student.status === 'Present' ? 'text-emerald-400' : student.status === 'Absent' ? 'text-rose-400' : 'text-gray-400'}`}>
                                    {student.status || 'Not Marked'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Follow-Up KPI Summary Row ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        <div className="bg-gradient-to-br from-purple-950/40 to-gray-900 border border-purple-500/20 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total Calls Logged</p>
                                <p className="text-2xl font-black text-purple-300 mt-1">{totalCalls}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                                <FaHistory size={16} />
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-950/40 to-gray-900 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total Talk Time</p>
                                <p className="text-2xl font-black text-cyan-300 mt-1">{totalTalkTime}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                <FaClock size={16} />
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-950/40 to-gray-900 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Last Call Date</p>
                                <p className="text-sm font-bold text-emerald-300 mt-1">
                                    {latestCall ? formatDateOnly(latestCall.callDate || latestCall.createdAt) : 'Never'}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                <FaPhoneAlt size={14} />
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-950/40 to-gray-900 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Next Follow-Up</p>
                                <p className="text-sm font-bold text-amber-300 mt-1">
                                    {nextUpcoming ? formatDateOnly(nextUpcoming.nextFollowUpDate) : 'Not Scheduled'}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                                <FaRegCalendarCheck size={16} />
                            </div>
                        </div>
                    </div>

                    {/* ── All Follow-Up History Timeline ── */}
                    <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 shadow-inner">
                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-800">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center">
                                    <FaHistory size={14} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Full Communication History</h3>
                                    <p className="text-[11px] text-gray-400">All calls, discussions, and feedbacks in chronological order</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={fetchHistory}
                                disabled={loading}
                                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-gray-700"
                            >
                                <FaSync className={`${loading ? 'animate-spin text-purple-400' : ''}`} size={11} />
                                <span>Refresh</span>
                            </button>
                        </div>

                        {loading ? (
                            <div className="py-16 flex flex-col items-center justify-center gap-2.5 text-gray-400">
                                <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                <p className="text-xs font-medium">Loading history entries...</p>
                            </div>
                        ) : sortedHistory.length === 0 ? (
                            <div className="py-16 text-center flex flex-col items-center justify-center">
                                <div className="w-14 h-14 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-center text-gray-600 mb-2.5">
                                    <FaPhoneAlt size={20} className="opacity-40" />
                                </div>
                                <h4 className="text-sm font-bold text-gray-300">No Call History Yet</h4>
                                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                                    No follow-up calls have been recorded for {student.name}. Click the button below to log the first call.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowCallModal(true)}
                                    className="mt-3.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-500/20 cursor-pointer flex items-center gap-1.5"
                                >
                                    <FaPhoneAlt size={10} />
                                    <span>Log First Follow-Up Call</span>
                                </button>
                            </div>
                        ) : (
                            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-indigo-500 before:to-gray-800">
                                {sortedHistory.map((item, index) => {
                                    const fbColor = FEEDBACK_COLORS[item.feedback] || FEEDBACK_COLORS['Other'];
                                    const durationStr = formatDuration(item.callDuration);

                                    return (
                                        <div key={item._id || index} className="relative group">
                                            {/* Timeline Node Dot */}
                                            <div className="absolute -left-[27px] top-1.5 w-6 h-6 rounded-full bg-gray-950 border-2 border-purple-500 flex items-center justify-center text-purple-400 shadow-md shadow-purple-500/30 group-hover:scale-110 transition-transform">
                                                <FaPhone size={9} />
                                            </div>

                                            {/* History Entry Card */}
                                            <div className="bg-gray-950/80 border border-gray-800 hover:border-gray-700/80 rounded-2xl p-4 transition-all shadow-sm">
                                                {/* Header Row */}
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2.5 border-b border-gray-800/60">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="font-bold text-white text-xs flex items-center gap-1.5">
                                                            <FaRegClock className="text-purple-400 text-[11px]" />
                                                            {formatDateTime(item.callDate || item.createdAt)}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 font-mono">
                                                            ({getRelativeTime(item.callDate || item.createdAt)})
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {/* Feedback Badge */}
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${fbColor.bg} ${fbColor.text} ${fbColor.border}`}>
                                                            {item.feedback}
                                                        </span>

                                                        {/* Duration Badge */}
                                                        {durationStr && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium bg-gray-800 text-gray-300 border border-gray-700">
                                                                <FaClock size={9} className="text-gray-400" />
                                                                {durationStr}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Caller & Next Follow Up */}
                                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-3 text-gray-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <FaUser className="text-gray-500 text-[10px]" />
                                                        <span className="text-gray-300 font-medium">
                                                            {item.calledBy?.name || 'Staff Member'}
                                                        </span>
                                                        {item.calledBy?.role && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-purple-300 uppercase font-bold">
                                                                {item.calledBy.role}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {item.nextFollowUpDate && (
                                                        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold">
                                                            <FaRegCalendarCheck size={11} className="text-amber-400" />
                                                            <span>Next Call: {formatDateOnly(item.nextFollowUpDate)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Notes / Discussion Summary */}
                                                {item.notes ? (
                                                    <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-3 flex items-start gap-2 text-xs text-gray-200">
                                                        <FaStickyNote className="text-amber-400/80 text-xs shrink-0 mt-0.5" />
                                                        <p className="leading-relaxed whitespace-pre-wrap">{item.notes}</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-gray-600 italic">No notes provided for this call.</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Modal Footer ── */}
                <div className="px-6 py-4 bg-gray-950 border-t border-gray-800 flex items-center justify-between shrink-0">
                    <span className="text-xs text-gray-400">
                        {totalCalls} total follow-up interaction{totalCalls === 1 ? '' : 's'} recorded
                    </span>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowCallModal(true)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-500/20 cursor-pointer flex items-center gap-1.5"
                        >
                            <FaPhoneAlt size={10} />
                            <span>Log New Follow-Up</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Sub-modal: Call / Follow-Up modal on top of History */}
            {showCallModal && (
                <StudentFollowUpModal
                    student={student}
                    studentType="PNTSE"
                    onClose={() => {
                        setShowCallModal(false);
                        fetchHistory();
                        if (onFollowUpUpdated) onFollowUpUpdated();
                    }}
                />
            )}
        </div>
    );
};

export default PNTSEStudentHistoryModal;
