import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaBookOpen } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "../../../context/ThemeContext";

import { hasPermission } from "../../../config/permissions";
import ExcelImportExport from "../../../components/common/ExcelImportExport";

const ChapterList = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [chapters, setChapters] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterClass, setFilterClass] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ chapterName: "", subjectId: "", classId: "" });
    const [editId, setEditId] = useState(null);

    // Pagination & Selection State
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, "academics", "chapters", "create");

    const chapterColumns = ["Chapter Name", "Class Name", "Subject Name"];
    const API_URL = import.meta.env.VITE_API_URL;

    const fetchClasses = React.useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setClasses(data);
        } catch (error) {
            console.error("Error fetching classes:", error);
        }
    }, [API_URL]);

    const fetchChapters = React.useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const query = new URLSearchParams({
                page,
                limit,
                search: searchTerm,
                classId: filterClass,
                subjectId: filterSubject
            });

            const response = await fetch(`${API_URL}/academics/chapter/list?${query.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setChapters(data.chapters);
                setTotalPages(data.totalPages);
                setTotalRecords(data.total);
            } else {
                toast.error("Failed to fetch chapters");
            }
        } catch (error) {
            console.error("Error fetching chapters:", error);
            toast.error("Error fetching chapters");
        } finally {
            setLoading(false);
        }
    }, [API_URL, page, limit, searchTerm, filterClass, filterSubject]);

    const fetchSubjects = React.useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/subject/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setSubjects(data);
            }
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    }, [API_URL]);

    useEffect(() => {
        fetchChapters();
    }, [fetchChapters]);

    useEffect(() => {
        fetchSubjects();
        fetchClasses();
    }, [fetchSubjects, fetchClasses]);

    const handleBulkImport = async (data) => {
        try {
            const token = localStorage.getItem("token");

            // Normalize data
            const formattedData = data.map(row => ({
                chapterName: row['Chapter Name'] || row['name'] || row['Name'],
                className: row['Class Name'] || row['classifyId'] || row['Section'] || row['Class'],
                subjectName: row['Subject Name'] || row['subjectId'] || row['Subject']
            }));

            const response = await fetch(`${API_URL}/academics/chapter/bulk-import`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formattedData)
            });

            const result = await response.json();
            if (response.ok) {
                toast.success(`Imported: ${result.results.successCount}, Failed: ${result.results.failedCount}`);
                if (result.results.errors.length > 0) {
                    console.error("Import Errors:", result.results.errors);
                    toast.warn("Check console for import details/errors");
                }
                fetchChapters();
                fetchClasses();
                fetchSubjects();
            } else {
                toast.error(result.message || "Import failed");
            }
        } catch (error) {
            console.error("Bulk Import Error:", error);
            toast.error("Error during import");
        }
    };

    const prepareExportData = () => {
        return chapters.map(c => ({
            "Chapter Name": c.chapterName,
            "Class Name": c.subjectId?.classId?.className || "N/A",
            "Subject Name": c.subjectId?.subjectName || "N/A"
        }));
    };

    const handleEdit = (chapter) => {
        const subj = chapter.subjectId;
        const cls = subj?.classId;

        setFormData({
            chapterName: chapter.chapterName,
            subjectId: subj?._id || subj,
            classId: cls?._id || cls // Use populated class ID if available
        });
        setEditId(chapter._id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this chapter?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/chapter/delete/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Chapter deleted successfully");
                if (chapters.length === 1 && page > 1) setPage(page - 1);
                else fetchChapters();
            } else {
                toast.error("Failed to delete chapter");
            }
        } catch (error) {
            console.error("Delete Error:", error);
            toast.error("Server error");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} chapters?`)) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/chapter/delete-multiple`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ids: selectedIds })
            });

            if (response.ok) {
                toast.success("Selected chapters deleted successfully");
                setSelectedIds([]);
                fetchChapters();
            } else {
                const data = await response.json();
                toast.error(data.message || "Failed to delete chapters");
            }
        } catch (error) {
            console.error("Bulk Delete Error:", error);
            toast.error("Server error during bulk delete");
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === chapters.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(chapters.map(c => c._id));
        }
    };

    const toggleSelectRow = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleJumpPage = (e) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val >= 1 && val <= totalPages) {
            setPage(val);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const url = editId
                ? `${API_URL}/academics/chapter/update/${editId}`
                : `${API_URL}/academics/chapter/create`;
            const method = editId ? "PUT" : "POST";

            const submissionData = {
                chapterName: formData.chapterName,
                subjectId: formData.subjectId
            };

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(submissionData)
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(editId ? "Chapter updated" : "Chapter created");
                setShowModal(false);
                setFormData({ chapterName: "", subjectId: "", classId: "" });
                setEditId(null);
                fetchChapters();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (error) {
            console.error("Submit Error:", error);
            toast.error("Server error");
        }
    };

    const openAddModal = () => {
        setFormData({ chapterName: "", subjectId: "", classId: "" });
        setEditId(null);
        setShowModal(true);
    };

    // Chapters are now filtered on backend, but we keep this for safety if UI needs client-side search overrides
    const displayChapters = chapters;

    return (
        <Layout activePage="Academics">
            <div className={`p-6 min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'text-gray-100 bg-[#131619]' : 'text-gray-900 bg-[#f8fafc]'}`}>
                <ToastContainer theme={theme} position="top-right" />

                <h1 className={`text-3xl font-bold mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    <FaBookOpen className="text-cyan-500" /> Chapter List
                </h1>

                {/* Controls */}
                <div className={`p-4 rounded-xl border shadow-lg mb-6 flex flex-wrap gap-4 justify-between items-center transition-colors ${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex gap-4 flex-1 flex-wrap">
                        <div className="relative w-64">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search chapters..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-all focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-200 shadow-sm'}`}
                            />
                        </div>
                        <select
                            className={`px-4 py-2 rounded-lg border transition-all focus:outline-none focus:border-cyan-500 font-medium ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-200 shadow-sm'}`}
                            value={filterClass}
                            onChange={(e) => { setFilterClass(e.target.value); setFilterSubject(""); setPage(1); }}
                        >
                            <option value="">All Classes</option>
                            {classes.map(cls => (
                                <option key={cls._id} value={cls._id}>{cls.className}</option>
                            ))}
                        </select>
                        <select
                            className={`px-4 py-2 rounded-lg border transition-all focus:outline-none focus:border-cyan-500 font-medium ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-200 shadow-sm'}`}
                            value={filterSubject}
                            onChange={(e) => { setFilterSubject(e.target.value); setPage(1); }}
                        >
                            <option value="">All Subjects</option>
                            {subjects.filter(sub => !filterClass || (sub.classId?._id === filterClass || sub.classId === filterClass)).map(sub => (
                                <option key={sub._id} value={sub._id}>{sub.subjectName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg flex items-center gap-2 font-bold transition shadow-md shadow-red-600/20"
                            >
                                <FaTrash /> Delete ({selectedIds.length})
                            </button>
                        )}
                        <ExcelImportExport
                            columns={chapterColumns}
                            data={chapters}
                            onImport={handleBulkImport}
                            onExport={prepareExportData}
                            filename="Chapter_List"
                            isDarkMode={isDarkMode}
                        />
                        {canCreate && (
                            <button
                                onClick={openAddModal}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-lg flex items-center gap-2 font-bold transition shadow-md shadow-cyan-600/20"
                            >
                                <FaPlus /> Add Chapter
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className={`rounded-xl border shadow-2xl overflow-hidden transition-colors ${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`text-xs uppercase border-b transition-colors ${isDarkMode ? 'bg-[#131619] text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                <th className="p-4 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded cursor-pointer accent-cyan-500"
                                        checked={chapters.length > 0 && selectedIds.length === chapters.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="p-4 font-bold tracking-wider w-24 text-center">SL NO.</th>
                                <th className="p-4 font-bold tracking-wider">Chapter Name</th>
                                <th className="p-4 font-bold tracking-wider">Class Name</th>
                                <th className="p-4 font-bold tracking-wider">Subject Name</th>
                                <th className="p-4 font-bold tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading...</td></tr>
                            ) : displayChapters.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-500">No chapters found.</td></tr>
                            ) : (
                                displayChapters.map((chapter, index) => (
                                    <tr key={chapter._id} className={`border-b transition-all duration-200 ${isDarkMode ? 'border-gray-800 hover:bg-[#2a323c]' : 'border-gray-50 hover:bg-gray-50/80'} ${selectedIds.includes(chapter._id) ? isDarkMode ? 'bg-[#06b6d410]' : 'bg-cyan-50' : ''}`}>
                                        <td className="p-4 text-center">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded cursor-pointer accent-cyan-500"
                                                checked={selectedIds.includes(chapter._id)}
                                                onChange={() => toggleSelectRow(chapter._id)}
                                            />
                                        </td>
                                        <td className={`p-4 font-medium text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{(page - 1) * limit + index + 1}</td>
                                        <td className={`p-4 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{chapter.chapterName}</td>
                                        <td className={`p-4 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{chapter.subjectId?.classId?.className || "N/A"}</td>
                                        <td className={`p-4 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{chapter.subjectId?.subjectName || "N/A"}</td>
                                        <td className="p-4 flex gap-4 justify-end">
                                            <button
                                                onClick={() => handleEdit(chapter)}
                                                className="text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors"
                                            >
                                                <FaEdit /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(chapter._id)}
                                                className="text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                                            >
                                                <FaTrash /> Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <div className={`p-4 border-t text-sm flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors ${isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-500 font-medium'}`}>
                        <span>Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} entries</span>

                        {/* Pagination Controls */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className={`px-3 py-1 rounded-lg transition border ${isDarkMode ? 'border-gray-700 hover:bg-gray-800 disabled:opacity-30' : 'border-gray-200 hover:bg-gray-50 disabled:opacity-50'}`}
                            >
                                Previous
                            </button>

                            <div className="flex items-center gap-1">
                                <span className="mr-1">Page</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={totalPages}
                                    value={page}
                                    onChange={handleJumpPage}
                                    className={`w-12 bg-transparent text-center font-bold text-cyan-400 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                />
                                <span className="ml-1">of {totalPages}</span>
                            </div>

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className={`px-3 py-1 rounded-lg transition border ${isDarkMode ? 'border-gray-700 hover:bg-gray-800 disabled:opacity-30' : 'border-gray-200 hover:bg-gray-50 disabled:opacity-50'}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 backdrop-blur-sm p-4">
                        <div className={`w-full max-w-md rounded-xl border shadow-2xl animate-fade-in transition-colors ${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{editId ? "Edit Chapter" : "Add Chapter"}</h2>
                                <button onClick={() => setShowModal(false)} className={`text-2xl transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>&times;</button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Class</label>
                                    <select
                                        required
                                        className={`w-full rounded-lg p-3 outline-none transition-all border ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600 shadow-sm'}`}
                                        value={formData.classId}
                                        onChange={(e) => setFormData({ ...formData, classId: e.target.value, subjectId: "" })}
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map(cls => (
                                            <option key={cls._id} value={cls._id}>{cls.className}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Subject</label>
                                    <select
                                        required
                                        className={`w-full rounded-lg p-3 outline-none transition-all border ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600 shadow-sm'}`}
                                        value={formData.subjectId}
                                        onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                                        disabled={!formData.classId}
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.filter(sub => (sub.classId?._id === formData.classId || sub.classId === formData.classId)).map(sub => (
                                            <option key={sub._id} value={sub._id}>{sub.subjectName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chapter Name</label>
                                    <input
                                        type="text"
                                        required
                                        className={`w-full rounded-lg p-3 outline-none transition-all border ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600 shadow-sm'}`}
                                        value={formData.chapterName}
                                        onChange={(e) => setFormData({ ...formData, chapterName: e.target.value })}
                                        placeholder="Enter chapter name"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className={`px-4 py-2 rounded-lg transition font-bold ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-lg transition shadow-lg shadow-cyan-600/20"
                                    >
                                        {editId ? "Update" : "Add"}
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

export default ChapterList;
