import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaTimes, FaEdit, FaTrash, FaPlus, FaCheck } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { hasPermission } from "../../config/permissions";

const Classes = () => {
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);

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

    // Filters State
    const [filters, setFilters] = useState({
        centreId: "",
        batchId: "",
        subjectId: "",
        teacherId: "",
        coordinatorId: "",
        fromDate: "",
        toDate: "",
        search: ""
    });

    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user.role === "admin" || user.role === "superAdmin";
    const isSuperAdmin = user.role === "superAdmin";
    const isCoordinator = user.role === "Class_Coordinator";
    const isTeacher = user.role === "teacher";

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

    const clearFilters = () => {
        setFilters({
            centreId: "",
            batchId: "",
            subjectId: "",
            teacherId: "",
            coordinatorId: "",
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
            <div className="p-6 text-gray-100 min-h-screen font-sans">
                <ToastContainer theme="dark" position="top-right" />

                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white uppercase italic tracking-wider">Class List</h1>
                </div>

                {/* Filters Section */}
                <div className="bg-[#1e2530] p-4 rounded-xl border border-gray-700 shadow-lg mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">

                        {/* Center */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">Center</label>
                            <select
                                name="centreId"
                                value={filters.centreId}
                                onChange={handleFilterChange}
                                className="bg-[#131619] text-white p-2 rounded-lg border border-gray-700 focus:border-cyan-500 outline-none text-sm transition-all"
                            >
                                <option value="">Select Center</option>
                                {dropdownData.centres?.map(c => <option key={c._id} value={c._id}>{c.centreName || c.name}</option>)}
                            </select>
                        </div>

                        {/* Batch */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">Batch</label>
                            <select
                                name="batchId"
                                value={filters.batchId}
                                onChange={handleFilterChange}
                                className="bg-[#131619] text-white p-2 rounded-lg border border-gray-700 focus:border-cyan-500 outline-none text-sm transition-all"
                            >
                                <option value="">Select Batch</option>
                                {dropdownData.batches?.map(b => <option key={b._id} value={b._id}>{b.batchName || b.name}</option>)}
                            </select>
                        </div>

                        {/* Subject */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">Subject</label>
                            <select
                                name="subjectId"
                                value={filters.subjectId}
                                onChange={handleFilterChange}
                                className="bg-[#131619] text-white p-2 rounded-lg border border-gray-700 focus:border-cyan-500 outline-none text-sm transition-all"
                            >
                                <option value="">Select Subject</option>
                                {dropdownData.subjects?.map(s => <option key={s._id} value={s._id}>{s.subjectName || s.name}</option>)}
                            </select>
                        </div>

                        {/* Teacher */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">Teacher</label>
                            <select
                                name="teacherId"
                                value={filters.teacherId}
                                onChange={handleFilterChange}
                                className="bg-[#131619] text-white p-2 rounded-lg border border-gray-700 focus:border-cyan-500 outline-none text-sm transition-all"
                            >
                                <option value="">Select Teacher</option>
                                {dropdownData.teachers?.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                        </div>

                        {/* Coordinator */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">Coordinator</label>
                            <select
                                name="coordinatorId"
                                value={filters.coordinatorId}
                                onChange={handleFilterChange}
                                className="bg-[#131619] text-white p-2 rounded-lg border border-gray-700 focus:border-cyan-500 outline-none text-sm transition-all"
                            >
                                <option value="">Select Coordinator</option>
                                {dropdownData.coordinators?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* From Date */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1 uppercase letter-spacing-wide">From Date</label>
                            <input
                                type="date"
                                name="fromDate"
                                value={filters.fromDate}
                                onChange={handleFilterChange}
                                className="bg-[#131619] text-white p-2 rounded-lg border border-gray-700 focus:border-cyan-500 outline-none text-sm"
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
                                className="bg-[#131619] text-white p-2 rounded-lg border border-gray-700 focus:border-cyan-500 outline-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Search Actions Row */}
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={fetchClasses} className="bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded-lg w-10 h-10 flex items-center justify-center transition shadow-lg shadow-cyan-900/20"><FaSearch /></button>
                        <button onClick={clearFilters} className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg w-10 h-10 flex items-center justify-center transition"><FaTimes /></button>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-[#1e2530] rounded-xl border border-gray-700 shadow-2xl overflow-hidden p-6">

                    {/* Header: Title & Add Button */}
                    <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                        <div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Class List</h2>
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
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-cyan-500 outline-none w-80 transition-all shadow-inner"
                        />
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-cyan-500 outline-none transition-all shadow-inner"
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
                                <tr className="bg-[#2a3038] text-gray-300 text-xs uppercase font-bold tracking-wider">
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
                            <tbody className="divide-y divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan="16" className="p-8 text-center text-gray-500 bg-[#1e2530]/50 animate-pulse">Fetching class data...</td></tr>
                                ) : classes.length === 0 ? (
                                    <tr><td colSpan="16" className="p-12 text-center text-gray-500 uppercase tracking-widest opacity-50">No classes found with selected filters</td></tr>
                                ) : (
                                    classes.map((cls) => (
                                        <tr key={cls._id} className="hover:bg-[#252b32] transition-colors text-sm text-gray-300 group">
                                            <td className="p-4 font-semibold text-white">{cls.className}</td>
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
                    <div className="flex justify-between items-center mt-6 text-sm text-gray-400 border-t border-gray-800 pt-6">
                        <div>
                            Showing <span className="text-white font-bold">{totalRecords === 0 ? 0 : ((page - 1) * limit) + 1}</span> to <span className="text-white font-bold">{Math.min(page * limit, totalRecords)}</span> of <span className="text-white font-bold">{totalRecords}</span> entries
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                disabled={page === 1}
                                className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-30 transition font-bold"
                            >
                                &lt; Prev
                            </button>
                            <span className="flex items-center px-4 bg-gray-900/50 rounded-lg border border-gray-700 text-xs text-cyan-400 font-mono"> Page {page} / {totalPages} </span>
                            <button
                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={page === totalPages || totalPages === 0}
                                className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-30 transition font-bold"
                            >
                                Next &gt;
                            </button>
                        </div>
                    </div>

                </div>

                {/* Edit Modal */}
                {showEditModal && editingClassData && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                        <div className="bg-[#1a1f24] w-full max-w-4xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#1e2530]">
                                <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-2 h-6 bg-yellow-500 rounded-full"></div>
                                    Edit Class Schedule
                                </h3>
                                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg">
                                    <FaTimes />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateClass} className="overflow-y-auto max-h-[80vh]">
                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Class Name */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Class Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingClassData.className}
                                            onChange={(e) => setEditingClassData({ ...editingClassData, className: e.target.value })}
                                            className="bg-[#131619] text-white p-3 rounded-lg border border-gray-700 focus:border-yellow-500 outline-none transition-all"
                                        />
                                    </div>

                                    {/* Date */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={editingClassData.date}
                                            onChange={(e) => setEditingClassData({ ...editingClassData, date: e.target.value })}
                                            className="bg-[#131619] text-white p-3 rounded-lg border border-gray-700 focus:border-yellow-500 outline-none transition-all"
                                        />
                                    </div>

                                    {/* Start & End Time */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase">Start Time</label>
                                            <input
                                                type="time"
                                                required
                                                value={editingClassData.startTime}
                                                onChange={(e) => setEditingClassData({ ...editingClassData, startTime: e.target.value })}
                                                className="bg-[#131619] text-white p-3 rounded-lg border border-gray-700 focus:border-yellow-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase">End Time</label>
                                            <input
                                                type="time"
                                                required
                                                value={editingClassData.endTime}
                                                onChange={(e) => setEditingClassData({ ...editingClassData, endTime: e.target.value })}
                                                className="bg-[#131619] text-white p-3 rounded-lg border border-gray-700 focus:border-yellow-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Center */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Center</label>
                                        <select
                                            required
                                            value={editingClassData.centreId}
                                            onChange={(e) => setEditingClassData({ ...editingClassData, centreId: e.target.value })}
                                            className="bg-[#131619] text-white p-3 rounded-lg border border-gray-700 focus:border-yellow-500 outline-none transition-all"
                                        >
                                            <option value="">Select Center</option>
                                            {dropdownData.centres?.map(c => <option key={c._id} value={c._id}>{c.centreName || c.name}</option>)}
                                        </select>
                                    </div>

                                    {/* Instructor */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Instructor</label>
                                        <select
                                            required
                                            value={editingClassData.teacherId}
                                            onChange={(e) => setEditingClassData({ ...editingClassData, teacherId: e.target.value })}
                                            className="bg-[#131619] text-white p-3 rounded-lg border border-gray-700 focus:border-yellow-500 outline-none transition-all transition-all shadow-lg"
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