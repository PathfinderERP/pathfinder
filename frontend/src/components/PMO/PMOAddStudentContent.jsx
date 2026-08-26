import React, { useState, useEffect } from 'react';
import {
    FaUserPlus, FaGraduationCap, FaPhoneAlt, FaMapMarkerAlt,
    FaSchool, FaSave, FaTimes, FaCheckCircle, FaSpinner,
    FaMoneyBillWave, FaCreditCard, FaUniversity, FaFileInvoice, FaTag, FaIdCard
} from 'react-icons/fa';
import BillGenerator from '../Finance/BillGenerator';
import { useLocation, useNavigate } from 'react-router-dom';

const INITIAL_FORM = {
    name: '',
    mobile: '',
    secondaryMobile: '',
    email: '',
    dob: '',
    gender: '',
    class: '',
    board: '',
    school: '',
    centre: '',
    session: '',
    examTag: '',
    course: '',
    paymentType: 'paid',
    guardianName: '',
    guardianMobile: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    examDate: '',
    examVenue: '',
    reportingTime: '',
    timeSlot: '',
    remarks: '',
    studentId: '',
    rollNo: '',
};

const INITIAL_PAYMENT = {
    paymentMethod: 'CASH',
    transactionId: '',
    accountHolderName: '',
    chequeDate: '',
    receivedDate: new Date().toISOString().split('T')[0],
    waiver: '',
};

const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Cash', icon: '💵' },
    { value: 'UPI', label: 'UPI', icon: '📱' },
    { value: 'CARD', label: 'Card', icon: '💳' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏦' },
];

const GROSS_FEE = 100;

const PMOAddStudentContent = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [form, setForm] = useState(INITIAL_FORM);
    const [paymentForm, setPaymentForm] = useState(INITIAL_PAYMENT);
    const [errors, setErrors] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const [dbCentres, setDbCentres] = useState([]);
    const [dbZones, setDbZones] = useState([]);
    const [dbClasses, setDbClasses] = useState([]);
    const [dbBoards, setDbBoards] = useState([]);
    const [dbSessions, setDbSessions] = useState([]);
    const [dbExamTags, setDbExamTags] = useState([]);
    const [loading, setLoading] = useState(true);

    const [billData, setBillData] = useState(null);
    const [showBill, setShowBill] = useState(false);

    // Carry Forward / Auto-allocation modal state
    const [cfModalOpen, setCfModalOpen] = useState(false);
    const [cfStudentDetails, setCfStudentDetails] = useState(null);

    const courses = [
        'PMO 5', 'PMO 6', 'PMO 7', 'PMO 8', 'PMO 9', 'PMO 10'
    ];
    const genders = ['Male', 'Female', 'Other'];

    const waiverNum = Math.max(0, Math.min(GROSS_FEE, Number(paymentForm.waiver) || 0));
    const netPayable = GROSS_FEE - waiverNum;

    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const token = localStorage.getItem("token");
                const headers = { "Authorization": `Bearer ${token}` };
                const [centresRes, classesRes, sessionsRes, tagsRes, boardsRes, zonesRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/class`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/examTag`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/board`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/zone`, { headers })
                ]);
                if (centresRes.ok) setDbCentres(await centresRes.json());
                if (classesRes.ok) setDbClasses(await classesRes.json());
                if (boardsRes.ok) setDbBoards(await boardsRes.json());
                if (sessionsRes.ok) {
                    const d = await sessionsRes.json();
                    const allSessions = Array.isArray(d) ? d : (d.sessions || []);
                    const filtered = allSessions.filter(s => 
                        (s.sessionName || s.name || '').includes('2026-2027') && s.isGlobalActive !== false
                    );
                    const finalSessions = (filtered.length > 0 ? filtered : allSessions.filter(s => (s.sessionName || s.name || '').includes('2026-2027')))
                        .filter((s, idx, self) => idx === self.findIndex(t => (t.sessionName || t.name) === (s.sessionName || s.name)));
                    setDbSessions(finalSessions);
                    if (finalSessions.length > 0) {
                        setForm(prev => prev.session ? prev : { ...prev, session: finalSessions[0]._id });
                    }
                }
                if (tagsRes.ok) {
                    const allTags = await tagsRes.json();
                    const filteredTags = Array.isArray(allTags)
                        ? allTags.filter(t => t.name && /pmo/i.test(t.name))
                        : [];
                    setDbExamTags(filteredTags.length > 0 ? filteredTags : allTags);
                }
                if (zonesRes.ok) {
                    const zData = await zonesRes.json();
                    setDbZones(Array.isArray(zData) ? zData : (zData.zones || zData.data || []));
                }
            } catch (err) {
                console.error("Failed to load master data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMasterData();
    }, []);

    const applyCarryForward = (s, customRollNo) => {
        const details = s.studentsDetails?.[0] || {};
        
        let matchedCentreId = "";
        if (details.centre) {
            const matched = dbCentres.find(c => c.centreName?.toLowerCase().trim() === details.centre?.toLowerCase().trim());
            if (matched) matchedCentreId = matched._id;
        }

        let matchedClassId = "";
        const studentClassStr = s.examSchema?.[0]?.class || "";
        if (studentClassStr) {
            const studentClassDigit = studentClassStr.replace(/\D/g, "");
            const matched = dbClasses.find(c => c.name?.replace(/\D/g, "") === studentClassDigit);
            if (matched) matchedClassId = matched._id;
        }

        let matchedBoardId = "";
        const studentBoard = s.examSchema?.[0]?.board || s.board || "";
        if (studentBoard && dbBoards.length > 0) {
            const matched = dbBoards.find(b =>
                b.boardCourse?.toLowerCase().trim() === String(studentBoard).toLowerCase().trim() ||
                b.boardName?.toLowerCase().trim() === String(studentBoard).toLowerCase().trim() ||
                String(b._id) === String(studentBoard)
            );
            if (matched) matchedBoardId = matched._id;
        }

        let matchedCourse = "";
        const studentClassDigit = studentClassStr.replace(/\D/g, "");
        if (studentClassDigit) {
            matchedCourse = `PMO ${studentClassDigit}`;
        }

        setForm(prev => ({
            ...prev,
            name: details.studentName || prev.name,
            mobile: details.mobileNum || prev.mobile,
            email: details.studentEmail || prev.email,
            dob: details.dateOfBirth || prev.dob,
            gender: details.gender || prev.gender,
            address: details.address || prev.address,
            city: details.city || prev.city,
            state: details.state || prev.state,
            pincode: details.pincode || prev.pincode,
            school: details.schoolName || prev.school,
            guardianName: details.guardians?.[0]?.guardianName || s.guardians?.[0]?.guardianName || prev.guardianName,
            guardianMobile: details.guardians?.[0]?.guardianMobile || s.guardians?.[0]?.guardianMobile || prev.guardianMobile,
            centre: matchedCentreId || prev.centre,
            class: matchedClassId || prev.class,
            board: matchedBoardId || prev.board,
            course: matchedCourse || prev.course,
            studentId: s._id || prev.studentId,
            rollNo: customRollNo || prev.rollNo
        }));
    };

    useEffect(() => {
        if (location.state?.student && dbCentres.length > 0 && dbClasses.length > 0) {
            applyCarryForward(location.state.student, location.state.rollNo);
        }
    }, [location.state, dbCentres, dbClasses, dbBoards]);

    const debounceTimeout = React.useRef({});

    const checkDbDuplicate = async (name, value) => {
        if (!value) return;
        if (name === 'mobile' && !/^\d{10}$/.test(value)) return;
        if (name === 'email' && !/\S+@\S+\.\S+/.test(value)) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/pmo/check-duplicate?${name}=${encodeURIComponent(value)}`,
                { headers: { "Authorization": `Bearer ${token}` } }
            );
            if (response.ok) {
                const data = await response.json();
                if (data.alreadyInOtherCourse && data.existingStudentDetails) {
                    setCfStudentDetails(data.existingStudentDetails);
                    setCfModalOpen(true);
                } else if (name === 'mobile' && data.mobileExistsInPmo) {
                    setErrors(prev => ({ ...prev, mobile: 'Mobile number is already registered in PMO' }));
                } else if (name === 'email' && data.emailExistsInPmo) {
                    setErrors(prev => ({ ...prev, email: 'Email ID is already registered in PMO' }));
                }
            }
        } catch (err) {
            console.error("Duplicate check failed", err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => {
            const updated = { ...prev, [name]: value };
            if (name === 'class' && value) {
                const selectedClassObj = dbClasses.find(c => String(c._id) === String(value));
                if (selectedClassObj) {
                    const digit = selectedClassObj.name?.replace(/\D/g, "");
                    if (digit) {
                        updated.course = `PMO ${digit}`;
                    }
                }
            }
            return updated;
        });

        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        if (name === 'mobile' || name === 'email') {
            if (debounceTimeout.current[name]) clearTimeout(debounceTimeout.current[name]);
            debounceTimeout.current[name] = setTimeout(() => checkDbDuplicate(name, value), 600);
        }
    };

    const handlePaymentChange = (e) => {
        const { name, value } = e.target;
        setPaymentForm(prev => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        const errs = {};
        if (!form.name.trim()) errs.name = 'Full Name is required';
        if (!form.mobile.trim() || !/^\d{10}$/.test(form.mobile)) errs.mobile = 'Valid 10-digit mobile is required';
        if (!form.class) errs.class = 'Class is required';
        if (!form.board) errs.board = 'Board is required';
        if (!form.centre) errs.centre = 'Centre is required';
        if (!form.session) errs.session = 'Session is required';
        if (!form.examTag) errs.examTag = 'Exam Tag is required';
        if (!form.course) errs.course = 'Course is required';
        if (!form.gender) errs.gender = 'Gender is required';

        if (netPayable > 0) {
            if (!paymentForm.receivedDate) errs.receivedDate = 'Received date is required';
            if (['UPI', 'CARD', 'BANK_TRANSFER'].includes(paymentForm.paymentMethod) && !paymentForm.transactionId.trim()) {
                errs.transactionId = 'Transaction ID is required for non-cash payment';
            }
        }
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (errors.mobile && errors.mobile.includes("registered in PMO")) errs.mobile = errors.mobile;
        if (errors.email && errors.email.includes("registered in PMO")) errs.email = errors.email;
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const payload = {
                ...form,
                paymentType: netPayable === 0 ? 'free' : 'paid',
                paymentMethod: paymentForm.paymentMethod,
                transactionId: paymentForm.transactionId,
                accountHolderName: paymentForm.accountHolderName,
                chequeDate: paymentForm.chequeDate || undefined,
                receivedDate: paymentForm.receivedDate,
                waiver: paymentForm.waiver !== '' ? Number(paymentForm.waiver) : 0,
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL}/pmo/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (response.ok) {
                setMessage(data.message || 'PMO Student registered successfully!');
                setSubmitted(true);
                setForm(INITIAL_FORM);
                setPaymentForm(INITIAL_PAYMENT);
                setErrors({});

                if (data.billData) {
                    setBillData(data.billData);
                    setShowBill(true);
                } else {
                    setTimeout(() => setSubmitted(false), 3000);
                }
            } else {
                alert(data.message || 'Registration failed.');
            }
        } catch (err) {
            console.error("Error creating PMO student", err);
            alert("Server error occurred.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => { setForm(INITIAL_FORM); setPaymentForm(INITIAL_PAYMENT); setErrors({}); };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <FaSpinner className="text-4xl text-purple-400 animate-spin" />
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
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <FaGraduationCap className="text-white text-xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Add PMO Student</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Register student for Pathfinder Math Olympiad (Course Fee: ₹100)</p>
                    </div>
                </div>
            </div>

            {/* Success Toast */}
            {submitted && !showBill && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-500 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-emerald-500/30 animate-bounce">
                    <FaCheckCircle className="text-lg" />
                    <span className="font-medium">{message}</span>
                </div>
            )}

            {/* Bill Modal */}
            {showBill && billData && (
                <BillGenerator
                    preloadedBillData={billData}
                    onClose={() => {
                        setShowBill(false);
                        setBillData(null);
                        setTimeout(() => setSubmitted(false), 500);
                    }}
                />
            )}

            {/* Existing Enrollment Auto-Allocation Modal */}
            {cfModalOpen && cfStudentDetails && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-gray-900 border border-purple-500/40 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden shadow-purple-900/20">
                        <div className="px-6 py-5 bg-gradient-to-r from-purple-950/80 to-indigo-950/80 border-b border-purple-800/40 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                <FaIdCard className="text-purple-400 text-xl" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white leading-tight">Existing Student Enrolled</h3>
                                <p className="text-xs text-purple-300 mt-0.5">Matching mobile/email found in existing course records</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            <p className="text-sm text-gray-300 leading-relaxed">
                                This student is already registered with Enrollment/Admission Number: <strong className="text-purple-400 font-mono text-base">{cfStudentDetails.rollNo}</strong>.
                                Would you like to <span className="text-purple-400 font-bold">Auto-Allocate</span> this existing Enrollment Number for this PMO registration?
                            </p>

                            <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                    <div>
                                        <span className="text-gray-500 uppercase font-semibold">Student Name</span>
                                        <p className="text-sm text-gray-200 font-semibold mt-0.5">{cfStudentDetails.name}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 uppercase font-semibold">Enrolled Course</span>
                                        <p className="text-sm text-purple-400 font-semibold mt-0.5">{cfStudentDetails.course}</p>
                                    </div>
                                    <div className="mt-2">
                                        <span className="text-gray-500 uppercase font-semibold">Existing Enrollment ID</span>
                                        <p className="text-sm text-emerald-400 font-mono font-bold mt-0.5">{cfStudentDetails.rollNo || "N/A"}</p>
                                    </div>
                                    <div className="mt-2">
                                        <span className="text-gray-500 uppercase font-semibold">Mobile</span>
                                        <p className="text-sm text-gray-200 font-medium mt-0.5">{cfStudentDetails.mobile}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-950/40 border-t border-gray-800/80">
                            <button
                                type="button"
                                onClick={() => setCfModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
                            >
                                Keep Independent
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (cfStudentDetails.student) {
                                        applyCarryForward(cfStudentDetails.student, cfStudentDetails.rollNo);
                                    } else {
                                        setForm(prev => ({
                                            ...prev,
                                            name: cfStudentDetails.name || prev.name,
                                            rollNo: cfStudentDetails.rollNo || prev.rollNo
                                        }));
                                    }
                                    setCfModalOpen(false);
                                }}
                                className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
                            >
                                <FaCheckCircle /> Auto-Allocate Enrollment ID
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
                {/* 1. Student Personal Details */}
                <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                    <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-800 text-purple-400 font-semibold text-sm">
                        <FaUserPlus /> 1. Personal & Contact Details
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Full Name <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Student Full Name"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
                            />
                            {errors.name && <p className="text-rose-400 text-[11px] mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Mobile Number <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                name="mobile"
                                maxLength={10}
                                value={form.mobile}
                                onChange={handleChange}
                                placeholder="10-digit mobile"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition font-mono"
                            />
                            {errors.mobile && <p className="text-rose-400 text-[11px] mt-1">{errors.mobile}</p>}
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Secondary Mobile</label>
                            <input
                                type="text"
                                name="secondaryMobile"
                                maxLength={10}
                                value={form.secondaryMobile}
                                onChange={handleChange}
                                placeholder="Optional mobile"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="student@example.com"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
                            />
                            {errors.email && <p className="text-rose-400 text-[11px] mt-1">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Date of Birth</label>
                            <input
                                type="date"
                                name="dob"
                                value={form.dob}
                                onChange={handleChange}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 focus:outline-none focus:border-purple-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Gender <span className="text-rose-500">*</span></label>
                            <select
                                name="gender"
                                value={form.gender}
                                onChange={handleChange}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 focus:outline-none focus:border-purple-500 transition"
                            >
                                <option value="">Select Gender</option>
                                {genders.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            {errors.gender && <p className="text-rose-400 text-[11px] mt-1">{errors.gender}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-gray-400 mb-1.5 font-medium">Address</label>
                            <input
                                type="text"
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="Street address"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">City</label>
                            <input
                                type="text"
                                name="city"
                                value={form.city}
                                onChange={handleChange}
                                placeholder="City"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">State</label>
                            <input
                                type="text"
                                name="state"
                                value={form.state}
                                onChange={handleChange}
                                placeholder="State"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Pincode</label>
                            <input
                                type="text"
                                name="pincode"
                                value={form.pincode}
                                onChange={handleChange}
                                placeholder="Pincode"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Allocated Enrollment / Roll No (Auto if existing)</label>
                            <input
                                type="text"
                                name="rollNo"
                                value={form.rollNo}
                                onChange={handleChange}
                                placeholder="Auto-generated or Auto-allocated"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-purple-300 font-mono font-bold placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Academic & Exam Tags */}
                <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                    <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-800 text-purple-400 font-semibold text-sm">
                        <FaGraduationCap /> 2. Academic & Course Mapping
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Class <span className="text-rose-500">*</span></label>
                            <select
                                name="class"
                                value={form.class}
                                onChange={handleChange}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 focus:outline-none focus:border-purple-500 transition"
                            >
                                <option value="">Select Class</option>
                                {dbClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                            {errors.class && <p className="text-rose-400 text-[11px] mt-1">{errors.class}</p>}
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Board <span className="text-rose-500">*</span></label>
                            <select
                                name="board"
                                value={form.board}
                                onChange={handleChange}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 focus:outline-none focus:border-purple-500 transition"
                            >
                                <option value="">Select Board</option>
                                {dbBoards.map(b => <option key={b._id} value={b._id}>{b.boardCourse || b.boardName}</option>)}
                            </select>
                            {errors.board && <p className="text-rose-400 text-[11px] mt-1">{errors.board}</p>}
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Centre <span className="text-rose-500">*</span></label>
                            <select
                                name="centre"
                                value={form.centre}
                                onChange={handleChange}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 focus:outline-none focus:border-purple-500 transition"
                            >
                                <option value="">Select Centre</option>
                                {dbCentres.map(c => <option key={c._id} value={c._id}>{c.centreName} ({c.enterCode || c.centreCode})</option>)}
                            </select>
                            {errors.centre && <p className="text-rose-400 text-[11px] mt-1">{errors.centre}</p>}
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Academic Session <span className="text-rose-500">*</span></label>
                            <select
                                name="session"
                                value={form.session}
                                onChange={handleChange}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 focus:outline-none focus:border-purple-500 transition"
                            >
                                <option value="">Select Session</option>
                                {dbSessions.map(s => <option key={s._id} value={s._id}>{s.sessionName || s.name}</option>)}
                            </select>
                            {errors.session && <p className="text-rose-400 text-[11px] mt-1">{errors.session}</p>}
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Exam Tag <span className="text-rose-500">*</span></label>
                            <select
                                name="examTag"
                                value={form.examTag}
                                onChange={handleChange}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 focus:outline-none focus:border-purple-500 transition"
                            >
                                <option value="">Select Exam Tag</option>
                                {dbExamTags.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                            {errors.examTag && <p className="text-rose-400 text-[11px] mt-1">{errors.examTag}</p>}
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Course <span className="text-rose-500">*</span></label>
                            <select
                                name="course"
                                value={form.course}
                                onChange={handleChange}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-purple-300 font-bold focus:outline-none focus:border-purple-500 transition"
                            >
                                <option value="">Select Course</option>
                                {courses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            {errors.course && <p className="text-rose-400 text-[11px] mt-1">{errors.course}</p>}
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">School Name</label>
                            <input
                                type="text"
                                name="school"
                                value={form.school}
                                onChange={handleChange}
                                placeholder="Current School"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Guardian Name</label>
                            <input
                                type="text"
                                name="guardianName"
                                value={form.guardianName}
                                onChange={handleChange}
                                placeholder="Father / Mother name"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Guardian Mobile</label>
                            <input
                                type="text"
                                name="guardianMobile"
                                maxLength={10}
                                value={form.guardianMobile}
                                onChange={handleChange}
                                placeholder="10-digit mobile"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Exam Schedule & Hall Ticket Details */}
                <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                    <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-800 text-purple-400 font-semibold text-sm">
                        <FaSchool /> 3. Exam Schedule & Venue
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 text-xs">
                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Exam Date</label>
                            <input
                                type="date"
                                name="examDate"
                                value={form.examDate}
                                onChange={handleChange}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 focus:outline-none focus:border-purple-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Exam Venue</label>
                            <input
                                type="text"
                                name="examVenue"
                                value={form.examVenue}
                                onChange={handleChange}
                                placeholder="Venue details"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Reporting Time</label>
                            <input
                                type="time"
                                name="reportingTime"
                                value={form.reportingTime}
                                onChange={handleChange}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 focus:outline-none focus:border-purple-500 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-1.5 font-medium">Exam Time Slot</label>
                            <input
                                type="text"
                                name="timeSlot"
                                value={form.timeSlot}
                                onChange={handleChange}
                                placeholder="e.g. 10:00 AM - 11:30 AM"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
                            />
                        </div>

                        <div className="md:col-span-4">
                            <label className="block text-gray-400 mb-1.5 font-medium">Remarks</label>
                            <input
                                type="text"
                                name="remarks"
                                value={form.remarks}
                                onChange={handleChange}
                                placeholder="Any additional notes"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
                            />
                        </div>
                    </div>
                </div>

                {/* 4. Course Fee & Payment Collection */}
                <div className="bg-gradient-to-br from-gray-900/90 to-purple-950/40 border border-purple-800/40 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                        <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                            <FaMoneyBillWave /> 4. PMO Fee & Payment Collection (₹100 Course Fee)
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">Standard Course Fee: <strong className="text-white">₹100</strong></span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                        {/* Discount / Waiver Input */}
                        <div className="bg-gray-950/80 p-4 rounded-xl border border-gray-800 space-y-2">
                            <label className="block text-gray-300 font-semibold flex items-center gap-1.5">
                                <FaTag className="text-amber-400" /> Discount / Waiver (₹)
                            </label>
                            <input
                                type="number"
                                name="waiver"
                                min={0}
                                max={100}
                                value={paymentForm.waiver}
                                onChange={handlePaymentChange}
                                placeholder="0 - 100 (e.g. 20 for ₹20 discount)"
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-amber-300 font-bold placeholder-gray-600 focus:outline-none focus:border-amber-400 transition"
                            />
                            <div className="flex justify-between text-[11px] text-gray-400 pt-1">
                                <span>Gross: ₹{GROSS_FEE}</span>
                                <span>Discount: -₹{waiverNum}</span>
                                <span className="font-bold text-emerald-400">Net: ₹{netPayable}</span>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="bg-gray-950/80 p-4 rounded-xl border border-gray-800 space-y-2">
                            <label className="block text-gray-300 font-semibold">Payment Method</label>
                            <select
                                name="paymentMethod"
                                value={paymentForm.paymentMethod}
                                onChange={handlePaymentChange}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-200 focus:outline-none focus:border-purple-500 transition"
                            >
                                {PAYMENT_METHODS.map(m => (
                                    <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Received Date */}
                        <div className="bg-gray-950/80 p-4 rounded-xl border border-gray-800 space-y-2">
                            <label className="block text-gray-300 font-semibold">Payment Received Date <span className="text-rose-500">*</span></label>
                            <input
                                type="date"
                                name="receivedDate"
                                value={paymentForm.receivedDate}
                                onChange={handlePaymentChange}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-200 focus:outline-none focus:border-purple-500 transition"
                            />
                            {errors.receivedDate && <p className="text-rose-400 text-[11px] mt-1">{errors.receivedDate}</p>}
                        </div>

                        {/* Transaction ID if non-cash */}
                        {paymentForm.paymentMethod !== 'CASH' && (
                            <div>
                                <label className="block text-gray-400 mb-1.5 font-medium">Transaction ID / UTR / Reference <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    name="transactionId"
                                    value={paymentForm.transactionId}
                                    onChange={handlePaymentChange}
                                    placeholder="Enter Transaction Ref"
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition font-mono"
                                />
                                {errors.transactionId && <p className="text-rose-400 text-[11px] mt-1">{errors.transactionId}</p>}
                            </div>
                        )}

                        {/* Account Holder Name */}
                        {paymentForm.paymentMethod !== 'CASH' && (
                            <div>
                                <label className="block text-gray-400 mb-1.5 font-medium">Account / Remitter Name</label>
                                <input
                                    type="text"
                                    name="accountHolderName"
                                    value={paymentForm.accountHolderName}
                                    onChange={handlePaymentChange}
                                    placeholder="Payer Name"
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-4 pt-4">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl transition"
                    >
                        Reset Form
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition transform active:scale-95"
                    >
                        {submitting ? <FaSpinner className="animate-spin text-sm" /> : <FaSave className="text-sm" />}
                        {submitting ? 'Registering...' : `Register & Collect ₹${netPayable}`}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PMOAddStudentContent;
