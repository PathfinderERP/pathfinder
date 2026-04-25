import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaArrowLeft, FaCalculator, FaMoneyBillWave, FaCalendarAlt, FaUserGraduate, FaCheckCircle, FaTrash } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const BoardCourseAdmissionPage = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [loading, setLoading] = useState(false);
    const [student, setStudent] = useState(null);
    const [boards, setBoards] = useState([]);
    const [selectedBoard, setSelectedBoard] = useState(null);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
    const [durationMonths, setDurationMonths] = useState(0);
    const [totalWaiver, setTotalWaiver] = useState(0);
    const [downPayment, setDownPayment] = useState(0);
    const [billingStartDate, setBillingStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [transactionId, setTransactionId] = useState("");
    const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState("");
    const [academicSession, setAcademicSession] = useState("");
    const [bankName, setBankName] = useState("");
    const [chequeDate, setChequeDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountHolderName, setAccountHolderName] = useState("");
    const [programme, setProgramme] = useState("");
    const [lastClass, setLastClass] = useState("");
    const [classes, setClasses] = useState([]);
    const [admissionFee, setAdmissionFee] = useState(0);
    const [examFee, setExamFee] = useState(0);
    const [paidExamFee, setPaidExamFee] = useState(0);
    const [additionalThingsName, setAdditionalThingsName] = useState("");
    const [additionalThingsAmount, setAdditionalThingsAmount] = useState(0);
    const [paidAdditionalThings, setPaidAdditionalThings] = useState(0);
    const [counselData, setCounselData] = useState(null);
    const [boardCourseSubjects, setBoardCourseSubjects] = useState([]); // Subjects for SPECIFIC Board+Class
    const [allBoardCourseSubjects, setAllBoardCourseSubjects] = useState([]); // All Board+Class mappings

    const apiUrl = import.meta.env.VITE_API_URL;

    // Construct Board Course Name Dynamically: Board + Programme + Session + Subjects
    const getDynamicCourseName = () => {
        if (!selectedBoard) return "";
        const boardName = selectedBoard.boardCourse || "";
        const subNames = boardCourseSubjects
            .filter(s => selectedSubjectIds.includes(s.subjectId?._id || s.subjectId))
            .map(s => (s.subjectId?.subName || s.subjectId?.name || "Subject"))
            .sort()
            .join(" + ");

        let name = `${boardName} Class ${lastClass || ''} ${programme || ''} ${academicSession || ''}`;
        if (programme !== "NCRP") {
            name += ` : ${subNames || 'No Subjects'}`;
        }
        if (additionalThingsName && additionalThingsName.trim() !== "") {
            name += ` + ${additionalThingsName.trim()}`;
        }
        return name;
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            let targetStudentId = studentId;

            // 1. Try to fetch as a counselling record first
            const counselRes = await fetch(`${apiUrl}/board-admission/counsel/${studentId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            let targetBoardId = null;
            let targetSubjectIds = [];
            let fetchedProgramme = "";
            let startingClass = ""; // must be outer scope so it's accessible in all branches

            if (counselRes.ok) {
                const counselRecord = await counselRes.json();
                setCounselData(counselRecord);
                targetStudentId = counselRecord.studentId?._id || counselRecord.studentId;
                fetchedProgramme = counselRecord.programme || "";
                startingClass = counselRecord.lastClass || ""; // assign to outer-scope var
                // Pre-fill from counselling
                if (counselRecord.boardId) {
                    targetBoardId = counselRecord.boardId?._id || counselRecord.boardId;
                    if (counselRecord.selectedSubjects) {
                        targetSubjectIds = counselRecord.selectedSubjects.map(s => s.subjectId?._id || s.subjectId);
                    }
                }
            }

            // 2. Fetch Student, Boards, and Classes
            const fetchPromises = [
                fetch(`${apiUrl}/board`, { headers: { "Authorization": `Bearer ${token}` } }),
                fetch(`${apiUrl}/class`, { headers: { "Authorization": `Bearer ${token}` } }),
                fetch(`${apiUrl}/board-course-subject`, { headers: { "Authorization": `Bearer ${token}` } })
            ];

            // Only fetch student if we have a valid-looking ID
            const isValidStudentId = targetStudentId && targetStudentId !== "null" && targetStudentId.length >= 12;
            if (isValidStudentId) {
                fetchPromises.unshift(fetch(`${apiUrl}/normalAdmin/getStudent/${targetStudentId}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                }));
            }

            const results = await Promise.all(fetchPromises);

            let studentRes, boardsRes, classesRes, allBCSRes;
            if (isValidStudentId) {
                [studentRes, boardsRes, classesRes, allBCSRes] = results;
            } else {
                [boardsRes, classesRes, allBCSRes] = results;
                studentRes = { ok: false }; // Mock failure if ID was invalid
            }

            const studentData = (studentRes && studentRes.ok) ? await studentRes.json() : null;
            const boardsData = await boardsRes.json();
            const classesData = await (classesRes.ok ? classesRes.json() : Promise.resolve([]));
            const allBCSData = await (allBCSRes?.ok ? allBCSRes.json() : Promise.resolve([]));

            if (studentRes.ok) {
                setStudent(studentData);
                // Priority: console session > student details session
                const sessionFromConsole = studentData?.sessionExamCourse?.[0]?.session;
                const sessionFromDetails = studentData?.studentsDetails?.[0]?.academicSession;

                if (sessionFromConsole) {
                    setAcademicSession(sessionFromConsole);
                } else if (sessionFromDetails) {
                    setAcademicSession(sessionFromDetails);
                }

                if (!fetchedProgramme) {
                    fetchedProgramme = studentData?.studentsDetails?.[0]?.programme || "";
                }
                setProgramme(fetchedProgramme);

                // If no class from counselling record, try student profile
                if (!startingClass) {
                    startingClass = studentData?.examSchema?.[0]?.class || studentData?.studentsDetails?.[0]?.lastClass || "";
                }
                setLastClass(startingClass);
            }
            if (classesRes.ok) {
                setClasses(classesData);
            }
            if (allBCSRes?.ok) {
                setAllBoardCourseSubjects(allBCSData);
            }
            if (boardsRes.ok) {
                setBoards(boardsData);

                // 1. Priority: Pre-fill from counselling
                if (targetBoardId) {
                    const matched = boardsData.find(b => b._id === targetBoardId);
                    if (matched) {
                        setSelectedBoard(matched);
                        // Don't pre-set subject IDs here; let Board+Class fetch handle it
                        // We'll trigger subject fetch after this block
                    }
                }
                // 2. Fallback: Pre-fill from student registration board
                else if (studentData?.studentsDetails?.[0]?.board) {
                    const matchedBoard = boardsData.find(b =>
                        b.boardCourse.toLowerCase() === studentData.studentsDetails[0].board.toLowerCase()
                    );
                    if (matchedBoard) {
                        setSelectedBoard(matchedBoard);
                    }
                }
            }

            // After boards+classes+student all loaded, trigger subject fetch if both board and class are known
            const finalBoardId = targetBoardId ||
                boardsData.find(b => b.boardCourse.toLowerCase() === (studentData?.studentsDetails?.[0]?.board || "").toLowerCase())?._id;
            const finalClass = startingClass;
            if (finalBoardId && finalClass && classesData.length > 0) {
                const classObj = classesData.find(c => (c.name || c.className) === finalClass || c._id === finalClass);
                if (classObj) {
                    const token2 = localStorage.getItem("token");
                    const subRes = await fetch(`${apiUrl}/board-course-subject/by-board-class?boardId=${finalBoardId}&classId=${classObj._id}`, {
                        headers: { "Authorization": `Bearer ${token2}` }
                    });
                    if (subRes.ok) {
                        const subData = await subRes.json();
                        if (subData && subData.subjects) {
                            setBoardCourseSubjects(subData.subjects);
                            // Pre-select subjects that were in the counselling record
                            if (targetSubjectIds.length > 0) {
                                const counselSubIds = subData.subjects
                                    .filter(s => targetSubjectIds.some(tid => tid === (s.subjectId?._id?.toString() || s.subjectId?.toString())))
                                    .map(s => s.subjectId?._id?.toString() || s.subjectId?.toString());
                                setSelectedSubjectIds(counselSubIds);
                            }
                        }
                    }
                }
            }

        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    // Fetch subjects from Board Course Subject master data when both board and class are selected
    const fetchSubjectsByBoardAndClass = async (boardId, classId) => {
        if (!boardId || !classId) {
            setBoardCourseSubjects([]);
            setSelectedSubjectIds([]);
            return;
        }
        try {
            const token = localStorage.getItem("token");
            // Find classId by matching class name or ID
            const classObj = classes.find(c => (c.name || c.className) === classId || c._id === classId);
            if (!classObj) {
                setBoardCourseSubjects([]);
                setSelectedSubjectIds([]);
                return;
            }
            const res = await fetch(`${apiUrl}/board-course-subject/by-board-class?boardId=${boardId}&classId=${classObj._id}`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.subjects) {
                    setBoardCourseSubjects(data.subjects); // [{subjectId:{_id,subName,...}, amount:500}, ...]
                } else {
                    setBoardCourseSubjects([]);
                    toast.warn("No subjects configured for this Board + Class combination in Master Data");
                }
            } else {
                setBoardCourseSubjects([]);
            }
        } catch (err) {
            console.error("Error fetching board course subjects:", err);
            setBoardCourseSubjects([]);
        }
        setSelectedSubjectIds([]); // Always reset selections when board/class combo changes
    };

    const handleBoardChange = (e) => {
        const boardId = e.target.value;
        const board = boards.find(b => b._id === boardId);
        setSelectedBoard(board || null);
        setSelectedSubjectIds([]);
        setBoardCourseSubjects([]);
        if (board && lastClass) {
            fetchSubjectsByBoardAndClass(board._id, lastClass);
        }
    };

    const handleClassChange = (e) => {
        const cls = e.target.value;
        setLastClass(cls);
        setSelectedSubjectIds([]);
        setBoardCourseSubjects([]);
        if (selectedBoard && cls) {
            fetchSubjectsByBoardAndClass(selectedBoard._id, cls);
        }
    };

    const toggleSubject = (subjectId) => {
        setSelectedSubjectIds(prev =>
            prev.includes(subjectId)
                ? prev.filter(id => id !== subjectId)
                : [...prev, subjectId]
        );
    };

    const calculateMonthlyFee = () => {
        if (programme === "NCRP") return 0;
        // Use Board Course Subject master prices, NOT the old Board.subjects prices
        return boardCourseSubjects
            .filter(s => selectedSubjectIds.includes(s.subjectId?._id?.toString() || s.subjectId?.toString()))
            .reduce((sum, s) => sum + (s.amount || 0), 0);
    };

    const monthlyFee = calculateMonthlyFee();
    const monthlyWaiver = (totalWaiver > 0 && durationMonths > 0) ? (totalWaiver / durationMonths) : 0;
    const netMonthly = Math.max(0, monthlyFee - monthlyWaiver);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!student?._id) {
            return toast.error("Student profile not found. Cannot process admission.");
        }
        if (!selectedBoard) {
            return toast.error("Please select a board");
        }
        if (programme !== "NCRP" && selectedSubjectIds.length === 0) {
            return toast.error("Please select at least one subject");
        }
        if (!lastClass) {
            return toast.error("Please select the student's last class");
        }

        if (paymentMethod === "CHEQUE") {
            if (!bankName || !transactionId || !accountHolderName || !chequeDate) {
                return toast.error("Please fill all bank details for Cheque payment");
            }
        }

        if ((paymentMethod === "ONLINE" || paymentMethod === "UPI") && !transactionId) {
            return toast.error(`Please provide Transaction ID for ${paymentMethod === "ONLINE" ? "Online" : "UPI"} payment`);
        }

        if (paymentMethod === "BANK_TRANSFER" && !transactionId) {
            return toast.error("Please provide Transaction Reference for Bank Transfer");
        }


        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/board-admission/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId: student?._id, // Must use actual Student Profile ID, NOT the Counselling ID from the URL params
                    studentName: student?.studentsDetails?.[0]?.studentName,
                    mobileNum: student?.studentsDetails?.[0]?.mobileNum,
                    boardId: selectedBoard._id,
                    selectedSubjectIds,
                    totalDurationMonths: Number(durationMonths),
                    totalWaiver: Number(totalWaiver),
                    downPayment: Number(downPayment),
                    billingStartDate,
                    receivedDate,
                    paymentMethod,
                    transactionId,
                    bankName,
                    accountHolderName,
                    chequeDate,
                    admissionFee: Number(admissionFee),
                    examFee: Number(examFee),
                    paidExamFee: Number(paidExamFee),
                    additionalThingsName: additionalThingsName.trim(),
                    additionalThingsAmount: Number(additionalThingsAmount),
                    paidAdditionalThings: Number(paidAdditionalThings),
                    remarks,
                    academicSession,
                    programme,
                    lastClass,
                    centre: counselData?.centre || student?.studentsDetails?.[0]?.centre
                })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success("Board Admission processed successfully!");
                setTimeout(() => navigate(`/board-admissions?tab=Enrolled`), 1000);
            } else {
                toast.error(data.message || "Something went wrong");
            }
        } catch (error) {
            toast.error("Failed to submit admission");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !student) {
        return <div className="p-10 text-center">Loading...</div>;
    }

    return (
        <div className={`flex-1 p-6 overflow-y-auto ${isDarkMode ? 'bg-[#131619] text-white' : 'bg-gray-50 text-gray-900'}`}>
            <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "colored"} />

            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white border border-gray-200 hover:bg-gray-100 text-gray-700'}`}
                >
                    <FaArrowLeft />
                </button>
                <div>
                    <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Board Course Admission</h2>
                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Enrollment & Fee Structure Setup</p>
                </div>
            </div>

            {student && (
                <div className={`p-8 rounded-xl border mb-8 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-black text-2xl border ${isDarkMode ? 'border-gray-800 bg-gradient-to-br from-cyan-900 to-blue-900' : 'border-gray-200 bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md text-white'}`}>
                            {(student.studentsDetails?.[0]?.studentName || counselData?.studentName || "S").charAt(0)}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-black uppercase">{counselData?.studentName || student?.studentsDetails?.[0]?.studentName}</h3>
                                    <div className="flex flex-wrap gap-4 mt-2">
                                        <span className="text-[10px] font-black text-white px-2 py-0.5 rounded bg-cyan-600 tracking-wider">UID: {(student._id || "").toString().slice(-8).toUpperCase()}</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Centre: {counselData?.centre || student.studentsDetails?.[0]?.centre}</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mobile: {counselData?.mobileNum || student.studentsDetails?.[0]?.mobileNum}</span>
                                    </div>
                                </div>
                                <div className={`p-4 rounded-xl border-2 border-dashed transition-all duration-500 ${isDarkMode ? 'border-cyan-500/20 bg-cyan-500/5' : 'border-cyan-200 bg-cyan-50'} max-w-[60%]`}>
                                    <p className="text-[9px] font-black uppercase text-cyan-500 mb-1 tracking-widest">Enrolled Course Logic</p>
                                    <h4 className={`text-xs font-black uppercase tracking-tight leading-relaxed ${isDarkMode ? 'text-cyan-100' : 'text-cyan-900'}`}>
                                        {getDynamicCourseName() || "Awaiting Selection..."}
                                    </h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Section */}
                <div className="lg:col-span-2 space-y-8">
                    <div className={`p-8 rounded-xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex items-center gap-3 mb-6">
                            <FaUserGraduate className="text-cyan-500" />
                            <h4 className="text-sm font-black uppercase tracking-widest">Board & Subject Selection</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Select Board</label>
                                <select
                                    value={selectedBoard?._id || ""}
                                    onChange={handleBoardChange}
                                    className={`w-full p-3 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                    required
                                >
                                    <option value="">-- Choose Board --</option>
                                    {boards.map((b, idx) => (
                                        <option key={b._id || idx} value={b._id}>{b.boardCourse}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Billing Start Date</label>
                                <input
                                    type="date"
                                    value={billingStartDate}
                                    onChange={(e) => setBillingStartDate(e.target.value)}
                                    className={`w-full p-3 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Received Date (Actual Payment)</label>
                                <input
                                    type="date"
                                    value={receivedDate}
                                    onChange={(e) => setReceivedDate(e.target.value)}
                                    className={`w-full p-3 rounded-lg border outline-none font-black text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                    required
                                />
                                <p className="text-[9px] text-gray-500 mt-1 uppercase font-black italic">The actual date money was collected</p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Academic Session</label>
                                <input
                                    type="text"
                                    value={academicSession}
                                    onChange={(e) => setAcademicSession(e.target.value)}
                                    placeholder="e.g. 2026-27"
                                    className={`w-full p-3 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Programme *</label>
                                <select
                                    value={programme}
                                    onChange={(e) => setProgramme(e.target.value)}
                                    className={`w-full p-3 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                    required
                                >
                                    <option value="">-- Choose Programme --</option>
                                    <option value="CRP">CRP</option>
                                    <option value="NCRP">NCRP</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Last Class *</label>
                                <select
                                    value={lastClass}
                                    onChange={handleClassChange}
                                    className={`w-full p-3 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                    required
                                >
                                    <option value="">-- Choose Class --</option>
                                    {classes
                                        .filter(c => !selectedBoard || allBoardCourseSubjects.some(bcs =>
                                            (bcs.boardId?._id || bcs.boardId) === selectedBoard._id &&
                                            (bcs.classId?._id === c._id || (bcs.classId?.name || bcs.classId?.className) === (c.name || c.className))
                                        ))
                                        .map(c => <option key={c._id} value={c.name || c.className}>{(c.name || c.className).toUpperCase()}</option>)}
                                </select>
                            </div>
                        </div>

                        {selectedBoard && programme !== "NCRP" && (
                            <div className="animate-fadeIn">
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-4">
                                    Available Subjects — {selectedBoard.boardCourse}{lastClass ? ` | Class ${lastClass}` : " (Select a class to load subjects)"}
                                </label>
                                {!lastClass ? (
                                    <p className="text-xs text-gray-500 italic">⬆ Please select a class above to view available subjects.</p>
                                ) : boardCourseSubjects.length === 0 ? (
                                    <p className="text-xs text-amber-500 italic">No subjects configured for {selectedBoard.boardCourse} Class {lastClass} in Board Course Master Data.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {boardCourseSubjects.map((s, idx) => {
                                            const subId = s.subjectId?._id?.toString() || s.subjectId?.toString();
                                            const isSelected = selectedSubjectIds.includes(subId);
                                            return (
                                                <div
                                                    key={subId || idx}
                                                    onClick={() => toggleSubject(subId)}
                                                    className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${isSelected
                                                            ? 'border-cyan-500 bg-cyan-500/5'
                                                            : isDarkMode ? 'border-gray-800 bg-[#131619] hover:border-gray-700' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-300'
                                                            }`}>
                                                            {isSelected && <FaCheckCircle className="text-white text-[10px]" />}
                                                        </div>
                                                        <span className="text-xs font-bold uppercase">{s.subjectId?.subName || "—"}</span>
                                                    </div>
                                                    <span className={`text-xs font-black ${isSelected ? 'text-cyan-500' : 'text-gray-400'}`}>₹{s.amount}/mo</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                        {selectedBoard && programme === "NCRP" && (
                            <div className={`p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center animate-fadeIn ${isDarkMode ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-200 bg-amber-50'}`}>
                                <div className="text-3xl mb-3">📋</div>
                                <h4 className={`text-sm font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>NCRP Programme Active</h4>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center">Subject selection are not mandatory for Non-Course Room Programmes</p>
                            </div>
                        )}
                    </div>

                    <div className={`p-8 rounded-xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex items-center gap-3 mb-6">
                            <FaCalendarAlt className="text-cyan-500" />
                            <h4 className="text-sm font-black uppercase tracking-widest">Duration & Waivers</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex-1">
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Total Duration (Months)</label>
                                <input
                                    type="number"
                                    min={programme === "NCRP" ? "0" : "1"}
                                    max="60"
                                    value={durationMonths}
                                    onChange={(e) => setDurationMonths(e.target.value)}
                                    className={`w-full p-3 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                    placeholder="Enter duration in months"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Waiver / Discount Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                    <input
                                        type="number"
                                        value={totalWaiver}
                                        onChange={(e) => setTotalWaiver(e.target.value)}
                                        className={`w-full pl-8 pr-4 py-3 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                        placeholder="0"
                                    />
                                </div>
                                <p className="text-[9px] text-gray-500 font-bold mt-2 uppercase italic opacity-60">
                                    * This will be divided equally over {durationMonths} months (₹{(durationMonths > 0 ? (totalWaiver / durationMonths) : 0).toFixed(2)}/mo)
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className={`p-8 rounded-xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex items-center gap-3 mb-6">
                            <FaMoneyBillWave className="text-cyan-500" />
                            <h4 className="text-sm font-black uppercase tracking-widest">Initial Payment (Down Payment)</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-500 mb-2 tracking-widest">Down Payment Amount</label>
                                <input
                                    type="number"
                                    value={downPayment}
                                    onChange={(e) => setDownPayment(e.target.value)}
                                    className={`w-full p-4 rounded-lg border outline-none font-black text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                    placeholder="Enter amount paid today"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-500 mb-2 tracking-widest">Payment Method</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className={`w-full p-4 rounded-lg border outline-none font-black text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                >
                                    <option value="CASH">CASH</option>
                                    <option value="ONLINE">ONLINE / CARD</option>
                                    <option value="UPI">UPI</option>
                                    <option value="BANK_TRANSFER">BANK TRANSFER</option>
                                    <option value="CHEQUE">CHEQUE</option>
                                </select>
                            </div>
                        </div>

                        {/* Conditional Payment Fields */}
                        {(paymentMethod === "ONLINE" || paymentMethod === "UPI" || paymentMethod === "BANK_TRANSFER") && (
                            <div className="mt-6 animate-fadeIn">
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">
                                    {paymentMethod === "ONLINE" ? "Transaction ID" : paymentMethod === "UPI" ? "Transaction ID" : "Bank Reference Number"}
                                </label>
                                <input
                                    type="text"
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    className={`w-full p-3 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                    placeholder={paymentMethod === "ONLINE" ? "Enter Online/Card Transaction ID" : paymentMethod === "UPI" ? "Enter UPI Transaction Reference" : "Enter Bank Transfer Reference"}
                                    required
                                />
                            </div>
                        )}


                        {paymentMethod === "CHEQUE" && (
                            <div className="mt-6 space-y-4 animate-fadeIn">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Bank Name</label>
                                        <input
                                            type="text"
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            className={`w-full p-3 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                            placeholder="e.g. SBI, HDFC"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Cheque Number</label>
                                        <input
                                            type="text"
                                            value={transactionId}
                                            onChange={(e) => setTransactionId(e.target.value)}
                                            className={`w-full p-3 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                            placeholder="6-digit Cheque No"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Account Holder Name</label>
                                        <input
                                            type="text"
                                            value={accountHolderName}
                                            onChange={(e) => setAccountHolderName(e.target.value)}
                                            className={`w-full p-3 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                            placeholder="Name as on Cheque"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Cheque Date</label>
                                        <input
                                            type="date"
                                            value={chequeDate}
                                            onChange={(e) => setChequeDate(e.target.value)}
                                            className={`w-full p-3 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Calculation & Submit Section */}
                <div className="space-y-6">
                    <div className={`p-8 rounded-xl border flex flex-col h-fit sticky top-6 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex items-center gap-3 mb-8">
                            <FaCalculator className="text-cyan-500" />
                            <h4 className="text-sm font-black uppercase tracking-widest">Fee Summary</h4>
                        </div>

                        <div className="space-y-6 flex-1">
                            {/* Inputs for Fees - Moved to right side for better focus */}
                            <div className="p-5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 space-y-6 shadow-xl shadow-cyan-500/5">
                                <h5 className="text-xs font-black text-cyan-500 uppercase tracking-[0.2em] mb-4">Board & Enrollment Fee Config</h5>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className={`block text-[11px] font-black uppercase mb-2 leading-tight ${isDarkMode ? 'text-gray-400' : 'text-cyan-800/80'}`}>Board Registration / Admission Fee</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                                            <input
                                                type="number"
                                                value={admissionFee}
                                                onChange={(e) => setAdmissionFee(e.target.value)}
                                                className={`w-full pl-8 pr-3 py-3 rounded-lg border outline-none font-black text-base transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500 text-right' : 'bg-white border-gray-200 focus:border-cyan-500 text-right'}`}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`block text-[11px] font-black uppercase mb-2 leading-tight ${isDarkMode ? 'text-gray-400' : 'text-cyan-800/80'}`}>Total Examination & Practical Fee</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                                            <input
                                                type="number"
                                                value={examFee}
                                                onChange={(e) => setExamFee(e.target.value)}
                                                className={`w-full pl-8 pr-3 py-3 rounded-lg border outline-none font-black text-base transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500 text-right' : 'bg-white border-gray-200 focus:border-cyan-500 text-right'}`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block text-[11px] font-black uppercase mb-2 leading-tight ${isDarkMode ? 'text-gray-400' : 'text-cyan-800/80'}`}>Additional Things (Name)</label>
                                        <input
                                            type="text"
                                            value={additionalThingsName}
                                            onChange={(e) => setAdditionalThingsName(e.target.value)}
                                            placeholder="e.g. CAPSUL/MOCK"
                                            className={`w-full px-3 py-3 rounded-lg border outline-none font-black text-base transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 focus:border-cyan-500'}`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-[11px] font-black uppercase mb-2 leading-tight ${isDarkMode ? 'text-gray-400' : 'text-cyan-800/80'}`}>Additional Things (Amount)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                                            <input
                                                type="number"
                                                value={additionalThingsAmount}
                                                onChange={(e) => setAdditionalThingsAmount(e.target.value)}
                                                className={`w-full pl-8 pr-3 py-3 rounded-lg border outline-none font-black text-base transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500 text-right' : 'bg-white border-gray-200 focus:border-cyan-500 text-right'}`}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-cyan-500/20 grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-cyan-400 mb-3 leading-tight italic tracking-wider">Exam Fee Collected Today</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 font-black text-lg">₹</span>
                                            <input
                                                type="number"
                                                value={paidExamFee}
                                                onChange={(e) => setPaidExamFee(e.target.value)}
                                                className={`w-full pl-10 pr-6 py-4 rounded-lg border outline-none font-black text-xl transition-all ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/30 text-white focus:border-cyan-500' : 'bg-cyan-50 border-cyan-200 focus:border-cyan-500 shadow-sm'}`}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-cyan-400 mb-3 leading-tight italic tracking-wider">Additional Fee Collected Today</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 font-black text-lg">₹</span>
                                            <input
                                                type="number"
                                                value={paidAdditionalThings}
                                                onChange={(e) => setPaidAdditionalThings(e.target.value)}
                                                className={`w-full pl-10 pr-6 py-4 rounded-lg border outline-none font-black text-xl transition-all ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/30 text-white focus:border-cyan-500' : 'bg-cyan-50 border-cyan-200 focus:border-cyan-500 shadow-sm'}`}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <p className="text-[10px] text-gray-500 font-black uppercase italic opacity-80 tracking-widest leading-relaxed">
                                        * Note: A separate payment receipt will be generated for the examination & additional fee collection.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 space-y-3">
                                <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-none">Monthly Fees</span>
                                    <span className={`text-sm font-black italic leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{monthlyFee}</span>
                                </div>
                                <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-none">Monthly Waiver</span>
                                    <span className="text-sm font-black text-red-500 italic leading-none">- ₹{monthlyWaiver.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.2em] leading-none">Expected Amount</span>
                                    <span className={`text-lg font-black italic leading-none ${isDarkMode ? 'text-white' : 'text-cyan-600'}`}>₹{((monthlyFee - monthlyWaiver) * durationMonths + Number(admissionFee) + Number(examFee) + Number(additionalThingsAmount)).toFixed(0)}</span>
                                </div>
                            </div>

                            <div className={`mt-8 p-6 rounded-2xl space-y-4 border ${isDarkMode ? 'bg-gradient-to-br from-black/40 to-black/20 border-white/5' : 'bg-white border-gray-200 shadow-md'}`}>
                                <div className="flex justify-between items-center">
                                    <span className={`text-[11px] font-bold uppercase italic leading-none ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Month 1 Owed (Tuit + Adm)</span>
                                    <span className="text-lg font-black text-amber-500 italic leading-none">
                                        ₹{(netMonthly + Number(admissionFee)).toFixed(0)}
                                    </span>
                                </div>

                                <div className={`flex justify-between items-center pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
                                    <span className={`text-[11px] font-bold uppercase tracking-[0.1em] leading-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Paid Today (Tuit/Adm)</span>
                                    <span className="text-xl font-black text-green-500 italic leading-none">₹{downPayment}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className={`text-[11px] font-bold uppercase tracking-[0.1em] leading-none ${isDarkMode ? 'text-cyan-500' : 'text-cyan-600'}`}>Paid Today (Exam)</span>
                                    <span className={`text-xl font-black italic leading-none ${isDarkMode ? 'text-cyan-400' : 'text-cyan-500'}`}>₹{paidExamFee}</span>
                                </div>

                                <div className={`flex justify-between items-center pt-4 border-t-2 border-dashed ${isDarkMode ? 'border-cyan-500/30' : 'border-cyan-200'}`}>
                                    <span className={`text-[12px] font-black uppercase italic tracking-[0.3em] leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>TOTAL PAYMENT</span>
                                    <span className={`text-3xl font-black italic leading-none ${isDarkMode ? 'text-white bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent' : 'text-cyan-600'}`}>₹{Number(downPayment) + Number(paidExamFee) + Number(paidAdditionalThings)}</span>
                                </div>

                                <div className="flex justify-between items-center pt-4">
                                    <span className={`text-[11px] font-bold uppercase leading-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Month 2 Payable</span>
                                    <span className={`text-lg font-black italic leading-none ${(netMonthly + (netMonthly + Number(admissionFee) - downPayment)) < 0 ? 'text-green-500' : 'text-cyan-500'}`}>
                                        ₹{Math.max(0, netMonthly + (netMonthly + Number(admissionFee) - downPayment)).toFixed(0)}
                                    </span>
                                </div>

                                <p className={`text-[10px] font-bold uppercase italic mt-4 leading-relaxed p-2 rounded ${isDarkMode ? 'text-gray-500 bg-black/30' : 'text-gray-600 bg-gray-50'}`}>
                                    {downPayment > (netMonthly + Number(admissionFee))
                                        ? `* Excess of ₹${(downPayment - (netMonthly + Number(admissionFee))).toFixed(0)} will be adjusted next month.`
                                        : downPayment < (netMonthly + Number(admissionFee))
                                            ? `* Balance of ₹${(netMonthly + Number(admissionFee) - downPayment).toFixed(0)} will carry forward.`
                                            : "* Initial payment covers first month tuition+adm."
                                    }
                                </p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full mt-10 py-4 rounded-lg font-black uppercase tracking-[0.2em] text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] ${loading
                                    ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                                    : 'bg-cyan-500 text-black hover:bg-cyan-400 hover:scale-[1.02]'
                                }`}
                        >
                            {loading ? "PROSSESING..." : "COMMIT ADMISSION"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default BoardCourseAdmissionPage;
