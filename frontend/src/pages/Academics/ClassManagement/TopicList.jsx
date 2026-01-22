import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaListUl } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { hasPermission } from "../../../config/permissions";
import ExcelImportExport from "../../../components/common/ExcelImportExport";

const TopicList = () => {
    // ... [existing state]
    const [topics, setTopics] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

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

    const fetchTopics = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/topic/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setTopics(data);
        } catch (error) {
            toast.error("Error fetching topics");
        } finally {
            setLoading(false);
        }
    };

    const fetchChapters = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/chapter/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setChapters(data);
        } catch (error) {
            toast.error("Error fetching chapters");
        }
    };

    const fetchSubjects = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/subject/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setSubjects(data);
        } catch (error) {
            toast.error("Error fetching subjects");
        }
    };

    const fetchClasses = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setClasses(data);
        } catch (error) {
            toast.error("Error fetching classes");
        }
    };

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
        } catch (error) {
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
                fetchTopics();
            } else {
                toast.error("Failed to delete topic");
            }
        } catch (error) {
            toast.error("Error deleting topic");
        }
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
        } catch (error) {
            toast.error("Server error");
        }
    };

    const getFilteredSubjects = (currentClassId, forModal = false) => {
        const classId = forModal ? formData.classId : filterClass;
        if (!classId) return [];
        return subjects.filter(sub => sub.classId?._id === classId);
    };

    const getFilteredChapters = (currentSubjectId, forModal = false) => {
        const subjectId = forModal ? formData.subjectId : filterSubject;
        if (!subjectId) return [];
        return chapters.filter(chap => (chap.subjectId?._id || chap.subjectId) === subjectId);
    };

    useEffect(() => {
        fetchTopics();
        fetchChapters();
        fetchSubjects();
        fetchClasses();
    }, []);

    const filteredTopics = topics.filter(t => {
        const matchesSearch = t.topicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.chapterId?.chapterName || "").toLowerCase().includes(searchTerm.toLowerCase());

        const matchesClass = !filterClass || t.chapterId?.subjectId?.classId?._id === filterClass;
        const matchesSubject = !filterSubject || t.chapterId?.subjectId?._id === filterSubject;
        const matchesChapter = !filterChapter || t.chapterId?._id === filterChapter;

        return matchesSearch && matchesClass && matchesSubject && matchesChapter;
    });

    // Pagination Logic
    const totalItems = filteredTopics.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredTopics.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <Layout activePage="Academics">
            <div className="p-4 md:p-6 text-gray-100 min-h-screen font-sans">
                <ToastContainer theme="dark" position="top-right" />

                <h1 className="text-2xl md:text-3xl font-bold mb-6 text-white flex items-center gap-2">
                    <FaListUl /> Topic List
                </h1>

                {/* Controls */}
                <div className="bg-[#1e2530] p-4 rounded-xl border border-gray-700 shadow-lg mb-6 flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-64">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search topics..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                            <ExcelImportExport
                                columns={topicColumns}
                                data={topics}
                                onImport={handleBulkImport}
                                onExport={prepareExportData}
                                filename="Topic_List"
                            />
                            {canCreate && (
                                <button
                                    onClick={openAddModal}
                                    className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-semibold transition shadow-md whitespace-nowrap text-sm"
                                >
                                    <FaPlus /> Add Topic
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filters Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                        <select
                            className="w-full bg-[#131619] text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 text-sm"
                            value={filterClass}
                            onChange={(e) => { setFilterClass(e.target.value); setFilterSubject(""); setFilterChapter(""); setCurrentPage(1); }}
                        >
                            <option value="">All Classes</option>
                            {classes.map(cls => (
                                <option key={cls._id} value={cls._id}>{cls.className}</option>
                            ))}
                        </select>
                        <select
                            className="w-full bg-[#131619] text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 text-sm"
                            value={filterSubject}
                            onChange={(e) => { setFilterSubject(e.target.value); setFilterChapter(""); setCurrentPage(1); }}
                        >
                            <option value="">All Subjects</option>
                            {getFilteredSubjects(null, false).map(sub => (
                                <option key={sub._id} value={sub._id}>{sub.subjectName}</option>
                            ))}
                        </select>
                        <select
                            className="w-full bg-[#131619] text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 text-sm sm:col-span-2 md:col-span-1"
                            value={filterChapter}
                            onChange={(e) => { setFilterChapter(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="">All Chapters</option>
                            {getFilteredChapters(null, false).map(chap => (
                                <option key={chap._id} value={chap._id}>{chap.chapterName}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table Container */}
                <div className="bg-[#1e2530] rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-[#131619] text-gray-400 text-xs uppercase border-b border-gray-700">
                                    <th className="p-4 font-semibold w-24">SL NO.</th>
                                    <th className="p-4 font-semibold">TOPIC NAME</th>
                                    <th className="p-4 font-semibold">CLASS NAME</th>
                                    <th className="p-4 font-semibold">SUBJECT NAME</th>
                                    <th className="p-4 font-semibold">CHAPTER NAME</th>
                                    <th className="p-4 font-semibold text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading...</td></tr>
                                ) : currentItems.length === 0 ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-500">No topics found.</td></tr>
                                ) : (
                                    currentItems.map((topic, index) => (
                                        <tr key={topic._id} className="border-b border-gray-800 hover:bg-[#2a323c] transition-all duration-200">
                                            <td className="p-4 text-gray-300">{indexOfFirstItem + index + 1}</td>
                                            <td
                                                className="p-4 text-white font-medium min-w-[150px] max-w-[400px] cursor-pointer hover:text-cyan-400 transition-colors"
                                                title="Click to view full details"
                                                onClick={() => handleView(topic)}
                                            >
                                                {topic.topicName}
                                            </td>
                                            <td className="p-4 text-gray-300">{topic.chapterId?.subjectId?.classId?.className || "N/A"}</td>
                                            <td className="p-4 text-gray-300">{topic.chapterId?.subjectId?.subjectName || "N/A"}</td>
                                            <td className="p-4 text-gray-300">{topic.chapterId?.chapterName || "N/A"}</td>
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
                    <div className="p-4 border-t border-gray-700 bg-[#131619] flex flex-col lg:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <span className="text-gray-400 text-sm">
                                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} entries
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-sm">Rows per page:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="bg-[#1e2530] text-white border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
                                >
                                    {[10, 20, 30, 50, 100].map(val => (
                                        <option key={val} value={val}>{val}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => paginate(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                            >
                                Prev
                            </button>

                            <div className="hidden sm:flex items-center gap-1">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => paginate(i + 1)}
                                        className={`w-8 h-8 rounded text-sm transition ${currentPage === i + 1
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                            </div>

                            <button
                                onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 backdrop-blur-sm p-4">
                        <div className="bg-[#1e2530] w-full max-w-lg rounded-xl border border-gray-700 shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
                            <div className="p-4 md:p-6 border-b border-gray-700 flex justify-between items-center bg-[#1e2530] rounded-t-xl sticky top-0 z-10">
                                <h2 className="text-xl font-bold text-white">
                                    {viewOnly ? "View Topic" : editId ? "Edit Topic" : "Add New Topic"}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl transition-colors">&times;</button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2 font-medium">Topic Name</label>
                                    <input
                                        type="text"
                                        required
                                        disabled={viewOnly}
                                        value={formData.topicName}
                                        onChange={(e) => setFormData({ ...formData, topicName: e.target.value })}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                        placeholder="Enter topic name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2 font-medium">Class</label>
                                    <select
                                        required
                                        disabled={viewOnly}
                                        value={formData.classId}
                                        onChange={(e) => setFormData({ ...formData, classId: e.target.value, subjectId: "", chapterId: "" })}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map(c => <option key={c._id} value={c._id}>{c.className}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2 font-medium">Subject</label>
                                    <select
                                        required
                                        disabled={viewOnly || !formData.classId}
                                        value={formData.subjectId}
                                        onChange={(e) => setFormData({ ...formData, subjectId: e.target.value, chapterId: "" })}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.filter(s => s.classId?._id === formData.classId || s.classId === formData.classId).map(s => (
                                            <option key={s._id} value={s._id}>{s.subjectName}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2 font-medium">Chapter</label>
                                    <select
                                        required
                                        disabled={viewOnly || !formData.subjectId}
                                        value={formData.chapterId}
                                        onChange={(e) => setFormData({ ...formData, chapterId: e.target.value })}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
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
                                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-lg text-sm"
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
