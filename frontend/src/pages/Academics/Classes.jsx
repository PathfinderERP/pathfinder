import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaTimes, FaEdit, FaTrash, FaPlus, FaCheck } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { hasPermission } from "../../config/permissions";
import { useTheme } from "../../context/ThemeContext";

const Classes = () => {
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    // Permission States
    const [canCreate, setCanCreate] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canDelete, setCanDelete] = useState(false);

    useEffect(() => {
        const userObj = JSON.parse(localStorage.getItem("user") || "{}");
        setCanCreate(hasPermission(userObj, "academics", "classes", "create"));
        setCanEdit(hasPermission(userObj, "academics", "classes", "edit"));
        setCanDelete(hasPermission(userObj, "academics", "classes", "delete"));
    }, []);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user.role === "admin" || user.role === "superAdmin";
    const isSuperAdmin = user.role === "superAdmin";
    const isCoordinator = user.role === "Class_Coordinator";
    const isTeacher = user.role === "teacher";

    // Filters State
    const [filters, setFilters] = useState({
        centreId: "",
        batchId: "",
        subjectId: "",
        teacherId: isTeacher ? user._id : "",
        coordinatorId: isCoordinator ? user._id : "",
        fromDate: "",
        toDate: "",
        search: ""
    });

    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [jumpPage, setJumpPage] = useState("");

    // Dropdown Data State
    const [dropdownData, setDropdownData] = useState({
        centres: [],
        batches: [],
        subjects: [],
        teachers: [],
        coordinators: [],
        sessions: [],
        exams: [],
        courses: []
    });

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingClassData, setEditingClassData] = useState(null);

    // Feedback State
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [selectedClassForFeedback, setSelectedClassForFeedback] = useState(null);
    const [teacherFeedback, setTeacherFeedback] = useState([]);

    const staticFeedbackCriteria = [
        "Explains concepts clearly and uses real-world examples to improve understanding.",
        "Maintains excellent classroom discipline and encourages student participation.",
        "Always well-prepared and delivers structured, easy-to-follow lessons.",
        "Provides timely feedback and supports students beyond classroom hours.",
        "Demonstrates strong subject knowledge and effective teaching methodologies.",
        "Creates a positive learning environment that motivates students to perform better.",
        "Uses interactive teaching methods and digital tools effectively.",
        "Regularly tracks student progress and addresses learning gaps proactively.",
        "Encourages critical thinking and problem-solving skills among students.",
        "Shows professionalism, punctuality, and dedication towards student success."
    ];

    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchDropdownData();
    }, []);

    useEffect(() => {
        fetchClasses();
    }, [filters, page, limit]); // auto fetch on any filter change

    const fetchDropdownData = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class-schedule/dropdown-data`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setDropdownData(data);
            }
        } catch (error) {
            console.error("Error fetching dropdowns:", error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this class schedule?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class-schedule/delete/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Class schedule deleted successfully!");
                fetchClasses();
            } else {
                toast.error("Failed to delete class schedule");
            }
        } catch (error) {
            toast.error("Error deleting class schedule");
        }
    };

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            const queryParams = new URLSearchParams({
                page,
                limit,
                ...filters
            });

            // Remove empty filters
            Object.keys(filters).forEach(key => {
                if (!filters[key]) queryParams.delete(key);
            });

            const response = await fetch(`${API_URL}/academics/class-schedule/list?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setClasses(data.classes);
                setTotalPages(data.totalPages);
                setTotalRecords(data.total);
            } else {
                toast.error(data.message || "Failed to fetch classes");
            }
        } catch (error) {
            toast.error("Error fetching classes");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1); // Reset to page 1 on filter change
    };

    const handleMultiSelectChange = (selectedOptions, name) => {
        const values = selectedOptions ? selectedOptions.map(option => option.value).join(',') : "";
        setFilters(prev => ({ ...prev, [name]: values }));
        setPage(1);
    };

    const customSelectStyles = {
        control: (base, state) => ({
            ...base,
            backgroundColor: isDarkMode ? "#131619" : "#f9fafb",
            borderColor: state.isFocused ? "#06b6d4" : isDarkMode ? "#374151" : "#d1d5db",
            borderRadius: "0.5rem",
            padding: "0.1rem",
            fontSize: "0.875rem",
            color: isDarkMode ? "white" : "black",
            boxShadow: "none",
            "&:hover": {
                borderColor: "#06b6d4"
            }
        }),
        menu: (base) => ({
            ...base,
            backgroundColor: isDarkMode ? "#1e2530" : "white",
            border: `1px solid ${isDarkMode ? "#374151" : "#d1d5db"}`,
            zIndex: 100
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused
                ? isDarkMode ? "#2a3038" : "#f3f4f6"
                : "transparent",
            color: isDarkMode ? "white" : "black",
            fontSize: "0.875rem",
            "&:active": {
                backgroundColor: "#06b6d4"
            }
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: isDarkMode ? "#06b6d420" : "#e0f2fe",
            borderRadius: "0.25rem",
            border: `1px solid ${isDarkMode ? "#06b6d440" : "#bae6fd"}`
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: isDarkMode ? "#22d3ee" : "#0369a1",
            fontSize: "0.75rem",
            fontWeight: "bold"
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: isDarkMode ? "#22d3ee" : "#0369a1",
            "&:hover": {
                backgroundColor: isDarkMode ? "#ef4444" : "#fee2e2",
                color: isDarkMode ? "white" : "#b91c1c"
            }
        }),
        input: (base) => ({
            ...base,
            color: isDarkMode ? "white" : "gray"
        }),
        placeholder: (base) => ({
            ...base,
            color: isDarkMode ? "#6b7280" : "#9ca3af"
        }),
        singleValue: (base) => ({
            ...base,
            color: isDarkMode ? "white" : "black"
        })
    };

    const clearFilters = () => {
        setFilters({
            centreId: "",
            batchId: "",
            subjectId: "",
            teacherId: isTeacher ? user._id : "",
            coordinatorId: isCoordinator ? user._id : "",
            fromDate: "",
            toDate: "",
            search: ""
        });
        setPage(1);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
    };

    const handleSubmitFeedback = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class-schedule/feedback/${selectedClassForFeedback._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ teacherFeedback })
            });

            if (response.ok) {
                toast.success("Feedback submitted successfully!");
                setShowFeedbackModal(false);
                setTeacherFeedback([]);
                fetchClasses();
            } else {
                toast.error("Failed to submit feedback");
            }
        } catch (error) {
            toast.error("Error submitting feedback");
        }
    };

    const handleStartClass = async (id) => {
        if (!window.confirm("Are you sure you want to start this class?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class-schedule/start/${id}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Class started successfully!");
                fetchClasses();
            } else {
                toast.error(data.message || "Failed to start class");
            }
        } catch (error) {
            toast.error("Error starting class");
        }
    };

    const handleEndClass = async (id) => {
        if (!window.confirm("Are you sure you want to end this class?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class-schedule/end/${id}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Class ended successfully!");
                fetchClasses();
            } else {
                toast.error(data.message || "Failed to end class");
            }
        } catch (error) {
            toast.error("Error ending class");
        }
    };

    const handleEdit = (cls) => {
        setEditingClassData({
            ...cls,
            centreId: cls.centreId?._id || cls.centreId,
            batchIds: cls.batchIds?.map(b => b._id) || (cls.batchId?._id ? [cls.batchId._id] : []),
            subjectId: cls.subjectId?._id || cls.subjectId,
            teacherId: cls.teacherId?._id || cls.teacherId,
            coordinatorId: cls.coordinatorId?._id || cls.coordinatorId,
            courseId: cls.courseId?._id || cls.courseId,
            examId: cls.examId?._id || cls.examId,
            date: cls.date ? new Date(cls.date).toISOString().split('T')[0] : ""
        });
        setShowEditModal(true);
    };

    const handleUpdateClass = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class-schedule/update/${editingClassData._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(editingClassData)
            });

            if (response.ok) {
                toast.success("Class schedule updated successfully!");
                setShowEditModal(false);
                fetchClasses();
            } else {
                const data = await response.json();
                toast.error(data.message || "Failed to update class schedule");
            }
        } catch (error) {
            toast.error("Error updating class schedule");
        }
    };

    const handleJumpPage = (e) => {
        e.preventDefault();
        const pageNum = parseInt(jumpPage);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            setPage(pageNum);
            setJumpPage("");
        } else {
            toast.error(`Please enter a page between 1 and ${totalPages}`);
        }
    };

    const renderPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (page <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push("...");
                pages.push(totalPages);
            } else if (page >= totalPages - 3) {
                pages.push(1);
                pages.push("...");
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push("...");
                for (let i = page - 1; i <= page + 1; i++) pages.push(i);
                pages.push("...");
                pages.push(totalPages);
            }
        }

        return pages.map((p, index) => (
            <button
                key={index}
                onClick={() => typeof p === "number" && setPage(p)}
                disabled={p === "..."}
                className={`min-w-[36px] h-9 flex items-center justify-center rounded-lg font-bold transition-all text-xs ${p === page
                    ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/40"
                    : p === "..."
                        ? "text-gray-500 cursor-default"
                        : `${isDarkMode ? 'bg-[#131619] text-gray-400 border-gray-800 hover:bg-gray-700 hover:text-white' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'}`
                    } border`}
            >
                {p}
            </button>
        ));
    };

    const TimeRemaining = ({ endTimeString, classDate }) => {
        const [timeLeft, setTimeLeft] = useState("");

        useEffect(() => {
            const timer = setInterval(() => {
                const now = new Date();
                const [hours, minutes] = endTimeString.split(':');
                const end = new Date(classDate);
                end.setHours(parseInt(hours), parseInt(minutes), 0);

                const diff = end - now;
                if (diff <= 0) {
                    setTimeLeft("Time Over");
                } else {
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    setTimeLeft(`${h}h ${m}m ${s}s`);
                }
            }, 1000);
            return () => clearInterval(timer);
        }, [endTimeString, classDate]);

        return <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-cyan-400 text-[10px] rounded border border-cyan-500/30 whitespace-nowrap shadow-xl z-20 font-mono tracking-tighter">
            Time Left: {timeLeft}
        </div>;
    };

    return (
        <Layout activePage="Academics">
            <div className={`p-6 min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900 bg-[#f8fafc]'}`}>
                <ToastContainer theme={theme} position="top-right" />

                <div className="flex justify-between items-center mb-6">
                    <h1 className={`text-3xl font-bold uppercase italic tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Class List</h1>
                </div>

                {/* Filters Section */}
                <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200 shadow-sm'} p-4 rounded-xl border mb-6`}>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">

                        {/* Center */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">Center</label>
                            <Select
                                isMulti
                                options={dropdownData.centres?.map(c => ({ value: c._id, label: c.centreName || c.name }))}
                                value={dropdownData.centres?.filter(c => filters.centreId.split(',').includes(c._id)).map(c => ({ value: c._id, label: c.centreName || c.name }))}
                                onChange={(selected) => handleMultiSelectChange(selected, "centreId")}
                                placeholder="Select Center"
                                styles={customSelectStyles}
                                className="text-sm"
                            />
                        </div>

                        {/* Batch */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">Batch</label>
                            <Select
                                isMulti
                                options={dropdownData.batches?.map(b => ({ value: b._id, label: b.batchName || b.name }))}
                                value={dropdownData.batches?.filter(b => filters.batchId.split(',').includes(b._id)).map(b => ({ value: b._id, label: b.batchName || b.name }))}
                                onChange={(selected) => handleMultiSelectChange(selected, "batchId")}
                                placeholder="Select Batch"
                                styles={customSelectStyles}
                                className="text-sm"
                            />
                        </div>

                        {/* Subject */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">Subject</label>
                            <Select
                                isMulti
                                options={dropdownData.subjects?.map(s => ({ value: s._id, label: s.subjectName || s.name }))}
                                value={dropdownData.subjects?.filter(s => filters.subjectId.split(',').includes(s._id)).map(s => ({ value: s._id, label: s.subjectName || s.name }))}
                                onChange={(selected) => handleMultiSelectChange(selected, "subjectId")}
                                placeholder="Select Subject"
                                styles={customSelectStyles}
                                className="text-sm"
                            />
                        </div>

                        {/* Teacher */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">Teacher</label>
                            <Select
                                isMulti
                                options={dropdownData.teachers?.map(t => ({ value: t._id, label: t.name }))}
                                value={dropdownData.teachers?.filter(t => filters.teacherId.split(',').includes(t._id)).map(t => ({ value: t._id, label: t.name }))}
                                onChange={(selected) => handleMultiSelectChange(selected, "teacherId")}
                                placeholder="Select Teacher"
                                styles={customSelectStyles}
                                className="text-sm"
                            />
                        </div>

                        {/* Coordinator */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">Coordinator</label>
                            <Select
                                isMulti
                                options={dropdownData.coordinators?.map(c => ({ value: c._id, label: c.name }))}
                                value={dropdownData.coordinators?.filter(c => filters.coordinatorId.split(',').includes(c._id)).map(c => ({ value: c._id, label: c.name }))}
                                onChange={(selected) => handleMultiSelectChange(selected, "coordinatorId")}
                                placeholder="Select Coordinator"
                                styles={customSelectStyles}
                                className="text-sm"
                            />
                        </div>

                        {/* From Date */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">From Date</label>
                            <input
                                type="date"
                                name="fromDate"
                                value={filters.fromDate}
                                onChange={handleFilterChange}
                                className={`p-2 rounded-lg border focus:border-cyan-500 outline-none text-sm ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                            />
                        </div>

                        {/* To Date */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">To Date</label>
                            <input
                                type="date"
                                name="toDate"
                                value={filters.toDate}
                                onChange={handleFilterChange}
                                className={`p-2 rounded-lg border focus:border-cyan-500 outline-none text-sm ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                            />
                        </div>
                    </div>

                    {/* Search Actions Row */}
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={fetchClasses} className="bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded-lg w-10 h-10 flex items-center justify-center transition shadow-lg shadow-cyan-900/20"><FaSearch /></button>
                        <button onClick={clearFilters} className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} p-2 rounded-lg w-10 h-10 flex items-center justify-center transition`}><FaTimes /></button>
                    </div>
                </div>

                {/* Table Section */}
                <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700 shadow-2xl' : 'bg-white border-gray-200 shadow-md'} rounded-xl border overflow-hidden p-6 transition-colors`}>

                    {/* Header: Title & Add Button */}
                    <div className={`flex justify-between items-center mb-6 border-b pb-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                        <div>
                            <h2 className={`text-xl font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Class List</h2>
                        </div>
                        {canCreate && (
                            <button
                                onClick={() => navigate("/academics/class/add")}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-blue-900/40 transition-all uppercase text-sm"
                            >
                                <FaPlus /> Add Class
                            </button>
                        )}
                    </div>

                    {/* Search & Pagination Control */}
                    <div className="flex justify-between items-center mb-6">
                        <input
                            type="text"
                            name="search"
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="Search class name, teacher..."
                            className={`px-4 py-2 rounded-lg border focus:border-cyan-500 outline-none w-80 transition-all shadow-inner ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                        />
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className={`px-4 py-2 rounded-lg border focus:border-cyan-500 outline-none transition-all shadow-inner ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                        >
                            <option value="10">10 per page</option>
                            <option value="20">20 per page</option>
                            <option value="50">50 per page</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b ${isDarkMode ? 'bg-[#2a3038] text-gray-300 border-gray-700' : 'bg-gray-50 text-gray-600 border-gray-200'} text-xs uppercase font-bold tracking-wider`}>
                                    <th className="p-4">Class Name</th>
                                    <th className="p-4">Batch</th>
                                    <th className="p-4">Class Mode</th>
                                    <th className="p-4">Center</th>
                                    <th className="p-4">Subject</th>
                                    <th className="p-4">Teacher</th>
                                    <th className="p-4">Coordinator</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Start Time</th>
                                    <th className="p-4">End Time</th>
                                    <th className="p-4">Actual Time</th>
                                    <th className="p-4 text-center">Teacher Attendance</th>
                                    <th className="p-4 text-center">Study Status</th>
                                    <th className="p-4">Feedback</th>
                                    <th className="p-4">Start/End</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr><td colSpan="16" className="p-8 text-center text-gray-500 bg-[#1e2530]/50 animate-pulse">Fetching class data...</td></tr>
                                ) : classes.length === 0 ? (
                                    <tr><td colSpan="16" className="p-12 text-center text-gray-500 uppercase tracking-widest opacity-50">No classes found with selected filters</td></tr>
                                ) : (
                                    classes.map((cls) => (
                                        <tr key={cls._id} className={`transition-colors text-sm group ${isDarkMode ? 'hover:bg-[#252b32] text-gray-300' : 'hover:bg-gray-50 text-gray-600'}`}>
                                            <td className={`p-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cls.className}</td>
                                            <td className="p-4">{cls.batchId?.batchName || cls.batchId?.name || "-"}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cls.classMode === 'Online' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                                                    {cls.classMode}
                                                </span>
                                            </td>
                                            <td className="p-4">{cls.centreId?.centreName || cls.centreId?.name || "-"}</td>
                                            <td className="p-4">{cls.subjectId?.subjectName || cls.subjectId?.name || "-"}</td>
                                            <td className="p-4 font-medium text-cyan-400/80">{cls.teacherId?.name || "-"}</td>
                                            <td className="p-4">{cls.coordinatorId?.name || "-"}</td>
                                            <td className="p-4 font-mono">{formatDate(cls.date)}</td>
                                            <td className="p-4 text-xs font-bold text-gray-400">{cls.startTime}</td>
                                            <td className="p-4 text-xs font-bold text-gray-400">{cls.endTime}</td>
                                            <td className="p-4 text-xs font-bold text-gray-400">
                                                {cls.actualStartTime ? new Date(cls.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                                {" - "}
                                                {cls.actualEndTime ? new Date(cls.actualEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                            </td>
                                            <td className="p-4 text-center">
                                                {cls.teacherAttendance ? (
                                                    <span className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-600/50 flex items-center justify-center gap-1 mx-auto w-fit">
                                                        <FaCheck size={10} /> Present
                                                    </span>
                                                ) : (
                                                    <span className="bg-red-600/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-600/50 flex items-center justify-center gap-1 mx-auto w-fit">
                                                        Absent
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-mono text-[10px] text-cyan-400">
                                                {cls.studyStartTime ? new Date(cls.studyStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                            </td>
                                            <td className="p-4 text-center">
                                                {cls.status === "Completed" && (isAdmin || isCoordinator) && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedClassForFeedback(cls);
                                                            const existingFeedback = cls.teacherFeedback && cls.teacherFeedback.length > 0
                                                                ? cls.teacherFeedback
                                                                : staticFeedbackCriteria.map(criteria => ({ criteria, rating: "Good" }));
                                                            setTeacherFeedback(existingFeedback);
                                                            setShowFeedbackModal(true);
                                                        }}
                                                        className="bg-purple-600/10 text-purple-400 px-3 py-1 rounded text-[10px] font-bold uppercase border border-purple-600/30 hover:bg-purple-600 hover:text-white transition-all shadow-lg"
                                                    >
                                                        {cls.teacherFeedback && cls.teacherFeedback.length > 0 ? "Feedback" : "Add Feedback"}
                                                    </button>
                                                )}
                                                {cls.status === "Completed" && isTeacher && <span className="text-[10px] font-bold text-gray-500 uppercase italic">Locked</span>}
                                                {cls.status !== "Completed" && "-"}
                                            </td>
                                            <td className="p-4">
                                                <div className="relative group/hover">
                                                    {cls.status === "Upcoming" && (
                                                        (isAdmin || isCoordinator) ? (
                                                            <button
                                                                onClick={() => handleStartClass(cls._id)}
                                                                className="bg-green-600/10 text-green-400 px-3 py-1 rounded text-[10px] font-bold uppercase border border-green-600/30 hover:bg-green-600 hover:text-white transition-all shadow-lg shadow-green-900/10"
                                                            >
                                                                Start
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-gray-600 uppercase italic">Upcoming</span>
                                                        )
                                                    )}
                                                    {cls.status === "Ongoing" && (
                                                        <div className="flex gap-1 items-center">
                                                            {(isAdmin || isCoordinator) ? (
                                                                <button
                                                                    onClick={() => handleEndClass(cls._id)}
                                                                    className="bg-red-600 text-white px-3 py-1 rounded text-[10px] font-bold uppercase border border-red-700 hover:bg-red-700 transition-all shadow-lg animate-pulse"
                                                                >
                                                                    End
                                                                </button>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-cyan-400 uppercase italic animate-pulse">Ongoing</span>
                                                            )}
                                                            <div className="invisible group-hover/hover:visible">
                                                                <TimeRemaining endTimeString={cls.endTime} classDate={cls.date} />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {cls.status === "Completed" && (
                                                        <span className="text-[10px] font-bold text-gray-600 uppercase italic">Completed</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {(canEdit || isAdmin || isCoordinator) && (
                                                        <button onClick={() => handleEdit(cls)} title="Edit Class" className="text-yellow-400 hover:text-yellow-200 transition-colors">
                                                            <FaEdit />
                                                        </button>
                                                    )}
                                                    {(canDelete || isAdmin || isCoordinator) && (
                                                        <button onClick={() => handleDelete(cls._id)} title="Delete Class" className="text-red-400 hover:text-red-300 transition-colors">
                                                            <FaTrash />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className={`flex flex-col md:flex-row justify-between items-center mt-6 text-sm border-t pt-6 gap-4 ${isDarkMode ? 'text-gray-400 border-gray-800' : 'text-gray-500 border-gray-100'}`}>
                        <div className="flex items-center gap-6">
                            <div>
                                Showing <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-bold`}>{totalRecords === 0 ? 0 : ((page - 1) * limit) + 1}</span> to <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-bold`}>{Math.min(page * limit, totalRecords)}</span> of <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-bold`}>{totalRecords}</span> entries
                            </div>
                            <form onSubmit={handleJumpPage} className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-lg border ${isDarkMode ? 'bg-[#131619] border-gray-700' : 'bg-gray-50 border-gray-300'}`}>
                                <span className="text-[10px] font-bold uppercase text-gray-500">Go to</span>
                                <input
                                    type="text"
                                    value={jumpPage}
                                    onChange={(e) => setJumpPage(e.target.value)}
                                    placeholder="Pg"
                                    className={`w-10 bg-transparent text-center outline-none text-xs font-bold font-mono ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                                />
                            </form>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                disabled={page === 1}
                                className={`px-3 py-2 rounded-lg disabled:opacity-30 transition font-bold text-xs flex items-center gap-1 ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                <span>&lt;</span> Prev
                            </button>

                            <div className="flex gap-1">
                                {renderPageNumbers()}
                            </div>

                            <button
                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={page === totalPages || totalPages === 0}
                                className={`px-3 py-2 rounded-lg disabled:opacity-30 transition font-bold text-xs flex items-center gap-1 ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                Next <span>&gt;</span>
                            </button>
                        </div>
                    </div>

                </div>

                {/* Edit Modal */}
                {showEditModal && editingClassData && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                        <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'} w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200`}>
                            <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'bg-[#1e2530] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                <h3 className={`text-lg font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    <div className="w-2 h-6 bg-yellow-500 rounded-full"></div>
                                    Edit Class Schedule
                                </h3>
                                <button onClick={() => setShowEditModal(false)} className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition-colors p-2 hover:bg-gray-200 rounded-lg`}>
                                    <FaTimes />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateClass} className="overflow-y-auto max-h-[80vh]">
                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Class Name */}
                                    <div className="flex flex-col gap-2">
                                        <label className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Class Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingClassData.className}
                                            onChange={(e) => setEditingClassData({ ...editingClassData, className: e.target.value })}
                                            className={`p-3 rounded-lg border focus:border-yellow-500 outline-none transition-all ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                                        />
                                    </div>

                                    {/* Date */}
                                    <div className="flex flex-col gap-2">
                                        <label className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={editingClassData.date}
                                            onChange={(e) => setEditingClassData({ ...editingClassData, date: e.target.value })}
                                            className={`p-3 rounded-lg border focus:border-yellow-500 outline-none transition-all ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                                        />
                                    </div>

                                    {/* Start & End Time */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-2">
                                            <label className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Start Time</label>
                                            <input
                                                type="time"
                                                required
                                                value={editingClassData.startTime}
                                                onChange={(e) => setEditingClassData({ ...editingClassData, startTime: e.target.value })}
                                                className={`p-3 rounded-lg border focus:border-yellow-500 outline-none transition-all ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>End Time</label>
                                            <input
                                                type="time"
                                                required
                                                value={editingClassData.endTime}
                                                onChange={(e) => setEditingClassData({ ...editingClassData, endTime: e.target.value })}
                                                className={`p-3 rounded-lg border focus:border-yellow-500 outline-none transition-all ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Center */}
                                    <div className="flex flex-col gap-2">
                                        <label className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Center</label>
                                        <select
                                            required
                                            value={editingClassData.centreId}
                                            onChange={(e) => setEditingClassData({ ...editingClassData, centreId: e.target.value })}
                                            className={`p-3 rounded-lg border focus:border-yellow-500 outline-none transition-all ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                                        >
                                            <option value="">Select Center</option>
                                            {dropdownData.centres?.map(c => <option key={c._id} value={c._id}>{c.centreName || c.name}</option>)}
                                        </select>
                                    </div>

                                    {/* Instructor */}
                                    <div className="flex flex-col gap-2">
                                        <label className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Instructor</label>
                                        <select
                                            required
                                            value={editingClassData.teacherId}
                                            onChange={(e) => setEditingClassData({ ...editingClassData, teacherId: e.target.value })}
                                            className={`p-3 rounded-lg border focus:border-yellow-500 outline-none transition-all shadow-lg ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                                        >
                                            <option value="">Select Teacher</option>
                                            {dropdownData.teachers?.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                        </select>
                                    </div>

                                    {/* Coordinator */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Coordinator</label>
                                        <select
                                            required
                                            value={editingClassData.coordinatorId}
                                            onChange={(e) => setEditingClassData({ ...editingClassData, coordinatorId: e.target.value })}
                                            className="bg-[#131619] text-white p-3 rounded-lg border border-gray-700 focus:border-yellow-500 outline-none transition-all transition-all shadow-lg"
                                        >
                                            <option value="">Select Coordinator</option>
                                            {dropdownData.coordinators?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </div>

                                    {/* Class Mode */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Class Mode</label>
                                        <select
                                            required
                                            value={editingClassData.classMode}
                                            onChange={(e) => setEditingClassData({ ...editingClassData, classMode: e.target.value })}
                                            className="bg-[#131619] text-white p-3 rounded-lg border border-gray-700 focus:border-yellow-500 outline-none transition-all transition-all shadow-lg text-sm"
                                        >
                                            <option value="Offline">Offline</option>
                                            <option value="Online">Online</option>
                                        </select>
                                    </div>

                                    {/* Subject */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Subject</label>
                                        <select
                                            required
                                            value={editingClassData.subjectId}
                                            onChange={(e) => setEditingClassData({ ...editingClassData, subjectId: e.target.value })}
                                            className="bg-[#131619] text-white p-3 rounded-lg border border-gray-700 focus:border-yellow-500 outline-none transition-all transition-all shadow-lg text-sm"
                                        >
                                            <option value="">Select Subject</option>
                                            {dropdownData.subjects?.map(s => <option key={s._id} value={s._id}>{s.subjectName || s.name}</option>)}
                                        </select>
                                    </div>

                                    {/* Batches (Multi-select) */}
                                    <div className="flex flex-col gap-2 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase flex justify-between">
                                            <span>Batches (Select multiple)</span>
                                            <span className="text-cyan-500 capitalize">{editingClassData.batchIds?.length || 0} selected</span>
                                        </label>
                                        <select
                                            multiple
                                            required
                                            value={editingClassData.batchIds}
                                            onChange={(e) => {
                                                const options = Array.from(e.target.selectedOptions);
                                                const values = options.map(opt => opt.value);
                                                setEditingClassData({ ...editingClassData, batchIds: values });
                                            }}
                                            className="bg-[#131619] text-white p-3 rounded-lg border border-gray-700 focus:border-yellow-500 outline-none transition-all transition-all shadow-lg h-32 scrollbar-thin scrollbar-thumb-gray-800"
                                        >
                                            {dropdownData.batches?.map(b => (
                                                <option key={b._id} value={b._id} className="p-2 border-b border-gray-800 last:border-0">{b.batchName || b.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-gray-500 italic mt-1">Hold Ctrl (Cmd) to select multiple batches</p>
                                    </div>
                                </div>

                                <div className="p-8 border-t border-gray-800 flex gap-4 bg-[#1e2530]">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="flex-1 px-4 py-4 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition font-bold uppercase text-xs tracking-widest border border-gray-700 hover:border-gray-500 shadow-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] px-8 py-4 bg-yellow-600 text-white rounded-xl hover:bg-yellow-500 transition font-bold uppercase text-xs tracking-widest shadow-lg shadow-yellow-900/40 border border-yellow-700"
                                    >
                                        Save Changes & Update Schedule
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Feedback Modal */}
                {showFeedbackModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                        <div className="bg-[#1a1f24] w-full max-w-lg rounded-2xl border border-gray-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#1e2530]">
                                <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-2 h-6 bg-purple-500 rounded-full"></div>
                                    Teacher Performance Feedback
                                </h3>
                                <button onClick={() => setShowFeedbackModal(false)} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg">
                                    <FaTimes />
                                </button>
                            </div>
                            <form onSubmit={handleSubmitFeedback} className="p-6 space-y-4">
                                <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                                    {teacherFeedback.map((item, index) => (
                                        <div key={index} className="bg-[#131619] p-4 rounded-xl border border-gray-800 space-y-3">
                                            <div className="flex gap-3">
                                                <span className="bg-purple-600/20 text-purple-400 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold border border-purple-600/30 flex-shrink-0">
                                                    {index + 1}
                                                </span>
                                                <p className="text-gray-300 text-sm leading-relaxed">{item.criteria}</p>
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                {["Excellent", "Good", "Average", "Bad"].map((r) => (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...teacherFeedback];
                                                            updated[index].rating = r;
                                                            setTeacherFeedback(updated);
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${item.rating === r
                                                            ? r === "Excellent" ? "bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/40"
                                                                : r === "Good" ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40"
                                                                    : r === "Average" ? "bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-900/40"
                                                                        : "bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/40"
                                                            : "bg-[#1e2530] border-gray-700 text-gray-500 hover:text-gray-300"
                                                            }`}
                                                    >
                                                        {r}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 border-t border-gray-800 flex gap-3 bg-[#1e2530]">
                                    <button
                                        type="button"
                                        onClick={() => setShowFeedbackModal(false)}
                                        className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition font-bold uppercase text-xs"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-2 px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition font-bold uppercase text-xs shadow-lg shadow-purple-900/20"
                                    >
                                        Save All Feedback
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Classes;