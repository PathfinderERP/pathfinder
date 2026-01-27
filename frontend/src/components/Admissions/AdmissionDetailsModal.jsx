import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaGraduationCap, FaMoneyBillWave, FaCalendar, FaCheckCircle, FaExclamationCircle, FaFileInvoice, FaSync, FaInfoCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BillGenerator from '../Finance/BillGenerator';

const AdmissionDetailsModal = ({ admission, onClose, onUpdate, canEdit = false, isDarkMode }) => {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedInstallment, setSelectedInstallment] = useState(null);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [paymentData, setPaymentData] = useState({
        paidAmount: 0,
        paymentMethod: "CASH",
        transactionId: "",
        accountHolderName: "",
        chequeDate: "",

        remarks: "",
        carryForward: false
    });
    const [billModal, setBillModal] = useState({ show: false, admission: null, installment: null });
    const [monthlyBreakdown, setMonthlyBreakdown] = useState([]);
    const [loadingBreakdown, setLoadingBreakdown] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();

    useEffect(() => {
        if (admission && admission.admissionType === 'BOARD') {
            fetchBreakdown();
        }
    }, [admission]);

    const fetchBreakdown = async () => {
        setLoadingBreakdown(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}/admission/${admission._id}/monthly-breakdown`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setMonthlyBreakdown(data.monthlyBreakdown);
            }
        } catch (error) {
            console.error('Error fetching breakdown:', error);
        } finally {
            setLoadingBreakdown(false);
        }
    };

    if (!admission) return null;

    const student = admission.student?.studentsDetails?.[0] || {};
    const guardian = admission.student?.guardians?.[0] || {};
    const exam = admission.student?.examSchema?.[0] || {};

    // Helper to format date as DD/MM/YYYY (en-GB standard)
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString('en-GB');
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();

        // Check if payment method requires transaction ID
        const onlinePaymentMethods = ["UPI", "CARD", "BANK_TRANSFER"];
        const isOnlinePayment = onlinePaymentMethods.includes(paymentData.paymentMethod);

        if (isOnlinePayment && !paymentData.transactionId.trim()) {
            toast.error("Transaction ID is required for online payment methods");
            return;
        }

        setProcessingPayment(true);
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                `${apiUrl}/admission/${admission._id}/payment/${selectedInstallment.installmentNumber}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(paymentData)
                }
            );

            const data = await response.json();

            if (response.ok) {
                toast.success("Payment updated successfully");
                // Check if partial
                if (paymentData.paidAmount < selectedInstallment.amount) {
                    toast.info("Partial payment recorded. Remaining amount carried forward.");
                }
                setShowPaymentModal(false);

                // Show bill generator after payment
                setBillModal({
                    show: true,
                    admission: admission,
                    installment: {
                        ...selectedInstallment,
                        paidAmount: paymentData.paidAmount,
                        paymentMethod: paymentData.paymentMethod,
                        receivedDate: paymentData.receivedDate,
                        status: paymentData.paymentMethod === "CHEQUE" ? "PENDING_CLEARANCE" : "PAID"
                    }
                });

                setSelectedInstallment(null);
                onUpdate();
            } else {
                toast.error(data.message || "Failed to update payment");
            }
        } catch (err) {
            console.error(err);
            toast.error("Server error during payment processing");
        } finally {
            setProcessingPayment(false);
        }
    };

    const openPaymentModal = (installment) => {
        setSelectedInstallment(installment);
        setPaymentData({
            paidAmount: installment.amount,
            paymentMethod: "CASH",
            transactionId: "",
            accountHolderName: "",
            chequeDate: new Date().toISOString().split('T')[0],
            receivedDate: new Date().toISOString().split('T')[0],

            remarks: "",
            carryForward: false
        });
        setShowPaymentModal(true);
    };

    const getInstallmentStatusColor = (status) => {
        switch (status) {
            case "PAID":
                return "bg-green-500/10 text-green-400";
            case "PENDING_CLEARANCE":
                return "bg-cyan-500/10 text-cyan-400";
            case "OVERDUE":
                return "bg-red-500/10 text-red-400";
            case "PENDING":
                return "bg-yellow-500/10 text-yellow-400";
            default:
                return "bg-gray-500/10 text-gray-400";
        }
    };

    const labelClass = "block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-2";
    const infoValueClass = `px-3 py-2.5 rounded-[4px] border font-bold text-[11px] uppercase tracking-wider transition-all ${isDarkMode ? 'bg-black/20 border-gray-800 text-white shadow-inner' : 'bg-white border-gray-200 text-gray-900 shadow-sm'}`;
    const sectionClass = `p-6 rounded-[4px] border transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`;

    return (
        <>
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                <div className={`rounded-[4px] border border-gray-800 max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`}>
                    {/* Header */}
                    <div className={`p-6 border-b flex items-center justify-between sticky top-0 z-10 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-[4px] bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                    <FaFileInvoice className="text-cyan-500 text-2xl" />
                                </div>
                                <div>
                                    <h2 className={`text-2xl font-black italic tracking-tighter uppercase leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        Admission Dossier
                                    </h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2">
                                        PROTOCOL: <span className="text-cyan-500 font-mono tracking-widest">{admission.admissionNumber}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {admission.admissionType === 'BOARD' ? (
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate(`/edit-board-subjects/${admission._id}`);
                                    }}
                                    className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest rounded-[4px] transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                                >
                                    <FaMoneyBillWave /> MANAGE MONTHLY BILLING
                                </button>
                            ) : (
                                canEdit && (
                                    <button
                                        onClick={() => {
                                            onClose();
                                            if (window.openEditModal) {
                                                window.openEditModal(admission);
                                            }
                                        }}
                                        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-widest rounded-[4px] transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
                                    >
                                        <FaUser /> MODIFY SYSTEM DATA
                                    </button>
                                )
                            )}
                            <button
                                onClick={onClose}
                                className={`p-3 rounded-[4px] transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10' : 'bg-gray-100 text-gray-400 hover:text-gray-900 hover:bg-gray-200'}`}
                            >
                                <FaTimes className="text-lg" />
                            </button>
                        </div>
                    </div>

                    <div className={`p-8 overflow-y-auto space-y-8 custom-scrollbar ${isDarkMode ? 'dark' : ''}`}>
                        {/* Deactivation Warning Banner */}
                        {admission.student?.status === 'Deactivated' && (
                            <div className={`p-4 rounded-[4px] border flex items-center gap-4 animate-pulse ${isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                                <div className="w-10 h-10 rounded-[4px] bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                    <FaExclamationCircle className="text-red-500 text-xl" />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest">CRITICAL: STUDENT DEACTIVATED</h4>
                                    <p className={`text-[11px] font-bold mt-1 ${isDarkMode ? 'text-red-400/60' : 'text-red-600/80'}`}>SYSTEM ACCESS AND FINANCIAL TRANSACTIONS ARE RESTRICTED FOR THIS ENTITY.</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Student Information */}
                            <div className={sectionClass}>
                                <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                    <FaUser size={14} /> BIOMETRIC CORE DATA
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className={labelClass}>ENTITY NAME</label>
                                        <div className={infoValueClass}>{student.studentName || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>COORDINATION EMAIL</label>
                                        <div className={infoValueClass}>{student.studentEmail || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>PRIMARY CONTACT</label>
                                        <div className={infoValueClass}>{student.mobileNum || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>BIRTH COORDINATES</label>
                                        <div className={infoValueClass}>{formatDate(student.dateOfBirth)}</div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>GENDER ASPECT</label>
                                        <div className={infoValueClass}>{student.gender || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>INSTITUTION</label>
                                        <div className={infoValueClass}>{student.schoolName || "N/A"}</div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>GEO ADDRESS</label>
                                        <div className={`${infoValueClass} normal-case`}>{student.address || "N/A"}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Guardian Information */}
                            <div className={sectionClass}>
                                <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                    <FaShieldAlt size={14} /> SECURE GUARDIAN NODE
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className={labelClass}>GUARDIAN NAME</label>
                                        <div className={infoValueClass}>{guardian.guardianName || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>CREDENTIALS</label>
                                        <div className={infoValueClass}>{guardian.qualification || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>MOBILE LINK</label>
                                        <div className={infoValueClass}>{guardian.guardianMobile || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>SECURE EMAIL</label>
                                        <div className={infoValueClass}>{guardian.guardianEmail || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>VOCATIONAL TAG</label>
                                        <div className={infoValueClass}>{guardian.occupation || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>ANNUAL REVENUE</label>
                                        <div className={infoValueClass}>{guardian.annualIncome || "N/A"}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Course & Academic Details */}
                            <div className={sectionClass}>
                                <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                    <FaGraduationCap size={14} /> ACADEMIC VECTOR
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className={labelClass}>COURSE / BOARD</label>
                                        <div className={infoValueClass}>
                                            {admission.admissionType === 'BOARD'
                                                ? (admission.boardCourseName || admission.board?.boardCourse || "Board Course")
                                                : (admission.course?.courseName || "N/A")}
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>CENTRE HUB</label>
                                        <div className={infoValueClass}>{admission.department?.departmentName || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>CLASSIFICATION</label>
                                        <div className={infoValueClass}>{admission.class?.name || exam.class || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>EXAM TAG</label>
                                        <div className={infoValueClass}>{admission.examTag?.name || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>ACADEMIC CYCLE</label>
                                        <div className={infoValueClass}>{admission.academicSession}</div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>ADMISSION TIMESTAMP</label>
                                        <div className={infoValueClass}>{formatDate(admission.admissionDate)}</div>
                                    </div>
                                    {exam.scienceMathParcent && (
                                        <div className="md:col-span-2">
                                            <label className={labelClass}>S/M PERFORMANCE COEFF.</label>
                                            <div className={infoValueClass}>{exam.scienceMathParcent}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Fee Structure */}
                            <div className={sectionClass}>
                                <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                    <FaMoneyBillWave size={14} /> FINANCIAL ARCHITECTURE
                                </h3>
                                <div className="space-y-4">
                                    <div className={`p-4 rounded-[4px] border ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-white border-gray-100'}`}>
                                        <div className="space-y-3">
                                            {admission.feeStructureSnapshot?.map((fee, index) => (
                                                <div key={index} className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider">
                                                    <span className="text-gray-500">{fee.feesType}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>₹{fee.value?.toLocaleString()}</span>
                                                        {fee.discount !== "0%" && (
                                                            <span className="text-emerald-500 text-[9px] px-1.5 py-0.5 rounded-[2px] bg-emerald-500/10 border border-emerald-500/20">-{fee.discount}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="border-t border-gray-800 my-4 pt-4 space-y-3">
                                            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider">
                                                <span className="text-gray-500">BASE VALUATION</span>
                                                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>₹{admission.baseFees?.toLocaleString()}</span>
                                            </div>
                                            {admission.discountAmount > 0 && (
                                                <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider">
                                                    <span className="text-emerald-500">WAIVER APPLIED</span>
                                                    <span className="text-emerald-500">-₹{admission.discountAmount?.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider">
                                                <span className="text-gray-500">SYSTEM TAX (CGST 9%)</span>
                                                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>₹{(admission.cgstAmount || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider">
                                                <span className="text-gray-500">SYSTEM TAX (SGST 9%)</span>
                                                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>₹{(admission.sgstAmount || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-4 rounded-[4px] border border-cyan-500/30 bg-cyan-500/5">
                                            <span className="text-[9px] font-black text-cyan-500 uppercase block mb-1">TOTAL CAPEX</span>
                                            <span className="text-[14px] font-black text-cyan-500">₹{admission.totalFees?.toLocaleString()}</span>
                                        </div>
                                        <div className="p-4 rounded-[4px] border border-emerald-500/30 bg-emerald-500/5">
                                            <span className="text-[9px] font-black text-emerald-500 uppercase block mb-1">INITIAL OPEX</span>
                                            <span className="text-[14px] font-black text-emerald-500">₹{admission.downPayment?.toLocaleString()}</span>
                                        </div>
                                        <div className="p-4 rounded-[4px] border border-amber-500/30 bg-amber-500/5">
                                            <span className="text-[9px] font-black text-amber-500 uppercase block mb-1">OUTSTANDING</span>
                                            <span className="text-[14px] font-black text-amber-500">₹{admission.remainingAmount?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Schedule / Monthly History */}
                        <div className={sectionClass}>
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] flex items-center gap-3">
                                    <FaCalendar size={14} /> {admission.admissionType === 'BOARD' ? 'SUBSCRIPTION LEDGER' : 'PAYMENT MILESTONES'}
                                </h3>
                                {admission.admissionType === 'BOARD' && (
                                    <button
                                        onClick={() => {
                                            onClose();
                                            navigate(`/edit-board-subjects/${admission._id}`);
                                        }}
                                        className="text-cyan-500 hover:text-cyan-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
                                    >
                                        <FaSync className="text-[12px]" /> RECONFIGURE BILLING
                                    </button>
                                )}
                            </div>

                            {admission.admissionType === 'BOARD' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {loadingBreakdown ? (
                                        <div className="col-span-full py-20 text-center">
                                            <FaSync className="animate-spin mx-auto mb-4 text-cyan-500 text-3xl" />
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">SYNCHRONIZING LEDGER...</p>
                                        </div>
                                    ) : (
                                        monthlyBreakdown.map((item, idx) => (
                                            <div key={idx} className={`p-5 rounded-[4px] border flex flex-col h-full transition-all group ${item.isPaid ? 'bg-emerald-500/5 border-emerald-500/20' : isDarkMode ? 'bg-white/5 border-gray-800 hover:border-cyan-500/30' : 'bg-white border-gray-200 hover:border-cyan-500/30 shadow-sm'}`}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest block mb-1">CYCLE {idx + 1} / {admission.courseDurationMonths}</span>
                                                        <h4 className={`text-[13px] font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.monthName}</h4>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded-[2px] text-[9px] font-black tracking-widest ${item.isPaid ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-black'}`}>
                                                        {item.isPaid ? 'CONFIRMED' : 'REMAINING'}
                                                    </span>
                                                </div>
                                                <div className="space-y-2 mb-6 flex-grow">
                                                    {item.subjects.length > 0 ? (
                                                        item.subjects.map((sub, sidx) => (
                                                            <div key={sidx} className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                                                <span className="text-gray-500">{sub.name}</span>
                                                                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>₹{sub.price}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-[9px] text-gray-500 italic opacity-60">INHERITANCE PENDING (RESOLVES ON TRIGGER)</p>
                                                    )}
                                                </div>
                                                <div className="pt-4 border-t border-gray-800/10 dark:border-gray-800">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="text-gray-500 text-[9px] font-black tracking-widest uppercase">NET LIABILITY</span>
                                                        <span className="text-cyan-500 font-black text-[14px]">₹{item.totalAmount?.toLocaleString() || '0'}</span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2">
                                                        {item.isPaid ? (
                                                            <button
                                                                className={`col-span-2 py-2 rounded-[4px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isDarkMode ? 'bg-white/5 text-cyan-400 hover:bg-white/10 border border-cyan-500/20' : 'bg-gray-100 text-cyan-600 hover:bg-gray-200 border border-cyan-500/20'}`}
                                                                onClick={() => setBillModal({ show: true, admission: admission, installment: { installmentNumber: 0, billingMonth: item.month } })}
                                                            >
                                                                <FaFileInvoice /> DOWNLOAD RECEIPT
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    className="py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[4px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
                                                                    onClick={() => {
                                                                        onClose();
                                                                        navigate(`/edit-board-subjects/${admission._id}?month=${item.month}&action=pay`);
                                                                    }}
                                                                >
                                                                    <FaMoneyBillWave /> SETTLE
                                                                </button>
                                                                <button
                                                                    className={`py-2 rounded-[4px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                                                                    onClick={() => {
                                                                        onClose();
                                                                        navigate(`/edit-board-subjects/${admission._id}?month=${item.month}&action=edit`);
                                                                    }}
                                                                >
                                                                    <FaSync /> ADJUST
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className={`${isDarkMode ? 'bg-black/40 text-gray-500' : 'bg-gray-100 text-gray-500'} text-[10px] font-black uppercase tracking-[0.2em]`}>
                                                <th className="p-4 text-left border-y border-gray-800/10 dark:border-gray-800">ID</th>
                                                <th className="p-4 text-left border-y border-gray-800/10 dark:border-gray-800">EXPIRY DATE</th>
                                                <th className="p-4 text-left border-y border-gray-800/10 dark:border-gray-800">LIABILITY</th>
                                                <th className="p-4 text-left border-y border-gray-800/10 dark:border-gray-800">CLEARED</th>
                                                <th className="p-4 text-left border-y border-gray-800/10 dark:border-gray-800">PROTOCOL</th>
                                                <th className="p-4 text-left border-y border-gray-800/10 dark:border-gray-800">STATUS</th>
                                                <th className="p-4 text-right border-y border-gray-800/10 dark:border-gray-800">EXECUTION</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {admission.paymentBreakdown?.map((payment, index) => {
                                                const previousPaid = index === 0 || ["PAID", "COMPLETED"].includes(admission.paymentBreakdown[index - 1].status);
                                                const isPaid = ["PAID", "COMPLETED"].includes(payment.status);

                                                return (
                                                    <tr key={index} className={`border-b border-gray-800/10 dark:border-gray-800 group hover:bg-cyan-500/5 transition-colors`}>
                                                        <td className={`p-4 text-[11px] font-mono ${isDarkMode ? 'text-cyan-500' : 'text-cyan-600 font-bold'}`}>#{payment.installmentNumber}</td>
                                                        <td className={`p-4 text-[11px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{formatDate(payment.dueDate)}</td>
                                                        <td className={`p-4 text-[11px] font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                            ₹{payment.amount?.toLocaleString()}
                                                            {payment.remarks && payment.remarks.includes("Includes") && (
                                                                <div className="text-[9px] text-amber-500 font-black mt-1 uppercase tracking-tighter opacity-70 italic">{payment.remarks}</div>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-[11px] font-black text-emerald-500">₹{payment.paidAmount?.toLocaleString() || 0}</td>
                                                        <td className={`p-4 text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{payment.paymentMethod || "---"}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded-[2px] text-[9px] font-black uppercase tracking-widest ${getInstallmentStatusColor(payment.status)}`}>
                                                                {payment.status === "PENDING_CLEARANCE" ? "VERIFYING" : payment.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            {canEdit ? (
                                                                (!isPaid && payment.status !== "PENDING_CLEARANCE") ? (
                                                                    <button
                                                                        onClick={() => admission.student?.status !== 'Deactivated' && openPaymentModal(payment)}
                                                                        disabled={!previousPaid || admission.student?.status === 'Deactivated'}
                                                                        className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-[4px] transition-all ${(!previousPaid || admission.student?.status === 'Deactivated') ? 'bg-gray-800/10 dark:bg-white/5 text-gray-500 cursor-not-allowed opacity-30 shadow-none' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 hover:-translate-y-0.5'}`}
                                                                        title={admission.student?.status === 'Deactivated' ? "LOCKED: DEACTIVATED" : (!previousPaid ? "LOCKED: SEQUENCE BREAK" : "TRIGGER PAYMENT")}
                                                                    >
                                                                        SETTLE NOW
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => admission.student?.status !== 'Deactivated' && setBillModal({ show: true, admission: admission, installment: payment })}
                                                                        disabled={admission.student?.status === 'Deactivated'}
                                                                        className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-[4px] transition-all flex items-center gap-2 ml-auto ${admission.student?.status === 'Deactivated' ? 'bg-gray-800/10 dark:bg-white/5 text-gray-500 cursor-not-allowed opacity-30 shadow-none' : 'bg-gray-100 dark:bg-white/5 text-cyan-500 hover:bg-cyan-500 hover:text-white border border-cyan-500/20'}`}
                                                                    >
                                                                        <FaFileInvoice /> {payment.status === "PENDING_CLEARANCE" ? "RECEIPT" : "DOCKET"}
                                                                    </button>
                                                                )
                                                            ) : (
                                                                (isPaid || payment.status === "PENDING_CLEARANCE") && (
                                                                    <button
                                                                        onClick={() => admission.student?.status !== 'Deactivated' && setBillModal({ show: true, admission: admission, installment: payment })}
                                                                        disabled={admission.student?.status === 'Deactivated'}
                                                                        className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-[4px] transition-all flex items-center gap-2 ml-auto ${admission.student?.status === 'Deactivated' ? 'bg-gray-800/10 dark:bg-white/5 text-gray-500 cursor-not-allowed opacity-30 shadow-none' : 'bg-gray-100 dark:bg-white/5 text-cyan-500 hover:bg-cyan-500 hover:text-white border border-cyan-500/20'}`}
                                                                    >
                                                                        <FaFileInvoice /> {payment.status === "PENDING_CLEARANCE" ? "RECEIPT" : "DOCKET"}
                                                                    </button>
                                                                )
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Payment Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-[4px] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                        <FaCheckCircle className="text-emerald-500" />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">CLEARED ASSETS</span>
                                </div>
                                <p className="text-emerald-500 text-3xl font-black tracking-tighter italic leading-none">₹{admission.totalPaidAmount?.toLocaleString()}</p>
                            </div>
                            <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-100'}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-[4px] bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                        <FaExclamationCircle className="text-amber-500" />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">PENDING LIABILITIES</span>
                                </div>
                                <p className="text-amber-500 text-3xl font-black tracking-tighter italic leading-none uppercase">
                                    {(admission.totalFees - admission.totalPaidAmount) >= 0
                                        ? `₹${(admission.totalFees - admission.totalPaidAmount).toLocaleString()}`
                                        : `+₹${(admission.totalPaidAmount - admission.totalFees).toLocaleString()} (EXCESS)`
                                    }
                                </p>
                            </div>
                            <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-cyan-50 border-cyan-100'}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-[4px] bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                        <FaInfoCircle className="text-cyan-500" />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ACCOUNT STATUS</span>
                                </div>
                                <p className="text-cyan-500 text-2xl font-black tracking-tighter italic leading-none uppercase">{admission.paymentStatus}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedInstallment && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 backdrop-blur-md">
                    <div className={`rounded-[4px] border border-gray-800 max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`}>
                        <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                            <h3 className={`text-lg font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>TRANSACTION INITIATION</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white transition-colors">
                                <FaTimes />
                            </button>
                        </div>

                        <div className={`p-4 border-b ${isDarkMode ? 'bg-cyan-500/5 border-gray-800' : 'bg-cyan-50 border-gray-100'}`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">TARGET MILESTONE</span>
                                    <span className="text-cyan-500 font-black text-sm">#{selectedInstallment.installmentNumber}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">LIABILITY AMOUNT</span>
                                    <span className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{selectedInstallment.amount}</span>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className={labelClass}>SETTLEMENT QUANTITY *</label>
                                <input
                                    type="number"
                                    value={paymentData.paidAmount}
                                    onChange={(e) => setPaymentData({ ...paymentData, paidAmount: parseFloat(e.target.value) })}
                                    className={`w-full p-2.5 rounded-[4px] border font-bold text-[11px] uppercase tracking-wider focus:outline-none transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                    required
                                />
                                {(() => {
                                    const diff = selectedInstallment.amount - paymentData.paidAmount;
                                    if (diff > 0) {
                                        return (
                                            <div className="mt-3 space-y-3">
                                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-[4px] text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                                                    PARTIAL EXECUTION: ₹{diff.toLocaleString()} WILL REMAIN OUTSTANDING.
                                                </div>

                                                <label className={`flex items-center gap-3 p-3 rounded-[4px] border cursor-pointer transition-all ${isDarkMode ? 'bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10' : 'bg-purple-50 border-purple-100 hover:bg-purple-100'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={paymentData.carryForward}
                                                        onChange={(e) => setPaymentData({ ...paymentData, carryForward: e.target.checked })}
                                                        className="w-4 h-4 rounded-[2px] border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700"
                                                    />
                                                    <div className="flex-1">
                                                        <span className="text-purple-500 font-black text-[10px] uppercase tracking-widest block">CARRY FORWARD RESIDUE</span>
                                                        <span className="text-gray-500 text-[9px] font-bold block mt-0.5">ALLOCATE ₹{diff.toLocaleString()} TO FUTURE ADJUSTMENTS.</span>
                                                    </div>
                                                </label>
                                            </div>
                                        );
                                    } else if (diff < 0) {
                                        return (
                                            <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-[4px] text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                                                SURPLUS DETECTED: ₹{Math.abs(diff).toLocaleString()} WILL BE CREDITED TO NEXT CYCLE.
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            <div>
                                <label className={labelClass}>PAYMENT PROTOCOL *</label>
                                <div className={`grid grid-cols-3 gap-2 p-1.5 rounded-[4px] border ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                                    {[
                                        { id: 'CASH', label: 'CASH', icon: <FaMoneyBillWave /> },
                                        { id: 'UPI', label: 'DIGITAL', icon: <FaCreditCard /> },
                                        { id: 'CHEQUE', label: 'BANK', icon: <FaUniversity /> }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setPaymentData({ ...paymentData, paymentMethod: opt.id, transactionId: "", accountHolderName: "" })}
                                            className={`flex flex-col items-center gap-1.5 py-3 rounded-[4px] transition-all border ${paymentData.paymentMethod === opt.id || (opt.id === 'UPI' && ["UPI", "CARD"].includes(paymentData.paymentMethod)) || (opt.id === 'CHEQUE' && ["CHEQUE", "BANK_TRANSFER"].includes(paymentData.paymentMethod))
                                                ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                                                : isDarkMode ? 'bg-white/5 border-transparent text-gray-500 hover:text-gray-300' : 'bg-white border-transparent text-gray-500 hover:text-gray-900 border-gray-200 shadow-sm'
                                                }`}
                                        >
                                            <span className="text-sm">{opt.icon}</span>
                                            <span className="text-[9px] font-black uppercase tracking-widest">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>TRANSCRIPTION DATE *</label>
                                <input
                                    type="date"
                                    value={paymentData.receivedDate}
                                    onChange={(e) => setPaymentData({ ...paymentData, receivedDate: e.target.value })}
                                    className={`w-full p-2.5 rounded-[4px] border font-bold text-[11px] uppercase tracking-wider focus:outline-none transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                    required
                                />
                                <p className="text-[9px] text-gray-500 mt-2 font-bold uppercase tracking-widest italic opacity-60">CHRONOLOGICAL MARKER FOR FUND RECEPTION</p>
                            </div>

                            {/* Conditional Fields */}
                            {(paymentData.paymentMethod === "CHEQUE" || paymentData.paymentMethod === "BANK_TRANSFER") && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div>
                                        <label className={labelClass}>ACCOUNT HOLDER IDENTITY *</label>
                                        <input
                                            type="text"
                                            value={paymentData.accountHolderName}
                                            onChange={(e) => setPaymentData({ ...paymentData, accountHolderName: e.target.value })}
                                            className={`w-full p-2.5 rounded-[4px] border font-bold text-[11px] uppercase tracking-wider focus:outline-none transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            placeholder="IDENTITY AS PRINTED ON INSTRUMENT"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>INSTRUMENT ID *</label>
                                            <input
                                                type="text"
                                                value={paymentData.transactionId}
                                                onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                                                className={`w-full p-2.5 rounded-[4px] border font-bold text-[11px] uppercase tracking-wider focus:outline-none transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                                placeholder="REF NUMBER"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>MATURITY DATE *</label>
                                            <input
                                                type="date"
                                                value={paymentData.chequeDate ? new Date(paymentData.chequeDate).toISOString().split('T')[0] : ""}
                                                onChange={(e) => setPaymentData({ ...paymentData, chequeDate: e.target.value })}
                                                className={`w-full p-2.5 rounded-[4px] border font-bold text-[11px] uppercase tracking-wider focus:outline-none transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(paymentData.paymentMethod === "UPI" || paymentData.paymentMethod === "CARD") && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className={labelClass}>DIGITAL TRACE ID *</label>
                                    <input
                                        type="text"
                                        value={paymentData.transactionId}
                                        onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                                        className={`w-full p-2.5 rounded-[4px] border font-bold text-[11px] uppercase tracking-wider focus:outline-none transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                        placeholder="TRANSACTION REFERENCE"
                                        required
                                    />
                                </div>
                            )}

                            <div>
                                <label className={labelClass}>ANNOTATIONS</label>
                                <textarea
                                    value={paymentData.remarks}
                                    onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                                    className={`w-full p-2.5 rounded-[4px] border font-bold text-[11px] uppercase tracking-wider focus:outline-none transition-all min-h-[80px] ${isDarkMode ? 'bg-black/40 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                    placeholder="SUPPLEMENTARY TRANSACTION DATA"
                                />
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-gray-800/10 dark:border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)}
                                    className={`flex-1 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    disabled={processingPayment}
                                >
                                    ABORT
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2"
                                    disabled={processingPayment}
                                >
                                    {processingPayment ? <FaSync className="animate-spin" /> : <>PROCEED <FaSave /></>}
                                </button>
                            </div>
                        </form>
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

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: ${isDarkMode ? '#0f1215' : 'transparent'}; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#d1d5db'}; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? '#374151' : '#9ca3af'}; }
            `}</style>
        </>
    );
};

export default AdmissionDetailsModal;
