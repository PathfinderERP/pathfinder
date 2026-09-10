import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    FaPhone, FaTimes, FaHistory, FaCalendarAlt, FaUser,
    FaSpinner, FaCheckCircle, FaChevronDown, FaStickyNote,
    FaRegClock, FaPhoneSlash
} from 'react-icons/fa';
import { MdCallMade } from 'react-icons/md';

const API_URL = import.meta.env.VITE_API_URL;

const FEEDBACK_OPTIONS = [
    'Foundation class 6',
    'Foundation class 7',
    'Foundation class 8',
    'Foundation class 9',
    'Foundation class 10',
    'Not Interested',
    'No Response',
    'Call Back Later',
    'Other',
];

const FEEDBACK_COLORS = {
    'Foundation class 6':  { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/40' },
    'Foundation class 7':  { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
    'Foundation class 8':  { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/40' },
    'Foundation class 9':  { bg: 'bg-blue-500/20',   text: 'text-blue-300',   border: 'border-blue-500/40' },
    'Foundation class 10': { bg: 'bg-cyan-500/20',   text: 'text-cyan-300',   border: 'border-cyan-500/40' },
    'Not Interested':      { bg: 'bg-rose-500/20',   text: 'text-rose-300',   border: 'border-rose-500/40' },
    'No Response':         { bg: 'bg-amber-500/20',  text: 'text-amber-300',  border: 'border-amber-500/40' },
    'Call Back Later':     { bg: 'bg-emerald-500/20',text: 'text-emerald-300',border: 'border-emerald-500/40' },
    'Other':               { bg: 'bg-gray-700/60',   text: 'text-gray-300',   border: 'border-gray-600/60' },
};

const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
});

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDuration = (secs) => {
    if (!secs && secs !== 0) return null;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${String(s).padStart(2, '0')}s`;
};

const groupByDate = (entries) => {
    const groups = {};
    entries.forEach(e => {
        const key = new Date(e.callDate).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
        });
        if (!groups[key]) groups[key] = [];
        groups[key].push(e);
    });
    return groups;
};

const FeedbackBadge = ({ value }) => {
    const c = FEEDBACK_COLORS[value] || FEEDBACK_COLORS['Other'];
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
            {value}
        </span>
    );
};

const StudentFollowUpModal = ({ student, studentType, onClose }) => {
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    // Form state
    const [feedback, setFeedback] = useState('');
    const [notes, setNotes] = useState('');
    const [nextFollowUpDate, setNextFollowUpDate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // ── Call Timer State ──
    const [callActive, setCallActive] = useState(false);        // call in progress?
    const [callSeconds, setCallSeconds] = useState(0);          // live counter
    const [capturedDuration, setCapturedDuration] = useState(null); // seconds after end
    const timerRef = useRef(null);

    const today = new Date().toISOString().split('T')[0];
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // ── Timer helpers ──
    const startCall = () => {
        setCallActive(true);
        setCallSeconds(0);
        setCapturedDuration(null);
        timerRef.current = setInterval(() => {
            setCallSeconds(prev => prev + 1);
        }, 1000);
    };

    const endCall = () => {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setCallActive(false);
        setCapturedDuration(callSeconds);   // lock in the duration
        setCallSeconds(0);
    };

    // cleanup on unmount
    useEffect(() => () => clearInterval(timerRef.current), []);

    // ── Fetch history ──
    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await fetch(
                `${API_URL}/follow-up/${studentType}/${student._id}`,
                { headers: getHeaders() }
            );
            const data = await res.json();
            if (data.success) setHistory(data.followUps || []);
        } catch (err) {
            console.error('Failed to fetch follow-up history', err);
        } finally {
            setHistoryLoading(false);
        }
    }, [student._id, studentType]);

    useEffect(() => {
        fetchHistory();
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [fetchHistory]);

    // ── Submit ──
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!feedback) { setSubmitError('Please select a feedback option.'); return; }
        setSubmitError('');
        setSubmitting(true);
        try {
            const body = {
                studentId: student._id,
                studentType,
                feedback,
                notes,
                nextFollowUpDate: nextFollowUpDate || null,
                callDuration: capturedDuration,   // null if call button wasn't used
            };
            const res = await fetch(`${API_URL}/follow-up/`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSubmitSuccess(true);
                setFeedback('');
                setNotes('');
                setNextFollowUpDate('');
                setCapturedDuration(null);
                fetchHistory();
                setTimeout(() => setSubmitSuccess(false), 2500);
            } else {
                setSubmitError(data.message || 'Failed to save. Please try again.');
            }
        } catch {
            setSubmitError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Format live counter as MM:SS
    const liveTimer = (() => {
        const m = Math.floor(callSeconds / 60);
        const s = callSeconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    })();

    const grouped = groupByDate(history);
    const dateKeys = Object.keys(grouped);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-gray-950 border border-gray-800/80 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-950/80 to-indigo-950/80 border-b border-gray-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <FaPhone className="text-white text-base" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white leading-tight">Call & Follow-Up</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-semibold text-purple-300">{student.name}</span>
                                <span className="text-gray-600 text-xs">•</span>
                                <span className="text-xs text-gray-400 font-mono">{student.mobile}</span>
                                {student.rollNo && (
                                    <>
                                        <span className="text-gray-600 text-xs">•</span>
                                        <span className="text-[11px] text-indigo-400 font-mono">{student.rollNo}</span>
                                    </>
                                )}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ml-1 ${
                                    studentType === 'PMO'
                                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                }`}>{studentType}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Left — Log a Call */}
                    <div className="w-full md:w-[380px] shrink-0 border-r border-gray-800 flex flex-col">
                        <div className="px-5 pt-5 pb-2 shrink-0">
                            <div className="flex items-center gap-2 mb-4">
                                <MdCallMade className="text-emerald-400 text-lg" />
                                <h3 className="text-sm font-bold text-white">Log a Call</h3>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-5 pb-5 gap-4 overflow-y-auto">

                            {/* ── Call Button ── */}
                            {!callActive ? (
                                <button
                                    type="button"
                                    onClick={startCall}
                                    className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl font-bold text-sm transition-all select-none
                                        bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500
                                        text-white shadow-lg shadow-emerald-500/25 active:scale-95"
                                >
                                    <FaPhone className="text-base" />
                                    {capturedDuration !== null
                                        ? `Call Again  (last: ${formatDuration(capturedDuration)})`
                                        : `Call ${student.mobile}`}
                                </button>
                            ) : (
                                /* Active call — red pulsing end-call button + timer */
                                <div className="flex flex-col items-center gap-2">
                                    {/* Live timer display */}
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                        </span>
                                        <span className="font-mono font-bold text-2xl tracking-widest text-emerald-300">
                                            {liveTimer}
                                        </span>
                                        <span className="text-xs text-emerald-600">in call</span>
                                    </div>

                                    {/* End Call button */}
                                    <button
                                        type="button"
                                        onClick={endCall}
                                        className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl font-bold text-sm transition-all select-none
                                            bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500
                                            text-white shadow-lg shadow-rose-500/30 active:scale-95 animate-pulse"
                                    >
                                        <FaPhoneSlash className="text-base" />
                                        End Call
                                    </button>
                                </div>
                            )}

                            {/* Captured duration badge */}
                            {capturedDuration !== null && !callActive && (
                                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2 text-xs text-emerald-400">
                                    <FaRegClock size={12} />
                                    <span>Call duration captured: <strong>{formatDuration(capturedDuration)}</strong></span>
                                </div>
                            )}

                            {/* Feedback */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                    Feedback <span className="text-rose-400">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={feedback}
                                        onChange={e => { setFeedback(e.target.value); setSubmitError(''); }}
                                        className="w-full appearance-none bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-3 py-2.5 text-sm text-gray-200 outline-none transition cursor-pointer pr-8"
                                    >
                                        <option value="">— Select outcome —</option>
                                        {FEEDBACK_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none" />
                                </div>
                                {feedback && <div className="mt-2"><FeedbackBadge value={feedback} /></div>}
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                    <FaStickyNote className="inline mr-1 text-amber-400" />
                                    Notes / Remarks
                                </label>
                                <textarea
                                    rows={4}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Enter any notes from the call..."
                                    className="w-full bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-3 py-2.5 text-sm text-gray-200 outline-none resize-none transition placeholder-gray-600"
                                />
                            </div>

                            {/* Next Follow-Up Date (optional) */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                    <FaCalendarAlt className="inline mr-1 text-purple-400" />
                                    Next Follow-Up Date{' '}
                                    <span className="text-gray-600 font-normal normal-case">(optional)</span>
                                </label>
                                <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 focus-within:border-purple-500 rounded-xl px-3 py-2.5 transition">
                                    <FaCalendarAlt className="text-purple-400 text-xs shrink-0" />
                                    <input
                                        type="date"
                                        value={nextFollowUpDate}
                                        min={today}
                                        onChange={e => setNextFollowUpDate(e.target.value)}
                                        className="flex-1 bg-transparent text-sm text-gray-200 outline-none cursor-pointer [color-scheme:dark]"
                                    />
                                    {nextFollowUpDate && (
                                        <button type="button" onClick={() => setNextFollowUpDate('')} className="text-gray-500 hover:text-gray-300">
                                            <FaTimes size={11} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Errors / success */}
                            {submitError && (
                                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{submitError}</p>
                            )}
                            {submitSuccess && (
                                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                                    <FaCheckCircle /> Call logged successfully!
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={submitting || callActive}
                                className="w-full mt-auto py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                                {submitting ? 'Saving...' : 'Save Call Log'}
                            </button>

                            {callActive && (
                                <p className="text-[11px] text-amber-500 text-center -mt-2">
                                    End the call before saving.
                                </p>
                            )}

                            <p className="text-[11px] text-gray-600 text-center">
                                Logged as: <span className="text-gray-400">{currentUser.name || currentUser.email || 'You'}</span>
                            </p>
                        </form>
                    </div>

                    {/* Right — Follow-Up History */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="px-5 pt-5 pb-2 flex items-center gap-2 shrink-0 border-b border-gray-800/60">
                            <FaHistory className="text-purple-400 text-base" />
                            <h3 className="text-sm font-bold text-white">Follow-Up History</h3>
                            {!historyLoading && (
                                <span className="ml-auto text-[11px] text-gray-500">
                                    {history.length} {history.length === 1 ? 'entry' : 'entries'}
                                </span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                            {historyLoading ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-3">
                                    <FaSpinner className="animate-spin text-2xl text-purple-400" />
                                    <p className="text-xs text-gray-500">Loading history...</p>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
                                        <FaPhone className="text-2xl text-gray-700" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-400">No follow-ups yet</p>
                                        <p className="text-xs text-gray-600 mt-1">Log the first call using the form on the left.</p>
                                    </div>
                                </div>
                            ) : (
                                dateKeys.map(dateKey => (
                                    <div key={dateKey}>
                                        {/* Day label */}
                                        <div className="flex items-center gap-2 mb-2.5">
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{dateKey}</span>
                                            <div className="flex-1 h-px bg-gray-800" />
                                            <span className="text-[10px] text-gray-600">
                                                {grouped[dateKey].length} call{grouped[dateKey].length > 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        <div className="space-y-2.5">
                                            {grouped[dateKey].map(entry => (
                                                <div
                                                    key={entry._id}
                                                    className="bg-gray-900/70 border border-gray-800 hover:border-gray-700 rounded-xl p-3.5 transition"
                                                >
                                                    {/* Top row */}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <FeedbackBadge value={entry.feedback} />
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {/* Call duration badge */}
                                                            {entry.callDuration != null && (
                                                                <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                                                    <FaPhone size={9} />
                                                                    {formatDuration(entry.callDuration)}
                                                                </span>
                                                            )}
                                                            <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                                                                <FaRegClock size={10} />
                                                                {new Date(entry.callDate).toLocaleTimeString('en-IN', {
                                                                    hour: '2-digit', minute: '2-digit', hour12: true
                                                                })}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Notes */}
                                                    {entry.notes && (
                                                        <p className="text-xs text-gray-300 mt-2 leading-relaxed whitespace-pre-line">{entry.notes}</p>
                                                    )}

                                                    {/* Next follow-up */}
                                                    {entry.nextFollowUpDate && (
                                                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-purple-400">
                                                            <FaCalendarAlt size={10} />
                                                            <span>Next: {formatDate(entry.nextFollowUpDate)}</span>
                                                        </div>
                                                    )}

                                                    {/* Caller */}
                                                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                                                        <FaUser size={10} />
                                                        <span>{entry.calledBy?.name || entry.calledBy?.email || 'Staff'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentFollowUpModal;
