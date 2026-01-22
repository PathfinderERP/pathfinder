import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaBookOpen } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { hasPermission } from "../../../config/permissions";
import ExcelImportExport from "../../../components/common/ExcelImportExport";

const ChapterList = () => {
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

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, "academics", "chapters", "create");

    const chapterColumns = ["Chapter Name", "Class Name", "Subject Name"];

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

    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchChapters();
        fetchSubjects();
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setClasses(data);
        } catch (error) {
            console.error("Error fetching classes");
        }
    };

    const fetchChapters = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/chapter/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setChapters(data);
            } else {
                toast.error("Failed to fetch chapters");
            }
        } catch (error) {
            toast.error("Error fetching chapters");
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
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
                fetchChapters();
            } else {
                toast.error("Failed to delete chapter");
            }
        } catch (error) {
            toast.error("Server error");
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
            toast.error("Server error");
        }
    };

    const openAddModal = () => {
        setFormData({ chapterName: "", subjectId: "", classId: "" });
        setEditId(null);
        setShowModal(true);
    };

    const filteredSubjects = subjects.filter(sub => {
        if (showModal && formData.classId) return sub.classId?._id === formData.classId || sub.classId === formData.classId;
        if (!showModal && filterClass) return sub.classId?._id === filterClass || sub.classId === filterClass;
        return !showModal || (showModal && !formData.classId); // Return all if not in modal or in modal with no class (though usually class required)
    });

    const filteredChapters = chapters.filter(c => {
        const matchesSearch = c.chapterName.toLowerCase().includes(searchTerm.toLowerCase());
        const sub = c.subjectId;
        const subId = sub?._id || sub;
        const subClassId = sub?.classId?._id || sub?.classId;

        const matchesClass = filterClass ? subClassId === filterClass : true;
        const matchesSubject = filterSubject ? subId === filterSubject : true;

        return matchesSearch && matchesClass && matchesSubject;
    });

    return (
        <Layout activePage="Academics">
            <div className="p-6 text-gray-100 min-h-screen font-sans">
                <ToastContainer theme="dark" position="top-right" />

                <h1 className="text-3xl font-bold mb-6 text-white flex items-center gap-2">
                    <FaBookOpen /> Chapter List
                </h1>

                {/* Controls */}
                <div className="bg-[#1e2530] p-4 rounded-xl border border-gray-700 shadow-lg mb-6 flex flex-wrap gap-4 justify-between items-center">
                    <div className="flex gap-4 flex-1 flex-wrap">
                        <div className="relative w-64">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search chapters..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                        </div>
                        <select
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                            value={filterClass}
                            onChange={(e) => { setFilterClass(e.target.value); setFilterSubject(""); }}
                        >
                            <option value="">All Classes</option>
                            {classes.map(cls => (
                                <option key={cls._id} value={cls._id}>{cls.className}</option>
                            ))}
                        </select>
                        <select
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                            value={filterSubject}
                            onChange={(e) => setFilterSubject(e.target.value)}
                        >
                            <option value="">All Subjects</option>
                            {filteredSubjects.map(sub => (
                                <option key={sub._id} value={sub._id}>{sub.subjectName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <ExcelImportExport
                            columns={chapterColumns}
                            data={chapters}
                            onImport={handleBulkImport}
                            onExport={prepareExportData}
                            filename="Chapter_List"
                        />
                        <button
                            onClick={openAddModal}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition shadow-md"
                        >
                            <FaPlus /> Add Chapter
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-[#1e2530] rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#131619] text-gray-400 text-xs uppercase border-b border-gray-700">
                                <th className="p-4 font-semibold w-24">SL NO.</th>
                                <th className="p-4 font-semibold">CHAPTER NAME</th>
                                <th className="p-4 font-semibold">CLASS NAME</th>
                                <th className="p-4 font-semibold">SUBJECT NAME</th>
                                <th className="p-4 font-semibold text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredChapters.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">No chapters found.</td></tr>
                            ) : (
                                filteredChapters.map((chapter, index) => (
                                    <tr key={chapter._id} className="border-b border-gray-800 hover:bg-[#2a323c] transition-all duration-200">
                                        <td className="p-4 text-gray-300">{index + 1}</td>
                                        <td className="p-4 font-bold text-white">{chapter.chapterName}</td>
                                        <td className="p-4 text-gray-300">{chapter.subjectId?.classId?.className || "N/A"}</td>
                                        <td className="p-4 text-gray-300">{chapter.subjectId?.subjectName || "N/A"}</td>
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
                    <div className="p-4 border-t border-gray-700 text-gray-400 text-sm flex justify-between">
                        <span>Showing {filteredChapters.length} entries</span>
                    </div>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 backdrop-blur-sm p-4">
                        <div className="bg-[#1e2530] w-full max-w-md rounded-xl border border-gray-700 shadow-2xl animate-fade-in">
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">{editId ? "Edit Chapter" : "Add Chapter"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm font-semibold mb-2">Class</label>
                                    <select
                                        required
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
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
                                    <label className="block text-gray-400 text-sm font-semibold mb-2">Subject</label>
                                    <select
                                        required
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
                                        value={formData.subjectId}
                                        onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                                        disabled={!formData.classId}
                                    >
                                        <option value="">Select Subject</option>
                                        {filteredSubjects.map(sub => (
                                            <option key={sub._id} value={sub._id}>{sub.subjectName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm font-semibold mb-2">Chapter Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
                                        value={formData.chapterName}
                                        onChange={(e) => setFormData({ ...formData, chapterName: e.target.value })}
                                        placeholder="Enter chapter name"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-lg"
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
