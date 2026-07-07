import React, { useState } from 'react';
import {
    FaSearch, FaFilter, FaDownload, FaEye, FaEdit, FaTrash,
    FaGraduationCap, FaUsers, FaTrophy, FaChartLine, FaSortUp, FaSortDown
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

    // Demo data
    const students = [
        { id: 1, name: 'Aarav Sharma', rollNo: 'PNTSE-2025-001', class: '10th', centre: 'Lucknow', mobile: '9876543210', score: 95, rank: 1, status: 'Qualified', session: '2025-26' },
        { id: 2, name: 'Priya Verma', rollNo: 'PNTSE-2025-002', class: '9th', centre: 'Kanpur', mobile: '9876543211', score: 88, rank: 5, status: 'Qualified', session: '2025-26' },
        { id: 3, name: 'Rohit Singh', rollNo: 'PNTSE-2025-003', class: '10th', centre: 'Lucknow', mobile: '9876543212', score: 72, rank: 18, status: 'Appeared', session: '2025-26' },
        { id: 4, name: 'Sneha Gupta', rollNo: 'PNTSE-2025-004', class: '8th', centre: 'Varanasi', mobile: '9876543213', score: 91, rank: 3, status: 'Qualified', session: '2025-26' },
        { id: 5, name: 'Amit Kumar', rollNo: 'PNTSE-2025-005', class: '9th', centre: 'Agra', mobile: '9876543214', score: 65, rank: 32, status: 'Not Qualified', session: '2025-26' },
        { id: 6, name: 'Nisha Patel', rollNo: 'PNTSE-2025-006', class: '10th', centre: 'Kanpur', mobile: '9876543215', score: 85, rank: 8, status: 'Qualified', session: '2025-26' },
        { id: 7, name: 'Vikram Yadav', rollNo: 'PNTSE-2025-007', class: '8th', centre: 'Lucknow', mobile: '9876543216', score: 78, rank: 14, status: 'Appeared', session: '2025-26' },
    ];

    const centres = ['Lucknow', 'Kanpur', 'Varanasi', 'Agra'];
    const classes = ['8th', '9th', '10th'];
    const statuses = ['Qualified', 'Appeared', 'Not Qualified'];
    const sessions = ['2025-26', '2024-25', '2023-24'];

    const filteredStudents = students.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.mobile.includes(searchQuery);
        const matchCentre = !filters.centre || s.centre === filters.centre;
        const matchClass = !filters.class || s.class === filters.class;
        const matchStatus = !filters.status || s.status === filters.status;
        const matchSession = !filters.session || s.session === filters.session;
        return matchSearch && matchCentre && matchClass && matchStatus && matchSession;
    });

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedStudents = [...filteredStudents].sort((a, b) => {
        if (!sortConfig.key) return 0;
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const stats = [
        { label: 'Total Students', value: students.length, icon: <FaUsers />, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10' },
        { label: 'Qualified', value: students.filter(s => s.status === 'Qualified').length, icon: <FaTrophy />, color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-500/10' },
        { label: 'Appeared', value: students.filter(s => s.status === 'Appeared').length, icon: <FaGraduationCap />, color: 'from-amber-500 to-yellow-500', bg: 'bg-amber-500/10' },
        { label: 'Avg. Score', value: `${Math.round(students.reduce((a, b) => a + b.score, 0) / students.length)}%`, icon: <FaChartLine />, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10' },
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
                            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center text-lg bg-gradient-to-br ${stat.color} bg-clip-text`} style={{ color: 'transparent', backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}>
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
                        {centres.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* Class Filter */}
                    <select
                        value={filters.class}
                        onChange={e => setFilters(p => ({ ...p, class: e.target.value }))}
                        className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer min-w-[130px]"
                    >
                        <option value="">All Classes</option>
                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
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
                        {sessions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    {/* Export */}
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-cyan-500/20 ml-auto">
                        <FaDownload className="text-xs" />
                        Export
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
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
                                <th
                                    className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400 transition-colors"
                                    onClick={() => handleSort('score')}
                                >
                                    <div className="flex items-center gap-1.5">Score <SortIcon field="score" /></div>
                                </th>
                                <th
                                    className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400 transition-colors"
                                    onClick={() => handleSort('rank')}
                                >
                                    <div className="flex items-center gap-1.5">Rank <SortIcon field="rank" /></div>
                                </th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
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
                                <tr key={student.id} className="hover:bg-gray-800/40 transition-colors duration-150">
                                    <td className="px-5 py-4 text-gray-400">{idx + 1}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {student.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-gray-100">{student.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-gray-300 font-mono text-xs">{student.rollNo}</td>
                                    <td className="px-5 py-4 text-gray-300">{student.class}</td>
                                    <td className="px-5 py-4 text-gray-300">{student.centre}</td>
                                    <td className="px-5 py-4 text-gray-300">{student.mobile}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 rounded-full bg-gray-700 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                                    style={{ width: `${student.score}%` }}
                                                />
                                            </div>
                                            <span className="text-gray-200 font-medium">{student.score}%</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${student.rank <= 3 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-gray-300'}`}>
                                            #{student.rank}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusBadge(student.status)}`}>
                                            {student.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <button className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-cyan-500/20 hover:text-cyan-400 text-gray-400 flex items-center justify-center transition-all">
                                                <FaEye className="text-xs" />
                                            </button>
                                            <button className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-blue-500/20 hover:text-blue-400 text-gray-400 flex items-center justify-center transition-all">
                                                <FaEdit className="text-xs" />
                                            </button>
                                        </div>
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
