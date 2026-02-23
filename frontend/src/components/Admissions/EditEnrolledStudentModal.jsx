import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaSave } from 'react-icons/fa';
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

            const [deptRes, courseRes, classRes, sessionRes, tagRes] = await Promise.all([
                fetch(`${apiUrl}/department`, { headers }),
                fetch(`${apiUrl}/course`, { headers }),
                fetch(`${apiUrl}/class`, { headers }),
                fetch(`${apiUrl}/session/list`, { headers }),
                fetch(`${apiUrl}/examTag`, { headers })
            ]);

            if (deptRes.ok) setMasterDepartments(await deptRes.json());
            if (courseRes.ok) setMasterCourses(await courseRes.json());
            if (classRes.ok) setMasterClasses(await classRes.json());
            if (sessionRes.ok) setMasterSessions(await sessionRes.json());
            if (tagRes.ok) setMasterExamTags(await tagRes.json());
        } catch (error) {
            console.error('Error fetching master data:', error);
        }
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
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/normalAdmin/updateStudent/${admission.student._id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        studentsDetails: [{
                            studentName: formData.studentName,
                            studentEmail: formData.studentEmail,
                            mobileNum: formData.mobileNum,
                            whatsappNumber: formData.whatsappNumber,
                            dateOfBirth: formData.dateOfBirth,
                            gender: formData.gender,
                            schoolName: formData.schoolName,
                            address: formData.address,
                            pincode: formData.pincode,
                            state: formData.state,
                            board: formData.board,
                            centre: formData.centre,
                            source: admission.student?.studentsDetails?.[0]?.source || 'Walk-in',
                        }],
                        guardians: [{
                            guardianName: formData.guardianName,
                            qualification: formData.qualification,
                            guardianEmail: formData.guardianEmail,
                            guardianMobile: formData.guardianMobile,
                            occupation: formData.occupation,
                            annualIncome: formData.annualIncome,
                            organizationName: formData.organizationName,
                            designation: formData.designation,
                            officeAddress: formData.officeAddress
                        }]
                    })
                }
            );

            const data = await response.json();

            if (response.ok) {
                // Update the Admission record too to ensure consistency
                await fetch(
                    `${import.meta.env.VITE_API_URL}/admission/${admission._id}`,
                    {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            centre: formData.centre,
                            department: formData.department,
                            course: formData.course,
                            class: formData.class,
                            academicSession: formData.academicSession,
                            examTag: formData.examTag
                        })
                    }
                );

                toast.success('Student details and centre updated successfully!');
                onUpdate();
                onClose();
            } else {
                toast.error(data.message || 'Failed to update student details');
            }
        } catch (error) {
            console.error('Error updating student:', error);
            toast.error('Error updating student details');
        } finally {
            setLoading(false);
        }
    };

    const labelClass = "block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-2";
    const inputClass = `w-full p-2.5 rounded-[4px] border font-bold text-[11px] uppercase tracking-wider focus:outline-none transition-all ${isDarkMode ? 'bg-black/20 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`;
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
                                        {Array.isArray(centres) && centres.map((c) => (
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
                                    <input
                                        type="text"
                                        value={formData.board}
                                        onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>DEPARTMENT</label>
                                    <select
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        className={inputClass}
                                    >
                                        <option value="">SELECT DEPARTMENT</option>
                                        {masterDepartments.map((dept) => (
                                            <option key={dept._id} value={dept._id}>
                                                {dept.departmentName?.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>COURSE</label>
                                    <select
                                        name="course"
                                        value={formData.course}
                                        onChange={handleChange}
                                        className={inputClass}
                                    >
                                        <option value="">SELECT COURSE</option>
                                        {masterCourses.map((course) => (
                                            <option key={course._id} value={course._id}>
                                                {course.courseName?.toUpperCase()}
                                            </option>
                                        ))}
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
                                        {masterClasses.map((cl) => (
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
                                        {masterExamTags.map((tag) => (
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
