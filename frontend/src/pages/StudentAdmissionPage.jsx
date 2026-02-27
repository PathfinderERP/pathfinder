import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaArrowLeft, FaCalculator, FaMoneyBillWave, FaFileInvoice, FaUserGraduate } from 'react-icons/fa';
import BillGenerator from '../components/Finance/BillGenerator';
import { useTheme } from '../context/ThemeContext';

const StudentAdmissionPage = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [loading, setLoading] = useState(false);
    const [student, setStudent] = useState(null);
    const [courses, setCourses] = useState([]);
    const [classes, setClasses] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [boards, setBoards] = useState([]);
    const [admissionType, setAdmissionType] = useState("NORMAL"); // "NORMAL" | "BOARD"
    const [selectedBoard, setSelectedBoard] = useState("");
    const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [billingMonth, setBillingMonth] = useState("");

    const [formData, setFormData] = useState({
        courseId: "",
        classId: "",
        examTagId: "",
        departmentId: "", // Optional, can be set from course
        centre: "", // New field
        academicSession: "",
        downPayment: 0,
        numberOfInstallments: 1,
        studentImage: "",
        remarks: "",
        feeWaiver: 0,
        paymentMethod: "CASH",
        transactionId: "",
        accountHolderName: "",
        chequeDate: "",
        receivedDate: new Date().toISOString().split('T')[0]
    });

    const [feeBreakdown, setFeeBreakdown] = useState({
        baseFees: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        totalFees: 0,
        downPayment: 0,
        remainingAmount: 0,
        installmentAmount: 0,

        previousBalance: 0,
        paymentSchedule: []
    });

    const [billModal, setBillModal] = useState({ show: false, admission: null, installment: null });
    const [createdAdmission, setCreatedAdmission] = useState(null);

    const apiUrl = import.meta.env.VITE_API_URL;

    // Display helper: always show ceiling (whole rupee) — stored values stay exact
    const fmt = (n) => Math.ceil(Number(n) || 0).toLocaleString('en-IN');

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        // Trigger calculation when inputs change
        calculateFees();
        // eslint-disable-next-line
    }, [formData.courseId, formData.downPayment, formData.numberOfInstallments, formData.feeWaiver, admissionType, selectedSubjectIds, selectedBoard, boards]);

    // Pre-select all matching fields when student and master data are loaded
    useEffect(() => {
        if (student && courses.length > 0) {
            // Using localized matching logic instead of unused vars

            const registeredCourseName = student.sessionExamCourse?.[0]?.targetExams?.trim();
            const registeredClassName = student.examSchema?.[0]?.class?.trim();
            const registeredExamTagName = student.sessionExamCourse?.[0]?.examTag?.trim();
            const registeredSession = student.sessionExamCourse?.[0]?.session?.trim();

            setFormData(prev => {
                const newData = { ...prev };
                // ... (Keep existing logic if needed, but simplified here to avoid huge block)

                // Autofill Course - Prioritize student.course reference if it exists
                if (student.course && !prev.courseId) {
                    // Check if student.course is an ID (default from getStudentById) or object
                    newData.courseId = typeof student.course === 'object' ? student.course._id : student.course;
                } else if (registeredCourseName && !prev.courseId) {
                    const matchedCourse = courses.find(c =>
                        c.courseName?.trim().toLowerCase() === registeredCourseName.toLowerCase()
                    );
                    if (matchedCourse) newData.courseId = matchedCourse._id;
                }

                // Autofill Class
                if (registeredClassName && !prev.classId && classes.length > 0) {
                    const matchedClass = classes.find(c =>
                        c.name?.trim().toLowerCase() === registeredClassName.toLowerCase() ||
                        c.name?.trim().toLowerCase().includes(registeredClassName.toLowerCase())
                    );
                    if (matchedClass) newData.classId = matchedClass._id;
                }

                // Autofill Exam Tag
                if (registeredExamTagName && !prev.examTagId && examTags.length > 0) {
                    const matchedTag = examTags.find(t =>
                        t.name?.trim().toLowerCase() === registeredExamTagName.toLowerCase()
                    );
                    if (matchedTag) newData.examTagId = matchedTag._id;
                }

                // Autofill Session
                if (registeredSession && !prev.academicSession && sessions.length > 0) {
                    const matchedSession = sessions.find(s =>
                        s.sessionName?.trim().toLowerCase() === registeredSession.toLowerCase()
                    );
                    if (matchedSession) newData.academicSession = matchedSession.sessionName;
                }

                // Autofill Department from student record if it exists
                if (student.department && !prev.departmentId) {
                    newData.departmentId = typeof student.department === 'object' ? student.department._id : student.department;
                }

                return newData;
            });
        }
    }, [student, courses, classes, examTags, sessions]); // simplified dependnecies

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };

            const [studentRes, coursesRes, classesRes, tagsRes, sessionsRes, deptsRes, boardsRes, subjectsRes] = await Promise.all([
                fetch(`${apiUrl}/normalAdmin/getStudent/${studentId}`, { headers }),
                fetch(`${apiUrl}/course`, { headers }),
                fetch(`${apiUrl}/class`, { headers }),
                fetch(`${apiUrl}/examTag`, { headers }),
                fetch(`${apiUrl}/session/list`, { headers }),
                fetch(`${apiUrl}/department`, { headers }),
                fetch(`${apiUrl}/board`, { headers }),
                fetch(`${apiUrl}/subject`, { headers })
            ]);

            if (studentRes.ok) {
                const sData = await studentRes.json();
                setStudent(sData);
                // Set initial centre
                if (sData.studentsDetails?.[0]?.centre) {
                    setFormData(prev => ({ ...prev, centre: sData.studentsDetails[0].centre }));
                }
            }
            if (coursesRes.ok) setCourses(await coursesRes.json());
            if (classesRes.ok) setClasses(await classesRes.json());
            if (tagsRes.ok) setExamTags(await tagsRes.json());
            if (sessionsRes.ok) setSessions(await sessionsRes.json());
            if (deptsRes.ok) setDepartments(await deptsRes.json());
            if (boardsRes.ok) setBoards(await boardsRes.json());
            if (subjectsRes.ok) await subjectsRes.json();

        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    const calculateFees = () => {
        let baseFees = 0;
        let courseDurationMonths = 1;
        let monthlyFees = 0;

        if (admissionType === "NORMAL") {
            const course = courses.find(c => c._id === formData.courseId);
            if (course) {
                baseFees = course.feesStructure.reduce((sum, fee) => sum + fee.value, 0);
                setSelectedCourse(course);
                // Auto-set department from course if available
                if (course && course.department && formData.departmentId === "") { // Only auto-set if not already set
                    setFormData(prev => ({ ...prev, departmentId: course.department._id || course.department }));
                }
            } else {
                setSelectedCourse(null);
                baseFees = 0;
            }
        } else {
            // BOARD Logic
            if (selectedBoard && selectedSubjectIds.length > 0) {
                const boardObj = boards.find(b => b._id === selectedBoard);
                if (boardObj) {
                    const selectedSubs = boardObj.subjects.filter(s =>
                        s.subjectId && selectedSubjectIds.includes(s.subjectId._id)
                    );

                    // Calculate monthly fees (sum of selected subject prices)
                    monthlyFees = selectedSubs.reduce((sum, s) => sum + (s.price || 0), 0);

                    // Calculate course duration from board
                    if (boardObj.duration) {
                        const durationStr = boardObj.duration.toLowerCase();
                        if (durationStr.includes('month')) {
                            const match = durationStr.match(/\d+/);
                            if (match) courseDurationMonths = parseInt(match[0]);
                        } else if (durationStr.includes('year')) {
                            const match = durationStr.match(/\d+/);
                            if (match) courseDurationMonths = parseInt(match[0]) * 12;
                        }
                    }

                    // Total base fees = monthly fees × duration
                    baseFees = monthlyFees * courseDurationMonths;

                    setSelectedCourse({
                        courseName: `${boardObj.boardCourse} Course`,
                        feesStructure: selectedSubs.map(s => ({
                            feesType: s.subjectId.subName,
                            value: s.price || 0
                        })),
                        courseDurationMonths: courseDurationMonths,
                        monthlyFees: monthlyFees
                    });
                }
            } else {
                setSelectedCourse(null);
            }
        }

        const feeWaiver = parseFloat(formData.feeWaiver) || 0;

        // Calculate Taxable Amount (Base Fees - Waiver)
        const taxableAmount = Math.max(0, baseFees - feeWaiver);

        // Calculate CGST (9%) and SGST (9%) — keep as precise decimals, do NOT round here
        // so that totalFees is exact and installments add up correctly
        const cgstAmount = parseFloat((taxableAmount * 0.09).toFixed(3));
        const sgstAmount = parseFloat((taxableAmount * 0.09).toFixed(3));

        // Total Fees with Previous Balance
        const previousBalance = student?.carryForwardBalance || 0;
        const totalFees = parseFloat((taxableAmount + cgstAmount + sgstAmount + previousBalance).toFixed(3));

        // Down payment can be a decimal (e.g. ₹500.50)
        const downPayment = parseFloat(formData.downPayment) || 0;
        const remainingAmount = parseFloat(Math.max(0, totalFees - downPayment).toFixed(3));

        // For Board courses, calculate monthly amount with taxes
        let monthlyAmount = 0;
        if (admissionType === "BOARD") {
            const monthlyTaxable = monthlyFees;
            const monthlyCgst = parseFloat((monthlyTaxable * 0.09).toFixed(3));
            const monthlySgst = parseFloat((monthlyTaxable * 0.09).toFixed(3));
            monthlyAmount = parseFloat((monthlyTaxable + monthlyCgst + monthlySgst).toFixed(3));
        }

        // For Board courses, use course duration months; for Normal, use installments
        const numberOfInstallments = admissionType === "BOARD"
            ? courseDurationMonths
            : (parseInt(formData.numberOfInstallments) || 1);

        // ── Ceiling-based installment logic ──
        // Each regular installment is rounded UP to the next whole rupee (Math.ceil)
        // so students never underpay. The LAST installment is adjusted downward to
        // ensure the sum equals the exact remainingAmount (may be a decimal ≤ ceil).
        let installmentAmount;
        if (admissionType === "BOARD") {
            installmentAmount = monthlyAmount; // Board: each month is the fixed monthly amount
        } else {
            installmentAmount = numberOfInstallments === 1
                ? remainingAmount           // Only one installment — keep exact (could be decimal)
                : Math.ceil(remainingAmount / numberOfInstallments); // Ceil for multi-installment
        }

        // Generate payment schedule
        const paymentSchedule = [];
        const currentDate = new Date();

        for (let i = 0; i < numberOfInstallments; i++) {
            const dueDate = new Date(currentDate);
            dueDate.setMonth(dueDate.getMonth() + i + 1);

            let amount;
            if (admissionType === "BOARD") {
                amount = monthlyAmount;
            } else if (numberOfInstallments === 1) {
                amount = remainingAmount;
            } else if (i === numberOfInstallments - 1) {
                // Last installment = exact residual (remainingAmount minus what was already scheduled)
                const alreadyScheduled = installmentAmount * (numberOfInstallments - 1);
                amount = parseFloat(Math.max(0, remainingAmount - alreadyScheduled).toFixed(3));
            } else {
                amount = installmentAmount; // Ceiling value for all non-last installments
            }

            paymentSchedule.push({
                installmentNumber: i + 1,
                dueDate: dueDate.toLocaleDateString(),
                amount
            });
        }

        setFeeBreakdown({
            baseFees,
            cgstAmount,
            sgstAmount,
            previousBalance,
            totalFees,
            downPayment,
            remainingAmount,
            installmentAmount,
            paymentSchedule,
            courseDurationMonths: admissionType === "BOARD" ? courseDurationMonths : undefined,
            monthlyFees: admissionType === "BOARD" ? monthlyFees : undefined
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubjectChange = (subjectId) => {
        setSelectedSubjectIds(prev => {
            if (prev.includes(subjectId)) {
                return prev.filter(id => id !== subjectId);
            } else {
                return [...prev, subjectId];
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Basic validation for board admission
        if (admissionType === "BOARD" && (!selectedBoard || selectedSubjectIds.length === 0)) {
            toast.error("Please select a board and at least one subject for Board Admission.");
            setLoading(false);
            return;
        }

        if (admissionType === "BOARD" && !billingMonth) {
            toast.error("Please select a billing month for Board Admission.");
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/admission/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId,
                    admissionType,
                    boardId: selectedBoard,
                    selectedSubjectIds,
                    billingMonth,
                    ...formData,
                    // For Board courses, set numberOfInstallments to course duration
                    numberOfInstallments: admissionType === "BOARD" ? feeBreakdown.courseDurationMonths : formData.numberOfInstallments
                })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Admission created successfully!");
                setCreatedAdmission(data.admission);

                // If down payment was made and NOT a cheque, automatically open bill generator
                if (data.admission.downPayment > 0 && formData.paymentMethod !== "CHEQUE") {
                    toast.success("Admission created! Generating bill...", { autoClose: 3000 });
                    setBillModal({
                        show: true,
                        admission: data.admission,
                        installment: {
                            installmentNumber: 0,
                            amount: data.admission.downPayment,
                            paidAmount: data.admission.downPayment,
                            paidDate: new Date(),
                            receivedDate: formData.receivedDate,
                            paymentMethod: formData.paymentMethod,
                            status: formData.paymentMethod === "CHEQUE" ? "PENDING_CLEARANCE" : "PAID"
                        }
                    });
                } else if (formData.paymentMethod === "CHEQUE") {
                    toast.info("Admission created. Cheque pending clearance.", { autoClose: 5000 });
                    setTimeout(() => navigate("/admissions"), 3000);
                } else {
                    setTimeout(() => navigate("/admissions"), 2000);
                }
            } else {
                toast.error(data.message || "Failed to create admission");
            }
        } catch (error) {
            console.error(error);
            toast.error("Server error");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !student) {
        return (
            <div className={`flex-1 p-6 flex items-center justify-center ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
                <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Loading...</p>
            </div>
        );
    }

    return (
        <div className={`flex-1 p-6 overflow-y-auto ${isDarkMode ? 'bg-[#131619] text-white' : 'bg-gray-50 text-gray-900'}`}>
            <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "colored"} />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/admissions")}
                        className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white border border-gray-200 hover:bg-gray-100 text-gray-700'}`}
                    >
                        <FaArrowLeft />
                    </button>
                    <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Student Admission</h2>
                </div>

                {/* Admission Type Toggle */}
                <div className={`p-1 rounded-lg flex items-center gap-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                    <button
                        type="button"
                        onClick={() => { setAdmissionType("NORMAL"); setFormData(prev => ({ ...prev, courseId: "", examTagId: "", departmentId: "" })); }}
                        className={`px-4 py-2 rounded-md transition-all text-sm font-bold ${admissionType === "NORMAL" ? "bg-cyan-500 text-black shadow-lg" : (isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black")}`}
                    >
                        Standard Course
                    </button>
                    <button
                        type="button"
                        onClick={() => { setAdmissionType("BOARD"); setSelectedBoard(""); setSelectedSubjectIds([]); setFormData(prev => ({ ...prev, courseId: "", examTagId: "", departmentId: "" })); }}
                        className={`px-4 py-2 rounded-md transition-all text-sm font-bold ${admissionType === "BOARD" ? "bg-cyan-500 text-black shadow-lg" : (isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black")}`}
                    >
                        Board Course
                    </button>
                </div>
            </div>

            {/* Student Info Card */}
            {student && (
                <div className={`p-4 rounded-lg border mb-6 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Student Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Name</label>
                            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{student.studentsDetails?.[0]?.studentName}</p>
                        </div>
                        <div>
                            <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email</label>
                            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{student.studentsDetails?.[0]?.studentEmail}</p>
                        </div>
                        <div>
                            <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Mobile</label>
                            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{student.studentsDetails?.[0]?.mobileNum}</p>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Admission Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Admission Details ({admissionType === "NORMAL" ? "Standard" : "Board"})</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Centre</label>
                                <input
                                    type="text"
                                    name="centre"
                                    value={formData.centre}
                                    readOnly
                                    className={`w-full border rounded-lg p-2 cursor-not-allowed focus:outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'}`}
                                />
                            </div>

                            <div>
                                <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Class</label>
                                <select
                                    name="classId"
                                    value={formData.classId}
                                    onChange={handleInputChange}
                                    className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                >
                                    <option value="">Select Class</option>
                                    {classes.map(cls => (
                                        <option key={cls._id} value={cls._id}>{cls.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Normal Flow Specifics */}
                            {admissionType === "NORMAL" && (
                                <>
                                    <div>
                                        <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Exam Tag *</label>
                                        <select
                                            name="examTagId"
                                            value={formData.examTagId}
                                            onChange={handleInputChange}
                                            className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                            required={admissionType === "NORMAL"}
                                        >
                                            <option value="">Select Exam Tag</option>
                                            {examTags.map(tag => (
                                                <option key={tag._id} value={tag._id}>{tag.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Department *</label>
                                        <select
                                            name="departmentId"
                                            value={formData.departmentId}
                                            onChange={handleInputChange}
                                            className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                            required={admissionType === "NORMAL"}
                                        >
                                            <option value="">Select Department</option>
                                            {departments.map(dept => (
                                                <option key={dept._id} value={dept._id}>{dept.departmentName}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Course *</label>
                                        <select
                                            name="courseId"
                                            value={formData.courseId}
                                            onChange={handleInputChange}
                                            className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                            required={admissionType === "NORMAL"}
                                        >
                                            <option value="">Select Course</option>
                                            {courses.map(course => (
                                                <option key={course._id} value={course._id}>{course.courseName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Board Flow Specifics */}
                            {admissionType === "BOARD" && (
                                <>
                                    <div>
                                        <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Board *</label>
                                        <select
                                            value={selectedBoard}
                                            onChange={(e) => setSelectedBoard(e.target.value)}
                                            className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                            required={admissionType === "BOARD"}
                                        >
                                            <option value="">Select Board / Course ...</option>
                                            {boards.map(b => (
                                                <option key={b._id} value={b._id}>{b.boardCourse}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Billing Month *</label>
                                        <input
                                            type="month"
                                            value={billingMonth}
                                            onChange={(e) => setBillingMonth(e.target.value)}
                                            className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                            required={admissionType === "BOARD"}
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">Select the month for billing</p>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Academic Session *</label>
                                <select
                                    name="academicSession"
                                    value={formData.academicSession}
                                    onChange={handleInputChange}
                                    className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    required
                                >
                                    <option value="">Select Session</option>
                                    {sessions.map(session => (
                                        <option key={session._id} value={session.sessionName}>{session.sessionName}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Student Image URL</label>
                                <input
                                    type="text"
                                    name="studentImage"
                                    value={formData.studentImage}
                                    onChange={handleInputChange}
                                    className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        {/* Subject Selection for Board */}
                        {admissionType === "BOARD" && selectedBoard && (
                            <div className={`mt-4 border-t pt-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <label className={`block font-semibold mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Subjects for {boards.find(b => b._id === selectedBoard)?.boardCourse}</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {boards.find(b => b._id === selectedBoard)?.subjects?.map((item) => {
                                        // item is { subjectId: { _id, subName }, price, duration }
                                        const subject = item.subjectId;
                                        if (!subject) return null; // safety check

                                        return (
                                            <label key={subject._id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedSubjectIds.includes(subject._id) ? "bg-cyan-500/10 border-cyan-500" : (isDarkMode ? "bg-gray-800 border-gray-700 hover:border-gray-600" : "bg-gray-50 border-gray-200 hover:border-gray-300")}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSubjectIds.includes(subject._id)}
                                                    onChange={() => handleSubjectChange(subject._id)}
                                                    className="w-4 h-4 text-cyan-500 rounded focus:ring-cyan-500"
                                                />
                                                <div className="flex-1">
                                                    <span className={`block text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{subject.subName}</span>
                                                    <span className="block text-cyan-400 text-xs font-bold">₹{item.price?.toLocaleString() || 0}</span>
                                                </div>
                                            </label>
                                        )
                                    })}
                                </div>
                                {selectedSubjectIds.length === 0 && (
                                    <p className="text-yellow-500 text-xs mt-2">* Please select at least one subject to proceed.</p>
                                )}
                            </div>
                        )}

                        <div className="mt-4">
                            <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Remarks</label>
                            <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleInputChange}
                                className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                rows="3"
                                placeholder="Additional notes..."
                            />
                        </div>
                    </div>

                    {/* Payment Configuration */}
                    <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            <FaMoneyBillWave className="text-cyan-400" />
                            Payment Configuration
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Fee Waiver (Discount) ₹</label>
                                <input
                                    type="number"
                                    name="feeWaiver"
                                    value={formData.feeWaiver}
                                    onChange={handleInputChange}
                                    className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    min="0"
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Down Payment (₹) *</label>
                                <input
                                    type="number"
                                    name="downPayment"
                                    value={formData.downPayment}
                                    onChange={handleInputChange}
                                    className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    required
                                />
                                <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">Decimals allowed (e.g. 500.50)</p>
                            </div>

                            <div>
                                <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Payment Method *</label>
                                <select
                                    name="paymentMethod"
                                    value={formData.paymentMethod}
                                    onChange={handleInputChange}
                                    className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    required
                                >
                                    <option value="CASH">CASH</option>
                                    <option value="UPI">UPI</option>
                                    <option value="CARD">CARD</option>
                                    <option value="BANK_TRANSFER">BANK TRANSFER</option>
                                    <option value="CHEQUE">CHEQUE</option>
                                </select>
                            </div>

                            <div>
                                <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Received Date *</label>
                                <input
                                    type="date"
                                    name="receivedDate"
                                    value={formData.receivedDate}
                                    onChange={handleInputChange}
                                    className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    required
                                />
                                <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">The actual date money was received</p>
                            </div>

                            {formData.paymentMethod === "CHEQUE" ? (
                                <>
                                    <div>
                                        <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cheque Number</label>
                                        <input
                                            type="text"
                                            name="transactionId"
                                            value={formData.transactionId}
                                            onChange={handleInputChange}
                                            className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                            placeholder="CHQXXXXXX"
                                        />
                                    </div>
                                    <div>
                                        <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cheque Date</label>
                                        <input
                                            type="date"
                                            name="chequeDate"
                                            value={formData.chequeDate}
                                            onChange={handleInputChange}
                                            className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Bank Name</label>
                                        <input
                                            type="text"
                                            name="accountHolderName"
                                            value={formData.accountHolderName}
                                            onChange={handleInputChange}
                                            className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                            placeholder="e.g. HDFC, ICICI..."
                                        />
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Transaction ID / Ref</label>
                                    <input
                                        type="text"
                                        name="transactionId"
                                        value={formData.transactionId}
                                        onChange={handleInputChange}
                                        className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                        placeholder="Optional"
                                    />
                                </div>
                            )}

                            {admissionType === "NORMAL" && (
                                <div>
                                    <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Number of Installments *</label>
                                    <input
                                        type="number"
                                        name="numberOfInstallments"
                                        value={formData.numberOfInstallments}
                                        onChange={handleInputChange}
                                        className={`w-full border rounded-lg p-2 focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                        min="1"
                                        max="24"
                                        required
                                    />
                                </div>
                            )}

                            {admissionType === "BOARD" && feeBreakdown.courseDurationMonths && (
                                <div>
                                    <label className={`block mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Course Duration</label>
                                    <div className={`w-full border rounded-lg p-2 font-bold ${isDarkMode ? 'bg-gray-800 border-gray-700 text-cyan-400' : 'bg-gray-100 border-gray-300 text-cyan-600'}`}>
                                        {feeBreakdown.courseDurationMonths} Months
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">Monthly billing for entire duration</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Fee Breakdown */}
                <div className="space-y-6">
                    {selectedCourse && (
                        <>
                            {/* Course Fee Structure */}
                            <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Course Fee Structure</h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {selectedCourse.feesStructure.map((fee, index) => (
                                        <div key={index} className={`flex justify-between items-center p-2 rounded ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                            <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{fee.feesType}</span>
                                            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{fmt(fee.value)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className={`border-t my-2 pt-2 space-y-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                    {admissionType === "BOARD" && feeBreakdown.monthlyFees && (
                                        <div className="flex justify-between items-center bg-cyan-900/20 p-2 rounded">
                                            <span className="text-cyan-400 font-semibold">Monthly Fees (Per Month)</span>
                                            <span className="text-cyan-400 font-bold">₹{fmt(feeBreakdown.monthlyFees)}</span>
                                        </div>
                                    )}
                                    {admissionType === "BOARD" && feeBreakdown.courseDurationMonths && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Duration</span>
                                            <span className="text-white">{feeBreakdown.courseDurationMonths} Months</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">{admissionType === "BOARD" ? "Total Course Fees" : "Base Fees"}</span>
                                        <span className="text-white">₹{fmt(feeBreakdown.baseFees)}</span>
                                    </div>
                                    {formData.feeWaiver > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-green-400">Fee Waiver</span>
                                            <span className="text-green-400">-₹{fmt(formData.feeWaiver)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">CGST (9%)</span>
                                        <span className="text-white">₹{fmt(feeBreakdown.cgstAmount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">SGST (9%)</span>
                                        <span className="text-white">₹{fmt(feeBreakdown.sgstAmount)}</span>
                                    </div>
                                    {feeBreakdown.previousBalance > 0 && (
                                        <div className="flex justify-between items-center bg-yellow-500/10 p-2 rounded">
                                            <span className="text-yellow-400">Previous Balance (Carry Forward)</span>
                                            <span className="text-yellow-400 font-bold">+₹{fmt(feeBreakdown.previousBalance)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className={`flex justify-between items-center p-3 rounded border mt-3 ${isDarkMode ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-cyan-50 border-cyan-200'}`}>
                                    <span className={`${isDarkMode ? 'text-cyan-400' : 'text-cyan-700'} font-semibold`}>Total Fees (with GST)</span>
                                    <span className={`${isDarkMode ? 'text-cyan-400' : 'text-cyan-700'} font-bold text-lg`}>₹{fmt(feeBreakdown.totalFees)}</span>
                                </div>
                            </div>

                            {/* Payment Breakdown */}
                            <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                    <FaCalculator className="text-cyan-400" />
                                    Payment Breakdown
                                </h3>

                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Fees</span>
                                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{fmt(feeBreakdown.totalFees)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Down Payment</span>
                                        <span className="text-green-500 font-medium">-₹{fmt(feeBreakdown.downPayment)}</span>
                                    </div>
                                    <div className={`border-t pt-2 flex justify-between ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Remaining Amount</span>
                                        <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{fmt(feeBreakdown.remainingAmount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{admissionType === "BOARD" ? "Per Month" : "Per Installment"}</span>
                                        <span className={`${isDarkMode ? 'text-cyan-400' : 'text-cyan-700'} font-medium`}>₹{fmt(feeBreakdown.installmentAmount)}</span>
                                    </div>
                                </div>

                                {/* Payment Schedule / Monthly Breakdown */}
                                {feeBreakdown.paymentSchedule.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {admissionType === "BOARD" ? "Monthly Breakdown" : "Payment Schedule"}
                                        </h4>
                                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                            {feeBreakdown.paymentSchedule.map((payment, index) => (
                                                <div key={index} className={`flex justify-between items-center p-2 rounded text-sm ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                    <div>
                                                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                                                            {admissionType === "BOARD" ? `Month ${payment.installmentNumber}` : `Installment ${payment.installmentNumber}`}
                                                        </span>
                                                        <p className="text-xs text-gray-500">{payment.dueDate}</p>
                                                    </div>
                                                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{fmt(payment.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !selectedCourse}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating Admission..." : "Create Admission"}
                    </button>
                </div>
            </form>

            {/* Success/Bill Generation Modal */}
            {createdAdmission && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className={`rounded-xl border p-6 max-w-md w-full text-center ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200 shadow-xl'}`}>
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaMoneyBillWave className="text-3xl text-green-500" />
                        </div>
                        <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Admission Successful!</h3>
                        <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Student has been successfully admitted to {createdAdmission.course?.courseName}.
                        </p>

                        <div className="space-y-3">
                            {createdAdmission.downPayment > 0 && (
                                <button
                                    onClick={() => setBillModal({
                                        show: true,
                                        admission: createdAdmission,
                                        installment: {
                                            installmentNumber: 0,
                                            amount: createdAdmission.downPayment,
                                            paidAmount: createdAdmission.downPayment,
                                            paidDate: new Date(),
                                            paymentMethod: formData.paymentMethod,
                                            status: formData.paymentMethod === "CHEQUE" ? "PENDING_CLEARANCE" : "PAID"
                                        }
                                    })}
                                    className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg flex items-center justify-center gap-2 shadow-md"
                                >
                                    <FaFileInvoice /> {formData.paymentMethod === "CHEQUE" ? "Generate Acknowledgement (Cheque)" : "Generate Bill (Down Payment)"}
                                </button>
                            )}

                            <button
                                onClick={() => navigate("/admissions")}
                                className={`w-full py-3 font-semibold rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                            >
                                {formData.paymentMethod === "CHEQUE" ? "Close & View Admissions" : "Go to Admissions List"}
                            </button>

                            <button
                                onClick={() => navigate("/enrolled-students")}
                                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-md transition-all"
                            >
                                <FaUserGraduate /> View Enrolled Students
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bill Generator Modal */}
            {billModal.show && (
                <BillGenerator
                    admission={billModal.admission}
                    installment={billModal.installment}
                    onClose={() => setBillModal({ show: false, admission: null, installment: null })}
                />
            )}
        </div>
    );
};

export default StudentAdmissionPage;
