import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaTimes, FaPlay } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { hasPermission } from "../../config/permissions";
import { useTheme } from "../../context/ThemeContext";

const UpcomingClass = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    // Permission States
    const [canEdit, setCanEdit] = useState(false);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user.role === "admin" || user.role === "superAdmin";
    const isCoordinator = user.role === "Class_Coordinator";

    useEffect(() => {
        const userObj = JSON.parse(localStorage.getItem("user") || "{}");
        // 'UpcomingClass' belongs to 'academics.classes' logically for edit/start
        setCanEdit(hasPermission(userObj, "academics", "upcomingClass", "edit") || hasPermission(userObj, "academics", "classes", "edit"));
    }, []);

    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchClasses();
    }, [page, limit]);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams({
                page,
                limit,
                status: "Upcoming",
                search
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
                toast.error(data.message || "Failed to fetch upcoming classes");
            }
        } catch (error) {
            toast.error("Error fetching upcoming classes");
        } finally {
            setLoading(false);
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

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
    };

    return (
        <Layout activePage="Academics">
            <div className={`p-6 min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900 bg-[#f8fafc]'}`}>
                <ToastContainer theme={theme} position="top-right" />

                <div className="flex justify-between items-center mb-6">
                    <h1 className={`text-3xl font-bold uppercase italic tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Upcoming Class</h1>
                </div>

                <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700 shadow-2xl' : 'bg-white border-gray-200 shadow-md'} rounded-xl border overflow-hidden p-6 transition-colors`}>
                    <div className="flex justify-between items-center mb-6">
                        <div className="relative w-64">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                className={`px-4 py-2 pl-10 rounded-lg border focus:border-blue-500 outline-none w-full transition-all ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                            />
                            <FaSearch className="absolute left-3 top-3 text-gray-400" />
                        </div>
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className={`px-4 py-2 rounded-lg border focus:border-blue-500 outline-none transition-all ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                        >
                            <option value="10">10 per page</option>
                            <option value="20">20 per page</option>
                            <option value="50">50 per page</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b ${isDarkMode ? 'bg-[#2a3038] text-gray-300 border-gray-700' : 'bg-gray-50 text-gray-600 border-gray-200'} text-xs uppercase font-bold tracking-wider`}>
                                    <th className="p-4">Class Name</th>
                                    <th className="p-4">Class Mode</th>
                                    <th className="p-4">Batch</th>
                                    <th className="p-4">Teacher</th>
                                    <th className="p-4">Center</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Start Time</th>
                                    <th className="p-4">End Time</th>
                                    <th className="p-4">Subject</th>
                                    <th className="p-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr><td colSpan="10" className="p-8 text-center text-gray-500">Loading...</td></tr>
                                ) : classes.length === 0 ? (
                                    <tr><td colSpan="10" className="p-8 text-center text-gray-500 uppercase tracking-widest opacity-50">No upcoming classes assigned</td></tr>
                                ) : (
                                    classes.map((cls) => (
                                        <tr key={cls._id} className={`transition-colors text-sm ${isDarkMode ? 'hover:bg-[#252b32] text-gray-300' : 'hover:bg-gray-50 text-gray-600'}`}>
                                            <td className={`p-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cls.className}</td>
                                            <td className="p-4">{cls.classMode}</td>
                                            <td className="p-4">
                                                {cls.batchIds && cls.batchIds.length > 0
                                                    ? cls.batchIds.map(b => b.batchName || b.name).join(", ")
                                                    : (cls.batchId?.batchName || cls.batchId?.name || "-")}
                                            </td>
                                            <td className="p-4 font-medium text-cyan-400/80">{cls.teacherId?.name || "-"}</td>
                                            <td className="p-4">{cls.centreId?.centreName || cls.centreId?.name || "-"}</td>
                                            <td className="p-4">{formatDate(cls.date)}</td>
                                            <td className="p-4">{cls.startTime}</td>
                                            <td className="p-4">{cls.endTime}</td>
                                            <td className="p-4">{cls.subjectId?.subjectName || cls.subjectId?.name || "-"}</td>
                                            <td className="p-4 text-center">
                                                {(canEdit || isAdmin || isCoordinator) ? (
                                                    <button
                                                        onClick={() => handleStartClass(cls._id)}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase transition shadow-lg shadow-green-900/20 mx-auto"
                                                    >
                                                        <FaPlay size={10} /> Start
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase italic">Assigned</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className={`flex justify-between items-center mt-6 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <div>
                            Showing {totalRecords === 0 ? 0 : ((page - 1) * limit) + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} entries
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                disabled={page === 1}
                                className={`px-4 py-2 rounded-lg disabled:opacity-50 transition font-bold ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                Previous
                            </button>
                            <div className="flex gap-1">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPage(i + 1)}
                                        className={`w-10 h-10 flex items-center justify-center rounded-lg transition font-bold ${page === i + 1
                                            ? "bg-blue-600 text-white shadow-lg"
                                            : isDarkMode ? "bg-gray-800 text-gray-400 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={page === totalPages || totalPages === 0}
                                className={`px-4 py-2 rounded-lg disabled:opacity-50 transition font-bold ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default UpcomingClass;
