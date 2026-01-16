
import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaDownload, FaChevronLeft, FaChevronDown, FaFilter, FaChartBar, FaTable, FaTh, FaUserGraduate, FaChevronRight } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area
} from 'recharts';

const BoardReport = () => {
    const navigate = useNavigate();
    // ---- State ----
    const [loading, setLoading] = useState(false);
    const [boardStats, setBoardStats] = useState([]);
    const [subjectStats, setSubjectStats] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [centreStats, setCentreStats] = useState([]);

    // Master Data
    const [centres, setCentres] = useState([]);
    const [boards, setBoards] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [sessions, setSessions] = useState([]);

    // Filters
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedBoards, setSelectedBoards] = useState([]);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [selectedSession, setSelectedSession] = useState("");
    const [timePeriod, setTimePeriod] = useState("This Year");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Dropdowns
    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const [isBoardDropdownOpen, setIsBoardDropdownOpen] = useState(false);
    const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);

    const centreDropdownRef = useRef(null);
    const boardDropdownRef = useRef(null);
    const subjectDropdownRef = useRef(null);

    useEffect(() => {
        fetchMasterData();
        const handleClickOutside = (event) => {
            if (centreDropdownRef.current && !centreDropdownRef.current.contains(event.target)) setIsCentreDropdownOpen(false);
            if (boardDropdownRef.current && !boardDropdownRef.current.contains(event.target)) setIsBoardDropdownOpen(false);
            if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target)) setIsSubjectDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (timePeriod === "Custom" && (!startDate || !endDate)) return;
        fetchReportData();
    }, [selectedCentres, selectedBoards, selectedSubjects, selectedSession, timePeriod, startDate, endDate]);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            const [centreRes, boardRes, subjectRes, sessionRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/board`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/subject`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers })
            ]);

            if (centreRes.ok) setCentres(await centreRes.json());
            if (boardRes.ok) setBoards(await boardRes.json());
            if (subjectRes.ok) setSubjects(await subjectRes.json());
            if (sessionRes.ok) {
                const sessionList = await sessionRes.json();
                setSessions(sessionList);
                if (sessionList.length > 0 && !selectedSession) setSelectedSession(sessionList[0].sessionName);
            }
        } catch (error) {
            console.error("Error fetching master data", error);
        }
    };

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            if (timePeriod === "Custom") {
                params.append("startDate", startDate);
                params.append("endDate", endDate);
            } else {
                const currentYear = new Date().getFullYear();
                params.append("year", timePeriod === "This Year" ? currentYear : currentYear - 1);
            }
            if (selectedSession) params.append("session", selectedSession);
            if (selectedCentres.length > 0) params.append("centreIds", selectedCentres.join(","));
            if (selectedBoards.length > 0) params.append("boardIds", selectedBoards.join(","));
            if (selectedSubjects.length > 0) params.append("subjectIds", selectedSubjects.join(","));

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/board-report?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                setBoardStats(result.boardStats || []);
                setSubjectStats(result.subjectStats || []);
                setTrendData(result.trendData || []);
                setCentreStats(result.centreStats || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadExcel = () => {
        const wb = XLSX.utils.book_new();
        const boardHeaders = ["Board Name", "Enrollments", "Revenue"];
        const boardData = boardStats.map(b => [b.name || "N/A", b.enrollments || 0, b.revenue || 0]);
        const wsBoard = XLSX.utils.aoa_to_sheet([["Board Wise Summary"], [], boardHeaders, ...boardData]);
        XLSX.utils.book_append_sheet(wb, wsBoard, "Board Analysis");

        const subjectHeaders = ["Subject Name", "Total Admissions", "Revenue Contribution"];
        const subjectData = subjectStats.map(s => [s.subjectName || "N/A", s.count || 0, s.revenue || 0]);
        const wsSubject = XLSX.utils.aoa_to_sheet([["Subject Wise Analysis"], [], subjectHeaders, ...subjectData]);
        XLSX.utils.book_append_sheet(wb, wsSubject, "Subject Analysis");

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(data, `Board_Analysis_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    // Stats calculations
    const totalAdmissions = boardStats.reduce((acc, b) => acc + (b.enrollments || 0), 0);
    const totalRevenue = boardStats.reduce((acc, b) => acc + (b.revenue || 0), 0);
    const popularBoard = boardStats.length > 0 ? [...boardStats].sort((a, b) => b.enrollments - a.enrollments)[0].name : "N/A";

    return (
        <Layout activePage="Sales">
            <div className="space-y-6 animate-fade-in pb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
                            title="Go Back"
                        >
                            <FaChevronLeft size={18} />
                        </button>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white-800 dark:text-gray-100">Board Analysis</h1>
                        {selectedBoards.length > 0 && (
                            <button
                                onClick={() => setSelectedBoards([])}
                                className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-black flex items-center gap-2 hover:bg-blue-200 transition-all shadow-sm"
                            >
                                <FaFilter size={8} /> CLEAR BOARD FILTER
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleDownloadExcel} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all text-sm font-bold uppercase tracking-widest active:scale-95">
                            <FaDownload /> EXPORT EXCEL
                        </button>
                    </div>
                </div>

                {/* Performance Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#1a1f24] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <FaUserGraduate size={40} className="text-cyan-500" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Admissions</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">{totalAdmissions}</p>
                    </div>
                    <div className="bg-white dark:bg-[#1a1f24] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <FaChartBar size={40} className="text-green-500" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Gross Revenue</p>
                        <p className="text-2xl font-black text-green-600">₹{totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-[#1a1f24] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <FaFilter size={40} className="text-purple-500" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Popular Board</p>
                        <p className="text-2xl font-black text-purple-600 truncate" title={popularBoard}>{popularBoard}</p>
                    </div>
                    <div className="bg-white dark:bg-[#1a1f24] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <FaTh size={40} className="text-orange-500" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Unique Subjects</p>
                        <p className="text-2xl font-black text-orange-600">{subjectStats.length}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-[#1a1f24] p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <div className="flex flex-wrap gap-4 items-center">
                        <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="h-10 px-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl text-xs outline-none font-bold text-gray-700 dark:text-gray-300">
                            <option value="">All Sessions</option>
                            {sessions.map(s => <option key={s._id} value={s.sessionName}>{s.sessionName}</option>)}
                        </select>

                        <div className="relative" ref={centreDropdownRef}>
                            <button onClick={() => setIsCentreDropdownOpen(!isCentreDropdownOpen)} className="h-10 px-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl text-xs flex items-center justify-between gap-3 min-w-[160px] font-bold text-gray-700 dark:text-gray-300">
                                {selectedCentres.length > 0 ? `${selectedCentres.length} Centres` : "All Centres"}
                                <FaChevronDown size={8} />
                            </button>
                            {isCentreDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#1c2128] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto p-2 border-t-4 border-t-cyan-500">
                                    {centres.map(c => (
                                        <div key={c._id} className="flex items-center gap-3 p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer group" onClick={() => setSelectedCentres(prev => prev.includes(c._id) ? prev.filter(id => id !== c._id) : [...prev, c._id])}>
                                            <input type="checkbox" checked={selectedCentres.includes(c._id)} readOnly className="rounded border-gray-300 dark:border-gray-700 text-cyan-600 w-4 h-4" />
                                            <span className="text-xs font-bold uppercase text-gray-700 dark:text-white group-hover:text-cyan-500 transition-colors">{c.centreName}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="relative" ref={boardDropdownRef}>
                            <button onClick={() => setIsBoardDropdownOpen(!isBoardDropdownOpen)} className="h-10 px-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl text-xs flex items-center justify-between gap-3 min-w-[160px] font-bold text-gray-700 dark:text-gray-300">
                                {selectedBoards.length > 0 ? `${selectedBoards.length} Boards` : "All Boards"}
                                <FaChevronDown size={8} />
                            </button>
                            {isBoardDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#1c2128] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto p-2 border-t-4 border-t-purple-500">
                                    {boards.map(b => (
                                        <div key={b._id} className="flex items-center gap-3 p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-xl cursor-pointer group" onClick={() => setSelectedBoards(prev => prev.includes(b._id) ? prev.filter(id => id !== b._id) : [...prev, b._id])}>
                                            <input type="checkbox" checked={selectedBoards.includes(b._id)} readOnly className="rounded border-gray-300 dark:border-gray-700 text-purple-600 w-4 h-4" />
                                            <span className="text-xs font-bold uppercase text-gray-700 dark:text-white group-hover:text-purple-500 transition-colors">{b.boardCourse}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl p-1 px-3">
                            <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase outline-none text-gray-500 dark:text-gray-400">
                                <option value="This Year">This Year</option>
                                <option value="Last Year">Last Year</option>
                                <option value="Custom">Custom</option>
                            </select>
                            {timePeriod === "Custom" && (
                                <div className="flex items-center gap-2 animate-fade-in ml-2 border-l border-gray-200 dark:border-gray-800 pl-2">
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent border-none text-[10px] font-bold outline-none text-gray-700 dark:text-gray-300" />
                                    <span className="text-[10px] text-gray-400">TO</span>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-none text-[10px] font-bold outline-none text-gray-700 dark:text-gray-300" />
                                </div>
                            )}
                        </div>

                        <button onClick={() => { setSelectedCentres([]); setSelectedBoards([]); setSelectedSubjects([]); setTimePeriod("This Year"); }} className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest ml-auto active:scale-95 transition-all">RESET FILTERS</button>
                    </div>
                </div>

                {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center gap-6">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-cyan-500/20 rounded-full"></div>
                            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">Computing Deep Analytics...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* 1. Overall Board Share */}
                        <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-[0.2em] border-l-4 border-cyan-500 pl-3">Board Enrollment Share</h3>
                                <div className="text-[9px] font-bold text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-full uppercase">Live Count</div>
                            </div>
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={boardStats}
                                            dataKey="enrollments"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={120}
                                            label={({ name, percent }) => `${name || 'Unknown'} (${(percent * 100).toFixed(0)}%)`}
                                            onClick={(data) => {
                                                const board = boards.find(b => b.boardCourse === data.name);
                                                if (board) setSelectedBoards([board._id]);
                                            }}
                                            className="cursor-pointer outline-none"
                                        >
                                            {boardStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', backgroundColor: '#1a1f24', color: '#fff' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{value}</span>} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 2. Board Revenue */}
                        <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-[0.2em] border-l-4 border-green-500 pl-3">Revenue Distribution</h3>
                                <div className="text-[9px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full uppercase">Inc. GST</div>
                            </div>
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={boardStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} onClick={(data) => { if (data?.activePayload) { const name = data.activePayload[0].payload.name; const board = boards.find(b => b.boardName === name); if (board) setSelectedBoards([board._id]); } }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontWeight: 'bold' }} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontWeight: 'bold' }} tickFormatter={(v) => `₹${v >= 1000 ? v / 1000 + 'k' : v}`} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', backgroundColor: '#1a1f24' }}
                                        />
                                        <Bar dataKey="revenue" fill="#10B981" radius={[10, 10, 0, 0]} barSize={40} className="cursor-pointer" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 3. Subject Popularity (Bar Chart) */}
                        <div className="bg-white dark:bg-[#1a1f24] p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 lg:col-span-2">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-[0.2em] border-l-4 border-purple-500 pl-3">Subject Wise Admission Distribution</h3>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 ml-4 tracking-widest">Enrollment Volume per Subject</p>
                                </div>
                                <div className="bg-purple-500/10 text-purple-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">Subject Metrics</div>
                            </div>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={subjectStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                                        <XAxis dataKey="subjectName" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontWeight: 'bold' }} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontWeight: 'bold' }} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                                            contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1a1f24', color: '#fff' }}
                                        />
                                        <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 4. Monthly Trend (Line Chart with Dual Axis) */}
                        <div className="bg-white dark:bg-[#1a1f24] p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 lg:col-span-2">
                            <h3 className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-[0.2em] border-l-4 border-orange-500 pl-3 mb-8">Board Admission & Revenue Trend</h3>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                                        <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontWeight: 'bold' }} />
                                        <YAxis yAxisId="left" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#F59E0B', fontWeight: 'bold' }} label={{ value: 'Enrollments', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#F59E0B' }} />
                                        <YAxis yAxisId="right" orientation="right" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#3B82F6', fontWeight: 'bold' }} label={{ value: 'Revenue (₹)', angle: 90, position: 'insideRight', fontSize: 10, fill: '#3B82F6' }} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1a1f24', color: '#fff' }} />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                        <Line yAxisId="left" name="Admissions" type="monotone" dataKey="enrollments" stroke="#F59E0B" strokeWidth={4} dot={{ r: 6, fill: '#F59E0B', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 10, strokeWidth: 0 }} />
                                        <Line yAxisId="right" name="Revenue" type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={4} dot={{ r: 6, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 10, strokeWidth: 0 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Detailed Table Section */}
                        <div className="lg:col-span-2 bg-white dark:bg-[#1a1f24] rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 mt-4">
                            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                                <div>
                                    <h3 className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-[0.2em]">Centre-Wise Board Performance</h3>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-widest">Cross-sectional analysis of regional centers</p>
                                </div>
                                <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-xl">
                                    <FaTh className="text-gray-400" />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/80 dark:bg-black/20 text-[9px] font-black uppercase text-gray-500 tracking-[0.2em]">
                                            <th className="px-8 py-5">Centre Name</th>
                                            <th className="px-8 py-5 text-center">Total Enrollments</th>
                                            <th className="px-8 py-5 text-right">Revenue (Inc. GST)</th>
                                            <th className="px-8 py-5 text-center">Performance Indicator</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                        {centreStats.length > 0 ? centreStats.map((c, i) => (
                                            <tr key={i} className="hover:bg-cyan-500/[0.02] transition-colors group">
                                                <td className="px-8 py-5">
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight group-hover:text-cyan-500 transition-colors">{c.name}</span>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className="bg-cyan-100/50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-4 py-1.5 rounded-full text-[10px] font-black shadow-sm ring-1 ring-cyan-500/20">{c.enrollments}</span>
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-gray-900 dark:text-gray-100 text-sm italic">₹{c.revenue?.toLocaleString()}</td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <div className="w-32 h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner p-0.5">
                                                            <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-1000 shadow-lg" style={{ width: `${Math.min((c.enrollments / 50) * 100, 100)}%` }}></div>
                                                        </div>
                                                        <span className="text-[9px] font-black text-gray-400 w-8">{(c.enrollments / 50).toFixed(1)}x</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="4" className="px-8 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                                        <FaUserGraduate size={40} />
                                                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No centre data found for selected criteria</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default BoardReport;
