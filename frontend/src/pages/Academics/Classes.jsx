import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaTimes, FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";

const Classes = () => {
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters State
    const [filters, setFilters] = useState({
        centreId: "",
        batchId: "",
        subjectId: "",
        teacherId: "",
        fromDate: "",
        toDate: "",
        search: ""
    });

    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    // Dropdown Data State
    const [dropdownData, setDropdownData] = useState({
        centres: [],
        batches: [],
        subjects: [],
        teachers: []
    });

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
            fromDate: "",
            toDate: "",
            search: ""
        });
        setPage(1);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this class?")) return;
        // Mock Delete or Implement Delete Route
        // For now, let's assume Delete route isn't fully ready or we use a generic delete
        // If specific delete is needed, we should add it to controller/route
        toast.info("Delete functionality would go here.");
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
                    <h1 className="text-3xl font-bold text-white">Class List</h1>
                    {/* Header Controls (Theme, User) are typically in Layout/Sidebar, so keeping it simple here per screenshot */}
                </div>

                {/* Filters Section */}
                <div className="bg-[#1e2530] p-4 rounded-xl border border-gray-700 shadow-lg mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">

                        {/* Center */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1">Center</label>
                            <select
                                name="centreId"
                                value={filters.centreId}
                                onChange={handleFilterChange}
                                className="bg-[#131619] text-white p-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none text-sm"
                            >
                                <option value="">Select Center</option>
                                {dropdownData.centres.map(c => <option key={c._id} value={c._id}>{c.centreName || c.name}</option>)}
                            </select>
                        </div>

                        {/* Batch */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1">Batch</label>
                            <select
                                name="batchId"
                                value={filters.batchId}
                                onChange={handleFilterChange}
                                className="bg-[#131619] text-white p-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none text-sm"
                            >
                                <option value="">Select Batch</option>
                                {dropdownData.batches.map(b => <option key={b._id} value={b._id}>{b.batchName || b.name}</option>)}
                            </select>
                        </div>

                        {/* Subject */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1">Subject</label>
                            <select
                                name="subjectId"
                                value={filters.subjectId}
                                onChange={handleFilterChange}
                                className="bg-[#131619] text-white p-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none text-sm"
                            >
                                <option value="">Select Subject</option>
                                {dropdownData.subjects.map(s => <option key={s._id} value={s._id}>{s.subjectName || s.name}</option>)}
                            </select>
                        </div>

                        {/* Teacher */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1">Teacher</label>
                            <select
                                name="teacherId"
                                value={filters.teacherId}
                                onChange={handleFilterChange}
                                className="bg-[#131619] text-white p-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none text-sm"
                            >
                                <option value="">Select Teacher</option>
                                {dropdownData.teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                        </div>

                        {/* From Date */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1">From Date</label>
                            <input
                                type="date"
                                name="fromDate"
                                value={filters.fromDate}
                                onChange={handleFilterChange}
                                className="bg-[#131619] text-white p-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none text-sm"
                            />
                        </div>

                        {/* To Date */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-400 mb-1 ml-1">To Date</label>
                            <input
                                type="date"
                                name="toDate"
                                value={filters.toDate}
                                onChange={handleFilterChange}
                                className="bg-[#131619] text-white p-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Search Actions Row */}
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={fetchClasses} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg w-10 h-10 flex items-center justify-center transition"><FaSearch /></button>
                        <button onClick={clearFilters} className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg w-10 h-10 flex items-center justify-center transition"><FaTimes /></button>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-[#1e2530] rounded-xl border border-gray-700 shadow-2xl overflow-hidden p-4">

                    {/* Header: Title & Add Button */}
                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
                        <div>
                            <h2 className="text-xl font-bold text-white">Class List</h2>
                            {/* <p className="text-gray-400 text-sm">No classes found with selected filters</p> */}
                        </div>
                        <button
                            onClick={() => navigate("/academics/class/add")}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-md transition"
                        >
                            <FaPlus /> Add Class
                        </button>
                    </div>

                    {/* Search & Pagination Control */}
                    <div className="flex justify-between items-center mb-4">
                        <input
                            type="text"
                            name="search"
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="Search..."
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none w-64"
                        />
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

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#2a3038] text-gray-300 text-xs uppercase font-bold">
                                    <th className="p-3">Class Name</th>
                                    <th className="p-3">Batch</th>
                                    <th className="p-3">Class Mode</th>
                                    <th className="p-3">Center</th>
                                    <th className="p-3">Subject</th>
                                    <th className="p-3">Teacher</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Start Time</th>
                                    <th className="p-3">End Time</th>
                                    <th className="p-3">Feedback</th>
                                    <th className="p-3">Start/End</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan="12" className="p-8 text-center text-gray-500">Loading...</td></tr>
                                ) : classes.length === 0 ? (
                                    <tr><td colSpan="12" className="p-8 text-center text-gray-500">No data found</td></tr>
                                ) : (
                                    classes.map((cls) => (
                                        <tr key={cls._id} className="hover:bg-[#252b32] transition-colors text-sm text-gray-300">
                                            <td className="p-3 font-semibold text-white">{cls.className}</td>
                                            <td className="p-3">{cls.batchId?.batchName || cls.batchId?.name || "-"}</td>
                                            <td className="p-3">{cls.classMode}</td>
                                            <td className="p-3">{cls.centreId?.centreName || cls.centreId?.name || "-"}</td>
                                            <td className="p-3">{cls.subjectId?.subjectName || cls.subjectId?.name || "-"}</td>
                                            <td className="p-3">{cls.teacherId?.name || "-"}</td>
                                            <td className="p-3">{formatDate(cls.date)}</td>
                                            <td className="p-3">{cls.startTime}</td>
                                            <td className="p-3">{cls.endTime}</td>
                                            <td className="p-3 text-center">-</td>
                                            <td className="p-3">
                                                {/* Placeholder Buttons */}
                                                <button className="bg-green-600/20 text-green-400 px-2 py-1 rounded text-xs border border-green-600/50 hover:bg-green-600/40">Start</button>
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => toast.info("Edit feature coming soon")} className="text-yellow-400 hover:text-yellow-300"><FaEdit /></button>
                                                    <button onClick={() => handleDelete(cls._id)} className="text-red-400 hover:text-red-300"><FaTrash /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
                        <div>
                            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} entries
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                disabled={page === 1}
                                className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
                            >
                                &lt; Previous
                            </button>
                            <span> Page {page} </span>
                            <button
                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={page === totalPages || totalPages === 0}
                                className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
                            >
                                Next &gt;
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </Layout>
    );
};

export default Classes;