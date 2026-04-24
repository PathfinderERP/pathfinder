import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { FaTimes, FaUser, FaSave, FaSearch, FaFilter, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { toast } from 'react-toastify';

const EditEnrolledStudentModal = ({ admission, onClose, onUpdate, isDarkMode }) => {
    const [formData, setFormData] = useState({
        // Student Details
        studentName: admission.student?.studentsDetails?.[0]?.studentName || '',
        studentEmail: admission.student?.studentsDetails?.[0]?.studentEmail || '',
        mobileNum: admission.student?.studentsDetails?.[0]?.mobileNum || '',
        whatsappNumber: admission.student?.studentsDetails?.[0]?.whatsappNumber || '',
        dateOfBirth: admission.student?.studentsDetails?.[0]?.dateOfBirth || '',
        gender: admission.student?.studentsDetails?.[0]?.gender || '',
        schoolName: admission.student?.studentsDetails?.[0]?.schoolName || '',
        address: admission.student?.studentsDetails?.[0]?.address || '',
        pincode: admission.student?.studentsDetails?.[0]?.pincode || '',
        state: admission.student?.studentsDetails?.[0]?.state || '',
        board: admission.student?.studentsDetails?.[0]?.board || '',
        programme: admission.student?.studentsDetails?.[0]?.programme || '',
        centre: admission.student?.studentsDetails?.[0]?.centre || '',

        // Guardian Details
        guardianName: admission.student?.guardians?.[0]?.guardianName || '',
        guardianEmail: admission.student?.guardians?.[0]?.guardianEmail || '',
        guardianMobile: admission.student?.guardians?.[0]?.guardianMobile || '',
        qualification: admission.student?.guardians?.[0]?.qualification || '',
        occupation: admission.student?.guardians?.[0]?.occupation || '',
        annualIncome: admission.student?.guardians?.[0]?.annualIncome || '',
        organizationName: admission.student?.guardians?.[0]?.organizationName || '',
        designation: admission.student?.guardians?.[0]?.designation || '',
        officeAddress: admission.student?.guardians?.[0]?.officeAddress || '',

        // Academic Details
        department: admission.department?._id || '',
        course: admission.course?._id || '',
        class: admission.class?._id || '',
        academicSession: admission.academicSession || '',
        examTag: admission.examTag?._id || '',
    });

    const [loading, setLoading] = useState(false);
    const [centres, setCentres] = useState([]);
    const [masterDepartments, setMasterDepartments] = useState([]);
    const [masterCourses, setMasterCourses] = useState([]);
    const [masterClasses, setMasterClasses] = useState([]);
    const [masterSessions, setMasterSessions] = useState([]);
    const [masterExamTags, setMasterExamTags] = useState([]);
    const [masterBoards, setMasterBoards] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [showCourseFilters, setShowCourseFilters] = useState(false);
    const [courseFilters, setCourseFilters] = useState({
        mode: "",
        courseType: "",
        class: "",
        examTag: "",
        session: "",
        department: "",
        board: "",
        searchTerm: ""
    });

    // Indian States
    const indianStates = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
        "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
        "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
        "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
        "Uttar Pradesh", "Uttarakhand", "West Bengal",
        "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
        "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
    ];

    useEffect(() => {
        fetchCentres();
        fetchMasterData();
    }, []);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const apiUrl = import.meta.env.VITE_API_URL;

            const [deptRes, courseRes, classRes, sessionRes, tagRes, boardRes] = await Promise.all([
                fetch(`${apiUrl}/department`, { headers }),
                fetch(`${apiUrl}/course`, { headers }),
                fetch(`${apiUrl}/class`, { headers }),
                fetch(`${apiUrl}/session/list`, { headers }),
                fetch(`${apiUrl}/examTag`, { headers }),
                fetch(`${apiUrl}/board`, { headers })
            ]);

            if (deptRes.ok) {
                const data = await deptRes.json();
                const visibleDepts = Array.isArray(data) ? data.filter(dept => dept.showInAdmission !== false) : [];
                setMasterDepartments(visibleDepts);
            }
            if (courseRes.ok) setMasterCourses(await courseRes.json());
            if (classRes.ok) setMasterClasses(await classRes.json());
            if (sessionRes.ok) setMasterSessions(await sessionRes.json());
            if (tagRes.ok) setMasterExamTags(await tagRes.json());
            if (boardRes.ok) setMasterBoards(await boardRes.json());
        } catch (error) {
            console.error('Error fetching master data:', error);
        }
    };

    useEffect(() => {
        let result = masterCourses;
        if (courseFilters.mode) result = result.filter(v => v.mode === courseFilters.mode);
        if (courseFilters.courseType) result = result.filter(v => v.courseType === courseFilters.courseType);
        if (courseFilters.class) result = result.filter(v => v.class?._id === courseFilters.class || v.class === courseFilters.class);
        if (courseFilters.examTag) result = result.filter(v => v.examTag?._id === courseFilters.examTag || v.examTag === courseFilters.examTag);
        if (courseFilters.session) result = result.filter(v => v.courseSession === courseFilters.session);
        if (courseFilters.department) result = result.filter(v => v.department?._id === courseFilters.department || v.department === courseFilters.department);
        if (courseFilters.board) {
            // Check both board name and board ID logic similar to how it's saved
            result = result.filter(v => 
                (v.board?._id === courseFilters.board) || 
                (v.board === courseFilters.board) ||
                (v.board?.boardName === courseFilters.board) ||
                (v.board?.boardCourse === courseFilters.board)
            );
        }

        if (courseFilters.searchTerm) {
            const search = courseFilters.searchTerm.toLowerCase();
            result = result.filter(v =>
                v.courseName?.toLowerCase().includes(search) ||
                v.programme?.toLowerCase().includes(search)
            );
        }

        setFilteredCourses(result);
    }, [courseFilters, masterCourses]);

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
            department: "",
            board: "",
            searchTerm: ""
        });
    };

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setCentres(data);
            }
        } catch (error) {
            console.error('Error fetching centres:', error);
        }
    };


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const apiUrl = import.meta.env.VITE_API_URL;

            // Helper to clean empty strings to null for ObjectId fields etc.
            const cleanData = (obj) => {
                const newObj = { ...obj };
                Object.keys(newObj).forEach(key => {
                    if (newObj[key] === "") newObj[key] = null;
                });
                return newObj;
            };

            const dataToSave = cleanData(formData);

            // 1. Update Student Profile & Centre
            const studentResponse = await fetch(
                `${apiUrl}/normalAdmin/updateStudent/${admission.student._id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        studentsDetails: [{
                            studentName: dataToSave.studentName,
                            studentEmail: dataToSave.studentEmail,
                            mobileNum: dataToSave.mobileNum,
                            whatsappNumber: dataToSave.whatsappNumber,
                            dateOfBirth: dataToSave.dateOfBirth,
                            gender: dataToSave.gender,
                            schoolName: dataToSave.schoolName,
                            address: dataToSave.address,
                            pincode: dataToSave.pincode,
                            state: dataToSave.state,
                            board: dataToSave.board,
                            programme: dataToSave.programme,
                            centre: dataToSave.centre,
                            source: admission.student?.studentsDetails?.[0]?.source || 'Walk-in', // Preserve source
                        }],
                        guardians: [{
                            guardianName: dataToSave.guardianName,
                            qualification: dataToSave.qualification,
                            guardianEmail: dataToSave.guardianEmail,
                            guardianMobile: dataToSave.guardianMobile,
                            occupation: dataToSave.occupation,
                            annualIncome: dataToSave.annualIncome,
                            organizationName: dataToSave.organizationName,
                            designation: dataToSave.designation,
                            officeAddress: dataToSave.officeAddress
                        }],
                        examSchema: [{
                            ...(admission.student?.examSchema?.[0] || {}),
                            examName: masterExamTags.find(t => t._id === dataToSave.examTag)?.name || admission.student?.examSchema?.[0]?.examName,
                            class: masterClasses.find(c => c._id === dataToSave.class)?.name || masterClasses.find(c => c._id === dataToSave.class)?.className || admission.student?.examSchema?.[0]?.class
                        }],
                        sessionExamCourse: [{
                            ...(admission.student?.sessionExamCourse?.[0] || {}),
                            session: dataToSave.academicSession,
                            examTag: masterExamTags.find(t => t._id === dataToSave.examTag)?.name || admission.student?.sessionExamCourse?.[0]?.examTag
                        }]
                    })
                }
            );

            if (!studentResponse.ok) {
                const errorData = await studentResponse.json();
                throw new Error(errorData.message || 'Failed to update student profile');
            }

            // 2. Update Specific Admission Record (Department, Course, Class, etc.)
            const admissionResponse = await fetch(
                `${apiUrl}/admission/${admission._id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        centre: dataToSave.centre,
                        department: dataToSave.department,
                        course: dataToSave.course,
                        class: dataToSave.class,
                        academicSession: dataToSave.academicSession,
                        examTag: dataToSave.examTag
                    })
                }
            );

            if (!admissionResponse.ok) {
                const errorData = await admissionResponse.json();
                throw new Error(errorData.message || 'Failed to update admission system data');
            }

            toast.success('Core data and academic vector updated successfully!');
            onUpdate();
            onClose();

        } catch (error) {
            console.error('Update operation failed:', error);
            toast.error(error.message || 'An error occurred during update');
        } finally {
            setLoading(false);
        }
    };

    const labelClass = "block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-2";
    const inputClass = `w-full p-2.5 rounded-[4px] border font-bold text-[11px] uppercase tracking-wider focus:outline-none transition-all ${isDarkMode ? 'bg-[#111418] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`;
    const sectionClass = `p-6 rounded-[4px] border transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className={`rounded-[4px] border border-gray-800 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`}>
                {/* Header */}
                <div className={`p-6 border-b flex items-center justify-between sticky top-0 z-10 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-[4px] bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                            <FaUser className="text-cyan-500" />
                        </div>
                        <div>
                            <h2 className={`text-xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>IDENTIFICATION OVERRIDE</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1 italic">MODIFYING ENROLLED ASSET: {admission.student?.studentsDetails?.[0]?.studentName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-[4px] flex items-center justify-center text-gray-500 hover:bg-red-500 hover:text-white transition-all">
                        <FaTimes />
                    </button>
                </div>

                <div className={`p-8 overflow-y-auto space-y-8 custom-scrollbar ${isDarkMode ? 'dark' : ''}`}>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Student Information Section */}
                        <div className={sectionClass}>
                            <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                <FaUser size={14} /> STUDENT IDENTITY
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>STUDENT NAME *</label>
                                    <input
                                        type="text"
                                        name="studentName"
                                        value={formData.studentName}
                                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                                        className={inputClass}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>EMAIL ADDRESS</label>
                                    <input
                                        type="email"
                                        name="studentEmail"
                                        value={formData.studentEmail}
                                        onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>TELEMETRY OVERRIDE (MOBILE) *</label>
                                    <input
                                        type="tel"
                                        name="mobileNum"
                                        value={formData.mobileNum}
                                        onChange={(e) => setFormData({ ...formData, mobileNum: e.target.value })}
                                        className={inputClass}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>SECURE CHANNEL (WHATSAPP) *</label>
                                    <input
                                        type="tel"
                                        name="whatsappNumber"
                                        value={formData.whatsappNumber}
                                        onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                                        className={inputClass}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>DATE OF BIRTH</label>
                                    <input
                                        type="date"
                                        value={formData.dateOfBirth}
                                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className={labelClass}>GENDER MAPPING</label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        className={inputClass}
                                    >
                                        <option value="">SELECT PROTOCOL</option>
                                        <option value="Male">MALE</option>
                                        <option value="Female">FEMALE</option>
                                        <option value="Other">OTHER</option>
                                    </select>
                                </div>
                                <div className="md:col-span-1">
                                    <label className={labelClass}>REGISTERED CENTRE *</label>
                                    <select
                                        name="centre"
                                        value={formData.centre}
                                        onChange={handleChange}
                                        className={inputClass}
                                        required
                                    >
                                        <option value="">SELECT CENTRE</option>
                                        {Array.isArray(centres) && [...centres].sort((a, b) => (a.centreName || "").localeCompare(b.centreName || "")).map((c) => (
                                            <option key={c._id} value={c.centreName}>
                                                {c.centreName?.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Geospatial Data Section */}
                        <div className={sectionClass}>
                            <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                <FaUser size={14} /> GEOSPATIAL DATA
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-3">
                                    <label className={labelClass}>RESIDENTIAL VECTOR (ADDRESS)</label>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className={`${inputClass} min-h-[80px]`}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>STATE OF ORIGIN</label>
                                    <select
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        className={inputClass}
                                    >
                                        <option value="">SELECT STATE</option>
                                        {indianStates.map((state) => (
                                            <option key={state} value={state}>
                                                {state.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>CITY HUB</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>DISTRICT NODE</label>
                                    <input
                                        type="text"
                                        name="district"
                                        value={formData.district}
                                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>POSTAL CODE</label>
                                    <input
                                        type="text"
                                        name="pincode"
                                        value={formData.pincode}
                                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                        pattern="[0-9]{6}"
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Guardian Information Section */}
                        <div className={sectionClass}>
                            <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                <FaUser size={14} /> GUARDIAN IDENTITY
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>GUARDIAN NAME</label>
                                    <input
                                        type="text"
                                        name="guardianName"
                                        value={formData.guardianName}
                                        onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>GUARDIAN CONTACT (MOBILE)</label>
                                    <input
                                        type="tel"
                                        value={formData.guardianMobile}
                                        onChange={(e) => setFormData({ ...formData, guardianMobile: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>GUARDIAN EMAIL</label>
                                    <input
                                        type="email"
                                        value={formData.guardianEmail}
                                        onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>QUALIFICATION</label>
                                    <input
                                        type="text"
                                        value={formData.qualification}
                                        onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>ANNUAL INCOME</label>
                                    <input
                                        type="text"
                                        value={formData.annualIncome}
                                        onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>GUARDIAN OCCUPATION</label>
                                    <input
                                        type="text"
                                        value={formData.occupation}
                                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>ORGANIZATION</label>
                                    <input
                                        type="text"
                                        value={formData.organizationName}
                                        onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>DESIGNATION</label>
                                    <input
                                        type="text"
                                        value={formData.designation}
                                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelClass}>OFFICE ADDRESS</label>
                                    <textarea
                                        value={formData.officeAddress}
                                        onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                                        className={`${inputClass} min-h-[60px]`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Academic Section */}
                        <div className={sectionClass}>
                            <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                <FaUser size={14} /> ACADEMIC VECTOR
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="md:col-span-2">
                                    <label className={labelClass}>INSTITUTION (SCHOOL NAME)</label>
                                    <input
                                        type="text"
                                        value={formData.schoolName}
                                        onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>AFFILIATION (BOARD)</label>
                                    <select
                                        name="board"
                                        value={formData.board}
                                        onChange={handleChange}
                                        className={inputClass}
                                    >
                                        <option value="">SELECT BOARD</option>
                                        {Array.isArray(masterBoards) && [...masterBoards].sort((a, b) => (a.boardName || a.boardCourse || "").localeCompare(b.boardName || b.boardCourse || "")).map((b) => (
                                            <option key={b._id} value={b.boardName || b.boardCourse}>
                                                {(b.boardName || b.boardCourse)?.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>PROGRAMME</label>
                                    <select
                                        name="programme"
                                        value={formData.programme}
                                        onChange={handleChange}
                                        className={inputClass}
                                    >
                                        <option value="">SELECT PROGRAMME</option>
                                        {[...new Set(masterCourses.map(c => c.programme).filter(Boolean))].sort().map(p => (
                                            <option key={p} value={p}>{p.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                 <div>
                                    <label className={labelClass}>DEPARTMENT</label>
                                    <Select
                                        options={[...masterDepartments].sort((a, b) => (a.departmentName || "").localeCompare(b.departmentName || "")).map(dept => ({ value: dept._id, label: dept.departmentName?.toUpperCase() }))}
                                        value={masterDepartments.find(d => d._id === formData.department) ? { value: formData.department, label: masterDepartments.find(d => d._id === formData.department).departmentName?.toUpperCase() } : null}
                                        onChange={(selectedOption) => {
                                            handleChange({
                                                target: {
                                                    name: 'department',
                                                    value: selectedOption ? selectedOption.value : ''
                                                }
                                            });
                                        }}
                                        isSearchable={true}
                                        placeholder="SEARCH DEPARTMENT..."
                                        styles={{
                                            control: (base, state) => ({
                                                ...base,
                                                backgroundColor: isDarkMode ? '#111418' : '#f9fafb',
                                                borderColor: state.isFocused ? (isDarkMode ? 'rgba(6, 182, 212, 0.5)' : '#06b6d4') : (isDarkMode ? '#1f2937' : '#e5e7eb'),
                                                padding: '4px',
                                                borderRadius: '4px',
                                                fontSize: '13px',
                                                fontWeight: 'bold',
                                                color: isDarkMode ? 'white' : 'black',
                                                boxShadow: state.isFocused ? '0 0 0 1px rgba(6, 182, 212, 0.2)' : 'none',
                                                '&:hover': {
                                                    borderColor: isDarkMode ? 'rgba(6, 182, 212, 0.5)' : '#06b6d4'
                                                }
                                            }),
                                            menu: (base) => ({
                                                ...base,
                                                backgroundColor: isDarkMode ? '#1a1f24' : 'white',
                                                border: isDarkMode ? '1px solid #1f2937' : '1px solid #e5e7eb',
                                                zIndex: 100
                                            }),
                                            option: (base, state) => ({
                                                ...base,
                                                backgroundColor: state.isFocused 
                                                    ? (isDarkMode ? 'rgba(6, 182, 212, 0.2)' : 'rgba(6, 182, 212, 0.1)') 
                                                    : 'transparent',
                                                color: isDarkMode ? 'white' : 'black',
                                                fontSize: '11px',
                                                fontWeight: 'black',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                '&:active': {
                                                    backgroundColor: 'rgba(6, 182, 212, 0.3)'
                                                }
                                            }),
                                            singleValue: (base) => ({
                                                ...base,
                                                color: isDarkMode ? 'white' : 'black'
                                            }),
                                            placeholder: (base) => ({
                                                ...base,
                                                color: isDarkMode ? '#374151' : '#9ca3af'
                                            }),
                                            input: (base) => ({
                                                ...base,
                                                color: isDarkMode ? 'white' : 'black'
                                            })
                                        }}
                                    />
                                </div>
                                    <div className="md:col-span-1">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">COURSE *</label>
                                            <button 
                                                type="button"
                                                onClick={() => setShowCourseFilters(!showCourseFilters)}
                                                className={`text-[9px] font-black uppercase tracking-widest transition-all underline underline-offset-4 ${showCourseFilters ? 'text-red-500 hover:text-red-400' : 'text-cyan-500 hover:text-cyan-400'}`}
                                            >
                                                {showCourseFilters ? 'CLOSE FILTERS' : 'FILTER ENGINE'}
                                            </button>
                                        </div>

                                        {showCourseFilters && (
                                            <div className={`mb-6 p-5 rounded-[4px] border border-dashed animate-in fade-in slide-in-from-top-2 duration-300 ${isDarkMode ? 'bg-black/40 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200 shadow-inner'}`}>
                                                <div className="flex items-center justify-between mb-5 border-b border-gray-800 pb-3">
                                                    <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                                        <FaFilter size={10} className="text-cyan-600" /> COURSE FILTERING ENGINE
                                                    </h4>
                                                    <button type="button" onClick={resetCourseFilters} className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-all">RESET FILTERS</button>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="col-span-2 relative group">
                                                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] group-focus-within:text-cyan-500 transition-colors" />
                                                        <input
                                                            type="text"
                                                            name="searchTerm"
                                                            placeholder="SEARCH COURSE BY NAME OR UNIT..."
                                                            value={courseFilters.searchTerm}
                                                            onChange={handleCourseFilterChange}
                                                            className={`w-full pl-9 pr-3 py-2 rounded-[2px] border text-[9px] font-black uppercase tracking-widest outline-none transition-all ${isDarkMode ? 'bg-[#0f1215] border-gray-800 text-cyan-500 focus:border-cyan-500/50' : 'bg-white border-gray-200 text-cyan-600 focus:border-cyan-500'}`}
                                                        />
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.15em] mb-1.5 block">Filter by Class</label>
                                                        <select name="class" value={courseFilters.class} onChange={handleCourseFilterChange} className={`${inputClass} !p-2 !text-[9px] !bg-[#0f1215]`}>
                                                            <option value="" className="bg-[#1a1f24] text-white">ALL CLASSES</option>
                                                            {masterClasses.sort((a,b) => (a.name || "").localeCompare(b.name || "")).map(c => (
                                                                <option key={c._id} value={c._id} className="bg-[#1a1f24] text-white">{c.name || c.className}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.15em] mb-1.5 block">Filter by Tag</label>
                                                        <select name="examTag" value={courseFilters.examTag} onChange={handleCourseFilterChange} className={`${inputClass} !p-2 !text-[9px] !bg-[#0f1215]`}>
                                                            <option value="" className="bg-[#1a1f24] text-white">ALL TAGS</option>
                                                            {masterExamTags.sort((a,b) => (a.name || "").localeCompare(b.name || "")).map(t => (
                                                                <option key={t._id} value={t._id} className="bg-[#1a1f24] text-white">{t.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.15em] mb-1.5 block">Filter by Session</label>
                                                        <select name="session" value={courseFilters.session} onChange={handleCourseFilterChange} className={`${inputClass} !p-2 !text-[9px] !bg-[#0f1215]`}>
                                                            <option value="" className="bg-[#1a1f24] text-white">ALL SESSIONS</option>
                                                            {masterSessions.map(s => (
                                                                <option key={s._id} value={s.sessionName || s.name} className="bg-[#1a1f24] text-white">{s.sessionName || s.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                     <div>
                                                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.15em] mb-1.5 block">Filter by Dept</label>
                                                        <Select
                                                            options={[...masterDepartments].sort((a,b) => (a.departmentName || "").localeCompare(b.departmentName || "")).map(d => ({ value: d._id, label: d.departmentName }))}
                                                            value={masterDepartments.find(d => d._id === courseFilters.department) ? { value: courseFilters.department, label: masterDepartments.find(d => d._id === courseFilters.department).departmentName } : null}
                                                            onChange={(selectedOption) => {
                                                                handleCourseFilterChange({
                                                                    target: {
                                                                        name: 'department',
                                                                        value: selectedOption ? selectedOption.value : ''
                                                                    }
                                                                });
                                                            }}
                                                            isSearchable={true}
                                                            placeholder="ALL DEPTS"
                                                            isClearable={true}
                                                            styles={{
                                                                control: (base, state) => ({
                                                                    ...base,
                                                                    backgroundColor: isDarkMode ? '#0f1215' : 'white',
                                                                    borderColor: state.isFocused ? (isDarkMode ? 'rgba(6, 182, 212, 0.5)' : '#06b6d4') : (isDarkMode ? '#1f2937' : '#e5e7eb'),
                                                                    minHeight: '30px',
                                                                    borderRadius: '2px',
                                                                    fontSize: '9px',
                                                                    fontWeight: 'black',
                                                                    textTransform: 'uppercase',
                                                                    color: isDarkMode ? 'white' : 'black',
                                                                    boxShadow: state.isFocused ? '0 0 0 1px rgba(6, 182, 212, 0.2)' : 'none',
                                                                    '&:hover': {
                                                                        borderColor: isDarkMode ? 'rgba(6, 182, 212, 0.5)' : '#06b6d4'
                                                                    }
                                                                }),
                                                                menu: (base) => ({
                                                                    ...base,
                                                                    backgroundColor: isDarkMode ? '#1a1f24' : 'white',
                                                                    border: isDarkMode ? '1px solid #1f2937' : '1px solid #e5e7eb',
                                                                    zIndex: 100
                                                                }),
                                                                option: (base, state) => ({
                                                                    ...base,
                                                                    backgroundColor: state.isFocused 
                                                                        ? (isDarkMode ? 'rgba(6, 182, 212, 0.2)' : 'rgba(6, 182, 212, 0.1)') 
                                                                        : 'transparent',
                                                                    color: isDarkMode ? 'white' : 'black',
                                                                    fontSize: '9px',
                                                                    fontWeight: 'black',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.05em'
                                                                }),
                                                                singleValue: (base) => ({
                                                                    ...base,
                                                                    color: isDarkMode ? 'white' : 'black'
                                                                }),
                                                                placeholder: (base) => ({
                                                                    ...base,
                                                                    color: isDarkMode ? '#374151' : '#9ca3af'
                                                                }),
                                                                input: (base) => ({
                                                                    ...base,
                                                                    color: isDarkMode ? 'white' : 'black'
                                                                }),
                                                                dropdownIndicator: (base) => ({
                                                                    ...base,
                                                                    padding: '2px'
                                                                }),
                                                                clearIndicator: (base) => ({
                                                                    ...base,
                                                                    padding: '2px'
                                                                })
                                                            }}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.15em] mb-1.5 block">Filter by Board</label>
                                                        <select name="board" value={courseFilters.board} onChange={handleCourseFilterChange} className={`${inputClass} !p-2 !text-[9px] !bg-[#0f1215]`}>
                                                            <option value="" className="bg-[#1a1f24] text-white">ALL BOARDS</option>
                                                            {masterBoards.sort((a,b) => (a.boardName || a.boardCourse || "").localeCompare(b.boardName || b.boardCourse || "")).map(b => (
                                                                <option key={b._id} value={b.boardName || b.boardCourse} className="bg-[#1a1f24] text-white">{b.boardName || b.boardCourse}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.15em] mb-1.5 block">Programme</label>
                                                        <select name="programme" value={courseFilters.programme} onChange={handleCourseFilterChange} className={`${inputClass} !p-2 !text-[9px] !bg-[#0f1215]`}>
                                                            <option value="" className="bg-[#1a1f24] text-white">ALL</option>
                                                            <option value="CRP" className="bg-[#1a1f24] text-white">CRP</option>
                                                            <option value="NCRP" className="bg-[#1a1f24] text-white">NCRP</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.15em] mb-1.5 block">Mode</label>
                                                        <select name="mode" value={courseFilters.mode} onChange={handleCourseFilterChange} className={`${inputClass} !p-2 !text-[9px] !bg-[#0f1215]`}>
                                                            <option value="" className="bg-[#1a1f24] text-white">ALL MODES</option>
                                                            <option value="ONLINE" className="bg-[#1a1f24] text-white">ONLINE</option>
                                                            <option value="OFFLINE" className="bg-[#1a1f24] text-white">OFFLINE</option>
                                                            <option value="HYBRID" className="bg-[#1a1f24] text-white">HYBRID</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.15em] mb-1.5 block">Type</label>
                                                        <select name="courseType" value={courseFilters.courseType} onChange={handleCourseFilterChange} className={`${inputClass} !p-2 !text-[9px] !bg-[#0f1215]`}>
                                                            <option value="" className="bg-[#1a1f24] text-white">ALL TYPES</option>
                                                            <option value="REGULAR" className="bg-[#1a1f24] text-white">REGULAR</option>
                                                            <option value="CRASH" className="bg-[#1a1f24] text-white">CRASH</option>
                                                            <option value="TEST_SERIES" className="bg-[#1a1f24] text-white">TEST SERIES</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <select
                                            name="course"
                                            value={formData.course}
                                            onChange={handleChange}
                                            className={`${inputClass} !bg-[#111418]`}
                                        >
                                            <option value="" className="bg-[#1a1f24] text-white">SELECT COURSE</option>
                                            {filteredCourses.length > 0 ? (
                                                [...filteredCourses].sort((a, b) => (a.courseName || "").localeCompare(b.courseName || "")).map((course) => (
                                                    <option key={course._id} value={course._id} className="bg-[#1a1f24] text-white">
                                                        {course.courseName?.toUpperCase()}
                                                    </option>
                                                ))
                                            ) : (
                                                <option disabled className="bg-[#1a1f24] text-gray-500">NO COURSES MATCH FILTERS</option>
                                            )}
                                        </select>
                                    </div>
                                <div>
                                    <label className={labelClass}>CLASSIFICATION (CLASS)</label>
                                    <select
                                        name="class"
                                        value={formData.class}
                                        onChange={handleChange}
                                        className={inputClass}
                                    >
                                        <option value="">SELECT CLASS</option>
                                        {[...masterClasses].sort((a, b) => (a.name || a.className || "").localeCompare(b.name || b.className || "")).map((cl) => (
                                            <option key={cl._id} value={cl._id}>
                                                {(cl.className || cl.name)?.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>EXAM CLASSIFICATION</label>
                                    <select
                                        name="examTag"
                                        value={formData.examTag}
                                        onChange={handleChange}
                                        className={inputClass}
                                    >
                                        <option value="">SELECT TAG</option>
                                        {[...masterExamTags].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map((tag) => (
                                            <option key={tag._id} value={tag._id}>
                                                {tag.name?.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>ACADEMIC CYCLE (SESSION)</label>
                                    <select
                                        name="academicSession"
                                        value={formData.academicSession}
                                        onChange={handleChange}
                                        className={inputClass}
                                    >
                                        <option value="">SELECT SESSION</option>
                                        {masterSessions.map((session) => (
                                            <option key={session._id} value={session.sessionName || session.name}>
                                                {(session.sessionName || session.name)?.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        {/* Action Bar */}
                        <div className={`pt-6 border-t flex gap-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                            <button
                                type="button"
                                onClick={onClose}
                                className={`flex-1 py-3 px-6 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                ABORT CHANGES
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`flex-1 py-3 px-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20 flex justify-center items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'UPDATING...' : 'COMMENCE UPDATE'} <FaSave />
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: ${isDarkMode ? '#0f1215' : 'transparent'}; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#d1d5db'}; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? '#374151' : '#9ca3af'}; }
            `}</style>
        </div>
    );
};

export default EditEnrolledStudentModal;
