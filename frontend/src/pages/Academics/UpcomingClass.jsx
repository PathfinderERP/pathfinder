import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaTimes, FaPlay } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const UpcomingClass = () => {
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
            <div className="p-6 text-gray-100 min-h-screen font-sans">
                <ToastContainer theme="dark" position="top-right" />

                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white uppercase italic tracking-wider">Upcoming Class</h1>
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
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Start Time</th>
                                    <th className="p-4">End Time</th>
                                    <th className="p-4">Subject</th>
                                    <th className="p-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan="9" className="p-8 text-center text-gray-500">Loading...</td></tr>
                                ) : classes.length === 0 ? (
                                    <tr><td colSpan="9" className="p-8 text-center text-gray-500 uppercase tracking-widest opacity-50">No upcoming classes assigned</td></tr>
                                ) : (
                                    classes.map((cls) => (
                                        <tr key={cls._id} className="hover:bg-[#252b32] transition-colors text-sm text-gray-300">
                                            <td className="p-4 font-semibold text-white">{cls.className}</td>
                                            <td className="p-4">{cls.classMode}</td>
                                            <td className="p-4">{cls.batchId?.batchName || cls.batchId?.name || "-"}</td>
                                            <td className="p-4">{cls.centreId?.centreName || cls.centreId?.name || "-"}</td>
                                            <td className="p-4">{formatDate(cls.date)}</td>
                                            <td className="p-4">{cls.startTime}</td>
                                            <td className="p-4">{cls.endTime}</td>
                                            <td className="p-4">{cls.subjectId?.subjectName || cls.subjectId?.name || "-"}</td>
                                            <td className="p-4 text-center">
                                                {isAdmin ? (
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
                            <div className="flex gap-1">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPage(i + 1)}
                                        className={`w-10 h-10 flex items-center justify-center rounded-lg transition ${page === i + 1 ? "bg-blue-600 text-white font-bold" : "bg-gray-700 hover:bg-gray-600"}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
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

export default UpcomingClass;
