import React, { useState, useEffect } from 'react';
import { useTheme } from "../../context/ThemeContext";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaSearch, FaTimes, FaSun, FaMoon, FaSync, FaFilter, FaLayerGroup } from 'react-icons/fa';
import CustomMultiSelect from '../common/CustomMultiSelect';

const SectionAllotmentContent = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedDetail, setSelectedDetail] = useState(null); // For Modal
    const [showModal, setShowModal] = useState(false);
    const [examSections, setExamSections] = useState([]); // Dynamic Exam Sections

    // Filter Lists
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [classes, setClasses] = useState([]);

    // Filter States
    const [filters, setFilters] = useState({
        centre: [],
        course: [],
        class: []
    });

    // Form Data for Modal
    const [formData, setFormData] = useState({
        examSection: "",
        studySection: "",
        omrCode: "",
        rm: ""
    });

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = user.role === "Super Admin" || user.role === "superAdmin";

    useEffect(() => {
        fetchDropdowns();
        fetchExamSections();
    }, []);

    useEffect(() => {
        // Debounce search/filter fetch
        const timer = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timer);
    }, [search, filters]);

    const fetchExamSections = async () => {
        try {
            // Retrieve synchronized token from localStorage
            const portalToken = localStorage.getItem("portalToken");

            if (!portalToken) {
                console.warn("No portal token found. Please re-login to synchronize with the student portal.");
                return;
            }

            // Fetch sections using the portal token
            const response = await fetch("https://www.studypathportal.in/api/sections/", {
                headers: { "Authorization": `Bearer ${portalToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                setExamSections(data);
            } else if (response.status === 401) {
                console.error("Portal token expired or invalid.");
            }
        } catch (err) {
            console.error("Error fetching exam sections:", err);
            // Fallback to static sections handled by render logic
        }
    };

    const fetchDropdowns = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };

            const [centreRes, courseRes, classRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/course`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/class`, { headers })
            ]);

            if (centreRes.ok) {
                const allCentres = await centreRes.json();
                if (isSuperAdmin) {
                    setCentres(allCentres);
                } else {
                    const allowedCentres = allCentres.filter(c =>
                        user.centres && user.centres.some(uc => uc._id === c._id || uc.centreName === c.centreName)
                    );
                    setCentres(allowedCentres);
                }
            }
            if (courseRes.ok) setCourses(await courseRes.json());
            if (classRes.ok) setClasses(await classRes.json());

        } catch (err) {
            console.error("Error fetching dropdowns", err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            if (search) params.append('search', search);

            if (filters.centre.length) params.append('centre', filters.centre.map(c => c.value).join(','));
            if (filters.course.length) params.append('course', filters.course.map(c => c.value).join(','));
            if (filters.class.length) params.append('class', filters.class.map(c => c.value).join(','));

            const response = await fetch(`${import.meta.env.VITE_API_URL}/admission/section-allotment?${params.toString()}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            const data = await response.json();
            if (response.ok) {
                setStudents(data);
            }
        } catch (err) {
            toast.error("Failed to fetch students");
        } finally {
            setLoading(false);
        }
    };

    const handleAllotClick = (admission) => {
        setSelectedDetail(admission);
        setFormData({
            examSection: admission.sectionAllotment?.examSection || "",
            studySection: admission.sectionAllotment?.studySection || "",
            omrCode: admission.sectionAllotment?.omrCode || "",
            rm: admission.sectionAllotment?.rm || ""
        });
        setShowModal(true);
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admission/section-allotment/${selectedDetail._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success("Section allotted successfully");
                setShowModal(false);
                fetchData();
            } else {
                toast.error("Failed to update");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    return (
        <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-[#0f1215] text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
            <ToastContainer theme={isDarkMode ? 'dark' : 'light'} />

            {/* Header Section */}
            <div className={`p-6 border-b flex items-center justify-between sticky top-0 z-30 transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-2xl' : 'bg-white border-gray-200 shadow-md'}`}>
                <div className="flex flex-col">
                    <h2 className={`text-2xl font-black italic tracking-tighter uppercase leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Section Allotment
                    </h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2">
                        ADMISSIONS CONTROL MODULE <span className="mx-2 text-cyan-500">|</span> <span className="text-cyan-500">COHORT SEGMENTATION</span>
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className={`p-2.5 rounded-[4px] border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                        title="Toggle Local Theme"
                    >
                        {isDarkMode ? <FaSun /> : <FaMoon />}
                    </button>
                    <button
                        onClick={fetchData}
                        className={`p-2.5 rounded-[4px] border transition-all active:scale-95 ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black' : 'bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-100'}`}
                        title="Sync Registry"
                    >
                        <FaSync className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {/* Filters Section */}
                <div className={`p-6 rounded-[4px] border mb-8 transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <FaFilter className="text-cyan-500" />
                        <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Segment Selection Engine</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Master Search</label>
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
                                <input
                                    type="text"
                                    placeholder="INITIATE SCAN..."
                                    className={`w-full pl-10 pr-4 py-2.5 rounded-[4px] border text-[11px] font-bold tracking-tight transition-all focus:outline-none focus:ring-1 ${isDarkMode ? 'bg-[#111418] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Centre HQ</label>
                            <CustomMultiSelect
                                options={centres.map(c => ({ value: c.centreName, label: c.centreName }))}
                                value={filters.centre}
                                onChange={(selected) => setFilters({ ...filters, centre: selected })}
                                placeholder="ALL NODES"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Academic Syllabus</label>
                            <CustomMultiSelect
                                options={courses.map(c => ({ value: c._id, label: c.courseName }))}
                                value={filters.course}
                                onChange={(selected) => setFilters({ ...filters, course: selected })}
                                placeholder="ALL PROGRAMS"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Grade Level</label>
                            <CustomMultiSelect
                                options={classes.map(c => ({ value: c._id, label: c.name }))}
                                value={filters.class}
                                onChange={(selected) => setFilters({ ...filters, class: selected })}
                                placeholder="ALL LEVELS"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>
                    </div>
                </div>

                {/* Data Grid */}
                <div className={`rounded-[4px] border overflow-hidden transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-2xl' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`${isDarkMode ? 'bg-[#131619] border-b border-gray-800' : 'bg-gray-50 border-b border-gray-200'}`}>
                                    <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Reg Number</th>
                                    <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Entity Identification</th>
                                    <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Exam Section</th>
                                    <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Study Section</th>
                                    <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <FaSync size={24} className="text-cyan-500 animate-spin" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">SYNCHRONIZING RECORDS...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : students.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic">No students allocated in the current Matrix</p>
                                        </td>
                                    </tr>
                                ) : (
                                    students.map((admission) => {
                                        const student = admission.student?.studentsDetails?.[0] || {};
                                        return (
                                            <tr key={admission._id} className={`transition-all ${isDarkMode ? 'hover:bg-cyan-500/5' : 'hover:bg-gray-50'}`}>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black tracking-widest ${isDarkMode ? 'bg-[#131619] text-cyan-400 border border-cyan-400/20' : 'bg-gray-100 text-cyan-700 border border-cyan-200'}`}>{admission.admissionNumber}</span>
                                                </td>
                                                <td className="p-4">
                                                    <p className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{student.studentName}</p>
                                                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter mt-0.5">{admission.centre.toUpperCase()} | {admission.course?.courseName || 'GENERIC'}</p>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-[4px] font-black text-xs ${admission.sectionAllotment?.examSection ? (isDarkMode ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border border-cyan-200') : (isDarkMode ? 'bg-gray-800 text-gray-600' : 'bg-gray-100 text-gray-400')}`}>
                                                        {admission.sectionAllotment?.examSection || '-'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-[4px] font-black text-xs ${admission.sectionAllotment?.studySection ? (isDarkMode ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' : 'bg-purple-50 text-purple-600 border-purple-200') : (isDarkMode ? 'bg-gray-800 text-gray-600' : 'bg-gray-100 text-gray-400')}`}>
                                                        {admission.sectionAllotment?.studySection || '-'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-center">
                                                        <button
                                                            onClick={() => handleAllotClick(admission)}
                                                            className={`px-4 py-1.5 rounded-[4px] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm ${isDarkMode ? 'bg-gray-800 text-cyan-400 border border-gray-700 hover:bg-cyan-500 hover:text-white' : 'bg-white text-cyan-600 border border-cyan-200 hover:bg-cyan-600 hover:text-white active:scale-95'}`}
                                                        >
                                                            ALLOT
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Strategic Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className={`${isDarkMode ? 'bg-[#1e2329] border-gray-700' : 'bg-white border-gray-200'} rounded-[4px] w-full max-w-sm border shadow-2xl overflow-hidden`}>
                        <div className={`flex justify-between items-center p-6 border-b ${isDarkMode ? 'border-gray-700 bg-[#1e2329]' : 'border-gray-100 bg-gray-50'}`}>
                            <div>
                                <h3 className={`text-xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Choose Section</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Strategic Allotment</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors">
                                <FaTimes size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Exam Section</label>
                                    <select
                                        name="examSection"
                                        value={formData.examSection}
                                        onChange={handleInputChange}
                                        className={`w-full p-3 rounded-[4px] border font-black uppercase tracking-widest text-[11px] focus:outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                    >
                                        <option value="">Select Section</option>
                                        {examSections.length > 0 ? (
                                            examSections.map((section) => (
                                                <option key={section.id} value={section.name}>{section.name}</option>
                                            ))
                                        ) : (
                                            <>
                                                <option value="A">Section A</option>
                                                <option value="B">Section B</option>
                                                <option value="C">Section C</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Study Section</label>
                                    <select
                                        name="studySection"
                                        value={formData.studySection}
                                        onChange={handleInputChange}
                                        className={`w-full p-3 rounded-[4px] border font-black uppercase tracking-widest text-[11px] focus:outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-purple-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500'}`}
                                    >
                                        <option value="">Select Section</option>
                                        <option value="A">Section A</option>
                                        <option value="B">Section B</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">OMR Code</label>
                                    <input
                                        type="text"
                                        name="omrCode"
                                        value={formData.omrCode}
                                        onChange={handleInputChange}
                                        className={`w-full p-3 rounded-[4px] border font-black uppercase tracking-widest text-[11px] focus:outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                        placeholder="Enter OMR Code"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[4px] text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-lg active:scale-95 shadow-cyan-500/20"
                            >
                                Commit Allotment
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: ${isDarkMode ? '#0f1215' : '#f3f4f6'}; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#d1d5db'}; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? '#374151' : '#9ca3af'}; }
            `}</style>
        </div>
    );
};

export default SectionAllotmentContent;
