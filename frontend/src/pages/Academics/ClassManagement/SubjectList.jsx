import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaBook, FaLayerGroup } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SubjectList = () => {
    const [subjects, setSubjects] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterClass, setFilterClass] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ subjectName: "", classId: "" });
    const [editId, setEditId] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
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

    const fetchSubjects = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/subject/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setSubjects(data);
            } else {
                toast.error("Failed to fetch subjects");
            }
        } catch (error) {
            toast.error("Error fetching subjects");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (sub) => {
        setFormData({
            subjectName: sub.subjectName,
            classId: sub.classId?._id || sub.classId
        });
        setEditId(sub._id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this subject?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/subject/delete/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Subject deleted successfully");
                fetchSubjects();
            } else {
                toast.error("Failed to delete subject");
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
                ? `${API_URL}/academics/subject/update/${editId}`
                : `${API_URL}/academics/subject/create`;
            const method = editId ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(editId ? "Subject updated" : "Subject created");
                setShowModal(false);
                setFormData({ subjectName: "", classId: "" });
                setEditId(null);
                fetchSubjects();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (error) {
            toast.error("Server error");
        }
    };

    const openAddModal = () => {
        setFormData({ subjectName: "", classId: "" });
        setEditId(null);
        setShowModal(true);
    };

    const filteredSubjects = subjects.filter(sub => {
        const matchesSearch = sub.subjectName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = filterClass ? sub.classId?._id === filterClass : true;
        return matchesSearch && matchesClass;
    });

    return (
        <Layout activePage="Academics">
            <div className="p-6 text-gray-100 min-h-screen font-sans">
                <ToastContainer theme="dark" position="top-right" />

                <h1 className="text-3xl font-bold mb-6 text-white flex items-center gap-2">
                    <FaBook /> Subject List
                </h1>

                {/* Controls */}
                <div className="bg-[#1e2530] p-4 rounded-xl border border-gray-700 shadow-lg mb-6 flex flex-wrap gap-4 justify-between items-center">
                    <div className="flex gap-4 flex-1">
                        <div className="relative w-64">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search subjects..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                        </div>
                        <select
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                        >
                            <option value="">All Classes</option>
                            {classes.map(cls => (
                                <option key={cls._id} value={cls._id}>{cls.className}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition shadow-md"
                    >
                        <FaPlus /> Add Subject
                    </button>
                </div>

                {/* Table */}
                <div className="bg-[#1e2530] rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#131619] text-gray-400 text-xs uppercase border-b border-gray-700">
                                <th className="p-4 font-semibold w-24">SL NO.</th>
                                <th className="p-4 font-semibold">NAME</th>
                                <th className="p-4 font-semibold">CLASS NAME</th>
                                <th className="p-4 font-semibold text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" className="p-8 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredSubjects.length === 0 ? (
                                <tr><td colSpan="4" className="p-8 text-center text-gray-500">No subjects found.</td></tr>
                            ) : (
                                filteredSubjects.map((sub, index) => (
                                    <tr key={sub._id} className="border-b border-gray-800 hover:bg-[#2a323c] transition-all duration-200">
                                        <td className="p-4 text-gray-300">{index + 1}</td>
                                        <td className="p-4 font-bold text-white">{sub.subjectName}</td>
                                        <td className="p-4 text-gray-300">{sub.classId?.className || "N/A"}</td>
                                        <td className="p-4 flex gap-4 justify-end">
                                            <button
                                                onClick={() => handleEdit(sub)}
                                                className="text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors"
                                            >
                                                <FaEdit /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(sub._id)}
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
                        <span>Showing {filteredSubjects.length} entries</span>
                    </div>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 backdrop-blur-sm p-4">
                        <div className="bg-[#1e2530] w-full max-w-md rounded-xl border border-gray-700 shadow-2xl animate-fade-in">
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">{editId ? "Edit Subject" : "Add Subject"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm font-semibold mb-2">Class</label>
                                    <select
                                        required
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
                                        value={formData.classId}
                                        onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map(cls => (
                                            <option key={cls._id} value={cls._id}>{cls.className}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm font-semibold mb-2">Subject Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
                                        value={formData.subjectName}
                                        onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                                        placeholder="Enter subject name (e.g. Physics)"
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

export default SubjectList;
