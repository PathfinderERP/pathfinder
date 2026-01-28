import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { FaArrowLeft, FaSun, FaMoon, FaUserEdit } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const StudentRegistrationForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [centres, setCentres] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [classes, setClasses] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [boards, setBoards] = useState([]);
    const [sources, setSources] = useState([]);

    const [courseFilters, setCourseFilters] = useState({
        mode: "",
        courseType: "",
        class: "",
        examTag: "",
        session: "",
        department: ""
    });

    const indianStates = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
        "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
        "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
        "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
        "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
    ];

    const [formData, setFormData] = useState({
        // Student Details
        studentName: "",
        dateOfBirth: "",
        gender: "",
        centre: "",
        board: "",
        state: "",
        studentEmail: "",
        mobileNum: "",
        whatsappNumber: "",
        schoolName: "",
        pincode: "",
        source: "",
        address: "",
        programme: "",

        // Guardian Details
        guardianName: "",
        qualification: "",
        guardianEmail: "",
        guardianMobile: "",
        occupation: "",
        annualIncome: "",
        organizationName: "",
        designation: "",
        officeAddress: "",

        // Exam Schema
        examName: "",
        class: "",
        examStatus: "",
        markAgregate: "",
        scienceMathParcent: "",

        // Session Exam Course
        session: "",

        // New Fields
        course: "",
        batches: [],
        department: "",
        counselledBy: ""
    });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const currentUserName = user.name || "";

        if (location.state?.leadData) {
            const lead = location.state.leadData;

            // Extract Class Number
            let classVal = "";
            if (lead.className?.name) {
                const match = lead.className.name.match(/\d+/);
                if (match) classVal = match[0];
            }

            setFormData(prev => ({
                ...prev,
                studentName: lead.name || "",
                studentEmail: lead.email || "",
                mobileNum: lead.phoneNumber || "",
                schoolName: lead.schoolName || "",
                centre: lead.centre?.centreName || "",
                source: lead.source || "",
                targetExams: lead.targetExam || "",
                class: classVal,
                whatsappNumber: lead.phoneNumber || "",
                counselledBy: currentUserName // Always set to current user performing the action
            }));

            toast.info("Lead details autofilled");
        } else {
            // Default to current user's name for walk-ins too
            if (currentUserName) {
                setFormData(prev => ({ ...prev, counselledBy: currentUserName }));
            }
        }
    }, [location.state]);

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
                const user = JSON.parse(localStorage.getItem("user") || "{}");

                // If superAdmin, show all centres
                if (user.role === "superAdmin") {
                    setCentres(data);
                }
                // If centres are restricted to the user profile
                else if (user.centres && user.centres.length > 0) {
                    const authorizedCentreNames = user.centres.map(c => c.centreName);
                    const filtered = data.filter(c => authorizedCentreNames.includes(c.centreName));
                    setCentres(filtered);
                }
                // Fallback: show all if no restrictions found (or handle as per policy)
                else {
                    setCentres(data);
                }
            } else {
                console.error("Failed to fetch centres");
            }
        } catch (error) {
            console.error("Error fetching centres:", error);
        }
    };

    const fetchBoards = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/board/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) setBoards(data);
        } catch (error) { console.error("Error fetching boards:", error); }
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

    const fetchBatches = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/batch/list`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) setBatches(data);
        } catch (error) { console.error("Error fetching batches:", error); }
    };

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/course/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                setCourses(data);
                setFilteredCourses(data);
            }
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

    const fetchSources = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/source`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                // The API returns { sources: [...] } based on the controller research
                setSources(data.sources || data);
            }
        } catch (error) { console.error("Error fetching sources:", error); }
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

    useEffect(() => {
        fetchCentres();
        fetchBoards();
        fetchExamTags();
        fetchBatches();
        fetchCourses();
        fetchClasses();
        fetchSessions();
        fetchDepartments();
        fetchSources();
    }, []);

    useEffect(() => {
        let result = courses;
        if (courseFilters.mode) result = result.filter(v => v.mode === courseFilters.mode);
        if (courseFilters.courseType) result = result.filter(v => v.courseType === courseFilters.courseType);
        if (courseFilters.class) result = result.filter(v => v.class?._id === courseFilters.class || v.class === courseFilters.class);
        if (courseFilters.examTag) result = result.filter(v => v.examTag?._id === courseFilters.examTag || v.examTag === courseFilters.examTag);
        if (courseFilters.session) result = result.filter(v => v.courseSession === courseFilters.session);
        if (courseFilters.department) result = result.filter(v => v.department?._id === courseFilters.department || v.department === courseFilters.department);
        setFilteredCourses(result);
    }, [courseFilters, courses]);

    const handleCourseFilterChange = (e) => {
        const { name, value } = e.target;
        setCourseFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetCourseFilters = () => {
        setCourseFilters({
            mode: "",
            courseType: "",
            class: "",
            examTag: "",
            session: "",
            department: ""
        });
    };

    const handleBatchToggle = (batchId) => {
        setSelectedBatches(prev => {
            const updated = prev.includes(batchId)
                ? prev.filter(id => id !== batchId)
                : [...prev, batchId];
            setFormData(f => ({ ...f, batches: updated }));
            return updated;
        });
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
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Validate batch selection
        if (!formData.batches || formData.batches.length === 0) {
            toast.error("Please select at least one batch");
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem("token");

            // Construct payload based on StudentSchema structure
            const payload = {
                studentsDetails: [
                    {
                        studentName: formData.studentName,
                        dateOfBirth: formData.dateOfBirth,
                        gender: formData.gender,
                        centre: formData.centre,
                        board: formData.board,
                        state: formData.state,
                        studentEmail: formData.studentEmail,
                        mobileNum: formData.mobileNum,
                        whatsappNumber: formData.whatsappNumber,
                        schoolName: formData.schoolName,
                        pincode: formData.pincode,
                        source: formData.source,
                        address: formData.address,
                        programme: formData.programme,
                        // Nested schemas inside StudentsDetailsSchema
                        guardians: [
                            {
                                guardianName: formData.guardianName,
                                qualification: formData.qualification,
                                guardianEmail: formData.guardianEmail,
                                guardianMobile: formData.guardianMobile,
                                occupation: formData.occupation,
                                annualIncome: formData.annualIncome,
                                organizationName: formData.organizationName,
                                designation: formData.designation,
                                officeAddress: formData.officeAddress,
                            }
                        ],
                        examSchema: [
                            {
                                examName: formData.examName,
                                class: formData.class,
                                examStatus: formData.examStatus,
                                markAgregate: formData.markAgregate,
                                scienceMathParcent: formData.scienceMathParcent,
                            }
                        ]
                    }
                ],
                // Root level schemas in StudentSchema
                guardians: [
                    {
                        guardianName: formData.guardianName,
                        qualification: formData.qualification,
                        guardianEmail: formData.guardianEmail,
                        guardianMobile: formData.guardianMobile,
                        occupation: formData.occupation,
                        annualIncome: formData.annualIncome,
                        organizationName: formData.organizationName,
                        designation: formData.designation,
                        officeAddress: formData.officeAddress,
                    }
                ],
                examSchema: [
                    {
                        examName: formData.examName,
                        class: formData.class,
                        examStatus: formData.examStatus,
                        markAgregate: formData.markAgregate,
                        scienceMathParcent: formData.scienceMathParcent,
                    }
                ],
                sessionExamCourse: [
                    {
                        session: formData.session
                    }
                ],
                course: formData.course,
                batches: formData.batches,
                department: formData.department,
                counselledBy: formData.counselledBy
            };

            console.log("📤 Sending student registration payload:", JSON.stringify(payload, null, 2));

            const response = await fetch(`${import.meta.env.VITE_API_URL}/normalAdmin/createStudent`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("❌ Student Registration Failed!", data);
                const errorMsg = data.details || data.message || "Failed to register student";
                toast.error(errorMsg);
            } else {
                console.log("✅ Student registered successfully!");
                toast.success("Student registered successfully!");

                // Update Lead Status if registered from a lead
                if (location.state?.leadData?._id) {
                    try {
                        const leadUpdateResponse = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/${location.state.leadData._id}`, {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ isCounseled: true })
                        });

                        if (leadUpdateResponse.ok) {
                            console.log("Lead marked as counseled");
                        } else {
                            console.warn("Failed to mark lead as counseled");
                        }
                    } catch (leadError) {
                        console.error("Error updating lead status:", leadError);
                    }
                }

                // Optional: Reset form or navigate
                // navigate("/admissions");
            }
        } catch (err) {
            console.error("❌ Network or Server Error:", err);
            toast.error("Server error. Please try again.");
        }
        setLoading(false);
    };

    return (
        <div className={`flex-1 p-6 overflow-y-auto ${isDarkMode ? 'bg-[#131619] text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
            <ToastContainer position="top-right" theme={isDarkMode ? 'dark' : 'light'} />

            {/* Header */}
            <div className={`p-6 border-b flex items-center justify-between sticky top-0 z-30 transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-md'}`}>
                <div className="flex flex-col">
                    <h2 className={`text-2xl font-black italic tracking-tighter uppercase leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Student Registration
                    </h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2">
                        ADMISSIONS CONTROL MODULE <span className="mx-2 text-cyan-500">|</span> <span className="text-cyan-500">NEW ENROLLMENT ENGINE</span>
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className={`p-2.5 rounded-[4px] border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                    >
                        {isDarkMode ? <FaSun /> : <FaMoon />}
                    </button>
                    <button
                        onClick={() => navigate("/admissions")}
                        className={`flex items-center gap-3 px-6 py-2.5 rounded-[4px] text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${isDarkMode ? 'bg-[#131619] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <FaArrowLeft /> RETURN TO LEADS
                    </button>
                </div>
            </div>

            <div className={`p-8 custom-scrollbar ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
                <div className={`p-8 rounded-[4px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-4 mb-10 border-b border-gray-800/50 pb-6">
                        <div className={`w-12 h-12 rounded-[4px] flex items-center justify-center border ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500' : 'bg-cyan-50 border-cyan-200 text-cyan-600'}`}>
                            <FaUserEdit size={24} />
                        </div>
                        <div>
                            <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Registration Form</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 italic">Please complete all required verification fields</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-12">
                        {/* Define common styles */}
                        {(() => {
                            const labelClass = "text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2";
                            const inputClass = `w-full px-4 py-3 rounded-[4px] border text-[13px] font-bold tracking-tight transition-all focus:outline-none focus:ring-1 ${isDarkMode
                                ? 'bg-[#111418] border-gray-800 text-white focus:border-cyan-500/50 focus:ring-cyan-500/20 placeholder:text-gray-700'
                                : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500 focus:ring-cyan-500/20 placeholder:text-gray-400'
                                }`;
                            const sectionTitle = "text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-8 border-l-4 border-cyan-500 pl-4";

                            return (
                                <>
                                    {/* Student Details Section */}
                                    <div>
                                        <h4 className={sectionTitle}>STUDENT IDENTIFICATION CORE</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            <div>
                                                <label className={labelClass}>STUDENT NAME *</label>
                                                <input type="text" name="studentName" required value={formData.studentName} onChange={handleChange} placeholder="LEGAL NAME AS PER IDENTIFICATION" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>DATE OF BIRTH</label>
                                                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>GENDER IDENTITY</label>
                                                <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                                                    <option value="">SELECT BIOMETRIC</option>
                                                    <option value="Male">MALE</option>
                                                    <option value="Female">FEMALE</option>
                                                    <option value="Other">OTHER</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>CENTRE HQ *</label>
                                                <select name="centre" required value={formData.centre} onChange={handleChange} className={inputClass}>
                                                    <option value="">SELECT ALLOCATED CENTRE</option>
                                                    {centres.map((centre) => (
                                                        <option key={centre._id} value={centre.centreName}>{centre.centreName.toUpperCase()}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>EDUCATIONAL BOARD</label>
                                                <select name="board" value={formData.board} onChange={handleChange} className={inputClass}>
                                                    <option value="">SELECT BOARD SYSTEM</option>
                                                    {boards.map((b) => (
                                                        <option key={b._id} value={b.boardCourse}>{b.boardCourse.toUpperCase()}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>GEO STATE</label>
                                                <select name="state" value={formData.state} onChange={handleChange} className={inputClass}>
                                                    <option value="">SELECT TERRITORY</option>
                                                    {indianStates.map((state) => (
                                                        <option key={state} value={state}>{state.toUpperCase()}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>DIGITAL MAILBOX (EMAIL)</label>
                                                <input type="email" name="studentEmail" value={formData.studentEmail} onChange={handleChange} placeholder="E.G. USER@DOMAIN.COM" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>TELECOM LINE (MOBILE) *</label>
                                                <input type="text" name="mobileNum" required pattern="[0-9]{10}" value={formData.mobileNum} onChange={handleChange} placeholder="PRIMARY CONTACT DIGITS" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>ENCRYPTED WHATSAPP *</label>
                                                <input type="text" name="whatsappNumber" required pattern="[0-9]{10}" value={formData.whatsappNumber} onChange={handleChange} placeholder="MESSAGING CHANNEL" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>ACADEMIC INSTITUTION</label>
                                                <input type="text" name="schoolName" value={formData.schoolName} onChange={handleChange} placeholder="SCHOOL/COLLEGE NAME" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>ZIP/PINCODE</label>
                                                <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="POSTAL INDEX" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>ACQUISITION SOURCE</label>
                                                <select name="source" value={formData.source} onChange={handleChange} className={inputClass}>
                                                    <option value="">SELECT LEAD SOURCE</option>
                                                    {sources.map((s) => (
                                                        <option key={s._id} value={s.sourceName}>{s.sourceName.toUpperCase()}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className={labelClass}>ACADEMIC SESSION</label>
                                                <select name="session" value={formData.session} onChange={handleChange} className={inputClass}>
                                                    <option value="">SELECT YEAR CYCLE</option>
                                                    {sessions.map((session) => (
                                                        <option key={session._id} value={session.sessionName || session.name}>
                                                            {(session.sessionName || session.name).toUpperCase()}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>DEPARTMENT SECTOR</label>
                                                <select name="department" value={formData.department} onChange={handleChange} className={inputClass}>
                                                    <option value="">SELECT DIVISION</option>
                                                    {departments.map((dept) => (
                                                        <option key={dept._id} value={dept._id}>{dept.departmentName.toUpperCase()}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="relative">
                                                <label className={labelClass}>COUNSELLED BY (ENGINEER)</label>
                                                <input
                                                    type="text"
                                                    name="counselledBy"
                                                    value={formData.counselledBy}
                                                    readOnly
                                                    className={`${inputClass} bg-cyan-500/5 text-cyan-500 border-cyan-500/30 cursor-not-allowed`}
                                                />
                                            </div>

                                            <div className="md:col-span-2 lg:col-span-3">
                                                <label className={labelClass}>FULL GEO-ADDRESS</label>
                                                <textarea name="address" value={formData.address} onChange={handleChange} placeholder="COMPLETE PHYSICAL LOCATION DETAILS" rows="2" className={`${inputClass} resize-none min-h-[80px]`}></textarea>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Guardian Details Section */}
                                    <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                        <h4 className={sectionTitle}>GUARDIAN / SECONDARY IDENTIFICATION</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            <div>
                                                <label className={labelClass}>GUARDIAN NAME</label>
                                                <input type="text" name="guardianName" value={formData.guardianName} onChange={handleChange} placeholder="LEGAL REPRESENTATIVE" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>ACADEMIC CREDENTIALS</label>
                                                <input type="text" name="qualification" value={formData.qualification} onChange={handleChange} placeholder="LEVEL OF EDUCATION" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>GUARDIAN MAILBOX</label>
                                                <input type="email" name="guardianEmail" value={formData.guardianEmail} onChange={handleChange} placeholder="E.G. G@DOMAIN.COM" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>CONTACT SECURE (MOBILE)</label>
                                                <input type="text" name="guardianMobile" value={formData.guardianMobile} onChange={handleChange} placeholder="URGENT REACH DIGITS" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>PROFESSIONAL OCCUPATION</label>
                                                <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} placeholder="WORK SECTOR" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>ANNUAL REVENUE</label>
                                                <input type="text" name="annualIncome" value={formData.annualIncome} onChange={handleChange} placeholder="INCOME BRACKET" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>ORGANIZATION NAME</label>
                                                <input type="text" name="organizationName" value={formData.organizationName} onChange={handleChange} placeholder="COMPANY / UNIT" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>DESIGNATION VECTOR</label>
                                                <input type="text" name="designation" value={formData.designation} onChange={handleChange} placeholder="JOB TITLE" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>OFFICE GEO-DATA</label>
                                                <input type="text" name="officeAddress" value={formData.officeAddress} onChange={handleChange} placeholder="WORKPLACE LOCATION" className={inputClass} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Exam Details Section */}
                                    <div>
                                        <h4 className={sectionTitle}>PRIOR ACADEMIC PERFORMANCE MATRIX</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            <div>
                                                <label className={labelClass}>EXAM TAG IDENTIFIER</label>
                                                <select name="examName" value={formData.examName} onChange={handleChange} className={inputClass}>
                                                    <option value="">SELECT EXAM TAG</option>
                                                    {examTags.map((tag) => (
                                                        <option key={tag._id} value={tag.name}>{tag.name.toUpperCase()}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>LAST ACADEMIC CLASS</label>
                                                <select name="class" value={formData.class} onChange={handleChange} className={inputClass}>
                                                    <option value="">SELECT LEVEL</option>
                                                    {classes.map(c => (
                                                        <option key={c._id} value={c.name || c.className}>
                                                            CLASS {(c.name || c.className).toUpperCase()}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>RESULT STATUS</label>
                                                <input type="text" name="examStatus" value={formData.examStatus} onChange={handleChange} placeholder="PASSED/APPEARING" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>AGGREGATE SCORE (%)</label>
                                                <input type="text" name="markAgregate" value={formData.markAgregate} onChange={handleChange} placeholder="TOTAL PERCENTAGE" className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>STEM PERFORMANCE (%)</label>
                                                <input type="text" name="scienceMathParcent" value={formData.scienceMathParcent} onChange={handleChange} placeholder="SCIENCE & MATH SCORE" className={inputClass} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Course & Section Details */}
                                    <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'}`}>
                                        <h4 className={sectionTitle}>COURSE ALLOCATION & FILTER ENGINE</h4>
                                        <div className="space-y-8">
                                            <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-white border-gray-300'}`}>
                                                <div className="flex items-center justify-between mb-6">
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">REAL-TIME FILTER OVERRIDE</p>
                                                    <button type="button" onClick={resetCourseFilters} className="text-[9px] px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-[4px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                                                        RESET FILTERS
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                                                    <div className="space-y-2">
                                                        <label className={labelClass}>MODE</label>
                                                        <select name="mode" value={courseFilters.mode} onChange={handleCourseFilterChange} className={`${inputClass} p-2 py-2`}>
                                                            <option value="">ALL</option>
                                                            <option value="ONLINE">ONLINE</option>
                                                            <option value="OFFLINE">OFFLINE</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className={labelClass}>TYPE</label>
                                                        <select name="courseType" value={courseFilters.courseType} onChange={handleCourseFilterChange} className={`${inputClass} p-2 py-2`}>
                                                            <option value="">ALL</option>
                                                            <option value="INSTATION">INSTATION</option>
                                                            <option value="OUTSTATION">OUTSTATION</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className={labelClass}>LEVEL</label>
                                                        <select name="class" value={courseFilters.class} onChange={handleCourseFilterChange} className={`${inputClass} p-2 py-2`}>
                                                            <option value="">ALL</option>
                                                            {classes.map(c => <option key={c._id} value={c._id}>{(c.className || c.name).toUpperCase()}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className={labelClass}>TAG</label>
                                                        <select name="examTag" value={courseFilters.examTag} onChange={handleCourseFilterChange} className={`${inputClass} p-2 py-2`}>
                                                            <option value="">ALL</option>
                                                            {examTags.map(t => <option key={t._id} value={t._id}>{t.name.toUpperCase()}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className={labelClass}>SESSION</label>
                                                        <select name="session" value={courseFilters.session} onChange={handleCourseFilterChange} className={`${inputClass} p-2 py-2`}>
                                                            <option value="">ALL</option>
                                                            {sessions.map(s => <option key={s._id} value={s.sessionName || s.name}>{(s.sessionName || s.name).toUpperCase()}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className={labelClass}>DEPT</label>
                                                        <select name="department" value={courseFilters.department} onChange={handleCourseFilterChange} className={`${inputClass} p-2 py-2`}>
                                                            <option value="">ALL</option>
                                                            {departments.map(d => <option key={d._id} value={d._id}>{d.departmentName.toUpperCase()}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className={labelClass}>ENROLLING TARGET COURSE *</label>
                                                <select name="course" value={formData.course} onChange={handleChange} className={`${inputClass} border-cyan-500/50 bg-cyan-500/5 text-cyan-500`}>
                                                    <option value="">CHOOSE COURSE SYLLABUS</option>
                                                    {filteredCourses.map((c) => (
                                                        <option key={c._id} value={c._id}>
                                                            {c.courseName.toUpperCase()} [{c.mode} | {c.courseType}]
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Batch Selection */}
                                    <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                                        <h4 className="text-[12px] font-black text-amber-500 uppercase tracking-[0.2em] mb-8 border-l-4 border-amber-500 pl-4">BATCH ALLOCATION MATRIX (MULTIPLE SELECTION) *</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                            {batches.map((batch) => (
                                                <label key={batch._id} className={`flex items-center gap-4 p-4 rounded-[4px] border cursor-pointer transition-all active:scale-95 ${formData.batches.includes(batch._id)
                                                    ? 'bg-amber-600/20 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/10'
                                                    : isDarkMode ? 'bg-[#111418] border-gray-800 text-gray-400 hover:border-gray-500' : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'
                                                    }`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.batches.includes(batch._id)}
                                                        onChange={() => handleBatchToggle(batch._id)}
                                                        className="hidden"
                                                    />
                                                    <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all ${formData.batches.includes(batch._id) ? 'bg-amber-500 border-amber-500' : 'border-gray-600'}`}>
                                                        {formData.batches.includes(batch._id) && <span className="text-[10px] text-black font-black">✓</span>}
                                                    </div>
                                                    <span className="text-[11px] font-black uppercase tracking-tight">{batch.batchName}</span>
                                                </label>
                                            ))}
                                            {batches.length === 0 && <p className="text-[10px] text-gray-500 font-bold italic uppercase col-span-full">NO BATCH DATA DETECTED IN MASTER GRID</p>}
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full py-5 rounded-[4px] font-black uppercase tracking-[0.4em] transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-4 ${loading
                                            ? 'bg-gray-700 cursor-not-allowed text-gray-500'
                                            : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-500/20'
                                            }`}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                INITIATING UPLOAD...
                                            </>
                                        ) : (
                                            <>REGISTER STUDENT CLOUD DATA</>
                                        )}
                                    </button>
                                </>
                            );
                        })()}
                    </form>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: ${isDarkMode ? '#0f1215' : '#f3f4f6'}; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#d1d5db'}; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? '#374151' : '#9ca3af'}; }
            `}</style>
        </div >
    );
};

export default StudentRegistrationForm;
