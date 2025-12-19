import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaStop, FaClipboardList, FaCheck } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const OngoingClass = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user.role === "admin" || user.role === "superAdmin";

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
                status: "Ongoing",
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
                toast.error(data.message || "Failed to fetch ongoing classes");
            }
        } catch (error) {
            toast.error("Error fetching ongoing classes");
        } finally {
            setLoading(false);
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

    const handleAttendance = async (classId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class-schedule/mark-attendance/${classId}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Attendance marked successfully!");
                fetchClasses(); // Refresh the list
            } else {
                toast.error(data.message || "Failed to mark attendance");
            }
        } catch (error) {
            toast.error("Error marking attendance");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
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
                    <h1 className="text-3xl font-bold text-white uppercase italic tracking-wider">Ongoing Class</h1>
                </div>

                <div className="bg-[#1e2530] rounded-xl border border-gray-700 shadow-2xl overflow-hidden p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="relative w-64">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="bg-[#131619] text-white px-4 py-2 pl-10 rounded-lg border border-gray-700 focus:border-blue-500 outline-none w-full"
                            />
                            <FaSearch className="absolute left-3 top-3 text-gray-500" />
                        </div>
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                        >
                            <option value="10">10 per page</option>
                            <option value="20">20 per page</option>
                            <option value="50">50 per page</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#2a3038] text-gray-300 text-xs uppercase font-bold tracking-wider">
                                    <th className="p-4">Class Name</th>
                                    <th className="p-4">Class Mode</th>
                                    <th className="p-4">Batch</th>
                                    <th className="p-4">Center</th>
                                    <th className="p-4">Started At</th>
                                    <th className="p-4">Subject</th>
                                    <th className="p-4 text-center">Attendance</th>
                                    <th className="p-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan="8" className="p-8 text-center text-gray-500">Loading...</td></tr>
                                ) : classes.length === 0 ? (
                                    <tr><td colSpan="8" className="p-8 text-center text-gray-500 uppercase tracking-widest opacity-50">No classes are currently ongoing</td></tr>
                                ) : (
                                    classes.map((cls) => (
                                        <tr key={cls._id} className="hover:bg-[#252b32] transition-colors text-sm text-gray-300">
                                            <td className="p-4 font-semibold text-white">{cls.className}</td>
                                            <td className="p-4">{cls.classMode}</td>
                                            <td className="p-4">{cls.batchId?.batchName || cls.batchId?.name || "-"}</td>
                                            <td className="p-4">{cls.centreId?.centreName || cls.centreId?.name || "-"}</td>
                                            <td className="p-4">
                                                {cls.actualStartTime ? new Date(cls.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                            </td>
                                            <td className="p-4">{cls.subjectId?.subjectName || cls.subjectId?.name || "-"}</td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center">
                                                    <label className="flex items-center gap-2 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            checked={cls.teacherAttendance || false}
                                                            onChange={() => !cls.teacherAttendance && handleAttendance(cls._id)}
                                                            disabled={cls.teacherAttendance}
                                                            className="w-5 h-5 rounded border-2 border-blue-500 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                                                        />
                                                        <span className={`text-xs font-bold uppercase ${cls.teacherAttendance ? 'text-green-400' : 'text-gray-400 group-hover:text-blue-400'}`}>
                                                            {cls.teacherAttendance ? 'Present' : 'Mark'}
                                                        </span>
                                                    </label>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="relative group/hover inline-block">
                                                    {isAdmin ? (
                                                        <button
                                                            onClick={() => handleEndClass(cls._id)}
                                                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase transition shadow-lg shadow-red-900/20"
                                                        >
                                                            <FaStop size={10} /> End
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-cyan-400 uppercase italic animate-pulse cursor-help">
                                                            Ongoing
                                                        </span>
                                                    )}
                                                    <div className="invisible group-hover/hover:visible">
                                                        <TimeRemaining endTimeString={cls.endTime} classDate={cls.date} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center mt-6 text-sm text-gray-400">
                        <div>
                            Showing {totalRecords === 0 ? 0 : ((page - 1) * limit) + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} entries
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                disabled={page === 1}
                                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition"
                            >
                                Previous
                            </button>
                            <span> Page {page} of {totalPages} </span>
                            <button
                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={page === totalPages || totalPages === 0}
                                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition"
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

export default OngoingClass;
