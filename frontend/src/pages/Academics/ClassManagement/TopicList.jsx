import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaListUl } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "../../../context/ThemeContext";

import { hasPermission } from "../../../config/permissions";
import ExcelImportExport from "../../../components/common/ExcelImportExport";

const TopicList = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    // ... [existing state]
    const [topics, setTopics] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Pagination & Selection State
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);

    // Filters
    const [filterClass, setFilterClass] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    const [filterChapter, setFilterChapter] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [viewOnly, setViewOnly] = useState(false);
    const [formData, setFormData] = useState({ topicName: "", chapterId: "", subjectId: "", classId: "" });
    const [editId, setEditId] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL;
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, "academics", "topics", "create");

    const topicColumns = ["Topic Name", "Chapter Name", "Subject Name", "Class Name"];

    const openAddModal = () => {
        setFormData({ topicName: "", chapterId: "", subjectId: "", classId: "" });
        setEditId(null);
        setViewOnly(false);
        setShowModal(true);
    };

    const handleView = (topic) => {
        setFormData({
            topicName: topic.topicName,
            classId: topic.chapterId?.subjectId?.classId?._id || topic.chapterId?.subjectId?.classId || "",
            subjectId: topic.chapterId?.subjectId?._id || topic.chapterId?.subjectId || "",
            chapterId: topic.chapterId?._id || topic.chapterId || ""
        });
        setViewOnly(true);
        setEditId(null);
        setShowModal(true);
    };

    const fetchTopics = React.useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const query = new URLSearchParams({
                page,
                limit,
                search: searchTerm,
                classId: filterClass,
                subjectId: filterSubject,
                chapterId: filterChapter
            });

            const response = await fetch(`${API_URL}/academics/topic/list?${query.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setTopics(data.topics);
                setTotalPages(data.totalPages);
                setTotalRecords(data.total);
            } else {
                toast.error("Failed to fetch topics");
            }
        } catch {
            toast.error("Error fetching topics");
        } finally {
            setLoading(false);
        }
    }, [API_URL, page, limit, searchTerm, filterClass, filterSubject, filterChapter]);

    const fetchChapters = React.useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/chapter/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setChapters(data);
        } catch {
            toast.error("Error fetching chapters");
        }
    }, [API_URL]);

    const fetchSubjects = React.useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/subject/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setSubjects(data);
        } catch {
            toast.error("Error fetching subjects");
        }
    }, [API_URL]);

    const fetchClasses = React.useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setClasses(data);
        } catch {
            toast.error("Error fetching classes");
        }
    }, [API_URL]);

    const handleBulkImport = async (data) => {
        try {
            const token = localStorage.getItem("token");

            // Map csv headers to expected backend keys if needed, 
            // or rely on backend normalization (which we implemented).
            // Backend expects: topicName/topic, className/classifyId, subjectName/subjectId, chapterName/chapterId

            const response = await fetch(`${API_URL}/academics/topic/bulk-import`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (response.ok) {
                toast.success(`Imported: ${result.results.successCount}, Failed: ${result.results.failedCount}`);
                fetchTopics();
                fetchClasses();
                fetchSubjects();
                fetchChapters();
            } else {
                toast.error(result.message || "Import failed");
            }
        } catch {
            toast.error("Error during import");
        }
    };

    const prepareExportData = () => {
        return topics.map(t => ({
            "Topic Name": t.topicName,
            "Chapter Name": t.chapterId?.chapterName || "N/A",
            "Subject Name": t.chapterId?.subjectId?.subjectName || "N/A",
            "Class Name": t.chapterId?.subjectId?.classId?.className || "N/A"
        }));
    };

    const handleEdit = (topic) => {
        setFormData({
            topicName: topic.topicName,
            chapterId: topic.chapterId?._id || "",
            subjectId: topic.chapterId?.subjectId?._id || "",
            classId: topic.chapterId?.subjectId?.classId?._id || ""
        });
        setEditId(topic._id);
        setViewOnly(false);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this topic?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/topic/delete/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Topic deleted successfully");
                if (topics.length === 1 && page > 1) setPage(page - 1);
                else fetchTopics();
            } else {
                toast.error("Failed to delete topic");
            }
        } catch {
            toast.error("Error deleting topic");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} topics?`)) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/topic/delete-multiple`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ids: selectedIds })
            });

            if (response.ok) {
                toast.success("Topics deleted successfully");
                setSelectedIds([]);
                fetchTopics();
            } else {
                const data = await response.json();
                toast.error(data.message || "Bulk delete failed");
            }
        } catch {
            toast.error("Server error during bulk delete");
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === topics.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(topics.map(t => t._id));
        }
    };

    const toggleSelectRow = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const url = editId ? `${API_URL}/academics/topic/update/${editId}` : `${API_URL}/academics/topic/create`;
            const method = editId ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success(editId ? "Topic updated" : "Topic created");
                setShowModal(false);
                fetchTopics();
            } else {
                const res = await response.json();
                toast.error(res.message || "Operation failed");
            }
        } catch {
            toast.error("Server error");
        }
    };

    useEffect(() => {
        fetchTopics();
    }, [fetchTopics]);

    useEffect(() => {
        fetchChapters();
        fetchSubjects();
        fetchClasses();
    }, [fetchChapters, fetchSubjects, fetchClasses]);

    // Pagination shifted to server-side
    const currentItems = topics;

    return (
        <Layout activePage="Academics">
            <div className={`p-4 md:p-6 min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'text-gray-100 bg-[#131619]' : 'text-gray-900 bg-[#f8fafc]'}`}>
                <ToastContainer theme={theme} position="top-right" />

                <h1 className={`text-2xl md:text-3xl font-bold mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    <FaListUl className="text-cyan-500" /> Topic List
                </h1>

                {/* Controls */}
                <div className={`p-4 rounded-xl border shadow-lg mb-6 flex flex-col gap-4 transition-colors ${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-64">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search topics..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-all focus:outline-none focus:border-cyan-500 text-sm ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-200'}`}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                            {selectedIds.length > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg flex items-center gap-2 font-bold transition shadow-md shadow-red-600/20 text-sm"
                                >
                                    <FaTrash /> Delete ({selectedIds.length})
                                </button>
                            )}
                            <ExcelImportExport
                                columns={topicColumns}
                                data={topics}
                                onImport={handleBulkImport}
                                onExport={prepareExportData}
                                filename="Topic_List"
                                isDarkMode={isDarkMode}
                            />
                            {canCreate && (
                                <button
                                    onClick={openAddModal}
                                    className="flex-1 md:flex-none bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-lg flex items-center justify-center gap-2 font-bold transition shadow-md shadow-cyan-600/20 whitespace-nowrap text-sm"
                                >
                                    <FaPlus /> Add Topic
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filters Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                        <select
                            className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-cyan-500 text-sm font-medium transition-all ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-200 shadow-sm'}`}
                            value={filterClass}
                            onChange={(e) => { setFilterClass(e.target.value); setFilterSubject(""); setFilterChapter(""); setPage(1); }}
                        >
                            <option value="">All Classes</option>
                            {classes.map(cls => (
                                <option key={cls._id} value={cls._id}>{cls.className}</option>
                            ))}
                        </select>
                        <select
                            className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-cyan-500 text-sm font-medium transition-all ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-200 shadow-sm'}`}
                            value={filterSubject}
                            onChange={(e) => { setFilterSubject(e.target.value); setFilterChapter(""); setPage(1); }}
                        >
                            <option value="">All Subjects</option>
                            {subjects.filter(s => !filterClass || (s.classId?._id === filterClass || s.classId === filterClass)).map(sub => (
                                <option key={sub._id} value={sub._id}>{sub.subjectName}</option>
                            ))}
                        </select>
                        <select
                            className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-cyan-500 text-sm font-medium transition-all sm:col-span-2 md:col-span-1 ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-200 shadow-sm'}`}
                            value={filterChapter}
                            onChange={(e) => { setFilterChapter(e.target.value); setPage(1); }}
                        >
                            <option value="">All Chapters</option>
                            {chapters.filter(ch => !filterSubject || (ch.subjectId?._id === filterSubject || ch.subjectId === filterSubject)).map(chap => (
                                <option key={chap._id} value={chap._id}>{chap.chapterName}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table Container */}
                <div className={`rounded-xl border shadow-2xl overflow-hidden transition-colors ${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className={`text-xs uppercase border-b transition-colors ${isDarkMode ? 'bg-[#131619] text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                    <th className="p-4 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded cursor-pointer accent-cyan-500"
                                            checked={topics.length > 0 && selectedIds.length === topics.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="p-4 font-bold tracking-wider w-24">SL NO.</th>
                                    <th className="p-4 font-bold tracking-wider">Topic Name</th>
                                    <th className="p-4 font-bold tracking-wider">Class Name</th>
                                    <th className="p-4 font-bold tracking-wider">Subject Name</th>
                                    <th className="p-4 font-bold tracking-wider">Chapter Name</th>
                                    <th className="p-4 font-bold tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-500">Loading...</td></tr>
                                ) : currentItems.length === 0 ? (
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-500">No topics found.</td></tr>
                                ) : (
                                    currentItems.map((topic, index) => (
                                        <tr key={topic._id} className={`border-b transition-all duration-200 ${isDarkMode ? 'border-gray-800 hover:bg-[#2a323c]' : 'border-gray-50 hover:bg-gray-50/80'} ${selectedIds.includes(topic._id) ? isDarkMode ? 'bg-[#06b6d410]' : 'bg-cyan-50' : ''}`}>
                                            <td className="p-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded cursor-pointer accent-cyan-500"
                                                    checked={selectedIds.includes(topic._id)}
                                                    onChange={() => toggleSelectRow(topic._id)}
                                                />
                                            </td>
                                            <td className={`p-4 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{(page - 1) * limit + index + 1}</td>
                                            <td
                                                className={`p-4 font-bold min-w-[150px] max-w-[400px] cursor-pointer transition-colors ${isDarkMode ? 'text-white hover:text-cyan-400' : 'text-gray-900 hover:text-cyan-600'}`}
                                                title="Click to view full details"
                                                onClick={() => handleView(topic)}
                                            >
                                                {topic.topicName}
                                            </td>
                                            <td className={`p-4 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{topic.chapterId?.subjectId?.classId?.className || "N/A"}</td>
                                            <td className={`p-4 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{topic.chapterId?.subjectId?.subjectName || "N/A"}</td>
                                            <td className={`p-4 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{topic.chapterId?.chapterName || "N/A"}</td>
                                            <td className="p-4 flex gap-3 justify-end whitespace-nowrap">
                                                <button
                                                    onClick={() => handleEdit(topic)}
                                                    className="text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors text-sm"
                                                >
                                                    <FaEdit /> Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(topic._id)}
                                                    className="text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors text-sm"
                                                >
                                                    <FaTrash /> Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className={`p-4 border-t flex flex-col lg:flex-row items-center justify-between gap-4 transition-colors ${isDarkMode ? 'border-gray-700 bg-[#131619]' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} entries
                            </span>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rows per page: {limit}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className={`px-4 py-1.5 rounded font-bold transition text-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                            >
                                Prev
                            </button>

                            <div className="hidden sm:flex items-center gap-1">
                                <span className="text-sm font-medium mr-1">Page</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={totalPages}
                                    value={page}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (val >= 1 && val <= totalPages) setPage(val);
                                    }}
                                    className={`w-12 text-center bg-transparent border-b border-cyan-500 font-bold text-cyan-500 outline-none`}
                                />
                                <span className="text-sm font-medium ml-1">of {totalPages}</span>
                            </div>

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className={`px-4 py-1.5 rounded font-bold transition text-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 backdrop-blur-sm p-4">
                        <div className={`w-full max-w-lg rounded-xl border shadow-2xl animate-fade-in flex flex-col max-h-[90vh] transition-colors ${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className={`p-4 md:p-6 border-b flex justify-between items-center rounded-t-xl sticky top-0 z-10 ${isDarkMode ? 'border-gray-700 bg-[#1e2530]' : 'border-gray-100 bg-white'}`}>
                                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {viewOnly ? "View Topic" : editId ? "Edit Topic" : "Add New Topic"}
                                </h2>
                                <button onClick={() => setShowModal(false)} className={`text-2xl transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>&times;</button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto">
                                <div>
                                    <label className={`block text-sm mb-2 font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Topic Name</label>
                                    <input
                                        type="text"
                                        required
                                        disabled={viewOnly}
                                        value={formData.topicName}
                                        onChange={(e) => setFormData({ ...formData, topicName: e.target.value })}
                                        className={`w-full rounded-lg px-4 py-2.5 outline-none transition-all border ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500 disabled:opacity-70' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600 shadow-sm disabled:bg-gray-100'}`}
                                        placeholder="Enter topic name"
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm mb-2 font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Class</label>
                                    <select
                                        required
                                        disabled={viewOnly}
                                        value={formData.classId}
                                        onChange={(e) => setFormData({ ...formData, classId: e.target.value, subjectId: "", chapterId: "" })}
                                        className={`w-full rounded-lg px-4 py-2.5 outline-none transition-all border ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500 disabled:opacity-70' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600 shadow-sm disabled:bg-gray-100'}`}
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map(c => <option key={c._id} value={c._id}>{c.className}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className={`block text-sm mb-2 font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Subject</label>
                                    <select
                                        required
                                        disabled={viewOnly || !formData.classId}
                                        value={formData.subjectId}
                                        onChange={(e) => setFormData({ ...formData, subjectId: e.target.value, chapterId: "" })}
                                        className={`w-full rounded-lg px-4 py-2.5 outline-none transition-all border ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500 disabled:opacity-70' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600 shadow-sm disabled:bg-gray-100'}`}
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.filter(s => s.classId?._id === formData.classId || s.classId === formData.classId).map(s => (
                                            <option key={s._id} value={s._id}>{s.subjectName}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={`block text-sm mb-2 font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chapter</label>
                                    <select
                                        required
                                        disabled={viewOnly || !formData.subjectId}
                                        value={formData.chapterId}
                                        onChange={(e) => setFormData({ ...formData, chapterId: e.target.value })}
                                        className={`w-full rounded-lg px-4 py-2.5 outline-none transition-all border ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500 disabled:opacity-70' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600 shadow-sm disabled:bg-gray-100'}`}
                                    >
                                        <option value="">Select Chapter</option>
                                        {chapters.filter(ch => (ch.subjectId?._id || ch.subjectId) === formData.subjectId).map(ch => (
                                            <option key={ch._id} value={ch._id}>{ch.chapterName}</option>
                                        ))}
                                    </select>
                                </div>

                                {!viewOnly && (
                                    <div className="flex justify-end gap-3 mt-4 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className={`px-4 py-2 rounded-lg transition text-sm font-bold ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-lg transition shadow-lg shadow-cyan-600/20 text-sm"
                                        >
                                            {editId ? "Update Topic" : "Create Topic"}
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default TopicList;
