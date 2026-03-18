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
    const [durationMonths, setDurationMonths] = useState(6);
    const [totalWaiver, setTotalWaiver] = useState(0);
    const [downPayment, setDownPayment] = useState(0);
    const [billingStartDate, setBillingStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [transactionId, setTransactionId] = useState("");
    const [remarks, setRemarks] = useState("");
    const [academicSession, setAcademicSession] = useState("");

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const [studentRes, boardsRes] = await Promise.all([
                fetch(`${apiUrl}/normalAdmin/getStudent/${studentId}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                }),
                fetch(`${apiUrl}/board`, {
                    headers: { "Authorization": `Bearer ${token}` }
                })
            ]);

            const studentData = await studentRes.json();
            const boardsData = await boardsRes.json();

            if (studentRes.ok) {
                setStudent(studentData);
                if (studentData?.studentsDetails?.[0]?.academicSession) {
                    setAcademicSession(studentData.studentsDetails[0].academicSession);
                }
            }
            if (boardsRes.ok) setBoards(boardsData);

            // Auto select board if student already has one from registration
            if (studentData?.studentsDetails?.[0]?.board) {
                const matchedBoard = boardsData.find(b => 
                    b.boardCourse.toLowerCase() === studentData.studentsDetails[0].board.toLowerCase()
                );
                if (matchedBoard) {
                    setSelectedBoard(matchedBoard);
                    // Optionally pre-select subjects if they exist in board
                }
            }

        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleBoardChange = (e) => {
        const boardId = e.target.value;
        const board = boards.find(b => b._id === boardId);
        setSelectedBoard(board);
        setSelectedSubjectIds([]); // Reset subjects when board changes
    };

    const toggleSubject = (subjectId) => {
        setSelectedSubjectIds(prev => 
            prev.includes(subjectId) 
                ? prev.filter(id => id !== subjectId)
                : [...prev, subjectId]
        );
    };

    const calculateMonthlyFee = () => {
        if (!selectedBoard) return 0;
        return selectedBoard.subjects
            .filter(s => selectedSubjectIds.includes(s.subjectId._id))
            .reduce((sum, s) => sum + (s.price || 0), 0);
    };

    const monthlyFee = calculateMonthlyFee();
    const monthlyWaiver = totalWaiver > 0 ? (totalWaiver / durationMonths) : 0;
    const netMonthly = Math.max(0, monthlyFee - monthlyWaiver);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBoard || selectedSubjectIds.length === 0) {
            return toast.error("Please select a board and at least one subject");
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
                    studentId,
                    boardId: selectedBoard._id,
                    selectedSubjectIds,
                    totalDurationMonths: Number(durationMonths),
                    totalWaiver: Number(totalWaiver),
                    downPayment: Number(downPayment),
                    billingStartDate,
                    paymentMethod,
                    transactionId,
                    remarks,
                    academicSession,
                    centre: student?.studentsDetails?.[0]?.centre
                })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success("Board Admission processed successfully!");
                setTimeout(() => navigate("/enrolled-students"), 2000);
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
                <div className={`p-6 rounded-xl border mb-8 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500 text-2xl font-black">
                            {student.studentsDetails?.[0]?.studentName?.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase">{student.studentsDetails?.[0]?.studentName}</h3>
                            <div className="flex gap-4 mt-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">UID: {student._id.slice(-8)}</span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Centre: {student.studentsDetails?.[0]?.centre}</span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mobile: {student.studentsDetails?.[0]?.mobileNum}</span>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Select Board</label>
                                <select
                                    value={selectedBoard?._id || ""}
                                    onChange={handleBoardChange}
                                    className={`w-full p-3 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                    required
                                >
                                    <option value="">-- Choose Board --</option>
                                    {boards.map(b => (
                                        <option key={b._id} value={b._id}>{b.boardCourse}</option>
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
                        </div>

                        {selectedBoard && (
                            <div className="animate-fadeIn">
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-4">Available Subjects (Check to include)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {selectedBoard.subjects.map((s, idx) => (
                                        <div 
                                            key={s.subjectId._id}
                                            onClick={() => toggleSubject(s.subjectId._id)}
                                            className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between group ${
                                                selectedSubjectIds.includes(s.subjectId._id)
                                                    ? 'border-cyan-500 bg-cyan-500/5'
                                                    : isDarkMode ? 'border-gray-800 bg-[#131619] hover:border-gray-700' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                                    selectedSubjectIds.includes(s.subjectId._id) ? 'bg-cyan-500 border-cyan-500' : 'border-gray-300'
                                                }`}>
                                                    {selectedSubjectIds.includes(s.subjectId._id) && <FaCheckCircle className="text-white text-[10px]" />}
                                                </div>
                                                <span className="text-xs font-bold uppercase">{s.subjectId.subName}</span>
                                            </div>
                                            <span className={`text-xs font-black ${selectedSubjectIds.includes(s.subjectId._id) ? 'text-cyan-500' : 'text-gray-400'}`}>₹{s.price}/mo</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`p-8 rounded-xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex items-center gap-3 mb-6">
                            <FaCalendarAlt className="text-cyan-500" />
                            <h4 className="text-sm font-black uppercase tracking-widest">Duration & Waivers</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Total Duration (Months)</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="1"
                                        max="60"
                                        value={durationMonths}
                                        onChange={(e) => setDurationMonths(e.target.value)}
                                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    />
                                    <span className="w-12 text-center font-black text-cyan-500">{durationMonths}</span>
                                </div>
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
                                    * This will be divided equally over {durationMonths} months (₹{(totalWaiver / durationMonths).toFixed(2)}/mo)
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
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Down Payment Amount</label>
                                <input
                                    type="number"
                                    value={downPayment}
                                    onChange={(e) => setDownPayment(e.target.value)}
                                    className={`w-full p-3 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                    placeholder="Enter amount paid today"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Payment Method</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className={`w-full p-3 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
                                >
                                    <option value="CASH">CASH</option>
                                    <option value="ONLINE">ONLINE / CARD</option>
                                    <option value="UPI">UPI</option>
                                    <option value="CHEQUE">CHEQUE</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Calculation & Submit Section */}
                <div className="space-y-6">
                    <div className={`p-8 rounded-xl border flex flex-col h-fit sticky top-6 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex items-center gap-3 mb-8">
                            <FaCalculator className="text-cyan-500" />
                            <h4 className="text-sm font-black uppercase tracking-widest">Fee Summary</h4>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div className="flex justify-between items-center pb-4 border-b border-dashed border-gray-700">
                                <span className="text-xs font-bold text-gray-500 uppercase">Selected Subjects</span>
                                <span className="text-xs font-black">{selectedSubjectIds.length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500 uppercase">Monthly Fees</span>
                                <span className="text-xs font-black">₹{monthlyFee}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500 uppercase">Monthly Waiver</span>
                                <span className="text-xs font-black text-red-500">- ₹{monthlyWaiver.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                                <span className="text-xs font-black text-cyan-500 uppercase">Net Monthly</span>
                                <span className="text-lg font-black text-cyan-500">₹{netMonthly.toFixed(0)}</span>
                            </div>

                            <div className={`mt-8 p-4 rounded-lg bg-black/20 space-y-3`}>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Payable Today (DP)</span>
                                    <span className="text-sm font-black">₹{downPayment}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Month 2 Payable</span>
                                    <span className={`text-sm font-black ${ (netMonthly + (netMonthly - downPayment)) < 0 ? 'text-green-500' : ''}`}>
                                        ₹{Math.max(0, netMonthly + (netMonthly - downPayment)).toFixed(0)}
                                    </span>
                                </div>
                                <p className="text-[9px] text-gray-600 font-bold uppercase italic mt-2 leading-relaxed">
                                    {downPayment > netMonthly 
                                        ? `* Overpayment of ₹${(downPayment - netMonthly).toFixed(0)} will be adjusted in Month 2.`
                                        : downPayment < netMonthly 
                                            ? `* Underpayment of ₹${(netMonthly - downPayment).toFixed(0)} will be added to Month 2.`
                                            : "* Payment matches the monthly fee."
                                    }
                                </p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full mt-10 py-4 rounded-lg font-black uppercase tracking-[0.2em] text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] ${
                                loading 
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
