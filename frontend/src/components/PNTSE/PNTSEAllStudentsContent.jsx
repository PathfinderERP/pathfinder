import React, { useState, useEffect } from 'react';
import {
    FaSearch, FaFilter, FaDownload, FaEye, FaEdit, FaTrash,
    FaGraduationCap, FaUsers, FaTrophy, FaChartLine, FaSortUp, FaSortDown, FaSpinner
} from 'react-icons/fa';

const PNTSEAllStudentsContent = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        centre: '',
        class: '',
        status: '',
        session: '',
    });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const [students, setStudents] = useState([]);
    const [dbCentres, setDbCentres] = useState([]);
    const [dbClasses, setDbClasses] = useState([]);
    const [dbSessions, setDbSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);

    const statuses = ['Qualified', 'Appeared', 'Not Qualified'];

    // Load master data
    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const token = localStorage.getItem("token");
                const headers = { "Authorization": `Bearer ${token}` };

                const [centresRes, classesRes, sessionsRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/class`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers })
                ]);

                if (centresRes.ok) setDbCentres(await centresRes.json());
                if (classesRes.ok) setDbClasses(await classesRes.json());
                if (sessionsRes.ok) {
                    const data = await sessionsRes.json();
                    setDbSessions(Array.isArray(data) ? data : (data.sessions || []));
                }
            } catch (err) {
                console.error("Failed to load master data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMasterData();
    }, []);

    // Load PNTSE Students when filters or search query changes
    useEffect(() => {
        const fetchStudents = async () => {
            setStudentsLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = { "Authorization": `Bearer ${token}` };

                const params = new URLSearchParams();
                if (searchQuery) params.append('search', searchQuery);
                if (filters.centre) params.append('centre', filters.centre);
                if (filters.class) params.append('class', filters.class);
                if (filters.session) params.append('session', filters.session);
                if (filters.status) params.append('status', filters.status);

                const response = await fetch(`${import.meta.env.VITE_API_URL}/pntse/list?${params.toString()}`, { headers });
                if (response.ok) {
                    const data = await response.json();
                    setStudents(data);
                }
            } catch (err) {
                console.error("Failed to load PNTSE students", err);
            } finally {
                setStudentsLoading(false);
            }
        };

        const handler = setTimeout(() => {
            fetchStudents();
        }, 300); // Small debounce

        return () => clearTimeout(handler);
    }, [searchQuery, filters]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedStudents = [...students].sort((a, b) => {
        if (!sortConfig.key) return 0;
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle populated fields object
        if (sortConfig.key === 'class') {
            aVal = a.class?.name || '';
            bVal = b.class?.name || '';
        } else if (sortConfig.key === 'centre') {
            aVal = a.centre?.centreName || '';
            bVal = b.centre?.centreName || '';
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const stats = [
        { label: 'Total Students', value: students.length, icon: <FaUsers />, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10' },
        { label: 'Qualified', value: students.filter(s => s.status === 'Qualified').length, icon: <FaTrophy />, color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-500/10' },
        { label: 'Appeared', value: students.filter(s => s.status === 'Appeared').length, icon: <FaGraduationCap />, color: 'from-amber-500 to-yellow-500', bg: 'bg-amber-500/10' },
        { label: 'Avg. Score', value: students.length > 0 ? `${Math.round(students.reduce((a, b) => a + (b.score || 0), 0) / students.length)}%` : '0%', icon: <FaChartLine />, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10' },
    ];

    const getStatusBadge = (status) => {
        const map = {
            'Qualified': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
            'Appeared': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
            'Not Qualified': 'bg-red-500/20 text-red-400 border border-red-500/30',
        };
        return map[status] || 'bg-gray-500/20 text-gray-400';
    };

    const SortIcon = ({ field }) => {
        if (sortConfig.key !== field) return <FaSortUp className="opacity-30" />;
        return sortConfig.direction === 'asc' ? <FaSortUp className="text-cyan-400" /> : <FaSortDown className="text-cyan-400" />;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <FaSpinner className="text-4xl text-cyan-400 animate-spin" />
                    <p className="text-sm text-gray-400">Loading PNTSE console...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <FaGraduationCap className="text-white text-lg" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">PNTSE — All Students</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Pathfinder National Talent Search Examination</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all duration-200 group">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center text-lg`} style={{ color: 'transparent' }}>
                                <span className={`bg-gradient-to-br ${stat.color} bg-clip-text text-transparent text-xl`}>{stat.icon}</span>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{stat.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters Row */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
                <div className="flex flex-wrap gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[220px]">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                        <input
                            type="text"
                            placeholder="Search by name, roll no, mobile..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        />
                    </div>

                    {/* Centre Filter */}
                    <select
                        value={filters.centre}
                        onChange={e => setFilters(p => ({ ...p, centre: e.target.value }))}
                        className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer min-w-[140px]"
                    >
                        <option value="">All Centres</option>
                        {dbCentres.map(c => <option key={c._id} value={c._id}>{c.centreName || c.enterCode}</option>)}
                    </select>

                    {/* Class Filter */}
                    <select
                        value={filters.class}
                        onChange={e => setFilters(p => ({ ...p, class: e.target.value }))}
                        className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer min-w-[130px]"
                    >
                        <option value="">All Classes</option>
                        {dbClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={filters.status}
                        onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                        className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer min-w-[150px]"
                    >
                        <option value="">All Statuses</option>
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    {/* Session Filter */}
                    <select
                        value={filters.session}
                        onChange={e => setFilters(p => ({ ...p, session: e.target.value }))}
                        className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer min-w-[130px]"
                    >
                        <option value="">All Sessions</option>
                        {dbSessions.map(s => <option key={s._id} value={s._id}>{s.sessionName}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden relative">
                {studentsLoading && (
                    <div className="absolute inset-0 bg-gray-950/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <FaSpinner className="text-3xl text-cyan-400 animate-spin" />
                    </div>
                )}

                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <h2 className="text-sm font-semibold text-white">
                        PNTSE Students
                        <span className="ml-2 text-xs text-gray-400 font-normal">{sortedStudents.length} record(s)</span>
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-800/60">
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Sl.</th>
                                <th
                                    className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400 transition-colors"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-1.5">Student Name <SortIcon field="name" /></div>
                                </th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Roll No.</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Class</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Centre</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Mobile</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Course</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid Status</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Exam Tag</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {sortedStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-16 text-gray-500">
                                        <FaGraduationCap className="text-4xl mx-auto mb-3 opacity-30" />
                                        <p>No students found</p>
                                    </td>
                                </tr>
                            ) : sortedStudents.map((student, idx) => (
                                <tr key={student._id} className="hover:bg-gray-800/40 transition-colors duration-150">
                                    <td className="px-5 py-4 text-gray-400">{idx + 1}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {student.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-gray-100">{student.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-cyan-400 font-mono text-xs font-semibold">{student.rollNo}</td>
                                    <td className="px-5 py-4 text-gray-300">{student.class?.name || student.class}</td>
                                    <td className="px-5 py-4 text-gray-300">{student.centre?.centreName || student.centre?.enterCode || student.centre}</td>
                                    <td className="px-5 py-4 text-gray-300">{student.mobile}</td>
                                    <td className="px-5 py-4 text-gray-300">{student.course}</td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${student.paymentType === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                            {student.paymentType} {student.paymentType === 'paid' && `(Rs. ${student.amountPaid})`}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30">
                                            {student.examTag?.name || '—'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PNTSEAllStudentsContent;
