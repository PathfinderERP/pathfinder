import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { hasPermission } from "../../config/permissions";
import { FaPlus, FaTrash } from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";

const AddClass = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    useEffect(() => {
        const userObj = JSON.parse(localStorage.getItem("user") || "{}");
        if (!hasPermission(userObj, "academics", "classes", "create")) {
            toast.error("You do not have permission to create classes");
            navigate("/academics/class");
        }
    }, [navigate]);

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

    // Searchable Dropdown Component
    const SearchableSelect = ({ 
        label, 
        value, 
        options, 
        onChange, 
        placeholder, 
        isDarkMode, 
        required = false,
        name,
        disabled = false,
        displayPath = "name",
        valuePath = "_id",
        filterFunc = null,
        fullWidth = false
    }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [search, setSearch] = useState("");
        const dropdownRef = useRef(null);

        useEffect(() => {
            const handler = (e) => {
                if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener("mousedown", handler);
            return () => document.removeEventListener("mousedown", handler);
        }, []);

        const filteredOptions = options.filter(opt => {
            const displayVal = typeof opt === 'string' ? opt : opt[displayPath];
            const matchesSearch = displayVal?.toLowerCase().includes(search.toLowerCase());
            if (filterFunc) return matchesSearch && filterFunc(opt);
            return matchesSearch;
        });

        const selectedOption = options.find(opt => (typeof opt === 'string' ? opt : opt[valuePath]) === value);
        const displayLabel = selectedOption 
            ? (typeof selectedOption === 'string' ? selectedOption : selectedOption[displayPath])
            : placeholder;

        return (
            <div className={fullWidth ? "md:col-span-2" : "md:col-span-1"} ref={dropdownRef}>
                {label && (
                    <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {label}{required ? '*' : ''}
                    </label>
                )}
                <div className="relative">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => { if(!disabled) setIsOpen(!isOpen); setSearch(""); }}
                        className={`w-full rounded-lg p-3 outline-none transition-all border text-left flex justify-between items-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600 shadow-sm'}`}
                    >
                        <span className={value ? '' : 'text-gray-400'}>
                            {displayLabel}
                        </span>
                        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    {isOpen && (
                        <div className={`absolute z-50 w-full mt-1 rounded-lg border shadow-xl overflow-hidden ${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className={`p-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <input
                                    type="text"
                                    autoFocus
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder={`Search ${label}...`}
                                    className={`w-full px-3 py-1.5 text-sm rounded-lg border outline-none ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                />
                            </div>
                            <div className="max-h-52 overflow-y-auto">
                                <button
                                    type="button"
                                    onClick={() => { onChange({ target: { name, value: "" } }); setIsOpen(false); }}
                                    className={`w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'text-gray-400 hover:bg-[#131619]' : 'text-gray-400 hover:bg-gray-50'}`}
                                >
                                    {placeholder}
                                </button>
                                {filteredOptions.map((opt, i) => {
                                    const val = typeof opt === 'string' ? opt : opt[valuePath];
                                    const labelText = typeof opt === 'string' ? opt : opt[displayPath];
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => { onChange({ target: { name, value: val } }); setIsOpen(false); setSearch(""); }}
                                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${value === val ? (isDarkMode ? 'bg-cyan-900/40 text-cyan-300' : 'bg-cyan-50 text-cyan-700 font-semibold') : (isDarkMode ? 'text-gray-200 hover:bg-[#131619]' : 'text-gray-800 hover:bg-gray-50')}`}
                                        >
                                            {labelText}
                                        </button>
                                    );
                                })}
                                {filteredOptions.length === 0 && (
                                    <div className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No results found</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {required && !value && <input type="text" value="" required className="opacity-0 absolute h-0 w-0" onChange={()=>{}} />}
            </div>
        );
    };

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
            <div className={`p-6 min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'text-gray-100 bg-[#131619]' : 'text-gray-900 bg-[#f8fafc]'}`}>
                <ToastContainer theme={theme} position="top-right" />

                <h1 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add Class</h1>

                <div className={`p-6 rounded-xl border transition-colors ${isDarkMode ? 'bg-[#1e2530] border-gray-700 shadow-2xl' : 'bg-white border-gray-200 shadow-md'}`}>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Top Section Fields */}
                        <div className="md:col-span-1">
                            <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Name*</label>
                            <input
                                type="text"
                                name="className"
                                value={formData.className}
                                onChange={handleChange}
                                className={`w-full rounded-lg p-3 outline-none transition-all border ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600 shadow-sm'}`}
                                required
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Date*</label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className={`w-full rounded-lg p-3 outline-none transition-all border ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600 shadow-sm'}`}
                                required
                            />
                        </div>
                        <SearchableSelect
                            label="Class Mode"
                            name="classMode"
                            value={formData.classMode}
                            options={["Online", "Offline"]}
                            onChange={handleChange}
                            placeholder="Select"
                            isDarkMode={isDarkMode}
                            required
                            fullWidth
                        />
                        <div className="md:col-span-1">
                            <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Start Time*</label>
                            <input
                                type="time"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleChange}
                                className={`w-full rounded-lg p-3 outline-none transition-all border ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600 shadow-sm'}`}
                                required
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>End Time*</label>
                            <input
                                type="time"
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleChange}
                                className={`w-full rounded-lg p-3 outline-none transition-all border ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600 shadow-sm'}`}
                                required
                            />
                        </div>
                        <SearchableSelect
                            label="Teacher Subject"
                            name="subjectId"
                            value={formData.subjectId}
                            options={dropdownData.subjects}
                            displayPath="subjectName"
                            onChange={handleChange}
                            placeholder="Select a subject"
                            isDarkMode={isDarkMode}
                            required
                        />

                        <SearchableSelect
                            label="Teacher"
                            name="teacherId"
                            value={formData.teacherId}
                            options={dropdownData.teachers}
                            displayPath="name"
                            onChange={handleChange}
                            placeholder="Select a teacher"
                            isDarkMode={isDarkMode}
                            required
                            filterFunc={(t) => {
                                if (formData.centreId) {
                                    return t.centres?.some(c => (c._id || c).toString() === formData.centreId);
                                }
                                return true;
                            }}
                        />

                        <SearchableSelect
                            label="Class Coordinator (Optional)"
                            name="coordinatorId"
                            value={formData.coordinatorId}
                            options={dropdownData.coordinators}
                            displayPath="name"
                            onChange={handleChange}
                            placeholder={formData.centreId ? 'Select a coordinator (Filtered by Centre)' : 'Select a coordinator'}
                            isDarkMode={isDarkMode}
                            filterFunc={(c) => {
                                if (formData.centreId) {
                                    return c.centres?.some(ctrl => (ctrl._id || ctrl).toString() === formData.centreId);
                                }
                                return true;
                            }}
                        />

                        <SearchableSelect
                            label="Session"
                            name="session"
                            value={formData.session}
                            options={dropdownData.sessions}
                            displayPath="sessionName"
                            valuePath="sessionName"
                            onChange={handleChange}
                            placeholder="Select a session"
                            isDarkMode={isDarkMode}
                            required
                        />

                        <SearchableSelect
                            label="Exam"
                            name="examId"
                            value={formData.examId}
                            options={dropdownData.exams}
                            displayPath="name"
                            onChange={handleChange}
                            placeholder="Select a exam"
                            isDarkMode={isDarkMode}
                            required
                        />

                        <SearchableSelect
                            label="Course"
                            name="courseId"
                            value={formData.courseId}
                            options={dropdownData.courses}
                            displayPath="courseName"
                            onChange={handleChange}
                            placeholder="Select a course"
                            isDarkMode={isDarkMode}
                            required
                        />

                        <SearchableSelect
                            label="Centre"
                            name="centreId"
                            value={formData.centreId}
                            options={dropdownData.centres}
                            displayPath="centreName"
                            onChange={handleChange}
                            placeholder="Select a centre"
                            isDarkMode={isDarkMode}
                            required
                        />

                        <div className="md:col-span-2">
                            <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Batches*</label>
                            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700' : 'bg-gray-50 border-gray-200 shadow-inner'}`}>
                                {dropdownData.batches.map(b => (
                                    <label key={b._id} className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${formData.batchIds.includes(b._id) ? (isDarkMode ? 'bg-cyan-900/30 border-cyan-500 text-cyan-200' : 'bg-cyan-50 border-cyan-500 text-cyan-700') : (isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-gray-500 hover:border-gray-600' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300')}`}>
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
                                        <span className="text-xs font-bold truncate uppercase tracking-tight">{b.batchName}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* NEW SECTION: Academic Class Content */}
                        <SearchableSelect
                            label="Class (Academic)"
                            name="acadClassId"
                            value={formData.acadClassId}
                            options={dropdownData.academicClasses}
                            displayPath="className"
                            onChange={handleChange}
                            placeholder="Select a class"
                            isDarkMode={isDarkMode}
                            required
                        />

                        <SearchableSelect
                            label="Subject (Academic)"
                            name="acadSubjectId"
                            value={formData.acadSubjectId}
                            options={acadSubjects}
                            displayPath="subjectName"
                            onChange={handleChange}
                            placeholder="Select a subject"
                            isDarkMode={isDarkMode}
                            required
                            disabled={!formData.acadClassId}
                        />

                        <SearchableSelect
                            label="Chapter"
                            name="chapterId"
                            value={formData.chapterId}
                            options={acadChapters}
                            displayPath="chapterName"
                            onChange={handleChange}
                            placeholder="Select a chapter"
                            isDarkMode={isDarkMode}
                            required
                            disabled={!formData.acadSubjectId}
                        />

                        <div className="md:col-span-1">
                            <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Topic Names</label>
                            <div className="flex gap-2 items-start">
                                <div className="flex-1">
                                    <SearchableSelect
                                        label=""
                                        value={currentTopicId}
                                        options={acadTopics}
                                        displayPath="topicName"
                                        onChange={(e) => setCurrentTopicId(e.target.value)}
                                        placeholder="Select topics"
                                        isDarkMode={isDarkMode}
                                        disabled={!formData.chapterId}
                                    />
                                </div>
                                <button type="button" onClick={handleAddTopic} className="bg-blue-600 px-5 h-[46px] rounded-lg text-white hover:bg-blue-700 disabled:opacity-50 transition-all font-bold flex items-center justify-center shrink-0"><FaPlus /></button>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {selectedTopics.map(t => (
                                    <span key={t._id} className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-tight flex items-center gap-2 transition-all shadow-sm ${isDarkMode ? 'bg-cyan-900/40 text-cyan-200 border border-cyan-800' : 'bg-cyan-50 text-cyan-700 border border-cyan-100'}`}>
                                        {t.topicName}
                                        <button type="button" onClick={() => handleRemoveTopic(t._id)} className={`${isDarkMode ? 'text-red-400 hover:text-red-200' : 'text-red-500 hover:text-red-700'}`}><FaTrash size={10} /></button>
                                    </span>
                                ))}
                            </div>
                        </div>


                        {/* Message */}
                        <div className="md:col-span-2">
                            <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Message</label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                placeholder="Enter message (optional)"
                                className={`w-full rounded-lg p-3 outline-none transition-all border h-24 ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600 shadow-sm'}`}
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
