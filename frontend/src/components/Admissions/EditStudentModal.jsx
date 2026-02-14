import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaUser, FaPhoneAlt, FaSchool, FaBook, FaEdit } from 'react-icons/fa';
import { toast } from 'react-toastify';

const EditStudentModal = ({ student, onClose, onUpdate, isDarkMode }) => {
    const [formData, setFormData] = useState({
        studentName: student.studentsDetails?.[0]?.studentName || '',
        studentEmail: student.studentsDetails?.[0]?.studentEmail || '',
        mobileNum: student.studentsDetails?.[0]?.mobileNum || '',
        whatsappNumber: student.studentsDetails?.[0]?.whatsappNumber || '',
        dateOfBirth: student.studentsDetails?.[0]?.dateOfBirth || '',
        gender: student.studentsDetails?.[0]?.gender || '',
        centre: student.studentsDetails?.[0]?.centre || '',
        board: student.studentsDetails?.[0]?.board || '',
        state: student.studentsDetails?.[0]?.state || '',
        schoolName: student.studentsDetails?.[0]?.schoolName || '',
        address: student.studentsDetails?.[0]?.address || '',
        programme: student.studentsDetails?.[0]?.programme || '',
        pincode: student.studentsDetails?.[0]?.pincode || '',
        class: student.examSchema?.[0]?.class || '',
        scienceMathParcent: student.examSchema?.[0]?.scienceMathParcent || '',
        markAgregate: student.examSchema?.[0]?.markAgregate || '',
        examTag: student.sessionExamCourse?.[0]?.examTag || '',
        targetExams: student.sessionExamCourse?.[0]?.targetExams || '',
        session: student.sessionExamCourse?.[0]?.session || '',
        guardianName: student.guardians?.[0]?.guardianName || '',
        guardianEmail: student.guardians?.[0]?.guardianEmail || '',
        guardianMobile: student.guardians?.[0]?.guardianMobile || '',
        occupation: student.guardians?.[0]?.occupation || '',
        annualIncome: student.guardians?.[0]?.annualIncome || '',
        qualification: student.guardians?.[0]?.qualification || '',
        course: student.course?._id || student.course || '',
        batches: student.batches ? student.batches.map(b => b._id || b) : [],
        department: student.department?._id || student.department || ''
    });

    const [availableBatches, setAvailableBatches] = useState([]);

    const [loading, setLoading] = useState(false);
    const [centres, setCentres] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [courses, setCourses] = useState([]);
    const [classes, setClasses] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [courseFilters, setCourseFilters] = useState({
        mode: "",
        courseType: "",
        class: "",
        examTag: ""
    });

    useEffect(() => {
        fetchCentres();
        fetchExamTags();
        fetchCourses();
        fetchClasses();
        fetchSessions();
        fetchAvailableBatches();
        fetchDepartments();
    }, []);

    const fetchAvailableBatches = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/batch/list`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) setAvailableBatches(data);
        } catch (error) { console.error("Error fetching batches:", error); }
    };

    const fetchDepartments = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/department`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) setDepartments(data);
        } catch (error) { console.error("Error fetching departments:", error); }
    };

    const handleBatchToggle = (batchId) => {
        setFormData(prev => {
            const currentBatches = [...prev.batches];
            const index = currentBatches.indexOf(batchId);
            if (index > -1) {
                currentBatches.splice(index, 1);
            } else {
                currentBatches.push(batchId);
            }
            return { ...prev, batches: currentBatches };
        });
    };

    useEffect(() => {
        let filtered = [...courses];
        if (courseFilters.mode) filtered = filtered.filter(c => c.mode === courseFilters.mode);
        if (courseFilters.courseType) filtered = filtered.filter(c => c.courseType === courseFilters.courseType);
        if (courseFilters.class) filtered = filtered.filter(c => c.class?._id === courseFilters.class || c.class === courseFilters.class);
        if (courseFilters.examTag) filtered = filtered.filter(c => c.examTag?._id === courseFilters.examTag || c.examTag === courseFilters.examTag);
        setFilteredCourses(filtered);
    }, [courseFilters, courses]);

    const handleCourseFilterChange = (e) => {
        const { name, value } = e.target;
        setCourseFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetCourseFilters = () => {
        setCourseFilters({ mode: "", courseType: "", class: "", examTag: "" });
    };

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/course`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) setCourses(data);
        } catch (error) { console.error("Error fetching courses:", error); }
    };

    const fetchClasses = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/class/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) setClasses(data);
        } catch (error) { console.error("Error fetching classes:", error); }
    };

    const fetchSessions = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/session/list`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) setSessions(data);
        } catch (error) { console.error("Error fetching sessions:", error); }
    };

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setCentres(data);
            } else {
                console.error("Failed to fetch centres");
            }
        } catch (error) {
            console.error("Error fetching centres:", error);
        }
    };

    const fetchExamTags = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/examTag/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setExamTags(data);
            } else {
                console.error("Failed to fetch exam tags");
            }
        } catch (error) {
            console.error("Error fetching exam tags:", error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "course") {
            const selectedCourseObj = courses.find(c => c._id === value);
            setFormData(prev => ({
                ...prev,
                [name]: value,
                programme: selectedCourseObj ? selectedCourseObj.programme : ""
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        let success = false;

        try {
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;

            // Construct the update payload matching the Student schema structure
            const updatePayload = {
                studentsDetails: [{
                    studentName: formData.studentName || null,
                    studentEmail: formData.studentEmail || null,
                    mobileNum: formData.mobileNum || null,
                    whatsappNumber: formData.whatsappNumber || null,
                    dateOfBirth: formData.dateOfBirth || null,
                    gender: formData.gender || null,
                    centre: formData.centre || null,
                    board: formData.board || null,
                    state: formData.state || null,
                    schoolName: formData.schoolName || null,
                    address: formData.address || null,
                    programme: formData.programme || null,
                    pincode: formData.pincode || null,
                    source: student.studentsDetails?.[0]?.source || '',
                }],
                examSchema: [{
                    examName: student.examSchema?.[0]?.examName || '',
                    class: formData.class || null,
                    examStatus: student.examSchema?.[0]?.examStatus || '',
                    markAgregate: formData.markAgregate || null,
                    scienceMathParcent: formData.scienceMathParcent || null,
                }],
                sessionExamCourse: [{
                    examTag: formData.examTag || null,
                    targetExams: formData.targetExams || null,
                    session: formData.session || null,
                }],
                guardians: [{
                    guardianName: formData.guardianName || null,
                    guardianEmail: formData.guardianEmail || null,
                    guardianMobile: formData.guardianMobile || null,
                    occupation: formData.occupation || null,
                    annualIncome: formData.annualIncome || null,
                    qualification: formData.qualification || null,
                    organizationName: student.guardians?.[0]?.organizationName || '',
                    designation: student.guardians?.[0]?.designation || '',
                    officeAddress: student.guardians?.[0]?.officeAddress || '',
                }],
                course: formData.course || null,
                batches: (formData.batches || []).filter(Boolean),
                department: formData.department || null,
                section: student.section || [],
            };

            const response = await fetch(`${apiUrl}/normalAdmin/updateStudent/${student._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updatePayload),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Student updated successfully!');
                success = true;
            } else {
                toast.error(data.message || 'Failed to update student');
            }
        } catch (error) {
            console.error('Error updating student:', error);
            toast.error('Error updating student');
        } finally {
            setLoading(false);
            if (success) {
                onUpdate();
            }
        }
    };

    const labelClass = "block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-2";
    const inputClass = `w-full p-2.5 rounded-[4px] border font-bold text-[11px] uppercase tracking-wider focus:outline-none transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 shadow-sm'}`;
    const sectionClass = `p-6 rounded-[4px] border transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className={`rounded-[4px] border border-gray-800 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`}>
                {/* Header */}
                <div className={`p-6 border-b flex items-center justify-between sticky top-0 z-10 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[4px] bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                <FaEdit className="text-cyan-500 text-xl" />
                            </div>
                            <div>
                                <h2 className={`text-2xl font-black italic tracking-tighter uppercase leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Modify Student
                                </h2>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2">
                                    SYNCHRONIZING CORE DATA <span className="mx-2 text-cyan-500">|</span> <span className="text-cyan-500">ID: {student._id?.slice(-8).toUpperCase()}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className={`p-3 rounded-[4px] transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10' : 'bg-gray-100 text-gray-400 hover:text-gray-900 hover:bg-gray-200'}`}
                        >
                            <FaTimes className="text-lg" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className={`p-8 overflow-y-auto space-y-8 custom-scrollbar ${isDarkMode ? 'dark' : ''}`}>
                    {/* Personal Information */}
                    <div className={sectionClass}>
                        <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <FaUser size={14} /> PERSONAL IDENTIFICATION
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className={labelClass}>STUDENT NAME *</label>
                                <input
                                    type="text"
                                    name="studentName"
                                    value={formData.studentName}
                                    onChange={handleChange}
                                    required
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>DATE OF BIRTH</label>
                                <input
                                    type="text"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="DD/MM/YYYY"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>GENDER BIOMETRIC</label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="">SELECT GENDER</option>
                                    <option value="Male">MALE</option>
                                    <option value="Female">FEMALE</option>
                                    <option value="Other">OTHER</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>BASE CENTRE *</label>
                                <select
                                    name="centre"
                                    value={formData.centre}
                                    onChange={handleChange}
                                    required
                                    className={inputClass}
                                >
                                    <option value="">SELECT CENTRE</option>
                                    {centres.map((centre) => (
                                        <option key={centre._id} value={centre.centreName}>{centre.centreName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>ACADEMIC PROGRAMME</label>
                                <select
                                    name="programme"
                                    value={formData.programme}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="">SELECT PROGRAMME</option>
                                    <option value="CRP">CRP</option>
                                    <option value="NCRP">NCRP</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className={sectionClass}>
                        <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <FaPhoneAlt size={14} /> COMMUNICATION CHANNELS
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-2">
                                <label className={labelClass}>DIGITAL MAILBOX</label>
                                <input
                                    type="email"
                                    name="studentEmail"
                                    value={formData.studentEmail}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>TELECOM LINE *</label>
                                <input
                                    type="text"
                                    name="mobileNum"
                                    value={formData.mobileNum}
                                    onChange={handleChange}
                                    required
                                    pattern="[0-9]{10}"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>WHATSAPP SECURE *</label>
                                <input
                                    type="text"
                                    name="whatsappNumber"
                                    value={formData.whatsappNumber}
                                    onChange={handleChange}
                                    required
                                    pattern="[0-9]{10}"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>GEO-POSTAL CODE</label>
                                <input
                                    type="text"
                                    name="pincode"
                                    value={formData.pincode}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div className="lg:col-span-3">
                                <label className={labelClass}>PHYSICAL ADDRESS</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    rows="2"
                                    className={`${inputClass} normal-case h-[42px] py-2`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Academic Information */}
                    <div className={sectionClass}>
                        <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <FaSchool size={14} /> ACADEMIC RECORD
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <label className={labelClass}>PRIMARY INSTITUTION</label>
                                <input
                                    type="text"
                                    name="schoolName"
                                    value={formData.schoolName}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>EDUCATIONAL BOARD *</label>
                                <input
                                    type="text"
                                    name="board"
                                    value={formData.board}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>CURRENT CLASS</label>
                                <input
                                    type="text"
                                    name="class"
                                    value={formData.class}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>STATE JURISDICTION *</label>
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>SCIENCE/MATH %</label>
                                <input
                                    type="text"
                                    name="scienceMathParcent"
                                    value={formData.scienceMathParcent}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>AGGREGATE SCORE</label>
                                <input
                                    type="text"
                                    name="markAgregate"
                                    value={formData.markAgregate}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>DEPARTMENT HQ</label>
                                <select
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="">SELECT DEPARTMENT</option>
                                    {departments.map((dept) => (
                                        <option key={dept._id} value={dept._id}>{dept.departmentName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Exam & Course Information */}
                    <div className={sectionClass}>
                        <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <FaBook size={14} /> ENROLLED SCHEMAS
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className={labelClass}>EXAM TAG</label>
                                <select
                                    name="examTag"
                                    value={formData.examTag}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="">SELECT EXAM TAG</option>
                                    {examTags.map((tag) => (
                                        <option key={tag._id} value={tag.name}>{tag.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>TARGET MATRIX</label>
                                <input
                                    type="text"
                                    name="targetExams"
                                    value={formData.targetExams}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>ACTIVE SESSION</label>
                                <select
                                    name="session"
                                    value={formData.session}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="">SELECT SESSION</option>
                                    {sessions.map((session) => (
                                        <option key={session._id} value={session.sessionName || session.name}>
                                            {session.sessionName || session.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Course Filters */}
                        <div className={`mt-8 p-6 rounded-[4px] border ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-white border-gray-100'}`}>
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">REFINE COURSE INVENTORY</h4>
                                <button type="button" onClick={resetCourseFilters} className="text-[9px] font-black bg-cyan-500/10 text-cyan-500 px-3 py-1 rounded-[4px] hover:bg-cyan-500/20 transition-all border border-cyan-500/20 uppercase tracking-widest">RESET FILTERS</button>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <select name="mode" value={courseFilters.mode} onChange={handleCourseFilterChange} className={inputClass}>
                                    <option value="">ALL MODES</option>
                                    <option value="ONLINE">ONLINE</option>
                                    <option value="OFFLINE">OFFLINE</option>
                                </select>
                                <select name="courseType" value={courseFilters.courseType} onChange={handleCourseFilterChange} className={inputClass}>
                                    <option value="">ALL TYPES</option>
                                    <option value="INSTATION">INSTATION</option>
                                    <option value="OUTSTATION">OUTSTATION</option>
                                </select>
                                <select name="class" value={courseFilters.class} onChange={handleCourseFilterChange} className={inputClass}>
                                    <option value="">ALL CLASSES</option>
                                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                                <select name="examTag" value={courseFilters.examTag} onChange={handleCourseFilterChange} className={inputClass}>
                                    <option value="">ALL TAGS</option>
                                    {examTags.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>ENROLLING TRACK COURSE</label>
                                <select
                                    name="course"
                                    value={formData.course}
                                    onChange={handleChange}
                                    className={`${inputClass} text-cyan-500 border-cyan-500/30 bg-cyan-500/5`}
                                >
                                    <option value="">SELECT CORE COURSE</option>
                                    {filteredCourses.map((c) => (
                                        <option key={c._id} value={c._id}>{c.courseName} ({c.mode} - {c.courseType})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Batch Selection */}
                        <div className="mt-8">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">BATCH ALLOCATION MATRIX</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {availableBatches.map((batch) => (
                                    <label
                                        key={batch._id}
                                        className={`flex items-center gap-3 p-3 rounded-[4px] border cursor-pointer transition-all ${formData.batches.includes(batch._id)
                                            ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                                            : `border-gray-800 text-gray-400 hover:border-gray-600 ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={formData.batches.includes(batch._id)}
                                            onChange={() => handleBatchToggle(batch._id)}
                                        />
                                        <div className={`w-3 h-3 rounded-[2px] border ${formData.batches.includes(batch._id) ? 'bg-white border-white' : 'border-gray-600'}`}></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest truncate">{batch.batchName}</span>
                                    </label>
                                ))}
                                {availableBatches.length === 0 && <p className="text-gray-600 text-[10px] font-bold italic uppercase tracking-widest">NO BATCHES DETECTED</p>}
                            </div>
                        </div>
                    </div>

                    {/* Guardian Information */}
                    <div className={sectionClass}>
                        <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <FaUser size={14} /> GUARDIAN / SECONDARY IDENTIFICATION
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className={labelClass}>GUARDIAN NAME</label>
                                <input
                                    type="text"
                                    name="guardianName"
                                    value={formData.guardianName}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>CONTACT SECURE</label>
                                <input
                                    type="text"
                                    name="guardianMobile"
                                    value={formData.guardianMobile}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>GUARDIAN EMAIL</label>
                                <input
                                    type="email"
                                    name="guardianEmail"
                                    value={formData.guardianEmail}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>PROFESSIONAL VECTOR</label>
                                <input
                                    type="text"
                                    name="occupation"
                                    value={formData.occupation}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>ANNUAL REVENUE</label>
                                <input
                                    type="text"
                                    name="annualIncome"
                                    value={formData.annualIncome}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>CREDENTIALS</label>
                                <input
                                    type="text"
                                    name="qualification"
                                    value={formData.qualification}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={`flex justify-end gap-3 pt-6 border-t sticky bottom-0 mt-auto ${isDarkMode ? 'border-gray-800 bg-[#1a1f24]' : 'border-gray-100 bg-white'}`}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-8 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                        >
                            ABORT MODIFICATION
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex items-center justify-center gap-3 px-10 py-3 bg-cyan-600 text-white text-[10px] font-black uppercase tracking-widest rounded-[4px] hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50`}
                        >
                            {loading ? (
                                <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> SYNCHRONIZING...</>
                            ) : (
                                <><FaSave /> AUTHORIZE CHANGES</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: ${isDarkMode ? '#0f1215' : 'transparent'}; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#d1d5db'}; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? '#374151' : '#9ca3af'}; }
            `}</style>
        </div>
    );
};

export default EditStudentModal;
