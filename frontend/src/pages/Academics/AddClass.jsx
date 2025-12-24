import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaPlus, FaTrash } from "react-icons/fa";

const AddClass = () => {
    const [formData, setFormData] = useState({
        className: "",
        date: "",
        classMode: "",
        startTime: "",
        endTime: "",
        subjectId: "",
        teacherId: "",
        session: "",
        examId: "",
        courseId: "",
        centreId: "",
        batchIds: [],
        coordinatorId: "",
        // New Academic Fields
        acadClassId: "",
        acadSubjectId: "",
        chapterId: "",
        topicIds: [], // We'll manage topics as selected objects with add/remove
        message: ""
    });

    const [dropdownData, setDropdownData] = useState({
        subjects: [],
        teachers: [],
        sessions: [],
        exams: [],
        courses: [],
        centres: [],
        batches: [],
        coordinators: [],
        academicClasses: []
    });

    // Cascading Dropdown States
    const [acadSubjects, setAcadSubjects] = useState([]);
    const [acadChapters, setAcadChapters] = useState([]);
    const [acadTopics, setAcadTopics] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState([]); // List of { id, name }
    const [currentTopicId, setCurrentTopicId] = useState("");

    const [loading, setLoading] = useState(false);
    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchDropdownData();
    }, []);

    const fetchDropdownData = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class-schedule/dropdown-data`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setDropdownData(data);
            } else {
                toast.error("Failed to load dropdown data");
            }
        } catch (error) {
            console.error("Error fetching dropdowns:", error);
        }
    };

    // Cascading Data Fetchers
    const fetchAcadSubjects = async (classId) => {
        if (!classId) { setAcadSubjects([]); return; }
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/academics/subject/list/class/${classId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setAcadSubjects(data);
        } catch (e) { console.error(e); }
    };

    const fetchAcadChapters = async (subjectId) => {
        if (!subjectId) { setAcadChapters([]); return; }
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/academics/chapter/list/subject/${subjectId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setAcadChapters(data);
        } catch (e) { console.error(e); }
    };

    const fetchAcadTopics = async (chapterId) => {
        if (!chapterId) { setAcadTopics([]); return; }
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/academics/topic/list/chapter/${chapterId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setAcadTopics(data);
        } catch (e) { console.error(e); }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Trigger cascades
        if (name === "acadClassId") {
            setFormData(prev => ({ ...prev, [name]: value, acadSubjectId: "", chapterId: "", topicIds: [] }));
            setAcadSubjects([]); setAcadChapters([]); setAcadTopics([]); setSelectedTopics([]);
            fetchAcadSubjects(value);
        }
        if (name === "acadSubjectId") {
            setFormData(prev => ({ ...prev, [name]: value, chapterId: "", topicIds: [] }));
            setAcadChapters([]); setAcadTopics([]); setSelectedTopics([]);
            fetchAcadChapters(value);
        }
        if (name === "chapterId") {
            setFormData(prev => ({ ...prev, [name]: value, topicIds: [] }));
            setAcadTopics([]); setSelectedTopics([]);
            fetchAcadTopics(value);
        }
    };

    const handleAddTopic = () => {
        if (!currentTopicId) return;
        const topicObj = acadTopics.find(t => t._id === currentTopicId);
        if (topicObj && !selectedTopics.find(t => t._id === currentTopicId)) {
            setSelectedTopics([...selectedTopics, topicObj]);
            setFormData(prev => ({ ...prev, topicIds: [...prev.topicIds, currentTopicId] }));
        }
        setCurrentTopicId("");
    };

    const handleRemoveTopic = (id) => {
        const updated = selectedTopics.filter(t => t._id !== id);
        setSelectedTopics(updated);
        setFormData(prev => ({ ...prev, topicIds: updated.map(t => t._id) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Ensure topicIds are set in formData correctly (already done via handleAdd/Remove)
        const payload = {
            ...formData,
            topicIds: selectedTopics.map(t => t._id)
        };

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class-schedule/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Class scheduled successfully");
                setFormData({
                    className: "", date: "", classMode: "", startTime: "", endTime: "",
                    subjectId: "", teacherId: "", session: "", examId: "", courseId: "", centreId: "", batchIds: [],
                    acadClassId: "", acadSubjectId: "", chapterId: "", topicIds: [], message: ""
                });
                setSelectedTopics([]);
                // Reset cascades
                setAcadSubjects([]); setAcadChapters([]); setAcadTopics([]);
            } else {
                toast.error(data.message || "Failed to schedule class");
            }
        } catch (error) {
            toast.error("Server error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout activePage="Academics">
            <div className="p-6 text-gray-100 min-h-screen font-sans">
                <ToastContainer theme="dark" position="top-right" />

                <h1 className="text-3xl font-bold text-white mb-6">Add Class</h1>

                <div className="bg-[#1e2530] p-6 rounded-xl border border-gray-700 shadow-2xl">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Top Section Fields */}
                        <div className="md:col-span-1">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Name*</label>
                            <input type="text" name="className" value={formData.className} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none" required />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Date*</label>
                            <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none" required />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Class Mode*</label>
                            <select name="classMode" value={formData.classMode} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none" required>
                                <option value="">Select</option>
                                <option value="Online">Online</option>
                                <option value="Offline">Offline</option>
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Start Time*</label>
                            <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none" required />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">End Time*</label>
                            <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none" required />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Teacher Subject*</label>
                            <select name="subjectId" value={formData.subjectId} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none" required>
                                <option value="">Select a subject</option>
                                {dropdownData.subjects.map(s => <option key={s._id} value={s._id}>{s.subjectName}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Teacher*</label>
                            <select name="teacherId" value={formData.teacherId} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none" required>
                                <option value="">Select a teacher</option>
                                {dropdownData.teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Class Coordinator (Optional)</label>
                            <select name="coordinatorId" value={formData.coordinatorId} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none">
                                <option value="">Select a coordinator</option>
                                {dropdownData.coordinators?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Session*</label>
                            <select name="session" value={formData.session} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none" required>
                                <option value="">Select a session</option>
                                {dropdownData.sessions.map((s, i) => <option key={i} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Exam*</label>
                            <select name="examId" value={formData.examId} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none" required>
                                <option value="">Select a exam</option>
                                {dropdownData.exams.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Course*</label>
                            <select name="courseId" value={formData.courseId} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none" required>
                                <option value="">Select a course</option>
                                {dropdownData.courses.map(c => <option key={c._id} value={c._id}>{c.courseName}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Centre*</label>
                            <select name="centreId" value={formData.centreId} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none" required>
                                <option value="">Select a centre</option>
                                {dropdownData.centres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Batches*</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-[#131619] p-4 rounded-lg border border-gray-700">
                                {dropdownData.batches.map(b => (
                                    <label key={b._id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${formData.batchIds.includes(b._id) ? 'bg-cyan-900/30 border-cyan-500 text-cyan-200' : 'bg-[#1a1f24] border-gray-800 text-gray-500 hover:border-gray-600'}`}>
                                        <input
                                            type="checkbox"
                                            checked={formData.batchIds.includes(b._id)}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    batchIds: checked
                                                        ? [...prev.batchIds, b._id]
                                                        : prev.batchIds.filter(id => id !== b._id)
                                                }));
                                            }}
                                            className="hidden"
                                        />
                                        <span className="text-xs font-bold truncate">{b.batchName}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* NEW SECTION: Academic Class Content */}
                        <div className="md:col-span-1">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Class (Academic)*</label>
                            <select name="acadClassId" value={formData.acadClassId} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none">
                                <option value="">Select a class</option>
                                {dropdownData.academicClasses?.map(c => <option key={c._id} value={c._id}>{c.className}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Subject (Academic)*</label>
                            <select name="acadSubjectId" value={formData.acadSubjectId} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none" disabled={!formData.acadClassId}>
                                <option value="">Select a subject</option>
                                {acadSubjects.map(s => <option key={s._id} value={s._id}>{s.subjectName}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Chapter*</label>
                            <select name="chapterId" value={formData.chapterId} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none" disabled={!formData.acadSubjectId}>
                                <option value="">Select a chapter</option>
                                {acadChapters.map(c => <option key={c._id} value={c._id}>{c.chapterName}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Topic Names</label>
                            <div className="flex gap-2">
                                <select
                                    value={currentTopicId}
                                    onChange={(e) => setCurrentTopicId(e.target.value)}
                                    className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
                                    disabled={!formData.chapterId}
                                >
                                    <option value="">Select topics</option>
                                    {acadTopics.map(t => <option key={t._id} value={t._id}>{t.topicName}</option>)}
                                </select>
                                <button type="button" onClick={handleAddTopic} className="bg-blue-600 px-4 rounded-lg text-white hover:bg-blue-700 disabled:opacity-50"><FaPlus /></button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedTopics.map(t => (
                                    <span key={t._id} className="bg-cyan-900 text-cyan-200 px-2 py-1 rounded text-sm flex items-center gap-2">
                                        {t.topicName}
                                        <button type="button" onClick={() => handleRemoveTopic(t._id)} className="text-red-400 hover:text-red-200"><FaTrash size={10} /></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Message */}
                        <div className="md:col-span-2">
                            <label className="block text-gray-400 text-sm font-semibold mb-2">Message</label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                placeholder="Enter message (optional)"
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none h-24"
                            ></textarea>
                        </div>

                        {/* Submit */}
                        <div className="md:col-span-2 flex justify-end mt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-lg w-full md:w-auto"
                            >
                                {loading ? "Adding Class..." : "Add"}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </Layout>
    );
};

export default AddClass;
