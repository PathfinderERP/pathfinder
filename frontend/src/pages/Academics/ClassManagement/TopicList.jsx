import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaListUl } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const TopicList = () => {
    const [topics, setTopics] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Filters
    const [filterClass, setFilterClass] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    const [filterChapter, setFilterChapter] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ topicName: "", chapterId: "", subjectId: "", classId: "" });
    const [editId, setEditId] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchTopics();
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

    const fetchSubjects = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/subject/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setSubjects(data);
        } catch (error) {
            console.error("Error fetching subjects");
        }
    };

    const fetchTopics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/topic/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setTopics(data);
            } else {
                toast.error("Failed to fetch topics");
            }
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
            if (response.ok) {
                setChapters(data);
            }
        } catch (error) {
            console.error("Error fetching chapters:", error);
        }
    };

    const handleEdit = (topic) => {
        const chap = topic.chapterId;
        const subj = chap?.subjectId;
        const cls = subj?.classId;

        setFormData({
            topicName: topic.topicName,
            chapterId: chap?._id || chap,
            subjectId: subj?._id || subj,
            classId: cls?._id || cls
        });
        setEditId(topic._id);
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
            toast.error("Server error");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const url = editId
                ? `${API_URL}/academics/topic/update/${editId}`
                : `${API_URL}/academics/topic/create`;
            const method = editId ? "PUT" : "POST";

            const submissionData = {
                topicName: formData.topicName,
                chapterId: formData.chapterId
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
                toast.success(editId ? "Topic updated" : "Topic created");
                setShowModal(false);
                setFormData({ topicName: "", chapterId: "", subjectId: "", classId: "" });
                setEditId(null);
                fetchTopics();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (error) {
            toast.error("Server error");
        }
    };

    const openAddModal = () => {
        setFormData({ topicName: "", chapterId: "", subjectId: "", classId: "" });
        setEditId(null);
        setShowModal(true);
    };

    // Derived lists for filtering/modal
    const getFilteredSubjects = (cId, forModal = false) => {
        const clsId = forModal ? formData.classId : filterClass;
        if (!clsId) return forModal ? [] : subjects;
        return subjects.filter(s => (s.classId?._id || s.classId) === clsId);
    };

    const getFilteredChapters = (sId, forModal = false) => {
        const subjId = forModal ? formData.subjectId : filterSubject;
        if (!subjId) {
            const availableSubjects = getFilteredSubjects(null, forModal);
            const availableSubjectIds = availableSubjects.map(s => s._id);
            return chapters.filter(c => availableSubjectIds.includes(c.subjectId?._id || c.subjectId));
        }
        return chapters.filter(c => (c.subjectId?._id || c.subjectId) === subjId);
    };

    const filteredTopics = topics.filter(t => {
        const matchesSearch = t.topicName.toLowerCase().includes(searchTerm.toLowerCase());

        const chap = t.chapterId;
        const chapId = chap?._id || chap;
        const subj = chap?.subjectId;
        const subjId = subj?._id || subj;
        const clsId = subj?.classId?._id || subj?.classId;

        const matchesClass = filterClass ? clsId === filterClass : true;
        const matchesSubject = filterSubject ? subjId === filterSubject : true;
        const matchesChapter = filterChapter ? chapId === filterChapter : true;

        return matchesSearch && matchesClass && matchesSubject && matchesChapter;
    });

    return (
        <Layout activePage="Academics">
            <div className="p-6 text-gray-100 min-h-screen font-sans">
                <ToastContainer theme="dark" position="top-right" />

                <h1 className="text-3xl font-bold mb-6 text-white flex items-center gap-2">
                    <FaListUl /> Topic List
                </h1>

                {/* Controls */}
                <div className="bg-[#1e2530] p-4 rounded-xl border border-gray-700 shadow-lg mb-6 flex flex-col gap-4">
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="relative w-full md:w-64">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search topics..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                        </div>
                        <button
                            onClick={openAddModal}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition shadow-md"
                        >
                            <FaPlus /> Add Topic
                        </button>
                    </div>

                    {/* Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                            value={filterClass}
                            onChange={(e) => { setFilterClass(e.target.value); setFilterSubject(""); setFilterChapter(""); }}
                        >
                            <option value="">All Classes</option>
                            {classes.map(cls => (
                                <option key={cls._id} value={cls._id}>{cls.className}</option>
                            ))}
                        </select>
                        <select
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                            value={filterSubject}
                            onChange={(e) => { setFilterSubject(e.target.value); setFilterChapter(""); }}
                        >
                            <option value="">All Subjects</option>
                            {getFilteredSubjects(null, false).map(sub => (
                                <option key={sub._id} value={sub._id}>{sub.subjectName}</option>
                            ))}
                        </select>
                        <select
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                            value={filterChapter}
                            onChange={(e) => setFilterChapter(e.target.value)}
                        >
                            <option value="">All Chapters</option>
                            {getFilteredChapters(null, false).map(chap => (
                                <option key={chap._id} value={chap._id}>{chap.chapterName}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-[#1e2530] rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
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
                            ) : filteredTopics.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-500">No topics found.</td></tr>
                            ) : (
                                filteredTopics.map((topic, index) => (
                                    <tr key={topic._id} className="border-b border-gray-800 hover:bg-[#2a323c] transition-all duration-200">
                                        <td className="p-4 text-gray-300">{index + 1}</td>
                                        <td className="p-4 font-bold text-white">{topic.topicName}</td>
                                        <td className="p-4 text-gray-300">{topic.chapterId?.subjectId?.classId?.className || "N/A"}</td>
                                        <td className="p-4 text-gray-300">{topic.chapterId?.subjectId?.subjectName || "N/A"}</td>
                                        <td className="p-4 text-gray-300">{topic.chapterId?.chapterName || "N/A"}</td>
                                        <td className="p-4 flex gap-4 justify-end">
                                            <button
                                                onClick={() => handleEdit(topic)}
                                                className="text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors"
                                            >
                                                <FaEdit /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(topic._id)}
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
                        <span>Showing {filteredTopics.length} entries</span>
                    </div>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 backdrop-blur-sm p-4">
                        <div className="bg-[#1e2530] w-full max-w-md rounded-xl border border-gray-700 shadow-2xl animate-fade-in">
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">{editId ? "Edit Topic" : "Add Topic"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm font-semibold mb-2">Class</label>
                                    <select
                                        required
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
                                        value={formData.classId}
                                        onChange={(e) => setFormData({ ...formData, classId: e.target.value, subjectId: "", chapterId: "" })}
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
                                        onChange={(e) => setFormData({ ...formData, subjectId: e.target.value, chapterId: "" })}
                                        disabled={!formData.classId}
                                    >
                                        <option value="">Select Subject</option>
                                        {getFilteredSubjects(null, true).map(sub => (
                                            <option key={sub._id} value={sub._id}>{sub.subjectName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm font-semibold mb-2">Chapter</label>
                                    <select
                                        required
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
                                        value={formData.chapterId}
                                        onChange={(e) => setFormData({ ...formData, chapterId: e.target.value })}
                                        disabled={!formData.subjectId}
                                    >
                                        <option value="">Select Chapter</option>
                                        {getFilteredChapters(null, true).map(chap => (
                                            <option key={chap._id} value={chap._id}>{chap.chapterName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm font-semibold mb-2">Topic Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
                                        value={formData.topicName}
                                        onChange={(e) => setFormData({ ...formData, topicName: e.target.value })}
                                        placeholder="Enter topic name"
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

export default TopicList;
