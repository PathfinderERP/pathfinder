import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    FaPhone, FaPhoneAlt, FaTimes, FaSearch, FaCalendarAlt, FaUser, FaBuilding,
    FaFilter, FaFileExcel, FaSync, FaChevronDown, FaCheck, FaClock,
    FaRegClock, FaGraduationCap, FaMapMarkerAlt, FaCommentDots,
    FaChevronLeft, FaChevronRight, FaRegCalendarCheck, FaStickyNote
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import StudentFollowUpModal from '../common/StudentFollowUpModal';

const API_URL = import.meta.env.VITE_API_URL;

const FEEDBACK_COLORS = {
    'Foundation class 6':  { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/40' },
    'Foundation class 7':  { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
    'Foundation class 8':  { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/40' },
    'Foundation class 9':  { bg: 'bg-blue-500/20',   text: 'text-blue-300',   border: 'border-blue-500/40' },
    'Foundation class 10': { bg: 'bg-cyan-500/20',   text: 'text-cyan-300',   border: 'border-cyan-500/40' },
    'Not Interested':      { bg: 'bg-rose-500/20',   text: 'text-rose-300',   border: 'border-rose-500/40' },
    'Neet 2 year':         { bg: 'bg-fuchsia-500/20',text: 'text-fuchsia-300',border: 'border-fuchsia-500/40' },
    'Neet 1 year':         { bg: 'bg-pink-500/20',   text: 'text-pink-300',   border: 'border-pink-500/40' },
    'JEE 2 year':          { bg: 'bg-sky-500/20',    text: 'text-sky-300',    border: 'border-sky-500/40' },
    'JEE 1 year':          { bg: 'bg-teal-500/20',   text: 'text-teal-300',   border: 'border-teal-500/40' },
    'No Response':         { bg: 'bg-amber-500/20',  text: 'text-amber-300',  border: 'border-amber-500/40' },
    'Call Back Later':     { bg: 'bg-emerald-500/20',text: 'text-emerald-300',border: 'border-emerald-500/40' },
    'Other':               { bg: 'bg-gray-700/60',   text: 'text-gray-300',   border: 'border-gray-600/60' },
};

const ALL_FEEDBACK_OPTIONS = [
    'Foundation class 6',
    'Foundation class 7',
    'Foundation class 8',
    'Foundation class 9',
    'Foundation class 10',
    'Not Interested',
    'Neet 2 year',
    'Neet 1 year',
    'JEE 2 year',
    'JEE 1 year',
    'No Response',
    'Call Back Later',
    'Other'
];

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
    if (secs === null || secs === undefined || secs === '' || isNaN(secs)) return '—';
    const s = Number(secs);
    if (s <= 0) return '—';
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (m === 0) return `${rem}s`;
    return `${m}m ${rem > 0 ? `${rem}s` : ''}`;
};

// Anchored multi-select dropdown matching PNTSE design system
const MultiSelectDropdown = ({ label, placeholder, options = [], selectedValues = [], onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        return options.filter(opt =>
            (opt.label || '').toLowerCase().includes(search.toLowerCase())
        );
    }, [options, search]);

    const toggleOption = (val) => {
        if (selectedValues.includes(val)) {
            onChange(selectedValues.filter(v => v !== val));
        } else {
            onChange([...selectedValues, val]);
        }
    };

    const handleSelectAll = (e) => {
        e.stopPropagation();
        onChange(filteredOptions.map(o => o.value));
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange([]);
    };

    let displayText = placeholder;
    if (selectedValues.length === 1) {
        const match = options.find(o => o.value === selectedValues[0]);
        displayText = match ? match.label : placeholder;
    } else if (selectedValues.length > 1) {
        displayText = `${selectedValues.length} Selected`;
    }

    return (
        <div className="relative min-w-[150px]" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-3 py-2 bg-gray-800/90 border rounded-xl text-xs text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    selectedValues.length > 0
                        ? 'border-purple-500/60 text-purple-200 bg-purple-950/20 shadow-sm shadow-purple-500/10'
                        : 'border-gray-700/80 text-gray-300 hover:border-gray-600'
                }`}
            >
                <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="truncate">{displayText}</span>
                </div>
                <FaChevronDown className={`text-[10px] text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-purple-400' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-60 max-w-[90vw] bg-gray-900 border border-gray-700/90 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md">
                    <div className="p-2 border-b border-gray-800 bg-gray-950/60">
                        <input
                            type="text"
                            placeholder={`Search ${label}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                            autoFocus
                        />
                        <div className="flex items-center justify-between mt-1.5 px-0.5 text-[10px]">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="text-purple-400 hover:text-purple-300 font-semibold transition cursor-pointer"
                            >
                                Select All
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                className="text-gray-500 hover:text-rose-400 font-semibold transition cursor-pointer"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto p-1 flex flex-col gap-0.5 custom-scrollbar">
                        {filteredOptions.length === 0 ? (
                            <div className="py-3 text-center text-xs text-gray-500">No options found</div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isChecked = selectedValues.includes(opt.value);
                                return (
                                    <div
                                        key={opt.value}
                                        onClick={() => toggleOption(opt.value)}
                                        className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition select-none ${
                                            isChecked
                                                ? 'bg-purple-500/15 text-purple-200 font-medium'
                                                : 'hover:bg-gray-800 text-gray-300'
                                        }`}
                                    >
                                        <span className="truncate pr-2">{opt.label}</span>
                                        <div
                                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition ${
                                                isChecked
                                                    ? 'bg-purple-600 border-purple-500 text-white'
                                                    : 'border-gray-600 bg-gray-800'
                                            }`}
                                        >
                                            {isChecked && <FaCheck size={8} />}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const PNTSEFollowUpsModal = ({ isOpen, onClose, dbCentres = [], dbZones = [], dbClasses = [] }) => {
    const [followUps, setFollowUps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        zone: [],
        centre: [],
        class: [],
        feedback: [],
        calledBy: [],
        dateType: 'callDate', // 'callDate' or 'nextFollowUpDate'
        datePreset: 'all',
        startDate: '',
        endDate: '',
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Call Modal child state
    const [callModalStudent, setCallModalStudent] = useState(null);

    const getHeaders = () => ({
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
    });

    const handleDatePresetChange = (preset) => {
        const now = new Date();
        const formatDate = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        const todayStr = formatDate(now);

        if (preset === 'custom') {
            setFilters(prev => ({ ...prev, datePreset: 'custom' }));
        } else if (preset === 'today') {
            setFilters(prev => ({ ...prev, datePreset: 'today', startDate: todayStr, endDate: todayStr }));
        } else if (preset === 'yesterday') {
            const y = new Date(now);
            y.setDate(y.getDate() - 1);
            const yStr = formatDate(y);
            setFilters(prev => ({ ...prev, datePreset: 'yesterday', startDate: yStr, endDate: yStr }));
        } else if (preset === 'last7') {
            const d = new Date(now);
            d.setDate(d.getDate() - 6);
            setFilters(prev => ({ ...prev, datePreset: 'last7', startDate: formatDate(d), endDate: todayStr }));
        } else if (preset === 'thisMonth') {
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            setFilters(prev => ({ ...prev, datePreset: 'thisMonth', startDate: formatDate(first), endDate: todayStr }));
        } else if (preset === 'lastMonth') {
            const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const last = new Date(now.getFullYear(), now.getMonth(), 0);
            setFilters(prev => ({ ...prev, datePreset: 'lastMonth', startDate: formatDate(first), endDate: formatDate(last) }));
        } else {
            setFilters(prev => ({ ...prev, datePreset: 'all', startDate: '', endDate: '' }));
        }
        setCurrentPage(1);
    };

    // Filter centres according to selected zones
    const availableCentres = useMemo(() => {
        if (!filters.zone || filters.zone.length === 0) return dbCentres;
        const selectedZoneObjs = dbZones.filter(z => filters.zone.includes(z._id));
        return dbCentres.filter(c =>
            selectedZoneObjs.some(z => (z.centres || []).some(zc => (zc._id || zc).toString() === c._id.toString()))
        );
    }, [dbCentres, dbZones, filters.zone]);

    // Fetch follow ups from backend
    const fetchFollowUps = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (search.trim()) params.append('search', search.trim());
            if (filters.zone.length > 0) params.append('zone', filters.zone.join(','));
            if (filters.centre.length > 0) params.append('centre', filters.centre.join(','));
            if (filters.class.length > 0) params.append('class', filters.class.join(','));
            if (filters.feedback.length > 0) params.append('feedback', filters.feedback.join(','));
            if (filters.calledBy.length > 0) params.append('calledBy', filters.calledBy.join(','));
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.dateType) params.append('dateType', filters.dateType);

            const res = await fetch(`${API_URL}/pntse/follow-ups?${params.toString()}`, {
                headers: getHeaders()
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setFollowUps(data.followUps || []);
            } else {
                setError(data.message || 'Failed to fetch follow-ups.');
            }
        } catch (err) {
            console.error('Fetch follow ups error:', err);
            setError('Server connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [search, filters]);

    useEffect(() => {
        if (isOpen) {
            fetchFollowUps();
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, fetchFollowUps]);

    // Distinct callers list for filter dropdown
    const callerOptions = useMemo(() => {
        const callerMap = new Map();
        followUps.forEach(fu => {
            if (fu.calledBy?._id && fu.calledBy?.name) {
                callerMap.set(fu.calledBy._id, {
                    value: fu.calledBy._id,
                    label: `${fu.calledBy.name} (${fu.calledBy.role || 'Staff'})`
                });
            }
        });
        return Array.from(callerMap.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [followUps]);

    // Calculate quick stats
    const stats = useMemo(() => {
        const total = followUps.length;
        const todayStr = new Date().toISOString().split('T')[0];

        let todayCalls = 0;
        let scheduledFuture = 0;
        const studentSet = new Set();

        followUps.forEach(fu => {
            if (fu.studentId) studentSet.add(fu.studentId.toString());
            if (fu.callDate && new Date(fu.callDate).toISOString().split('T')[0] === todayStr) {
                todayCalls++;
            }
            if (fu.nextFollowUpDate && new Date(fu.nextFollowUpDate) >= new Date()) {
                scheduledFuture++;
            }
        });

        return {
            total,
            todayCalls,
            scheduledFuture,
            uniqueStudents: studentSet.size
        };
    }, [followUps]);

    const hasActiveFilters = Boolean(
        search.trim() ||
        filters.zone.length > 0 ||
        filters.centre.length > 0 ||
        filters.class.length > 0 ||
        filters.feedback.length > 0 ||
        filters.calledBy.length > 0 ||
        filters.startDate ||
        filters.endDate ||
        filters.datePreset !== 'all'
    );

    const handleResetFilters = () => {
        setSearch('');
        setFilters({
            zone: [],
            centre: [],
            class: [],
            feedback: [],
            calledBy: [],
            dateType: 'callDate',
            datePreset: 'all',
            startDate: '',
            endDate: '',
        });
        setCurrentPage(1);
    };

    // Export Excel
    const handleExportExcel = () => {
        if (!followUps || followUps.length === 0) {
            alert('No follow-up records found to export.');
            return;
        }

        const rows = followUps.map((fu, idx) => {
            const st = fu.student || {};
            return {
                'Sl. No.': idx + 1,
                'Student Name': st.name || fu.studentName || '—',
                'Roll No.': st.rollNo || '—',
                'Mobile': st.mobile || '—',
                'Secondary Mobile': st.secondaryMobile || '—',
                'Class': st.class?.name || st.className || '—',
                'Course': st.course || '—',
                'School': st.school || '—',
                'Centre': fu.centreName || st.centre?.centreName || '—',
                'Zone': fu.zoneName || '—',
                'Call Date & Time': formatDateTime(fu.callDate),
                'Next Follow-Up Date': formatDateOnly(fu.nextFollowUpDate),
                'Feedback': fu.feedback || '—',
                'Call Duration': formatDuration(fu.callDuration),
                'Notes / Remarks': fu.notes || '—',
                'Called By': fu.calledBy?.name || fu.callerName || '—',
                'Caller Role': fu.calledBy?.role || 'Staff',
                'Logged At': formatDateTime(fu.createdAt)
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);

        // Column widths auto-fit
        const cols = Object.keys(rows[0] || {}).map(key => {
            const maxLen = Math.max(
                key.length,
                ...rows.map(r => String(r[key] ?? '').length)
            );
            return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
        });
        worksheet['!cols'] = cols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'PNTSE_FollowUps');
        XLSX.writeFile(workbook, `PNTSE_Follow_Ups_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Pagination
    const totalPages = Math.ceil(followUps.length / itemsPerPage) || 1;
    const paginatedFollowUps = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return followUps.slice(start, start + itemsPerPage);
    }, [followUps, currentPage, itemsPerPage]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-7xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-gray-100">

                {/* ── Modal Header ── */}
                <div className="px-6 py-4 bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-gray-900 border-b border-gray-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                            <FaPhone className="text-white text-base" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-xl font-bold text-white tracking-tight">PNTSE — Follow Ups</h2>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    {followUps.length} Records
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Pathfinder National Talent Search Examination • Student communication & follow-up logs
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={fetchFollowUps}
                            disabled={loading}
                            className="p-2.5 bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-gray-700 transition cursor-pointer flex items-center gap-1.5"
                            title="Refresh data"
                        >
                            <FaSync className={`${loading ? 'animate-spin text-purple-400' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-teal-500/20 cursor-pointer"
                            title="Export filtered records to Excel"
                        >
                            <FaFileExcel className="text-sm" />
                            <span>Export Excel</span>
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

                {/* ── Quick Stats Bar ── */}
                <div className="px-6 py-3.5 bg-gray-900/60 border-b border-gray-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                    <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total Follow-Ups</p>
                            <p className="text-2xl font-bold text-white mt-0.5">{stats.total}</p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                            <FaPhoneAlt size={13} />
                        </div>
                    </div>
                    <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Today's Calls</p>
                            <p className="text-2xl font-bold text-emerald-400 mt-0.5">{stats.todayCalls}</p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <FaClock size={13} />
                        </div>
                    </div>
                    <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Scheduled (Upcoming)</p>
                            <p className="text-2xl font-bold text-amber-400 mt-0.5">{stats.scheduledFuture}</p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <FaRegCalendarCheck size={14} />
                        </div>
                    </div>
                    <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Unique Students</p>
                            <p className="text-2xl font-bold text-cyan-400 mt-0.5">{stats.uniqueStudents}</p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                            <FaUser size={13} />
                        </div>
                    </div>
                </div>

                {/* ── Filters Section ── */}
                <div className="p-5 bg-gray-950 border-b border-gray-800/80 shrink-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[220px]">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                            <input
                                type="text"
                                placeholder="Search by student name, roll no, mobile, school..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-8 pr-3 py-2 bg-gray-800/90 border border-gray-700 rounded-xl text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all"
                            />
                        </div>

                        {/* Zone Filter */}
                        <MultiSelectDropdown
                            label="Zone"
                            placeholder="All Zones"
                            options={dbZones.map(z => ({ value: z._id, label: z.name }))}
                            selectedValues={filters.zone}
                            onChange={vals => {
                                setFilters(prev => ({ ...prev, zone: vals, centre: [] }));
                                setCurrentPage(1);
                            }}
                        />

                        {/* Centre Filter */}
                        <MultiSelectDropdown
                            label="Centre"
                            placeholder="All Centres"
                            options={availableCentres.map(c => ({ value: c._id, label: c.centreName || c.enterCode }))}
                            selectedValues={filters.centre}
                            onChange={vals => {
                                setFilters(prev => ({ ...prev, centre: vals }));
                                setCurrentPage(1);
                            }}
                        />

                        {/* Class Filter */}
                        <MultiSelectDropdown
                            label="Class"
                            placeholder="All Classes"
                            options={dbClasses.map(c => ({ value: c._id, label: c.name }))}
                            selectedValues={filters.class}
                            onChange={vals => {
                                setFilters(prev => ({ ...prev, class: vals }));
                                setCurrentPage(1);
                            }}
                        />

                        {/* Feedback Filter */}
                        <MultiSelectDropdown
                            label="Feedback"
                            placeholder="All Feedbacks"
                            options={ALL_FEEDBACK_OPTIONS.map(fb => ({ value: fb, label: fb }))}
                            selectedValues={filters.feedback}
                            onChange={vals => {
                                setFilters(prev => ({ ...prev, feedback: vals }));
                                setCurrentPage(1);
                            }}
                        />

                        {/* Telecaller Filter (if any) */}
                        {callerOptions.length > 0 && (
                            <MultiSelectDropdown
                                label="Called By"
                                placeholder="All Telecallers"
                                options={callerOptions}
                                selectedValues={filters.calledBy}
                                onChange={vals => {
                                    setFilters(prev => ({ ...prev, calledBy: vals }));
                                    setCurrentPage(1);
                                }}
                            />
                        )}

                        {/* Date Type Selector */}
                        <select
                            value={filters.dateType}
                            onChange={e => {
                                setFilters(p => ({ ...p, dateType: e.target.value }));
                                setCurrentPage(1);
                            }}
                            className="px-3 py-2 bg-gray-800/90 border border-gray-700 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-purple-500 transition cursor-pointer"
                        >
                            <option value="callDate">Call Date</option>
                            <option value="nextFollowUpDate">Next Follow-Up</option>
                        </select>

                        {/* Date Preset Selector */}
                        <select
                            value={filters.datePreset}
                            onChange={e => handleDatePresetChange(e.target.value)}
                            className="px-3 py-2 bg-gray-800/90 border border-gray-700 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-purple-500 transition cursor-pointer"
                        >
                            <option value="all">All Dates</option>
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="last7">Last 7 Days</option>
                            <option value="thisMonth">This Month</option>
                            <option value="lastMonth">Last Month</option>
                            <option value="custom">Custom Range</option>
                        </select>

                        {/* Custom Date Pickers */}
                        <div className="flex items-center gap-1.5 bg-gray-800/90 border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-gray-300">
                            <FaCalendarAlt className="text-purple-400 text-xs shrink-0" />
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={e => {
                                    setFilters(prev => ({ ...prev, datePreset: 'custom', startDate: e.target.value }));
                                    setCurrentPage(1);
                                }}
                                className="bg-transparent border-none text-xs text-gray-200 outline-none cursor-pointer [color-scheme:dark]"
                                title="Start Date"
                            />
                            <span className="text-gray-500 text-xs">to</span>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={e => {
                                    setFilters(prev => ({ ...prev, datePreset: 'custom', endDate: e.target.value }));
                                    setCurrentPage(1);
                                }}
                                className="bg-transparent border-none text-xs text-gray-200 outline-none cursor-pointer [color-scheme:dark]"
                                title="End Date"
                            />
                        </div>

                        {/* Clear Filters Button */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <FaTimes size={10} /> Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Data Table Content ── */}
                <div className="flex-1 overflow-auto p-5 custom-scrollbar">
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-400">
                            <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                            <p className="text-sm font-medium">Loading PNTSE Follow Ups...</p>
                        </div>
                    ) : error ? (
                        <div className="py-20 text-center">
                            <p className="text-rose-400 text-sm font-semibold">{error}</p>
                            <button
                                onClick={fetchFollowUps}
                                className="mt-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : followUps.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-600 mb-3 shadow-inner">
                                <FaPhoneAlt size={24} className="opacity-40" />
                            </div>
                            <h3 className="text-base font-bold text-gray-300">No PNTSE Follow-Ups Found</h3>
                            <p className="text-xs text-gray-500 mt-1 max-w-sm">
                                {hasActiveFilters
                                    ? 'No follow-up calls match your current filter selection. Try adjusting or clearing your filters.'
                                    : 'No follow-up calls have been recorded yet for PNTSE students. Use the Call button on any student to log a follow-up.'}
                            </p>
                            {hasActiveFilters && (
                                <button
                                    onClick={handleResetFilters}
                                    className="mt-4 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold transition"
                                >
                                    Clear All Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-900/60 shadow-inner">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead>
                                    <tr className="bg-gray-900/90 border-b border-gray-800 text-gray-400 font-semibold uppercase tracking-wider">
                                        <th className="px-4 py-3.5 text-center w-12">#</th>
                                        <th className="px-5 py-3.5">Student Details</th>
                                        <th className="px-4 py-3.5">Centre</th>
                                        <th className="px-4 py-3.5">Zone</th>
                                        <th className="px-4 py-3.5">Class / Course</th>
                                        <th className="px-4 py-3.5">Call Date</th>
                                        <th className="px-4 py-3.5">Next Follow-Up</th>
                                        <th className="px-4 py-3.5">Feedback</th>
                                        <th className="px-4 py-3.5">Duration</th>
                                        <th className="px-5 py-3.5 min-w-[200px]">Notes</th>
                                        <th className="px-4 py-3.5">Called By</th>
                                        <th className="px-4 py-3.5 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/60">
                                    {paginatedFollowUps.map((fu, idx) => {
                                        const sl = (currentPage - 1) * itemsPerPage + idx + 1;
                                        const st = fu.student || {};
                                        const fbStyle = FEEDBACK_COLORS[fu.feedback] || FEEDBACK_COLORS['Other'];

                                        return (
                                            <tr
                                                key={fu._id || idx}
                                                className="hover:bg-gray-800/40 transition-colors duration-150"
                                            >
                                                {/* Serial Number */}
                                                <td className="px-4 py-3 text-center text-gray-500 font-mono text-[11px]">
                                                    {sl}
                                                </td>

                                                {/* Student Name & Roll */}
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm shadow-purple-500/20">
                                                            {(st.name || fu.studentName || 'S').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-100 text-xs">
                                                                {st.name || fu.studentName || 'Unknown Student'}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="font-mono text-[11px] text-cyan-400 font-semibold">
                                                                    {st.rollNo || fu.rollNo || '—'}
                                                                </span>
                                                                <span className="text-[11px] text-gray-400">
                                                                    {st.mobile || fu.mobile || ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Centre */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5 text-gray-200">
                                                        <FaBuilding className="text-gray-500 text-[10px]" />
                                                        <span>{fu.centreName || st.centre?.centreName || '—'}</span>
                                                    </div>
                                                </td>

                                                {/* Zone */}
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-gray-800 text-gray-300 border border-gray-700">
                                                        <FaMapMarkerAlt className="text-purple-400 text-[9px]" />
                                                        {fu.zoneName || '—'}
                                                    </span>
                                                </td>

                                                {/* Class / Course */}
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <span className="font-medium text-gray-200">
                                                            {st.class?.name || st.className || '—'}
                                                        </span>
                                                        {st.course && (
                                                            <p className="text-[10px] text-gray-500 mt-0.5">{st.course}</p>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Call Date */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5 text-gray-300">
                                                        <FaRegClock className="text-gray-500 text-[10px]" />
                                                        <span>{formatDateTime(fu.callDate)}</span>
                                                    </div>
                                                </td>

                                                {/* Next Follow Up */}
                                                <td className="px-4 py-3">
                                                    {fu.nextFollowUpDate ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                                                            <FaRegCalendarCheck className="text-amber-400 text-[10px]" />
                                                            {formatDateOnly(fu.nextFollowUpDate)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-600 text-[11px]">—</span>
                                                    )}
                                                </td>

                                                {/* Feedback */}
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${fbStyle.bg} ${fbStyle.text} ${fbStyle.border}`}>
                                                        {fu.feedback}
                                                    </span>
                                                </td>

                                                {/* Call Duration */}
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-[11px] text-gray-400">
                                                        {formatDuration(fu.callDuration)}
                                                    </span>
                                                </td>

                                                {/* Notes / Remarks */}
                                                <td className="px-5 py-3 max-w-xs">
                                                    <div className="flex items-start gap-1.5 text-gray-300 text-xs">
                                                        {fu.notes ? (
                                                            <>
                                                                <FaStickyNote className="text-gray-500 text-[11px] mt-0.5 shrink-0" />
                                                                <span className="truncate max-w-[240px]" title={fu.notes}>
                                                                    {fu.notes}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-gray-600 italic">No notes</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Called By */}
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="font-medium text-gray-200">
                                                            {fu.callerName || fu.calledBy?.name || 'Staff'}
                                                        </p>
                                                        <p className="text-[10px] text-purple-400 uppercase tracking-wider">
                                                            {fu.calledBy?.role || 'Staff'}
                                                        </p>
                                                    </div>
                                                </td>

                                                {/* Action */}
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            // Student object to pass to StudentFollowUpModal
                                                            const studentTarget = st._id ? st : {
                                                                _id: fu.studentId,
                                                                name: fu.studentName || 'Student',
                                                                mobile: fu.mobile || '',
                                                                rollNo: fu.rollNo || ''
                                                            };
                                                            setCallModalStudent(studentTarget);
                                                        }}
                                                        className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 mx-auto shadow shadow-purple-500/20 cursor-pointer"
                                                        title="Log new call or view follow-up history"
                                                    >
                                                        <FaPhoneAlt size={10} />
                                                        <span>Call</span>
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

                {/* ── Modal Footer with Pagination ── */}
                <div className="px-6 py-3.5 bg-gray-950 border-t border-gray-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>
                            Showing {followUps.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
                            {Math.min(currentPage * itemsPerPage, followUps.length)} of {followUps.length} follow-ups
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Rows:</span>
                            <select
                                value={itemsPerPage}
                                onChange={e => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 outline-none cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition ${
                                    currentPage === 1
                                        ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                                        : 'border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer'
                                }`}
                            >
                                <FaChevronLeft size={9} />
                                <span>Prev</span>
                            </button>

                            <span className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 text-purple-300 rounded-lg text-xs font-bold">
                                {currentPage} / {totalPages}
                            </span>

                            <button
                                type="button"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition ${
                                    currentPage === totalPages
                                        ? 'border-gray-800 text-gray-600 cursor-not-allowed'
                                        : 'border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer'
                                }`}
                            >
                                <span>Next</span>
                                <FaChevronRight size={9} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Sub-modal: Call / Follow-Up modal on top of Follow-Ups list */}
            {callModalStudent && (
                <StudentFollowUpModal
                    student={callModalStudent}
                    studentType="PNTSE"
                    onClose={() => {
                        setCallModalStudent(null);
                        fetchFollowUps(); // Refresh follow-ups when modal closes
                    }}
                />
            )}
        </div>
    );
};

export default PNTSEFollowUpsModal;
