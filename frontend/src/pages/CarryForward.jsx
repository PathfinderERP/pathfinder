import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { 
    FaSearch, FaFilter, FaEye, FaArrowRight, FaMoneyBillWave, FaTimes, 
    FaUserGraduate, FaCheckCircle, FaBook, FaCalendar, FaSpinner, 
    FaChevronLeft, FaChevronRight, FaMapMarkerAlt, FaGlobe, FaSchool, FaReceipt
} from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import CustomMultiSelect from '../components/common/CustomMultiSelect';

const CarryForward = () => {
    const navigate = useNavigate();
    const apiUrl = import.meta.env.VITE_API_URL;

    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [dbZones, setDbZones] = useState([]);
    const [dbCentres, setDbCentres] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters State
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedZones, setSelectedZones] = useState([]);      // array of { value, label }
    const [selectedCentres, setSelectedCentres] = useState([]);  // array of { value, label }
    const [datePreset, setDatePreset] = useState("");
    const [showCustomDates, setShowCustomDates] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Date Preset calculation helper
    const applyDatePreset = (preset) => {
        const now = new Date();
        const fmt = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const today = fmt(now);
        const yesterday = fmt(new Date(now.getTime() - 86400000));
        const dayOfWeek = now.getDay();
        const diffToMon = (dayOfWeek + 6) % 7;
        const thisWeekMon = new Date(now); thisWeekMon.setDate(now.getDate() - diffToMon);
        const prevWeekMon = new Date(thisWeekMon); prevWeekMon.setDate(thisWeekMon.getDate() - 7);
        const prevWeekSun = new Date(thisWeekMon); prevWeekSun.setDate(thisWeekMon.getDate() - 1);
        const y = now.getFullYear(), m = now.getMonth();
        const thisMonStart = fmt(new Date(y, m, 1));
        const prevMonStart = fmt(new Date(y, m - 1, 1));
        const prevMonEnd = fmt(new Date(y, m, 0));
        const thisYearStart = fmt(new Date(y, 0, 1));
        const prevYearStart = fmt(new Date(y - 1, 0, 1));
        const prevYearEnd = fmt(new Date(y - 1, 11, 31));

        setDatePreset(preset);
        if (preset === 'custom') {
            setShowCustomDates(true);
            return;
        }
        setShowCustomDates(false);
        const ranges = {
            today: [today, today],
            yesterday: [yesterday, yesterday],
            thisWeek: [fmt(thisWeekMon), today],
            prevWeek: [fmt(prevWeekMon), fmt(prevWeekSun)],
            thisMonth: [thisMonStart, today],
            prevMonth: [prevMonStart, prevMonEnd],
            thisYear: [thisYearStart, today],
            prevYear: [prevYearStart, prevYearEnd],
        };
        const [from, to] = ranges[preset] || ['', ''];
        setFromDate(from);
        setToDate(to);
        setCurrentPage(1);
    };
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Modal State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentAdmissions, setStudentAdmissions] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState("carryForward");
    const [enrolledSearchTerm, setEnrolledSearchTerm] = useState("");
    const [searchedStudent, setSearchedStudent] = useState(null);
    const [searchedStudentAdmissions, setSearchedStudentAdmissions] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Fetch Master Data (Zones, Centres, Classes) & Carry Forward Students
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };

            const [cfRes, classesRes, zonesRes, centresRes] = await Promise.all([
                fetch(`${apiUrl}/carry-forward/students`, { headers }),
                fetch(`${apiUrl}/class`, { headers }),
                fetch(`${apiUrl}/zone`, { headers }),
                fetch(`${apiUrl}/centre`, { headers })
            ]);

            if (cfRes.ok) {
                const cfData = await cfRes.json();
                setStudents(cfData.data || []);
            } else {
                toast.error("Failed to fetch carry forward students");
            }

            if (classesRes.ok) {
                const cData = await classesRes.json();
                setClasses(Array.isArray(cData) ? cData : []);
            }

            if (zonesRes.ok) {
                const zData = await zonesRes.json();
                const zList = Array.isArray(zData) ? zData : (zData.data || zData.zones || []);
                setDbZones(zList.filter(z => z.isActive !== false));
            }

            if (centresRes.ok) {
                const cntData = await centresRes.json();
                const cntList = Array.isArray(cntData) ? cntData : (cntData.centres || []);
                setDbCentres(cntList.filter(c => c.status !== "deactive"));
            }

        } catch (err) {
            console.error("Error fetching carry forward data:", err);
            toast.error("Error loading Carry Forward data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [apiUrl]);

    // Filter available centres based on selected zones
    const filteredCentresList = useMemo(() => {
        if (!selectedZones || selectedZones.length === 0) {
            return dbCentres;
        }
        const selectedZoneIds = new Set(selectedZones.map(z => String(z.value || z._id || z)));
        const selectedZoneNames = new Set(selectedZones.map(z => String(z.label || z.name || z).toLowerCase().trim()));
        const allowedCentreIds = new Set();

        dbZones.forEach(zone => {
            if (selectedZoneIds.has(String(zone._id)) || selectedZoneNames.has(String(zone.name).toLowerCase().trim())) {
                (zone.centres || []).forEach(c => {
                    const cId = String(c._id || c);
                    allowedCentreIds.add(cId);
                });
            }
        });

        return dbCentres.filter(c => allowedCentreIds.has(String(c._id)));
    }, [selectedZones, dbCentres, dbZones]);

    // Centre options for CustomMultiSelect
    const centreOptions = useMemo(() => {
        return filteredCentresList.map(c => ({
            value: c.centreName || c.enterCode || String(c._id),
            label: c.centreName || c.enterCode,
            id: String(c._id)
        }));
    }, [filteredCentresList]);

    // Zone options for CustomMultiSelect
    const zoneOptions = useMemo(() => {
        return dbZones.map(z => ({
            value: String(z._id),
            label: z.name
        }));
    }, [dbZones]);

    // Client-side filtering for ultra-fast instant UI updates
    const filteredStudents = useMemo(() => {
        let result = students;

        // Search filter
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim();
            result = result.filter(s =>
                (s.name && s.name.toLowerCase().includes(q)) ||
                (s.mobile && s.mobile.includes(q)) ||
                (s.email && s.email.toLowerCase().includes(q)) ||
                (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q)) ||
                (s.centre && s.centre.toLowerCase().includes(q)) ||
                (s._id && s._id.toString().toLowerCase().includes(q))
            );
        }

        // Zone filter (multi-select)
        if (selectedZones && selectedZones.length > 0) {
            const zoneIds = new Set(selectedZones.map(z => String(z.value || z._id || z)));
            const zoneNames = new Set(selectedZones.map(z => String(z.label || z.name || z).toLowerCase().trim()));
            
            // Collect all centre names belonging to selected zones
            const allowedCentreNames = new Set();
            dbZones.forEach(zone => {
                if (zoneIds.has(String(zone._id)) || zoneNames.has(String(zone.name).toLowerCase().trim())) {
                    (zone.centres || []).forEach(c => {
                        if (c) {
                            if (c._id) allowedCentreNames.add(String(c._id).toLowerCase());
                            if (c.centreName) allowedCentreNames.add(String(c.centreName).toLowerCase().trim());
                            if (c.enterCode) allowedCentreNames.add(String(c.enterCode).toLowerCase().trim());
                        }
                    });
                }
            });

            result = result.filter(s => {
                const sZId = s.zoneId ? String(s.zoneId) : "";
                const sZName = s.zoneName ? String(s.zoneName).toLowerCase().trim() : "";
                const sCentre = s.centre ? String(s.centre).toLowerCase().trim() : "";

                return (sZId && zoneIds.has(sZId)) || 
                       (sZName && zoneNames.has(sZName)) ||
                       (sCentre && allowedCentreNames.has(sCentre));
            });
        }

        // Centre filter (multi-select)
        if (selectedCentres && selectedCentres.length > 0) {
            const selectedCentreValues = new Set(selectedCentres.map(c => String(c.value || c.label || c.centreName || c).toLowerCase().trim()));
            result = result.filter(s => 
                s.centre && selectedCentreValues.has(String(s.centre).toLowerCase().trim())
            );
        }

        // Class filter
        if (selectedClass) {
            const norm = (str) => String(str || "").toLowerCase().trim().replace(/^class\s+/i, '');
            const targetClass = norm(selectedClass);
            result = result.filter(s => norm(s.class) === targetClass);
        }

        // Date range filter
        if (fromDate || toDate) {
            const fromStr = fromDate ? String(fromDate).split('T')[0] : null;
            const toStr = toDate ? String(toDate).split('T')[0] : null;
            result = result.filter(s => {
                const rawDate = s.admissionDate || s.createdAt;
                if (!rawDate) return false;
                try {
                    const dStr = new Date(rawDate).toISOString().split('T')[0];
                    if (fromStr && dStr < fromStr) return false;
                    if (toStr && dStr > toStr) return false;
                    return true;
                } catch (e) {
                    return true;
                }
            });
        }

        return result;
    }, [students, searchTerm, selectedZones, selectedCentres, selectedClass, fromDate, toDate, dbZones]);

    // Reset pagination to page 1 on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedZones, selectedCentres, selectedClass, fromDate, toDate]);

    // Paginated subset
    const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredStudents.slice(start, start + pageSize);
    }, [filteredStudents, currentPage, pageSize]);

    // Open Student Modal & Fetch detailed admissions
    const openStudentModal = async (student) => {
        setSelectedStudent(student);
        setIsModalOpen(true);
        setModalLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };
            const res = await fetch(`${apiUrl}/carry-forward/student-details/${student._id}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setStudentAdmissions(data.admissions || []);
                if (data.student) {
                    setSelectedStudent(prev => ({ ...prev, ...data.student }));
                }
            } else {
                toast.error("Failed to load student course details");
            }
        } catch (err) {
            console.error("Error fetching student details:", err);
            toast.error("Error loading admissions");
        } finally {
            setModalLoading(false);
        }
    };

    const closeStudentModal = () => {
        setIsModalOpen(false);
        setSelectedStudent(null);
        setStudentAdmissions([]);
    };

    const handleEnrollNewCourse = () => {
        if (selectedStudent) {
            const existingRollNo = studentAdmissions?.[0]?.admissionNumber || selectedStudent.admissionNumber || selectedStudent.rollNo || '';
            navigate(`/admission/${selectedStudent._id}`, { state: { student: selectedStudent, rollNo: existingRollNo } });
        }
    };

    // Fast search enrolled student by admission number
    const handleSearchEnrolledStudent = async () => {
        if (!enrolledSearchTerm.trim()) {
            toast.error("Please enter an admission number to search");
            return;
        }

        setSearchLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };

            const res = await fetch(`${apiUrl}/carry-forward/search-enrolled?admissionNumber=${encodeURIComponent(enrolledSearchTerm.trim())}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setSearchedStudent(data.student);
                setSearchedStudentAdmissions(data.admissions || []);
                toast.success(`Found student with ${data.admissions?.length || 0} enrolled course(s)`);
            } else {
                const errData = await res.json();
                toast.error(errData.message || "Student not found");
                setSearchedStudent(null);
                setSearchedStudentAdmissions([]);
            }
        } catch (err) {
            console.error("Error searching student:", err);
            toast.error("Error searching for student");
        } finally {
            setSearchLoading(false);
        }
    };

    const getInstallmentStatusColor = (status) => {
        switch (status) {
            case "PAID":
                return "bg-green-500/20 text-green-400 border border-green-500/30";
            case "PENDING_CLEARANCE":
                return "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30";
            case "OVERDUE":
                return "bg-red-500/20 text-red-400 border border-red-500/30";
            case "PENDING":
                return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
            default:
                return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
        }
    };

    return (
        <Layout activePage="Course Management">
            <div className="flex-1 bg-[#131619] p-4 sm:p-6 overflow-y-auto text-white h-full">
                <ToastContainer position="top-right" theme="dark" />

                {/* Page Title */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-cyan-400 tracking-tight">Carry Forward Management</h2>
                        <p className="text-gray-400 text-sm mt-1">Track students who have enrolled in multiple courses or have carry forward balances</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-800">
                    <button
                        onClick={() => setActiveTab("carryForward")}
                        className={`px-6 py-3 font-semibold transition-colors relative flex items-center gap-2 cursor-pointer ${
                            activeTab === "carryForward"
                                ? "text-cyan-400 border-b-2 border-cyan-400"
                                : "text-gray-400 hover:text-gray-300"
                        }`}
                    >
                        <FaMoneyBillWave />
                        Carry Forward Students ({students.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("enrolled")}
                        className={`px-6 py-3 font-semibold transition-colors relative flex items-center gap-2 cursor-pointer ${
                            activeTab === "enrolled"
                                ? "text-cyan-400 border-b-2 border-cyan-400"
                                : "text-gray-400 hover:text-gray-300"
                        }`}
                    >
                        <FaUserGraduate />
                        Search Enrolled Students
                    </button>
                </div>

                {/* ================= CARRY FORWARD STUDENTS TAB ================= */}
                {activeTab === "carryForward" && (
                    <>
                        {/* Filters & Search Row */}
                        <div className="bg-[#1a1f24] p-5 rounded-2xl border border-gray-800 mb-6 shadow-lg">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                {/* Search input */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Search</label>
                                    <div className="relative">
                                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                                        <input
                                            type="text"
                                            placeholder="Name, Mobile or ID..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all h-[38px]"
                                        />
                                    </div>
                                </div>

                                {/* Multi-Selection Zone Filter */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Zone</label>
                                    <CustomMultiSelect
                                        options={zoneOptions}
                                        value={selectedZones}
                                        onChange={(selected) => {
                                            setSelectedZones(selected || []);
                                            setSelectedCentres([]);
                                        }}
                                        placeholder="All Zones"
                                        isDarkMode={true}
                                        maxShowTags={1}
                                    />
                                </div>

                                {/* Multi-Selection Centre Filter (Cascaded by Zone) */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Centre</label>
                                    <CustomMultiSelect
                                        options={centreOptions}
                                        value={selectedCentres}
                                        onChange={(selected) => setSelectedCentres(selected || [])}
                                        placeholder="All Centres"
                                        isDarkMode={true}
                                        maxShowTags={1}
                                    />
                                </div>

                                {/* Class filter */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Class</label>
                                    <select
                                        value={selectedClass}
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer transition-all h-[38px]"
                                    >
                                        <option value="">All Classes</option>
                                        {classes.map(cls => (
                                            <option key={cls._id || cls.name} value={cls.name}>{cls.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date Range Filter */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Date Range</label>
                                    <select
                                        value={datePreset}
                                        onChange={(e) => applyDatePreset(e.target.value)}
                                        className={`w-full bg-[#131619] border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer transition-all h-[38px] ${
                                            datePreset ? 'border-cyan-500 text-cyan-300' : 'border-gray-700'
                                        }`}
                                    >
                                        <option value="">-- Select Range --</option>
                                        <option value="today">Today</option>
                                        <option value="yesterday">Yesterday</option>
                                        <option value="thisWeek">This Week</option>
                                        <option value="prevWeek">Previous Week</option>
                                        <option value="thisMonth">This Month</option>
                                        <option value="prevMonth">Previous Month</option>
                                        <option value="thisYear">This Year</option>
                                        <option value="prevYear">Previous Year</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                            </div>

                            {/* Custom Date Pickers (Shown when Custom is selected) */}
                            {showCustomDates && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-800/80">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">From Date</label>
                                        <input
                                            type="date"
                                            value={fromDate}
                                            onChange={(e) => {
                                                setFromDate(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">To Date</label>
                                        <input
                                            type="date"
                                            value={toDate}
                                            onChange={(e) => {
                                                setToDate(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Active Filter Badges */}
                            {(selectedZones.length > 0 || selectedCentres.length > 0 || selectedClass || searchTerm || fromDate || toDate) && (
                                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-800/80 text-xs">
                                    <span className="text-gray-400 font-semibold">Active Filters:</span>
                                    {selectedZones.map(z => (
                                        <span key={z.value} className="px-2.5 py-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-lg flex items-center gap-1.5">
                                            Zone: {z.label}
                                            <button onClick={() => setSelectedZones(p => p.filter(x => x.value !== z.value))} className="hover:text-white cursor-pointer">×</button>
                                        </span>
                                    ))}
                                    {selectedCentres.map(c => (
                                        <span key={c.value} className="px-2.5 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded-lg flex items-center gap-1.5">
                                            Centre: {c.label}
                                            <button onClick={() => setSelectedCentres(p => p.filter(x => x.value !== c.value))} className="hover:text-white cursor-pointer">×</button>
                                        </span>
                                    ))}
                                    {selectedClass && (
                                        <span className="px-2.5 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded-lg flex items-center gap-1.5">
                                            Class: {selectedClass}
                                            <button onClick={() => setSelectedClass("")} className="hover:text-white cursor-pointer">×</button>
                                        </span>
                                    )}
                                    {(fromDate || toDate) && (
                                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-lg flex items-center gap-1.5">
                                            Date: {fromDate || 'Start'} → {toDate || 'End'}
                                            <button onClick={() => {
                                                setDatePreset("");
                                                setShowCustomDates(false);
                                                setFromDate("");
                                                setToDate("");
                                            }} className="hover:text-white cursor-pointer">×</button>
                                        </span>
                                    )}
                                    {searchTerm && (
                                        <span className="px-2.5 py-1 bg-gray-700 text-gray-300 rounded-lg flex items-center gap-1.5">
                                            Search: "{searchTerm}"
                                            <button onClick={() => setSearchTerm("")} className="hover:text-white cursor-pointer">×</button>
                                        </span>
                                    )}
                                    <button
                                        onClick={() => {
                                            setSelectedZones([]);
                                            setSelectedCentres([]);
                                            setSelectedClass("");
                                            setSearchTerm("");
                                            setDatePreset("");
                                            setShowCustomDates(false);
                                            setFromDate("");
                                            setToDate("");
                                        }}
                                        className="text-red-400 hover:text-red-300 ml-2 font-semibold underline cursor-pointer"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Students List Table */}
                        <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#171b20]">
                                <div className="flex items-center gap-2 text-sm text-gray-300 font-semibold">
                                    <span>Students</span>
                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                        {filteredStudents.length} record(s)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <span>Rows per page:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => setPageSize(Number(e.target.value))}
                                        className="bg-[#131619] border border-gray-700 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                                    >
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={200}>200</option>
                                    </select>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-[#1e2329] text-gray-400 text-xs uppercase tracking-wider font-semibold border-b border-gray-800">
                                            <th className="px-5 py-4">Student Name</th>
                                            <th className="px-5 py-4">Mobile</th>
                                            <th className="px-5 py-4">Zone</th>
                                            <th className="px-5 py-4">Centre</th>
                                            <th className="px-5 py-4">Class</th>
                                            <th className="px-5 py-4 text-center">Courses</th>
                                            <th className="px-5 py-4">CF Balance</th>
                                            <th className="px-5 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/60">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="8" className="p-16 text-center text-gray-400">
                                                    <FaSpinner className="text-3xl text-cyan-400 animate-spin mx-auto mb-3" />
                                                    <p>Loading carry forward students...</p>
                                                </td>
                                            </tr>
                                        ) : paginatedStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="p-16 text-center text-gray-500">
                                                    <FaUserGraduate className="text-4xl mx-auto mb-3 opacity-30" />
                                                    <p>No carry forward students found matching criteria</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedStudents.map(student => {
                                                const hasMultipleCourses = student.admissionCount > 1;
                                                const hasCarryForward = student.carryForwardBalance > 0 || student.markedForCarryForward;

                                                return (
                                                    <tr
                                                        key={student._id}
                                                        className="hover:bg-gray-800/40 transition-colors cursor-pointer"
                                                        onClick={() => openStudentModal(student)}
                                                    >
                                                        <td className="px-5 py-4">
                                                            <div className="font-semibold text-white">{student.name || "Unknown"}</div>
                                                            {student.email && (
                                                                <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{student.email}</div>
                                                            )}
                                                            <div className="flex gap-1.5 mt-1.5">
                                                                {hasMultipleCourses && (
                                                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[10px] font-semibold uppercase">
                                                                        Next Course
                                                                    </span>
                                                                )}
                                                                {hasCarryForward && (
                                                                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-[10px] font-semibold uppercase">
                                                                        CF Balance
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 text-gray-300 font-mono text-xs">{student.mobile || "—"}</td>
                                                        <td className="px-5 py-4">
                                                            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                                                {student.zoneName || "—"}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4 text-gray-200 font-medium">{student.centre || "—"}</td>
                                                        <td className="px-5 py-4">
                                                            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold">
                                                                {student.class || "—"}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4 text-center">
                                                            <span className="inline-flex items-center justify-center w-7 h-7 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold">
                                                                {student.admissionCount || 0}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4 text-yellow-400 font-bold text-sm">
                                                            ₹{(student.carryForwardBalance || 0).toLocaleString()}
                                                        </td>
                                                        <td className="px-5 py-4 text-right">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openStudentModal(student);
                                                                }}
                                                                className="px-3.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                                                            >
                                                                View Details <FaEye size={11} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {filteredStudents.length > pageSize && (
                                <div className="px-6 py-4 bg-[#171b20] border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-400">
                                    <div>
                                        Showing <span className="text-white font-semibold">{((currentPage - 1) * pageSize) + 1}</span> to <span className="text-white font-semibold">{Math.min(currentPage * pageSize, filteredStudents.length)}</span> of <span className="text-white font-semibold">{filteredStudents.length}</span> students
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 transition-all"
                                        >
                                            <FaChevronLeft size={10} /> Prev
                                        </button>
                                        <span className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-cyan-400 font-semibold">
                                            {currentPage} / {totalPages}
                                        </span>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 transition-all"
                                        >
                                            Next <FaChevronRight size={10} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ================= SEARCH ENROLLED STUDENTS TAB ================= */}
                {activeTab === "enrolled" && (
                    <>
                        <div className="bg-[#1a1f24] p-6 rounded-2xl border border-gray-800 mb-6 shadow-xl">
                            <p className="text-gray-400 text-sm mb-4">
                                Search for enrolled students by their Admission Number or Mobile to view course details and enroll them into new courses.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                                    <input
                                        type="text"
                                        placeholder="Enter Admission Number (e.g., PATH202300001) or Mobile Number..."
                                        value={enrolledSearchTerm}
                                        onChange={(e) => setEnrolledSearchTerm(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearchEnrolledStudent()}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all text-sm"
                                    />
                                </div>
                                <button
                                    onClick={handleSearchEnrolledStudent}
                                    disabled={searchLoading}
                                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {searchLoading ? <FaSpinner className="animate-spin" /> : "Search"}
                                </button>
                            </div>
                        </div>

                        {/* Search Results */}
                        {searchedStudent && (
                            <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 p-6 shadow-xl">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-6 border-b border-gray-800">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">
                                            {searchedStudent.studentsDetails?.[0]?.studentName || "Student Details"}
                                        </h3>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                            <span>Admission No: <strong className="text-cyan-400">{searchedStudentAdmissions?.[0]?.admissionNumber || "N/A"}</strong></span>
                                            <span>Mobile: <strong className="text-gray-200">{searchedStudent.studentsDetails?.[0]?.mobileNum || "N/A"}</strong></span>
                                            <span>Centre: <strong className="text-gray-200">{searchedStudent.studentsDetails?.[0]?.centre || "N/A"}</strong></span>
                                            <span>Email: <strong className="text-gray-200">{searchedStudent.studentsDetails?.[0]?.studentEmail || "N/A"}</strong></span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => {
                                                const existingRollNo = searchedStudentAdmissions?.[0]?.admissionNumber || searchedStudent?.admissionNumber || searchedStudent?.rollNo || '';
                                                navigate(`/admission/${searchedStudent._id}`, { state: { student: searchedStudent, rollNo: existingRollNo } });
                                            }}
                                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
                                            title="Enroll in a Normal Course"
                                        >
                                            Enroll Normal Course <FaArrowRight />
                                        </button>
                                        <button
                                            onClick={() => {
                                                const existingRollNo = searchedStudentAdmissions?.[0]?.admissionNumber || searchedStudent?.admissionNumber || searchedStudent?.rollNo || '';
                                                navigate(`/board-course-admission/${searchedStudent._id}`, { state: { student: searchedStudent, rollNo: existingRollNo } });
                                            }}
                                            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer"
                                            title="Enroll in a Board Course"
                                        >
                                            Enroll Board Course <FaArrowRight />
                                        </button>
                                        <button
                                            onClick={() => navigate(`/pntse/add-student`, { state: { student: searchedStudent, rollNo: searchedStudentAdmissions?.[0]?.admissionNumber || '' } })}
                                            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-500/20 flex items-center gap-2 cursor-pointer"
                                            title="Carry Forward to PNTSE Course"
                                        >
                                            Carry Forward PNTSE <FaArrowRight />
                                        </button>
                                        <button
                                            onClick={() => navigate(`/pmo/add-student`, { state: { student: searchedStudent, rollNo: searchedStudentAdmissions?.[0]?.admissionNumber || '' } })}
                                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
                                            title="Carry Forward to PMO Course"
                                        >
                                            Carry Forward PMO <FaArrowRight />
                                        </button>
                                    </div>
                                </div>

                                {/* Enrolled Courses */}
                                <div className="space-y-4">
                                    <h4 className="text-base font-semibold text-cyan-400 flex items-center gap-2">
                                        <FaBook /> Enrolled Courses ({searchedStudentAdmissions.length})
                                    </h4>
                                    {searchedStudentAdmissions.map((admission, idx) => (
                                        <div key={admission._id || idx} className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/80">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h5 className="text-white font-semibold">{admission.course?.courseName || admission.boardCourseName || "Course"}</h5>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {admission.department?.departmentName || "General"} • Session: {admission.academicSession || "N/A"}
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                                    admission.paymentStatus === 'COMPLETED' || admission.paymentStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                    admission.paymentStatus === 'PARTIAL' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                    'bg-red-500/20 text-red-400 border border-red-500/30'
                                                }`}>
                                                    {admission.paymentStatus || 'ACTIVE'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-xs">
                                                <div className="bg-[#131619] p-3 rounded-lg border border-gray-800">
                                                    <span className="text-gray-400 block mb-0.5">Total Fees:</span>
                                                    <p className="text-white font-bold text-sm">₹{(admission.totalFees || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="bg-[#131619] p-3 rounded-lg border border-gray-800">
                                                    <span className="text-gray-400 block mb-0.5">Paid:</span>
                                                    <p className="text-emerald-400 font-bold text-sm">₹{(admission.totalPaidAmount || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="bg-[#131619] p-3 rounded-lg border border-gray-800">
                                                    <span className="text-gray-400 block mb-0.5">Pending:</span>
                                                    <p className="text-yellow-400 font-bold text-sm">
                                                        ₹{Math.max(0, (admission.totalFees || 0) - (admission.totalPaidAmount || 0)).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ================= STUDENT DETAILS MODAL ================= */}
                {isModalOpen && selectedStudent && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-[#1a1f24] rounded-2xl w-full max-w-5xl border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto my-8 text-left">
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-[#171b20] p-6 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        {selectedStudent.name || selectedStudent.studentsDetails?.[0]?.studentName || "Student Details"}
                                    </h3>
                                    <div className="flex flex-wrap gap-4 text-xs text-gray-400 mt-1.5">
                                        <span>Admission No: <strong className="text-cyan-400">{selectedStudent.admissionNumber || "N/A"}</strong></span>
                                        <span>Mobile: <strong className="text-gray-200">{selectedStudent.mobile || selectedStudent.studentsDetails?.[0]?.mobileNum || "N/A"}</strong></span>
                                        <span>Zone: <strong className="text-cyan-300">{selectedStudent.zoneName || "—"}</strong></span>
                                        <span>Centre: <strong className="text-gray-200">{selectedStudent.centre || "—"}</strong></span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleEnrollNewCourse}
                                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                        title="Enroll in a Normal Course"
                                    >
                                        Enroll Normal <FaArrowRight size={10} />
                                    </button>
                                    <button
                                        onClick={() => navigate(`/board-course-admission/${selectedStudent._id}`)}
                                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                        title="Enroll in a Board Course"
                                    >
                                        Enroll Board <FaArrowRight size={10} />
                                    </button>
                                    <button
                                        onClick={() => navigate(`/pntse/add-student`, { state: { student: selectedStudent, rollNo: selectedStudent.admissionNumber || '' } })}
                                        className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                        title="Carry Forward to PNTSE Course"
                                    >
                                        Carry Forward PNTSE <FaArrowRight size={10} />
                                    </button>
                                    <button
                                        onClick={() => navigate(`/pmo/add-student`, { state: { student: selectedStudent, rollNo: selectedStudent.admissionNumber || '' } })}
                                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                        title="Carry Forward to PMO Course"
                                    >
                                        Carry Forward PMO <FaArrowRight size={10} />
                                    </button>
                                    <button
                                        onClick={closeStudentModal}
                                        className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
                                    >
                                        <FaTimes size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Carry Forward Balance Banner */}
                                {(selectedStudent.carryForwardBalance > 0 || selectedStudent.markedForCarryForward) && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl flex items-center gap-3">
                                        <FaMoneyBillWave className="text-yellow-400 text-2xl shrink-0" />
                                        <div>
                                            <p className="text-yellow-400 text-xs uppercase font-bold tracking-wider">Carry Forward Balance</p>
                                            <p className="text-2xl font-bold text-yellow-300 mt-0.5">
                                                ₹{(selectedStudent.carryForwardBalance || 0).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Enrolled Courses */}
                                <div>
                                    <h4 className="text-base font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                                        <FaBook /> All Enrolled Courses ({studentAdmissions.length})
                                    </h4>

                                    {modalLoading ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <FaSpinner className="text-2xl text-cyan-400 animate-spin mx-auto mb-2" />
                                            <p className="text-xs">Loading enrolled courses...</p>
                                        </div>
                                    ) : studentAdmissions.length === 0 ? (
                                        <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-800 text-center text-gray-400 text-xs">
                                            No course admissions found for this student.
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {studentAdmissions.map((admission, index) => (
                                                <div key={admission._id || index} className="bg-gray-800/40 rounded-xl border border-gray-700/70 overflow-hidden">
                                                    {/* Course Header */}
                                                    <div className="bg-[#171b20] p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-800">
                                                        <div>
                                                            <h5 className="text-base font-bold text-white">
                                                                Course {index + 1}: {admission.course?.courseName || admission.boardCourseName || "Course"}
                                                            </h5>
                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                {admission.department?.departmentName || "Department"} • Session: {admission.academicSession || "N/A"} • Centre: {admission.centre || "—"} • 
                                                                Admission Date: {admission.admissionDate ? new Date(admission.admissionDate).toLocaleDateString() : "—"}
                                                            </p>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                                            admission.paymentStatus === 'COMPLETED' || admission.paymentStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                            admission.paymentStatus === 'PARTIAL' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                            'bg-red-500/20 text-red-400 border border-red-500/30'
                                                        }`}>
                                                            {admission.paymentStatus || 'ACTIVE'}
                                                        </span>
                                                    </div>

                                                    <div className="p-4 space-y-4">
                                                        {/* Fee Summary */}
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                                            <div className="bg-[#131619] p-3 rounded-lg border border-gray-800">
                                                                <p className="text-gray-400">Total Fees</p>
                                                                <p className="text-base font-bold text-cyan-400 mt-0.5">
                                                                    ₹{(admission.totalFees || 0).toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <div className="bg-[#131619] p-3 rounded-lg border border-gray-800">
                                                                <p className="text-gray-400">Total Paid</p>
                                                                <p className="text-base font-bold text-emerald-400 mt-0.5">
                                                                    ₹{(admission.totalPaidAmount || 0).toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <div className="bg-[#131619] p-3 rounded-lg border border-gray-800">
                                                                <p className="text-gray-400">Pending</p>
                                                                <p className="text-base font-bold text-yellow-400 mt-0.5">
                                                                    ₹{Math.max(0, (admission.totalFees || 0) - (admission.totalPaidAmount || 0)).toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <div className="bg-[#131619] p-3 rounded-lg border border-gray-800">
                                                                <p className="text-gray-400">Down Payment</p>
                                                                <p className="text-base font-bold text-blue-400 mt-0.5">
                                                                    ₹{(admission.downPayment || 0).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Payment Breakdown Schedule */}
                                                        {admission.paymentBreakdown && admission.paymentBreakdown.length > 0 && (
                                                            <div>
                                                                <h6 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                    <FaCalendar /> Payment Schedule ({admission.paymentBreakdown.length} installments)
                                                                </h6>
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-xs">
                                                                        <thead>
                                                                            <tr className="bg-[#131619] text-gray-400 uppercase tracking-wider border-b border-gray-800">
                                                                                <th className="p-2.5 text-left">Inst #</th>
                                                                                <th className="p-2.5 text-left">Due Date</th>
                                                                                <th className="p-2.5 text-left">Amount</th>
                                                                                <th className="p-2.5 text-left">Paid</th>
                                                                                <th className="p-2.5 text-left">Method</th>
                                                                                <th className="p-2.5 text-left">Status</th>
                                                                                <th className="p-2.5 text-left">Remarks</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-800/50">
                                                                            {admission.paymentBreakdown.map((payment, pIdx) => (
                                                                                <tr key={payment.installmentNumber || pIdx} className="hover:bg-gray-800/30">
                                                                                    <td className="p-2.5 text-white font-mono">#{payment.installmentNumber}</td>
                                                                                    <td className="p-2.5 text-gray-300">
                                                                                        {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "—"}
                                                                                    </td>
                                                                                    <td className="p-2.5 text-white font-medium">
                                                                                        ₹{(payment.amount || 0).toLocaleString()}
                                                                                    </td>
                                                                                    <td className="p-2.5 text-emerald-400 font-medium">
                                                                                        ₹{(payment.paidAmount || 0).toLocaleString()}
                                                                                    </td>
                                                                                    <td className="p-2.5 text-gray-300">
                                                                                        {payment.paymentMethod || "—"}
                                                                                    </td>
                                                                                    <td className="p-2.5">
                                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getInstallmentStatusColor(payment.status)}`}>
                                                                                            {payment.status === "PENDING_CLEARANCE" ? "IN PROCESS" : (payment.status || "PENDING")}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="p-2.5 text-gray-400 text-[11px] truncate max-w-[150px]">
                                                                                        {payment.remarks || "—"}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CarryForward;
