import React, { useState, useEffect } from 'react';
import {
    FaUserPlus, FaGraduationCap, FaPhoneAlt, FaMapMarkerAlt,
    FaSchool, FaCalendarAlt, FaSave, FaTimes, FaCheckCircle, FaSpinner
} from 'react-icons/fa';

const INITIAL_FORM = {
    name: '',
    mobile: '',
    email: '',
    dob: '',
    gender: '',
    class: '',
    school: '',
    centre: '',
    session: '',
    examTag: '',
    course: '',
    paymentType: 'free',
    guardianName: '',
    guardianMobile: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    examDate: '',
    remarks: '',
};

const PNTSEAddStudentContent = () => {
    const [form, setForm] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [message, setMessage] = useState('');

    const [dbCentres, setDbCentres] = useState([]);
    const [dbClasses, setDbClasses] = useState([]);
    const [dbSessions, setDbSessions] = useState([]);
    const [dbExamTags, setDbExamTags] = useState([]);
    const [loading, setLoading] = useState(true);

    const courses = [
        'PNTSE CLASS 6',
        'PNTSE CLASS 7',
        'PNTSE CLASS 8',
        'PNTSE CLASS 9',
        'PNTSE CLASS 10'
    ];
    const genders = ['Male', 'Female', 'Other'];
    const paymentTypes = [
        { value: 'free', label: 'Free (Rs. 0)' },
        { value: 'paid', label: 'Paid (Rs. 100)' }
    ];

    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const token = localStorage.getItem("token");
                const headers = { "Authorization": `Bearer ${token}` };

                const [centresRes, classesRes, sessionsRes, tagsRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/class`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/examTag`, { headers })
                ]);

                if (centresRes.ok) {
                    const data = await centresRes.json();
                    setDbCentres(data);
                }
                if (classesRes.ok) {
                    const data = await classesRes.json();
                    setDbClasses(data);
                }
                if (sessionsRes.ok) {
                    const data = await sessionsRes.json();
                    setDbSessions(Array.isArray(data) ? data : (data.sessions || []));
                }
                if (tagsRes.ok) {
                    const data = await tagsRes.json();
                    setDbExamTags(data);
                }
            } catch (err) {
                console.error("Failed to load master data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMasterData();
    }, []);

    const debounceTimeout = React.useRef({});

    const checkDbDuplicate = async (name, value) => {
        if (!value) return;
        if (name === 'mobile' && !/^\d{10}$/.test(value)) return;
        if (name === 'email' && !/\S+@\S+\.\S+/.test(value)) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/pntse/check-duplicate?${name}=${encodeURIComponent(value)}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (name === 'mobile' && data.mobileExists) {
                    setErrors(prev => ({ ...prev, mobile: 'Mobile number is already registered' }));
                } else if (name === 'email' && data.emailExists) {
                    setErrors(prev => ({ ...prev, email: 'Email ID is already registered' }));
                }
            }
        } catch (err) {
            console.error("Duplicate check failed", err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));

        if (name === 'mobile' || name === 'email') {
            if (debounceTimeout.current[name]) {
                clearTimeout(debounceTimeout.current[name]);
            }
            debounceTimeout.current[name] = setTimeout(() => {
                checkDbDuplicate(name, value);
            }, 600);
        }
    };

    const validate = () => {
        const errs = {};
        if (!form.name.trim()) errs.name = 'Full Name is required';
        if (!form.mobile.trim() || !/^\d{10}$/.test(form.mobile)) errs.mobile = 'Valid 10-digit mobile is required';
        if (!form.class) errs.class = 'Class is required';
        if (!form.centre) errs.centre = 'Centre is required';
        if (!form.session) errs.session = 'Session is required';
        if (!form.examTag) errs.examTag = 'Exam Tag is required';
        if (!form.course) errs.course = 'Course is required';
        if (!form.gender) errs.gender = 'Gender is required';
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (errors.mobile && errors.mobile.includes("registered")) {
            errs.mobile = errors.mobile;
        }
        if (errors.email && errors.email.includes("registered")) {
            errs.email = errors.email;
        }
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/pntse/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(form)
            });

            const data = await response.json();
            if (response.ok) {
                setMessage(data.message || 'Student registered successfully!');
                setSubmitted(true);
                setForm(INITIAL_FORM);
                setTimeout(() => {
                    setSubmitted(false);
                }, 3000);
            } else {
                alert(data.message || 'Registration failed.');
            }
        } catch (err) {
            console.error("Error creating student", err);
            alert("Server error occurred.");
        }
    };

    const handleReset = () => {
        setForm(INITIAL_FORM);
        setErrors({});
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <FaSpinner className="text-4xl text-cyan-400 animate-spin" />
                    <p className="text-sm text-gray-400">Loading master data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <FaUserPlus className="text-white text-lg" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Add PNTSE Student</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Register a new student for PNTSE examination</p>
                    </div>
                </div>
            </div>

            {/* Success Toast */}
            {submitted && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-500 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-emerald-500/30 animate-bounce">
                    <FaCheckCircle className="text-lg" />
                    <span className="font-medium">{message}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
                {/* Personal Information */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                            <FaGraduationCap className="text-cyan-400 text-sm" />
                        </div>
                        <h2 className="text-sm font-semibold text-white">Personal Information</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Full Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Enter full name"
                                className={`px-4 py-2.5 bg-gray-800 border rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 transition-all
                                    ${errors.name ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/30'}`}
                            />
                            {errors.name && <p className="text-xs text-red-400 mt-0.5">{errors.name}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Gender <span className="text-red-400">*</span>
                            </label>
                            <select
                                name="gender"
                                value={form.gender}
                                onChange={handleChange}
                                className={`px-4 py-2.5 bg-gray-800 border rounded-xl text-sm text-gray-100 focus:outline-none focus:ring-1 transition-all cursor-pointer
                                    ${errors.gender ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/30'}`}
                            >
                                <option value="">Select Gender</option>
                                {genders.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            {errors.gender && <p className="text-xs text-red-400 mt-0.5">{errors.gender}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Mobile <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                name="mobile"
                                value={form.mobile}
                                onChange={handleChange}
                                placeholder="10-digit mobile number"
                                className={`px-4 py-2.5 bg-gray-800 border rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 transition-all
                                    ${errors.mobile ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/30'}`}
                            />
                            {errors.mobile && <p className="text-xs text-red-400 mt-0.5">{errors.mobile}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date of Birth</label>
                            <input
                                type="date"
                                name="dob"
                                value={form.dob}
                                onChange={handleChange}
                                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="student@example.com"
                                className={`px-4 py-2.5 bg-gray-800 border rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 transition-all
                                    ${errors.email ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/30'}`}
                            />
                            {errors.email && <p className="text-xs text-red-400 mt-0.5">{errors.email}</p>}
                        </div>
                    </div>
                </div>

                {/* Academic Information */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
                            <FaSchool className="text-violet-400 text-sm" />
                        </div>
                        <h2 className="text-sm font-semibold text-white">Academic Details</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Class <span className="text-red-400">*</span>
                            </label>
                            <select
                                name="class"
                                value={form.class}
                                onChange={handleChange}
                                className={`px-4 py-2.5 bg-gray-800 border rounded-xl text-sm text-gray-100 focus:outline-none focus:ring-1 transition-all cursor-pointer
                                    ${errors.class ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/30'}`}
                            >
                                <option value="">Select Class</option>
                                {dbClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                            {errors.class && <p className="text-xs text-red-400 mt-0.5">{errors.class}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Course <span className="text-red-400">*</span>
                            </label>
                            <select
                                name="course"
                                value={form.course}
                                onChange={handleChange}
                                className={`px-4 py-2.5 bg-gray-800 border rounded-xl text-sm text-gray-100 focus:outline-none focus:ring-1 transition-all cursor-pointer
                                    ${errors.course ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/30'}`}
                            >
                                <option value="">Select Course</option>
                                {courses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            {errors.course && <p className="text-xs text-red-400 mt-0.5">{errors.course}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Centre <span className="text-red-400">*</span>
                            </label>
                            <select
                                name="centre"
                                value={form.centre}
                                onChange={handleChange}
                                className={`px-4 py-2.5 bg-gray-800 border rounded-xl text-sm text-gray-100 focus:outline-none focus:ring-1 transition-all cursor-pointer
                                    ${errors.centre ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/30'}`}
                            >
                                <option value="">Select Centre</option>
                                {dbCentres.map(c => <option key={c._id} value={c._id}>{c.centreName || c.enterCode}</option>)}
                            </select>
                            {errors.centre && <p className="text-xs text-red-400 mt-0.5">{errors.centre}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Session <span className="text-red-400">*</span>
                            </label>
                            <select
                                name="session"
                                value={form.session}
                                onChange={handleChange}
                                className={`px-4 py-2.5 bg-gray-800 border rounded-xl text-sm text-gray-100 focus:outline-none focus:ring-1 transition-all cursor-pointer
                                    ${errors.session ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/30'}`}
                            >
                                <option value="">Select Session</option>
                                {dbSessions.map(s => <option key={s._id} value={s._id}>{s.sessionName}</option>)}
                            </select>
                            {errors.session && <p className="text-xs text-red-400 mt-0.5">{errors.session}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Exam Tag <span className="text-red-400">*</span>
                            </label>
                            <select
                                name="examTag"
                                value={form.examTag}
                                onChange={handleChange}
                                className={`px-4 py-2.5 bg-gray-800 border rounded-xl text-sm text-gray-100 focus:outline-none focus:ring-1 transition-all cursor-pointer
                                    ${errors.examTag ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/30'}`}
                            >
                                <option value="">Select Exam Tag</option>
                                {dbExamTags.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                            {errors.examTag && <p className="text-xs text-red-400 mt-0.5">{errors.examTag}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Payment Type
                            </label>
                            <select
                                name="paymentType"
                                value={form.paymentType}
                                onChange={handleChange}
                                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
                            >
                                {paymentTypes.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">School Name</label>
                            <input
                                type="text"
                                name="school"
                                value={form.school}
                                onChange={handleChange}
                                placeholder="Name of school"
                                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Exam Date</label>
                            <input
                                type="date"
                                name="examDate"
                                value={form.examDate}
                                onChange={handleChange}
                                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Roll No. Status</label>
                            <input
                                type="text"
                                disabled
                                placeholder="Auto-generated on save"
                                className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>

                {/* Guardian Information */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <FaPhoneAlt className="text-amber-400 text-sm" />
                        </div>
                        <h2 className="text-sm font-semibold text-white">Guardian Details</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Guardian Name</label>
                            <input
                                type="text"
                                name="guardianName"
                                value={form.guardianName}
                                onChange={handleChange}
                                placeholder="Parent / Guardian name"
                                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Guardian Mobile</label>
                            <input
                                type="text"
                                name="guardianMobile"
                                value={form.guardianMobile}
                                onChange={handleChange}
                                placeholder="10-digit mobile number"
                                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <FaMapMarkerAlt className="text-emerald-400 text-sm" />
                        </div>
                        <h2 className="text-sm font-semibold text-white">Address Details</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Address</label>
                            <textarea
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                rows={2}
                                placeholder="Street address..."
                                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">City</label>
                            <input
                                type="text"
                                name="city"
                                value={form.city}
                                onChange={handleChange}
                                placeholder="City"
                                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">State</label>
                            <input
                                type="text"
                                name="state"
                                value={form.state}
                                onChange={handleChange}
                                placeholder="State"
                                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pincode</label>
                            <input
                                type="text"
                                name="pincode"
                                value={form.pincode}
                                onChange={handleChange}
                                placeholder="6-digit pincode"
                                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Remarks */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Remarks / Notes</label>
                        <textarea
                            name="remarks"
                            value={form.remarks}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Any additional notes about this student..."
                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-none"
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pb-8">
                    <button
                        type="submit"
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/25"
                    >
                        <FaSave />
                        Register Student
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-all duration-200 border border-gray-700"
                    >
                        <FaTimes />
                        Reset Form
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PNTSEAddStudentContent;
