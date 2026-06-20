import React, { useState, useEffect, useCallback } from "react";
import { FaTimes, FaUserEdit, FaSync, FaSave, FaFilter, FaSearch, FaCheckSquare, FaSquare } from "react-icons/fa";
import { toast } from "react-toastify";
import CustomSearchSelect from "../common/CustomSearchSelect";

const BulkUpdateLeadModal = ({ selectedLeadIds, onClose, onSuccess, isDarkMode }) => {
    const [enabledFields, setEnabledFields] = useState({
        schoolName: false,
        className: false,
        centre: false,
        course: false,
        board: false,
        source: false,
        targetExam: false,
        leadType: false,
        leadResponsibility: false,
        isPriority: false
    });

    const [formData, setFormData] = useState({
        schoolName: "",
        className: "",
        centre: "",
        course: "",
        board: "",
        source: "",
        targetExam: "",
        leadType: "",
        leadResponsibility: "",
        isPriority: ""
    });

    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState([]);
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [sources, setSources] = useState([]);
    const [telecallers, setTelecallers] = useState([]);
    const [boards, setBoards] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [courseFilters, setCourseFilters] = useState({
        class: "",
        mode: "",
        examTag: "",
        type: ""
    });
    const [courseSearch, setCourseSearch] = useState("");

    const filteredCourses = courses.filter(course => {
        return (
            (!courseFilters.class || (course.class?._id || course.class) === courseFilters.class) &&
            (!courseFilters.mode || course.mode === courseFilters.mode) &&
            (!courseFilters.examTag || (course.examTag?._id || course.examTag) === courseFilters.examTag) &&
            (!courseFilters.type || course.courseType === courseFilters.type) &&
            (!courseSearch || course.courseName.toLowerCase().includes(courseSearch.toLowerCase()))
        );
    });

    const toggleField = (field) => {
        setEnabledFields(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const fetchDropdownData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");

            const userProfileRes = await fetch(`${import.meta.env.VITE_API_URL}/profile/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const profileData = await userProfileRes.json();
            const user = profileData.user || JSON.parse(localStorage.getItem("user") || "{}");
            setCurrentUser(user);

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
                const list = (Array.isArray(centreData) ? centreData : []).sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
                setCentres(list);
            }

            const courseResponse = await fetch(`${import.meta.env.VITE_API_URL}/course`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (courseResponse.ok) {
                const data = await courseResponse.json();
                const filtered = (Array.isArray(data) ? data : []).filter(c => c.department?.showInAdmission !== false);
                setCourses(filtered.sort((a, b) => (a.courseName || "").localeCompare(b.courseName || "")));
            }

            const sourceResponse = await fetch(`${import.meta.env.VITE_API_URL}/source`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const sourceData = await sourceResponse.json();
            if (sourceResponse.ok) setSources((sourceData.sources || []).sort((a, b) => (a.sourceName || "").localeCompare(b.sourceName || "")));

            const boardResponse = await fetch(`${import.meta.env.VITE_API_URL}/board`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const boardData = await boardResponse.json();
            if (boardResponse.ok) setBoards((Array.isArray(boardData) ? boardData : []).sort((a, b) => (a.boardName || a.boardCourse || "").localeCompare(b.boardName || b.boardCourse || "")));

            const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/getAllUsers`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const userData = await userResponse.json();
            if (userResponse.ok) {
                const leadUsers = (userData.users || []).filter(u => {
                    const r = u.role?.toLowerCase()?.replace(/\s+/g, '') || '';
                    const isActive = u.isActive !== false;
                    const allowedRoles = ['telecaller', 'centralizedtelecaller', 'counsellor', 'marketing', 'rm', 'centerincharge', 'centreincharge', 'zonalmanager', 'hod', 'superadmin'];
                    return isActive && allowedRoles.includes(r);
                });

                // Find duplicate active user names
                const nameCounts = {};
                leadUsers.forEach(u => {
                    const name = u.name?.trim();
                    if (name) nameCounts[name] = (nameCounts[name] || 0) + 1;
                });

                const formattedUsers = leadUsers.map(u => {
                    const name = u.name?.trim();
                    const isDuplicate = nameCounts[name] > 1;
                    let displayName = u.name;
                    if (isDuplicate) {
                        const centreNames = (u.centres || []).map(c => c.centreName || c.name).filter(Boolean).join(', ');
                        displayName = `${u.name} (${centreNames || 'No Centre'})`;
                    }
                    return {
                        ...u,
                        displayName,
                        value: isDuplicate ? displayName : u.name
                    };
                });

                formattedUsers.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
                setTelecallers(formattedUsers);
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
    }, []);

    useEffect(() => {
        fetchDropdownData();
    }, [fetchDropdownData]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Construct the update data only using enabled fields
        const updateData = {};
        let hasAtLeastOneField = false;

        Object.keys(enabledFields).forEach(field => {
            if (enabledFields[field]) {
                updateData[field] = formData[field];
                hasAtLeastOneField = true;
            }
        });

        if (!hasAtLeastOneField) {
            toast.warning("Please select at least one field to update.");
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/bulk-update`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ids: selectedLeadIds,
                    updateData
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || "Leads updated successfully");
                onSuccess();
            } else {
                toast.error(data.message || "Failed to update leads");
            }
        } catch (error) {
            console.error("Error updating leads:", error);
            toast.error("An internal error occurred");
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = (isEnabled) => `w-full px-4 py-2.5 rounded-[4px] border text-[11px] font-black uppercase tracking-widest outline-none transition-all ${
        !isEnabled ? 'bg-gray-800/10 border-gray-800/20 text-gray-500 cursor-not-allowed opacity-50' : 
        isDarkMode ? 'bg-[#131619] border-gray-800 text-white placeholder-gray-600 focus:border-cyan-500/50' : 
        'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-cyan-500'
    }`;

    const selectClasses = (isEnabled) => `w-full px-4 py-2.5 rounded-[4px] border text-[11px] font-black uppercase tracking-widest outline-none transition-all appearance-none cursor-pointer ${
        !isEnabled ? 'bg-gray-800/10 border-gray-800/20 text-gray-500 cursor-not-allowed opacity-50' : 
        isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500/50' : 
        'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'
    }`;

    const labelClasses = (isEnabled) => `block text-[10px] font-black uppercase mb-1.5 ml-1 tracking-widest ${isEnabled ? (isDarkMode ? 'text-cyan-400' : 'text-cyan-600') : 'text-gray-500'}`;

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[70] p-4 overflow-y-auto backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/70' : 'bg-white/60'}`}>
            <div className={`w-full max-w-3xl rounded-[4px] border shadow-2xl transition-all overflow-hidden scale-in ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-cyan-500/10' : 'bg-white border-gray-200'}`}>

                {/* Header */}
                <div className={`px-8 py-5 border-b flex justify-between items-center transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h3 className={`text-xl font-black uppercase tracking-tighter italic flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaUserEdit className="text-cyan-500" />
                            Bulk Update Selected Leads ({selectedLeadIds.length})
                        </h3>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-0.5">Toggle the checkbox next to any field to include it in the bulk update</p>
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
                        
                        {/* School and Target Class */}
                        <div className="space-y-4 md:col-span-2">
                            <div className={`flex items-center gap-3 border-b pb-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">Academic & school details</h4>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* School Name */}
                                <div className={`p-3 rounded border transition-all ${enabledFields.schoolName ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                                    <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('schoolName')}>
                                        {enabledFields.schoolName ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Enable School Name</span>
                                    </div>
                                    <label className={labelClasses(enabledFields.schoolName)}>Origin School</label>
                                    <input 
                                        type="text" 
                                        name="schoolName" 
                                        disabled={!enabledFields.schoolName}
                                        value={formData.schoolName} 
                                        onChange={handleChange} 
                                        className={inputClasses(enabledFields.schoolName)} 
                                        placeholder="School/College Name..." 
                                    />
                                </div>

                                {/* Target Class */}
                                <div className={`p-3 rounded border transition-all ${enabledFields.className ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                                    <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('className')}>
                                        {enabledFields.className ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Enable Class</span>
                                    </div>
                                    <label className={labelClasses(enabledFields.className)}>Target Class</label>
                                    <select 
                                        name="className" 
                                        disabled={!enabledFields.className}
                                        value={formData.className} 
                                        onChange={handleChange} 
                                        className={selectClasses(enabledFields.className)}
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map(cls => <option key={cls._id} value={cls._id}>{cls.name.toUpperCase()}</option>)}
                                    </select>
                                </div>

                                {/* Board */}
                                <div className={`p-3 rounded border transition-all ${enabledFields.board ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                                    <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('board')}>
                                        {enabledFields.board ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Enable Board</span>
                                    </div>
                                    <label className={labelClasses(enabledFields.board)}>Board</label>
                                    <select 
                                        name="board" 
                                        disabled={!enabledFields.board}
                                        value={formData.board} 
                                        onChange={handleChange} 
                                        className={selectClasses(enabledFields.board)}
                                    >
                                        <option value="">Select Board</option>
                                        {boards.map(b => <option key={b._id} value={b._id}>{b.boardName || b.boardCourse}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Assignment Details */}
                        <div className="space-y-4 md:col-span-2">
                            <div className={`flex items-center gap-3 border-b pb-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">Assignment & target centres</h4>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Target Centre */}
                                <div className={`p-3 rounded border transition-all ${enabledFields.centre ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                                    <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('centre')}>
                                        {enabledFields.centre ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Enable Centre</span>
                                    </div>
                                    <label className={labelClasses(enabledFields.centre)}>Target Centre</label>
                                    <select 
                                        name="centre" 
                                        disabled={!enabledFields.centre}
                                        value={formData.centre} 
                                        onChange={handleChange} 
                                        className={selectClasses(enabledFields.centre)}
                                    >
                                        <option value="">Select Centre</option>
                                        {centres.map(c => <option key={c._id} value={c._id}>{c.centreName.toUpperCase()}</option>)}
                                    </select>
                                </div>

                                {/* Lead Type */}
                                <div className={`p-3 rounded border transition-all ${enabledFields.leadType ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                                    <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('leadType')}>
                                        {enabledFields.leadType ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Enable Lead Type</span>
                                    </div>
                                    <label className={labelClasses(enabledFields.leadType)}>Lead Type</label>
                                    <select 
                                        name="leadType" 
                                        disabled={!enabledFields.leadType}
                                        value={formData.leadType} 
                                        onChange={handleChange} 
                                        className={selectClasses(enabledFields.leadType)}
                                    >
                                        <option value="">Select Lead Type</option>
                                        <option value="HOT LEAD">HOT LEAD</option>
                                        <option value="WARM LEAD">WARM LEAD</option>
                                        <option value="COLD LEAD">COLD LEAD</option>
                                        <option value="NEUTRAL LEAD">NEUTRAL LEAD</option>
                                        <option value="INVALID LEAD">INVALID LEAD</option>
                                    </select>
                                </div>

                                {/* Agent Assign */}
                                <div className={`p-3 rounded border transition-all ${enabledFields.leadResponsibility ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                                    <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('leadResponsibility')}>
                                        {enabledFields.leadResponsibility ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Enable Assign Agent</span>
                                    </div>
                                    <label className={labelClasses(enabledFields.leadResponsibility)}>Assign Agent</label>
                                    <CustomSearchSelect
                                        options={telecallers.map(t => ({ value: t.value || t.name, label: t.displayName || t.name }))}
                                        value={formData.leadResponsibility}
                                        onChange={(val) => setFormData({ ...formData, leadResponsibility: val })}
                                        placeholder="Select Agent"
                                        isDisabled={!enabledFields.leadResponsibility}
                                        isDarkMode={isDarkMode}
                                    />
                                </div>

                                {/* Lead Priority */}
                                <div className={`p-3 rounded border transition-all ${enabledFields.isPriority ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                                    <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('isPriority')}>
                                        {enabledFields.isPriority ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Enable Priority Tag</span>
                                    </div>
                                    <label className={labelClasses(enabledFields.isPriority)}>Lead Priority</label>
                                    <select 
                                        name="isPriority" 
                                        disabled={!enabledFields.isPriority}
                                        value={formData.isPriority} 
                                        onChange={handleChange} 
                                        className={selectClasses(enabledFields.isPriority)}
                                    >
                                        <option value="">Select Priority Option</option>
                                        <option value="true">YES, MARK AS PRIORITY</option>
                                        <option value="false">NO, REMOVE PRIORITY</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Course & Source Details */}
                        <div className="space-y-4 md:col-span-2">
                            <div className={`flex items-center gap-3 border-b pb-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">Course & source tags</h4>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Course Selection */}
                                <div className={`p-3 rounded border md:col-span-2 transition-all ${enabledFields.course ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                                    <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('course')}>
                                        {enabledFields.course ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Enable Course</span>
                                    </div>
                                    
                                    {/* Optional quick course filtering if course field is enabled */}
                                    {enabledFields.course && (
                                        <div className="mb-3 p-3 bg-black/20 rounded border border-gray-800 grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Type</label>
                                                <select
                                                    value={courseFilters.type}
                                                    onChange={(e) => setCourseFilters({ ...courseFilters, type: e.target.value })}
                                                    className="w-full py-1 px-2 bg-[#131619] border border-gray-850 rounded text-[9px] font-bold text-gray-300"
                                                >
                                                    <option value="">Any Type</option>
                                                    <option value="INSTATION">INSTATION</option>
                                                    <option value="OUTSTATION">OUTSTATION</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Search</label>
                                                <input
                                                    type="text"
                                                    value={courseSearch}
                                                    onChange={(e) => setCourseSearch(e.target.value)}
                                                    placeholder="Search Course..."
                                                    className="w-full py-1 px-2 bg-[#131619] border border-gray-850 rounded text-[9px] font-bold text-gray-300"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <label className={labelClasses(enabledFields.course)}>Select Course ({filteredCourses.length})</label>
                                    <select 
                                        name="course" 
                                        disabled={!enabledFields.course}
                                        value={formData.course} 
                                        onChange={handleChange} 
                                        className={selectClasses(enabledFields.course)}
                                    >
                                        <option value="">Select Course</option>
                                        {filteredCourses.map(c => <option key={c._id} value={c._id}>{c.courseName.toUpperCase()}</option>)}
                                    </select>
                                </div>

                                {/* Origin Source */}
                                <div className={`p-3 rounded border transition-all ${enabledFields.source ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                                    <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('source')}>
                                        {enabledFields.source ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Enable Source</span>
                                    </div>
                                    <label className={labelClasses(enabledFields.source)}>Origin Source</label>
                                    <select 
                                        name="source" 
                                        disabled={!enabledFields.source}
                                        value={formData.source} 
                                        onChange={handleChange} 
                                        className={selectClasses(enabledFields.source)}
                                    >
                                        <option value="">Select Source</option>
                                        {sources.map(s => <option key={s._id} value={s.sourceName}>{s.sourceName.toUpperCase()}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Target Exam */}
                        <div className="space-y-4 md:col-span-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className={`p-3 rounded border transition-all ${enabledFields.targetExam ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                                    <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('targetExam')}>
                                        {enabledFields.targetExam ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Enable Target Exam</span>
                                    </div>
                                    <label className={labelClasses(enabledFields.targetExam)}>Target Exam</label>
                                    <input 
                                        type="text" 
                                        name="targetExam" 
                                        disabled={!enabledFields.targetExam}
                                        value={formData.targetExam} 
                                        onChange={handleChange} 
                                        className={inputClasses(enabledFields.targetExam)} 
                                        placeholder="Target Exam..." 
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Submit Actions */}
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
                            className={`px-10 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/30'}`}
                        >
                            {loading ? <FaSync className="animate-spin" /> : <><FaSave className="inline-block mr-2" /> Update Selected Leads</>}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#333' : '#d1d5db'}; border-radius: 4px; }
            `}</style>
        </div>
    );
};

export default BulkUpdateLeadModal;
