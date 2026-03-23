import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { FaPrint, FaSave, FaSync, FaCheckCircle, FaTrash, FaCheck, FaExclamationTriangle, FaFileInvoice, FaArrowLeft, FaMoneyBillWave, FaPlus, FaTimes } from 'react-icons/fa';
import BillGenerator from '../components/Finance/BillGenerator';
import { useTheme } from '../context/ThemeContext';

const ManageBoardAdmission = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [loading, setLoading] = useState(true);
    const [admission, setAdmission] = useState(null);
    const [selectedBoard, setSelectedBoard] = useState(null);
    const [masterSubjects, setMasterSubjects] = useState([]);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
    const [effectiveFromMonth, setEffectiveFromMonth] = useState(null);
    const [paymentModal, setPaymentModal] = useState({ show: false, installment: null });
    const [showBillGenerator, setShowBillGenerator] = useState(false);
    const [selectedInstForBill, setSelectedInstForBill] = useState(null);
    const [examPayments, setExamPayments] = useState([]);
    const [admissionPayments, setAdmissionPayments] = useState([]);
    const [examPaymentModal, setExamPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: 0,
        paidExamFee: 0,
        paymentMethod: "CASH",
        transactionId: "",
        bankName: "",
        accountHolderName: "",
        chequeDate: new Date().toISOString().split('T')[0]
    });

    const apiUrl = import.meta.env.VITE_API_URL;


    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const [admissionRes, boardsRes, classesRes] = await Promise.all([
                fetch(`${apiUrl}/board-admission/${id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                }),
                fetch(`${apiUrl}/board`, {
                    headers: { "Authorization": `Bearer ${token}` }
                }),
                fetch(`${apiUrl}/class`, {
                    headers: { "Authorization": `Bearer ${token}` }
                })
            ]);

            const admissionData = await admissionRes.json();
            const boardsData = await boardsRes.json();
            const classesData = await (classesRes.ok ? classesRes.json() : Promise.resolve([]));

            if (admissionRes.ok) {
                setAdmission(admissionData);
                setSelectedSubjectIds(admissionData.selectedSubjects.map(s => s.subjectId._id));
                
                // Fetch bills/payments for this admission to find exam fee payments
                const billsRes = await fetch(`${apiUrl}/payment/bills/${id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (billsRes.ok) {
                    const billsData = await billsRes.json();
                    const allPayments = billsData.data || [];
                    setExamPayments(allPayments.filter(p => p.installmentNumber === 0));
                    setAdmissionPayments(allPayments.filter(p => p.installmentNumber === 1));
                }
            }
            if (boardsRes.ok) {
                if (admissionData) {
                    const boardObj = boardsData.find(b => b._id === (admissionData.boardId?._id || admissionData.boardId));
                    setSelectedBoard(boardObj);

                    // Fetch BoardCourseSubject Master Data based on Board and Class
                    const classObj = classesData.find(c => (c.name || c.className) === admissionData.lastClass);
                    if (boardObj && classObj) {
                        const mRes = await fetch(`${apiUrl}/board-course-subject/by-board-class?boardId=${boardObj._id}&classId=${classObj._id}`, {
                            headers: { "Authorization": `Bearer ${token}` }
                        });
                        if (mRes.ok) {
                            const mData = await mRes.json();
                            setMasterSubjects(mData.subjects || []);
                        }
                    }
                }
            }
        } catch {
            toast.error("Error fetching data");
        } finally {
            setLoading(false);
        }
    }, [apiUrl, id]);

    useEffect(() => {
        fetchData();
    }, [id, fetchData]);

    useEffect(() => {
        if (!paymentModal.show && !examPaymentModal) {
            setPaymentForm({ 
                amount: 0, 
                paidExamFee: 0, 
                paymentMethod: "CASH", 
                transactionId: "",
                bankName: "",
                accountHolderName: "",
                chequeDate: new Date().toISOString().split('T')[0]
            });
        } else if (paymentModal.installment) {
            setPaymentForm(prev => ({
                ...prev,
                amount: Math.max(0, paymentModal.installment.payableAmount - (paymentModal.installment.paidAmount || 0))
            }));
        }
    }, [paymentModal.show, paymentModal.installment, examPaymentModal]);

    const handleUpdateSubjects = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/board-admission/update-subjects/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    selectedSubjectIds,
                    effectiveFromMonth: effectiveFromMonth?.monthNumber 
                })
            });

            if (response.ok) {
                toast.success("Subjects updated successfully");
                fetchData();
            } else {
                const data = await response.json();
                toast.error(data.message || "Update failed");
            }
        } catch {
            toast.error("Update failed");
        } finally {
            setLoading(false);
        }
    };

    const handleCollectPayment = async (e) => {
        e.preventDefault();
        
        const maxAmount = paymentModal.installment.payableAmount - paymentModal.installment.paidAmount;
        if (Number(paymentForm.amount) > maxAmount) {
            toast.error(`Cannot pay more than the remaining balance (₹${maxAmount})`);
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/board-admission/collect-installment/${id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    installmentId: paymentModal.installment._id,
                    amount: paymentForm.amount,
                    paidExamFee: paymentForm.paidExamFee,
                    paymentMethod: paymentForm.paymentMethod,
                    transactionId: paymentForm.transactionId,
                    bankName: paymentForm.bankName,
                    accountHolderName: paymentForm.accountHolderName,
                    chequeDate: paymentForm.chequeDate
                })
            });

            if (response.ok) {
                toast.success("Payment collected");
                setPaymentModal({ show: false, installment: null });
                fetchData();
            } else {
                const data = await response.json();
                toast.error(data.message || "Payment failed");
            }
        } catch {
            toast.error("Payment failed");
        } finally {
            setLoading(false);
        }
    };

    const handleCollectExamPayment = async (e) => {
        e.preventDefault();
        
        const maxAmount = Math.max(0, admission.examFee - (admission.examFeePaid || 0));
        if (Number(paymentForm.amount) > maxAmount) {
            toast.error(`Cannot pay more than the remaining balance (₹${maxAmount})`);
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/board-admission/collect-exam-fee/${id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: paymentForm.amount,
                    paymentMethod: paymentForm.paymentMethod,
                    transactionId: paymentForm.transactionId,
                    bankName: paymentForm.bankName,
                    accountHolderName: paymentForm.accountHolderName,
                    chequeDate: paymentForm.chequeDate
                })
            });

            if (response.ok) {
                toast.success("Exam fee payment collected");
                setExamPaymentModal(false);
                fetchData();
            } else {
                const data = await response.json();
                toast.error(data.message || "Payment failed");
            }
        } catch {
            toast.error("Payment failed");
        } finally {
            setLoading(false);
        }
    };

    const calculateCurrentMonthly = () => {
        if (!masterSubjects.length) return 0;
        return masterSubjects
            .filter(s => selectedSubjectIds.includes(s.subjectId?._id || s.subjectId))
            .reduce((sum, s) => sum + (s.amount || 0), 0);
    };

    const getDynamicCourseName = () => {
        if (!admission || !masterSubjects.length) return "";
        const boardName = selectedBoard?.boardCourse || admission.boardId?.boardCourse || "";
        const subNames = masterSubjects
            .filter(s => selectedSubjectIds.includes(s.subjectId?._id || s.subjectId))
            .map(s => (s.subjectId?.subName || s.subjectId?.name || "Subject"))
            .sort()
            .join(" + ");
        
        return `${boardName} + Class ${admission.lastClass || ''} + ${admission.programme || ''} + ${admission.academicSession || ''} + ${subNames || 'No Subjects'}`;
    };

    if (loading && !admission) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className={`flex-1 p-6 overflow-y-auto ${isDarkMode ? 'bg-[#131619] text-white' : 'bg-gray-50 text-gray-900'}`}>
            <ToastContainer />
            
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white border hover:bg-gray-100'}`}
                >
                    <FaArrowLeft />
                </button>
                <div className="flex-1 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-cyan-500">Manage Board Admission</h2>
                        <p className="text-[10px] uppercase font-bold text-gray-500 line-clamp-1">Student: {admission?.studentId?.studentsDetails?.[0]?.studentName || admission?.studentName}</p>
                    </div>
                    <div className={`px-6 py-3 rounded-xl border-2 border-dashed transition-all duration-500 ${isDarkMode ? 'border-cyan-500/20 bg-cyan-500/5' : 'border-cyan-200 bg-cyan-50'} max-w-[65%]`}>
                        <p className="text-[9px] font-black uppercase text-cyan-500 mb-1 tracking-widest">Enrolled Course Logic</p>
                        <h4 className={`text-xs font-black uppercase tracking-tight leading-relaxed ${isDarkMode ? 'text-cyan-100' : 'text-cyan-900'} line-clamp-2`}>
                            {getDynamicCourseName() || "Select Subjects..."}
                        </h4>
                    </div>
                </div>
            </div>

            {admission?.programme !== "NCRP" && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left: Installments Tracker */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                <h4 className="text-sm font-black uppercase mb-6 flex items-center gap-2">
                                    <FaSync className="text-cyan-500" />
                                    Installment Tracker
                                </h4>
                                
                                <div className="relative space-y-4 pl-4 before:absolute before:inset-0 before:ml-[34px] before:w-[2px] before:bg-gray-800 before:z-0">
                                    {admission.installments.map((inst, index) => {
                                        const isPaid = inst.status === "PAID";
                                        const isCurrent = effectiveFromMonth?._id === inst._id;
                                        const isNextToPay = !isPaid && (index === 0 || admission.installments[index - 1].status === "PAID");
                                        
                                        return (
                                        <div 
                                            key={inst._id} 
                                            onClick={() => {
                                                if (!isPaid) {
                                                    setEffectiveFromMonth(inst);
                                                    let subIds = inst.subjects?.map(s => 
                                                        (typeof s.subjectId === 'object' && s.subjectId !== null) 
                                                        ? s.subjectId._id.toString() 
                                                        : s.subjectId?.toString()
                                                    ) || [];
                                                    if (subIds.length === 0) {
                                                        subIds = admission.selectedSubjects?.map(s => 
                                                            (typeof s.subjectId === 'object' && s.subjectId !== null)
                                                            ? s.subjectId._id.toString()
                                                            : s.subjectId?.toString()
                                                        ) || [];
                                                    }
                                                    setSelectedSubjectIds(subIds.filter(Boolean));
                                                }
                                            }}
                                            className={`relative z-10 p-5 rounded-xl border flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                                                isCurrent
                                                ? 'border-cyan-500 ring-2 ring-cyan-500/50 bg-cyan-900/20 scale-[1.02]'
                                                : isPaid 
                                                    ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-green-50 border-green-200 opacity-90')
                                                    : isNextToPay
                                                        ? (isDarkMode ? 'bg-[#1a222c] border-cyan-500/30' : 'bg-white border-cyan-200 shadow-sm')
                                                        : (isDarkMode ? 'bg-gray-800/40 border-gray-800/50 hover:border-gray-600 opacity-70' : 'bg-gray-50 border-gray-100 hover:border-gray-200 opacity-70')
                                            }`}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all shadow-lg ${
                                                    isPaid 
                                                    ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                                                    : isNextToPay
                                                        ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                                                        : isDarkMode ? 'bg-gray-800 text-gray-500 border border-gray-700' : 'bg-white text-gray-400 border border-gray-200'
                                                }`}>
                                                    {isPaid ? <FaCheck /> : inst.monthNumber}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className={`text-sm font-black uppercase ${isPaid ? 'text-emerald-400' : (isNextToPay ? 'text-cyan-400' : (isDarkMode ? 'text-gray-300' : 'text-gray-700'))}`}>
                                                        {new Date(inst.dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                                                        Payable: <span className="text-gray-300">₹{inst.payableAmount.toFixed(0)}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6" onClick={(e) => e.stopPropagation()}>
                                                <div className="text-right">
                                                    <p className={`text-sm font-black tracking-widest ${isPaid ? 'text-emerald-500' : 'text-gray-500'}`}>
                                                        {inst.status}
                                                    </p>
                                                    <p className="text-[11px] text-gray-400 font-bold">Paid: ₹{inst.paidAmount}</p>
                                                </div>
                                                <div className="w-[1px] h-10 bg-gray-700/50 mx-2"></div>
                                                {isPaid ? (
                                                    <button
                                                        onClick={() => {
                                                            const transformedInst = {
                                                                ...inst,
                                                                installmentNumber: inst.monthNumber,
                                                                billingMonth: new Date(inst.dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                                                            };
                                                            setSelectedInstForBill(transformedInst);
                                                            setShowBillGenerator(true);
                                                        }}
                                                        className="px-5 py-2.5 border border-emerald-500/50 text-emerald-500 rounded-lg font-black text-[11px] uppercase hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-2 group"
                                                    >
                                                        <FaFileInvoice className="text-emerald-500 group-hover:text-black" />
                                                        BILL
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            if (!isNextToPay) {
                                                                toast.warning("Please pay previous installments first.");
                                                                return;
                                                            }
                                                            setPaymentModal({ show: true, installment: inst });
                                                            setPaymentForm({ ...paymentForm, amount: inst.payableAmount - inst.paidAmount });
                                                        }}
                                                        disabled={!isNextToPay}
                                                        className={`px-6 py-2.5 rounded-lg font-black text-[11px] uppercase transition-all shadow-lg ${
                                                            isNextToPay 
                                                            ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_5px_15px_rgba(6,182,212,0.3)]' 
                                                            : 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-800'
                                                        }`}
                                                    >
                                                        PAY NOW
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        </div>

                        {/* Right: Subject Management */}
                        <div className="space-y-6">
                            <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                <h4 className="text-sm font-black uppercase mb-1 flex items-center gap-2">
                                    <FaSave className="text-cyan-500" />
                                    Subject Management
                                </h4>
                                <p className="text-[9px] text-gray-500 font-bold uppercase mb-6">
                                    {effectiveFromMonth 
                                        ? `Updating for Month ${effectiveFromMonth.monthNumber} & future` 
                                        : "Click a month to update its subjects"}
                                </p>

                                <div className="space-y-3 mb-6">
                                    {masterSubjects.map((s) => (
                                        <div 
                                            key={s.subjectId?._id}
                                            onClick={() => {
                                                if (!effectiveFromMonth) return;
                                                if (effectiveFromMonth.paidAmount > 0) {
                                                    toast.warning("Cannot modify subjects for a paid month.");
                                                    return;
                                                }
                                                const sid = s.subjectId?._id || s.subjectId;
                                                const exists = selectedSubjectIds.includes(sid);
                                                setSelectedSubjectIds(exists 
                                                    ? selectedSubjectIds.filter(id => id !== sid)
                                                    : [...selectedSubjectIds, sid]
                                                );
                                            }}
                                            className={`p-4 rounded-lg border cursor-pointer transition-all flex justify-between items-center group ${
                                                selectedSubjectIds.includes(s.subjectId?._id || s.subjectId)
                                                    ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/50'
                                                    : isDarkMode ? 'border-gray-800 bg-[#131619] opacity-60 hover:opacity-100' : 'border-gray-100 bg-gray-50 opacity-60 hover:opacity-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                                    selectedSubjectIds.includes(s.subjectId?._id || s.subjectId) ? 'bg-cyan-500 border-cyan-500' : 'border-gray-500'
                                                }`}>
                                                    {selectedSubjectIds.includes(s.subjectId?._id || s.subjectId) && <FaCheckCircle className="text-black text-[10px]" />}
                                                </div>
                                                <span className={`text-xs font-black uppercase ${selectedSubjectIds.includes(s.subjectId?._id || s.subjectId) ? 'text-cyan-400' : 'text-gray-500'}`}>
                                                    {s.subjectId?.subName}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-black text-gray-500">₹{s.amount}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-4 rounded bg-black/20 space-y-2 mb-6 text-xs font-bold uppercase">
                                    <div className="flex justify-between items-center text-gray-400">
                                        <span>Base Total</span>
                                        <span className="text-white">₹{calculateCurrentMonthly()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-red-500/80">
                                        <span>Waiver</span>
                                        <span>- ₹{admission.monthlyWaiver.toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-white/10 text-cyan-400 font-black">
                                        <span>Projected</span>
                                        <span className="text-sm">
                                            ₹{Math.max(0, calculateCurrentMonthly() - admission.monthlyWaiver + (effectiveFromMonth?.adjustmentAmount || 0)).toFixed(0)}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleUpdateSubjects}
                                    disabled={!effectiveFromMonth || effectiveFromMonth.paidAmount > 0}
                                    className={`w-full py-3 font-black text-xs uppercase rounded transition-all ${
                                        effectiveFromMonth && effectiveFromMonth.paidAmount === 0
                                        ? 'bg-cyan-500 text-black hover:bg-cyan-400' 
                                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {!effectiveFromMonth ? "SELECT A MONTH" : "UPDATE SUBJECTS"}
                                </button>
                            </div>

                            <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                <h4 className="text-sm font-black uppercase mb-4 text-gray-500">Summary</h4>
                                <div className="space-y-3 font-bold uppercase text-xs">
                                    <div className="flex justify-between">
                                        <span>Total Expected</span>
                                        <span>₹{admission.totalExpectedAmount.toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Total Paid</span>
                                        <span className="text-green-500">₹{admission.totalPaidAmount}</span>
                                    </div>
                                    <div className="flex justify-between pt-3 border-t border-gray-800">
                                        <span>Balance</span>
                                        <span className="text-orange-500">₹{(admission.totalExpectedAmount - admission.totalPaidAmount).toFixed(0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* horizontal Journey tracker */}
                    <div className={`mt-8 p-6 rounded-xl border overflow-x-auto ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <h4 className="text-sm font-black uppercase mb-10 flex items-center gap-2 text-gray-500">
                            <FaCheckCircle className={isDarkMode ? 'text-gray-600' : 'text-gray-400'} />
                            Payment Journey Status
                        </h4>
                        <div className="relative min-w-[600px] px-8 mb-6">
                            <div className={`absolute top-5 left-8 right-8 h-1 -translate-y-1/2 z-0 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                            <div 
                                className="absolute top-5 left-8 h-1 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                style={{ width: `${(Math.max(0, admission.installments.filter(i => i.status === "PAID").length - 1) / Math.max(1, admission.installments.length - 1)) * 100}%` }}
                            ></div>
                            <div className="flex justify-between relative z-10 w-full">
                                {admission.installments.map((inst, index) => {
                                    const isPaid = inst.status === "PAID";
                                    const isNextToPay = !isPaid && (index === 0 || admission.installments[index - 1].status === "PAID");
                                    return (
                                        <div key={inst._id} className="flex flex-col items-center gap-3 relative group w-10">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500 z-10 ${
                                                isPaid 
                                                ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-4 ' + (isDarkMode ? 'ring-[#1a1f24]' : 'ring-white')
                                                : isNextToPay
                                                    ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)] ring-4 ' + (isDarkMode ? 'ring-[#1a1f24]' : 'ring-white') + ' scale-110'
                                                    : isDarkMode ? 'bg-gray-800 text-gray-500 ring-4 ring-[#1a1f24]' : 'bg-white text-gray-400 border-2 border-gray-200 ring-4 ring-white'
                                            }`}>
                                                {isPaid ? <FaCheck /> : inst.monthNumber}
                                            </div>
                                            <div className="absolute top-12 whitespace-nowrap text-center text-[10px] font-black uppercase text-gray-500">
                                                {new Date(inst.dueDate).toLocaleDateString('en-GB', { month: 'short' })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Payment Modal */}
            {paymentModal.show && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className={`w-full max-w-md p-8 rounded-2xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-center mb-8">
                            <h4 className="text-xl font-black uppercase tracking-tight truncate mr-4">Collect Payment - Month {paymentModal.installment.monthNumber}</h4>
                            <button onClick={() => setPaymentModal({ show: false, installment: null })}><FaTimes /></button>
                        </div>

                        <form onSubmit={handleCollectPayment} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Amount</label>
                                    <input
                                        type="number"
                                        max={paymentModal.installment.payableAmount - paymentModal.installment.paidAmount}
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        className={`w-full p-3 rounded border outline-none font-bold ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Method</label>
                                    <select
                                        value={paymentForm.paymentMethod}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                                        className={`w-full p-3 rounded border outline-none font-bold ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                                    >
                                        <option value="CASH">CASH</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CHEQUE">CHEQUE</option>
                                        <option value="BANK_TRANSFER">BANK TRANSFER</option>
                                    </select>
                                </div>
                            </div>

                            {/* Conditional Cheque Fields */}
                            {paymentForm.paymentMethod === "CHEQUE" && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black uppercase text-cyan-500 mb-2">Bank Name</label>
                                        <input
                                            type="text"
                                            value={paymentForm.bankName}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                                            className={`w-full p-3 rounded border outline-none font-bold ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-cyan-500 mb-2">A/C Holder Name</label>
                                        <input
                                            type="text"
                                            value={paymentForm.accountHolderName}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, accountHolderName: e.target.value })}
                                            className={`w-full p-3 rounded border outline-none font-bold ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-cyan-500 mb-2">Cheque Date</label>
                                        <input
                                            type="date"
                                            value={paymentForm.chequeDate}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, chequeDate: e.target.value })}
                                            className={`w-full p-3 rounded border outline-none font-bold ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">
                                    {paymentForm.paymentMethod === "CHEQUE" ? "Cheque Number" : "Transaction ID / Reference"}
                                    {(paymentForm.paymentMethod === "UPI" || paymentForm.paymentMethod === "CHEQUE") && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                <input
                                    type="text"
                                    value={paymentForm.transactionId}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                                    className={`w-full p-3 rounded border outline-none font-bold ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                                    required={paymentForm.paymentMethod === "UPI" || paymentForm.paymentMethod === "CHEQUE"}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-cyan-500 text-black font-black uppercase text-sm tracking-widest hover:bg-cyan-400 transition-all rounded-lg shadow-lg"
                            >
                                CONFIRM PAYMENT
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showBillGenerator && (
                <BillGenerator 
                    admission={{
                        ...admission,
                        // Transformation to match what BillGenerator expects
                        admissionNo: admission.studentId?.admissionNumber,
                        boardCourseName: selectedBoard?.boardCourse || 'Board Course'
                    }} 
                    installment={selectedInstForBill} 
                    onClose={() => setShowBillGenerator(false)} 
                />
            )}
            {/* Admission Fee & General Payments Section (For NCRP or any student to see initial bill) */}
            {admission && (admission.programme === 'NCRP' || admissionPayments.length > 0) && (
                <div className={`mt-8 p-6 rounded-xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-2xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-black uppercase flex items-center gap-2 text-emerald-500">
                            <FaFileInvoice />
                            Admission & General Fees
                        </h4>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        {admissionPayments.length > 0 ? (
                            admissionPayments.map((p, idx) => (
                                <button
                                    key={p.billId || idx}
                                    onClick={() => {
                                        setSelectedInstForBill(p);
                                        setShowBillGenerator(true);
                                    }}
                                    className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-lg font-black text-xs uppercase hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-2 shadow-lg"
                                >
                                    <FaFileInvoice />
                                    VIEW ADMISSION BILL {admissionPayments.length > 1 ? `#${idx + 1}` : ''}
                                </button>
                            ))
                        ) : (
                            <div className="text-gray-500 text-xs font-bold uppercase italic text-center w-full py-4 border border-dashed border-gray-800 rounded-lg">
                                No admission payment records found in unified portal
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Examination Fee Tracker Section */}
            {admission && admission.examFee > 0 && (
                <div className={`mt-8 p-6 rounded-xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-2xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-black uppercase flex items-center gap-2 text-cyan-500">
                            <FaMoneyBillWave />
                            Examination Fee Management
                        </h4>
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                admission.examFeeStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-orange-500/20 text-orange-500'
                            }`}>
                                {admission.examFeeStatus}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Total Exam Fee</p>
                            <p className="text-lg font-black">₹{admission.examFee}</p>
                        </div>
                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Paid Amount</p>
                            <p className="text-lg font-black text-emerald-500">₹{admission.examFeePaid || 0}</p>
                        </div>
                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Remaining Balance</p>
                            <p className="text-lg font-black text-orange-500">₹{Math.max(0, admission.examFee - (admission.examFeePaid || 0))}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {admission.examFeePaid < admission.examFee && (
                                <button
                                    onClick={() => {
                                        setExamPaymentModal(true);
                                        setPaymentForm({ ...paymentForm, amount: admission.examFee - (admission.examFeePaid || 0) });
                                    }}
                                    className="flex-1 py-4 bg-cyan-500 text-black font-black uppercase text-xs rounded-lg hover:bg-cyan-400 transition-all shadow-lg"
                                >
                                    PAY NOW
                                </button>
                            )}
                            {examPayments.length > 0 && (
                                <div className="flex flex-col gap-1 flex-1">
                                    {examPayments.map((p, idx) => (
                                        <button
                                            key={p.billId}
                                            onClick={() => {
                                                setSelectedInstForBill(p);
                                                setShowBillGenerator(true);
                                            }}
                                            className="w-full py-2 border border-emerald-500/50 text-emerald-500 rounded-lg font-black text-[10px] uppercase hover:bg-emerald-500 hover:text-black transition-all flex items-center justify-center gap-2"
                                        >
                                            <FaFileInvoice />
                                            VIEW BILL {examPayments.length > 1 ? `#${idx + 1}` : ''}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Exam Payment Modal */}
            {examPaymentModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className={`w-full max-w-md p-8 rounded-2xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-center mb-8">
                            <h4 className="text-xl font-black uppercase tracking-tight">Examination Fee Payment</h4>
                            <button onClick={() => setExamPaymentModal(false)}><FaTimes /></button>
                        </div>

                        <form onSubmit={handleCollectExamPayment} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Amount</label>
                                    <input
                                        type="number"
                                        max={Math.max(0, admission.examFee - (admission.examFeePaid || 0))}
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        className={`w-full p-3 rounded border outline-none font-bold ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Method</label>
                                    <select
                                        value={paymentForm.paymentMethod}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                                        className={`w-full p-3 rounded border outline-none font-bold ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                                    >
                                        <option value="CASH">CASH</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CHEQUE">CHEQUE</option>
                                        <option value="BANK_TRANSFER">BANK TRANSFER</option>
                                    </select>
                                </div>
                            </div>

                            {/* Conditional Cheque Fields */}
                            {paymentForm.paymentMethod === "CHEQUE" && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black uppercase text-cyan-500 mb-2">Bank Name</label>
                                        <input
                                            type="text"
                                            value={paymentForm.bankName}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                                            className={`w-full p-3 rounded border outline-none font-bold ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-cyan-500 mb-2">A/C Holder Name</label>
                                        <input
                                            type="text"
                                            value={paymentForm.accountHolderName}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, accountHolderName: e.target.value })}
                                            className={`w-full p-3 rounded border outline-none font-bold ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-cyan-500 mb-2">Cheque Date</label>
                                        <input
                                            type="date"
                                            value={paymentForm.chequeDate}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, chequeDate: e.target.value })}
                                            className={`w-full p-3 rounded border outline-none font-bold ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">
                                    {paymentForm.paymentMethod === "CHEQUE" ? "Cheque Number" : "Transaction ID / Reference"}
                                    {(paymentForm.paymentMethod === "UPI" || paymentForm.paymentMethod === "CHEQUE") && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                <input
                                    type="text"
                                    value={paymentForm.transactionId}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                                    className={`w-full p-3 rounded border outline-none font-bold ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                                    required={paymentForm.paymentMethod === "UPI" || paymentForm.paymentMethod === "CHEQUE"}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-cyan-500 text-black font-black uppercase text-sm tracking-widest hover:bg-cyan-400 transition-all rounded-lg shadow-lg"
                            >
                                CONFIRM PAYMENT
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};


export default ManageBoardAdmission;
