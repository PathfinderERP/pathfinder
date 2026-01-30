import React, { useState, useEffect } from "react";
import { FaTimes, FaUserPlus, FaSync, FaSave, FaFilter } from "react-icons/fa";
import { toast } from "react-toastify";

const AddLeadModal = ({ onClose, onSuccess, isDarkMode }) => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phoneNumber: "",
        schoolName: "",
        className: "",
        centre: "",
        course: "",
        source: "",
        targetExam: "",
        leadType: "",
        leadResponsibility: ""
    });
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState([]);
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [sources, setSources] = useState([]);
    const [telecallers, setTelecallers] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [courseFilters, setCourseFilters] = useState({
        class: "",
        mode: "",
        examTag: "",
        type: ""
    });

    const filteredCourses = courses.filter(course => {
        return (
            (!courseFilters.class || (course.class?._id || course.class) === courseFilters.class) &&
            (!courseFilters.mode || course.mode === courseFilters.mode) &&
            (!courseFilters.examTag || (course.examTag?._id || course.examTag) === courseFilters.examTag) &&
            (!courseFilters.type || course.courseType === courseFilters.type)
        );
    });

    useEffect(() => {
        fetchDropdownData();
    }, []);

    const fetchDropdownData = async () => {
        try {
            const token = localStorage.getItem("token");

            const userProfileRes = await fetch(`${import.meta.env.VITE_API_URL}/profile/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const profileData = await userProfileRes.json();
            const currentUser = profileData.user || JSON.parse(localStorage.getItem("user") || "{}");
            const isSuperAdmin = currentUser.role === "superAdmin";

            const classResponse = await fetch(`${import.meta.env.VITE_API_URL}/class`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const classData = await classResponse.json();
            if (classResponse.ok) setClasses(Array.isArray(classData) ? classData : []);

            const centreResponse = await fetch(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const centreData = await centreResponse.json();
            if (centreResponse.ok) {
                const list = Array.isArray(centreData) ? centreData : [];
                setCentres(list);
                if (list.length > 0 && !formData.centre) {
                    setFormData(prev => ({ ...prev, centre: list[0]._id }));
                }
            }

            const courseResponse = await fetch(`${import.meta.env.VITE_API_URL}/course`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const courseData = await courseResponse.json();
            if (courseResponse.ok) setCourses(Array.isArray(courseData) ? courseData : []);

            const sourceResponse = await fetch(`${import.meta.env.VITE_API_URL}/source`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const sourceData = await sourceResponse.json();
            if (sourceResponse.ok) setSources(sourceData.sources || []);

            const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/getAllUsers`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const userData = await userResponse.json();
            if (userResponse.ok) {
                // Filter users to show only those with the "telecaller" role
                const telecallerUsers = (userData.users || []).filter(u => u.role === "telecaller");

                setTelecallers(telecallerUsers);

                // If current user is a telecaller, auto-select them
                if (currentUser.role === "telecaller") {
                    setFormData(prev => ({ ...prev, leadResponsibility: currentUser.name }));
                } else if (telecallerUsers.length === 1) {
                    // If only one telecaller available, auto-select them
                    setFormData(prev => ({ ...prev, leadResponsibility: telecallerUsers[0].name }));
                }
            }

            const examTagResponse = await fetch(`${import.meta.env.VITE_API_URL}/examTag`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const examTagData = await examTagResponse.json();
            if (examTagResponse.ok) setExamTags(Array.isArray(examTagData) ? examTagData : []);
        } catch (error) {
            console.error("Error fetching dropdown data:", error);
            toast.error("Failed to load options");
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Lead added successfully");
                onSuccess();
            } else {
                toast.error(data.message || "Failed to add lead");
            }
        } catch (error) {
            console.error("Error creating lead:", error);
            toast.error("An internal error occurred");
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = `w-full px-4 py-2.5 rounded-[4px] border text-[11px] font-black uppercase tracking-widest outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white placeholder-gray-600 focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-cyan-500'}`;
    const selectClasses = `w-full px-4 py-2.5 rounded-[4px] border text-[11px] font-black uppercase tracking-widest outline-none transition-all appearance-none cursor-pointer ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`;
    const labelClasses = `block text-[10px] font-black uppercase text-gray-500 mb-1.5 ml-1 tracking-widest`;

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[70] p-4 overflow-y-auto backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/70' : 'bg-white/60'}`}>
            <div className={`w-full max-w-3xl rounded-[4px] border shadow-2xl transition-all overflow-hidden scale-in ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-cyan-500/10' : 'bg-white border-gray-200'}`}>

                {/* Header */}
                <div className={`px-8 py-5 border-b flex justify-between items-center transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h3 className={`text-xl font-black uppercase tracking-tighter italic flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaUserPlus className="text-cyan-500" />
                            Add New Lead
                        </h3>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-0.5">Enter details for the new lead</p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`transition-all p-2 rounded-[4px] active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={`p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4 md:col-span-2">
                            <div className={`flex items-center gap-3 border-b pb-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">Contact Information</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className={labelClasses}>Full Name *</label>
                                    <input type="text" name="name" required value={formData.name} onChange={handleChange} className={inputClasses} placeholder="Student Name..." />
                                </div>
                                <div>
                                    <label className={labelClasses}>Primary Email *</label>
                                    <input type="email" name="email" required value={formData.email} onChange={handleChange} className={inputClasses} placeholder="Email Address..." />
                                </div>
                                <div>
                                    <label className={labelClasses}>Phone Number *</label>
                                    <input type="text" name="phoneNumber" required value={formData.phoneNumber} onChange={handleChange} className={inputClasses} placeholder="Phone Number..." />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 md:col-span-2">
                            <div className={`flex items-center gap-3 border-b pb-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">Academic Details</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className={labelClasses}>Origin School *</label>
                                    <input type="text" name="schoolName" required value={formData.schoolName} onChange={handleChange} className={inputClasses} placeholder="School/College Name..." />
                                </div>
                                <div>
                                    <label className={labelClasses}>Target Class *</label>
                                    <select name="className" required value={formData.className} onChange={handleChange} className={selectClasses}>
                                        <option value="">Select Class</option>
                                        {classes.map(cls => <option key={cls._id} value={cls._id}>{cls.name.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClasses}>Target Exam</label>
                                    <input type="text" name="targetExam" value={formData.targetExam} onChange={handleChange} className={inputClasses} placeholder="Target Exam..." />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 md:col-span-2">
                            <div className={`flex items-center gap-3 border-b pb-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">Assignment Details</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClasses}>Target Centre *</label>
                                    <select name="centre" required value={formData.centre} onChange={handleChange} className={selectClasses}>
                                        <option value="">Select Centre</option>
                                        {centres.map(c => <option key={c._id} value={c._id}>{c.centreName.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClasses}>Lead Priority *</label>
                                    <select name="leadType" required value={formData.leadType} onChange={handleChange} className={selectClasses}>
                                        <option value="">Select Priority</option>
                                        <option value="HOT LEAD">HOT LEAD</option>
                                        <option value="COLD LEAD">COLD LEAD</option>
                                        <option value="NEGATIVE">NEGATIVE</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Course Filter Panel */}
                        <div className={`md:col-span-2 p-6 rounded-[4px] border border-dashed transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <FaFilter className="text-cyan-500" size={10} />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Filter Courses</h4>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCourseFilters({ class: "", mode: "", examTag: "", type: "" })}
                                    className={`text-[9px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'text-gray-600 hover:text-cyan-400' : 'text-gray-400 hover:text-cyan-600'}`}
                                >
                                    Clear Filters
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Admission Type", key: "type", options: [{ v: "INSTATION", l: "INSTA" }, { v: "OUTSTATION", l: "OUT" }] },
                                    { label: "Mode", key: "mode", options: [{ v: "ONLINE", l: "ON" }, { v: "OFFLINE", l: "OFF" }] },
                                    { label: "Class", key: "class", options: classes.map(c => ({ v: c._id, l: c.name })) },
                                    { label: "Exam Type", key: "examTag", options: examTags.map(t => ({ v: t._id, l: t.name })) }
                                ].map(filter => (
                                    <div key={filter.key} className="space-y-1">
                                        <label className="text-[8px] font-black uppercase text-gray-600 tracking-widest">{filter.label}</label>
                                        <select
                                            value={courseFilters[filter.key]}
                                            onChange={(e) => setCourseFilters({ ...courseFilters, [filter.key]: e.target.value })}
                                            className={`w-full py-1.5 rounded-[2px] border text-[8px] font-black uppercase tracking-widest focus:outline-none transition-all appearance-none cursor-pointer ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-400 focus:border-cyan-500/50' : 'bg-white border-gray-100 text-gray-500 focus:border-cyan-500'}`}
                                        >
                                            <option value="">Any</option>
                                            {filter.options.map(opt => <option key={opt.v} value={opt.v}>{opt.l.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className={labelClasses}>Select Course ({filteredCourses.length}) *</label>
                            <select name="course" required value={formData.course} onChange={handleChange} className={selectClasses}>
                                <option value="">Select Course</option>
                                {filteredCourses.map(c => <option key={c._id} value={c._id}>{c.courseName.toUpperCase()}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className={labelClasses}>Origin Source *</label>
                            <select name="source" required value={formData.source} onChange={handleChange} className={selectClasses}>
                                <option value="">Select Source</option>
                                {sources.map(s => <option key={s._id} value={s.sourceName}>{s.sourceName.toUpperCase()}</option>)}
                            </select>
                        </div>

                        <div className="md:col-span-2 space-y-1.5">
                            <label className={labelClasses}>Assign To *</label>
                            <select name="leadResponsibility" required value={formData.leadResponsibility} onChange={handleChange} className={selectClasses}>
                                <option value="">Select Agent</option>
                                {telecallers.map(t => <option key={t._id} value={t.name}>{t.name.toUpperCase()}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={`flex justify-end gap-4 mt-10 pt-6 border-t transition-all ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-8 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-10 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${isDarkMode ? 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-500/20' : 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-cyan-500/30'}`}
                        >
                            {loading ? <FaSync className="animate-spin" /> : <><FaSave className="inline-block mr-2" /> Save Lead</>}
                        </button>
                    </div>
                </form>
            </div>

            <style jsx>{`
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#333' : '#d1d5db'}; border-radius: 4px; }
            `}</style>
        </div>
    );
};

export default AddLeadModal;
