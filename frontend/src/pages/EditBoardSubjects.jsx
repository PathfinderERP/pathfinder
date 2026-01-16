import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaCalendar, FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaMoneyBillWave, FaSave, FaSchool, FaUser, FaFileInvoice } from 'react-icons/fa';
import BillGenerator from '../components/Finance/BillGenerator';

const EditBoardSubjects = () => {
    const { admissionId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const apiUrl = import.meta.env.VITE_API_URL;

    const [loading, setLoading] = useState(true);
    const [admission, setAdmission] = useState(null);
    const [board, setBoard] = useState(null);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
    const [billingMonth, setBillingMonth] = useState('');
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [transactionId, setTransactionId] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [chequeDate, setChequeDate] = useState('');
    const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
    const [monthlyBreakdown, setMonthlyBreakdown] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [showBillModal, setShowBillModal] = useState(false);
    const [selectedInstallment, setSelectedInstallment] = useState(null);

    useEffect(() => {
        fetchAdmissionData();
    }, [admissionId]);

    const fetchAdmissionData = async () => {
        try {
            const token = localStorage.getItem('token');

            // Fetch admission details
            const admissionRes = await fetch(`${apiUrl}/admission/${admissionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const admissionData = await admissionRes.json();

            if (admissionRes.ok) {
                setAdmission(admissionData);
                // Ensure we have the full board object with subjects
                if (admissionData.board && admissionData.board.subjects) {
                    setBoard(admissionData.board);
                } else {
                    console.warn("Board data in admission is not fully populated");
                }

                // Set initial subjects - handle both populated and unpopulated subject references
                const initialSubjectIds = admissionData.selectedSubjects?.map(s => {
                    if (!s.subject) return null;
                    return typeof s.subject === 'object' ? s.subject._id : s.subject;
                }).filter(id => id !== null) || [];

                setSelectedSubjectIds(initialSubjectIds);
            }

            // Fetch monthly breakdown
            const breakdownRes = await fetch(`${apiUrl}/admission/${admissionId}/monthly-breakdown`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const breakdownData = await breakdownRes.json();

            if (breakdownRes.ok) {
                setMonthlyBreakdown(breakdownData.monthlyBreakdown || []);

                // Handle initial month selection from query params
                const queryMonth = searchParams.get('month');
                if (queryMonth) {
                    const monthData = breakdownData.monthlyBreakdown.find(m => m.month === queryMonth);
                    if (monthData) {
                        handleMonthSelect(monthData);
                    }
                }
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load admission data');
            setLoading(false);
        }
    };

    const handleSubjectChange = (subjectId) => {
        setSelectedSubjectIds(prev => {
            const current = prev || [];
            if (current.includes(subjectId)) {
                return current.filter(id => id !== subjectId);
            } else {
                return [...current, subjectId];
            }
        });
    };

    const calculateMonthlyFees = () => {
        if (!board || !Array.isArray(board.subjects) || !selectedSubjectIds || selectedSubjectIds.length === 0) return 0;

        const selectedSubs = board.subjects.filter(s => {
            if (!s.subjectId) return false;
            const subId = typeof s.subjectId === 'object' ? s.subjectId._id : s.subjectId;
            return selectedSubjectIds.includes(subId);
        });

        const monthlyFees = selectedSubs.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
        const cgst = Math.round(monthlyFees * 0.09);
        const sgst = Math.round(monthlyFees * 0.09);

        return monthlyFees + cgst + sgst;
    };

    const handleViewBill = (monthData) => {
        setSelectedInstallment({
            installmentNumber: 0,
            billingMonth: monthData.month,
            receivedDate: monthData.receivedDate || new Date()
        });
        setShowBillModal(true);
    };

    useEffect(() => {
        const fees = calculateMonthlyFees();
        setPaymentAmount(fees);
    }, [selectedSubjectIds, board]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (selectedSubjectIds.length === 0) {
            toast.error('Please select at least one subject');
            return;
        }

        if (!billingMonth) {
            toast.error('Please select a billing month');
            return;
        }

        setProcessing(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}/admission/${admissionId}/monthly-bill`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    selectedSubjectIds,
                    billingMonth,
                    paymentAmount,
                    paymentMethod,
                    transactionId,
                    receivedDate,
                    accountHolderName,
                    chequeDate
                })
            });

            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }

            if (response.ok) {
                toast.success('Monthly bill generated successfully!');
                await fetchAdmissionData();
                navigate('/enrolled-students');
            } else {
                console.error("Server Error:", data);
                toast.error(data.message || 'Failed to generate bill. Please check console.');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Submission failed: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdateSubjects = async () => {
        if (selectedSubjectIds.length === 0) {
            toast.error('Please select at least one subject');
            return;
        }
        if (!billingMonth) {
            toast.error('Please select a month to update');
            return;
        }

        setProcessing(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}/admission/${admissionId}/board-subjects`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    selectedSubjectIds,
                    billingMonth
                })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Subjects updated successfully!');
                await fetchAdmissionData();
            } else {
                toast.error(data.message || 'Failed to update subjects');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('An error occurred');
        } finally {
            setProcessing(false);
        }
    };

    const handleMonthSelect = (month) => {
        if (month.isPaid) {
            toast.info("This month is already paid. Subjects cannot be changed.");
            return;
        }
        setBillingMonth(month.month);

        let subjectsToSet = month.subjects?.map(s => s.subject?._id || s.subject) || [];

        // Logical Inheritance: If no subjects selected for this month, try to inherit from previous non-empty month
        if (subjectsToSet.length === 0) {
            const currentIndex = monthlyBreakdown.findIndex(m => m.month === month.month);
            // Search backwards for first month with subjects
            for (let i = currentIndex - 1; i >= 0; i--) {
                if (monthlyBreakdown[i].subjects && monthlyBreakdown[i].subjects.length > 0) {
                    subjectsToSet = monthlyBreakdown[i].subjects.map(s => s.subject?._id || s.subject || s._id);
                    toast.info(`Subjects inherited from ${monthlyBreakdown[i].monthName}`);
                    break;
                }
            }

            // If still empty, use current admission's default subjects
            if (subjectsToSet.length === 0 && admission.selectedSubjects) {
                subjectsToSet = admission.selectedSubjects.map(s => s.subject?._id || s.subject);
            }
        }

        setSelectedSubjectIds(subjectsToSet);
        // Scroll to top of form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const isFutureMonth = (monthStr) => {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        return monthStr >= currentMonth;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0a0e1a]">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    if (!admission || admission.admissionType !== 'BOARD') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0a0e1a]">
                <div className="text-white text-xl">This feature is only available for Board courses</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0e1a] p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/enrolled-students')}
                            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
                            title="Back to Students"
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Edit Board Course Subjects</h1>
                            <p className="text-gray-400 text-sm mt-1">
                                Student: {admission.student?.studentsDetails?.[0]?.studentName} |
                                Board: {board?.boardCourse}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Subject Selection & Payment */}
                    <div className="bg-[#1a1f24] p-6 rounded-lg border border-gray-800">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Generate Monthly Bill</h2>
                            <div className="flex gap-2">
                                <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded border border-cyan-500/30 uppercase font-bold">
                                    Step 1: Select Month
                                </span>
                                <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-1 rounded border border-purple-500/30 uppercase font-bold">
                                    Step 2: Update Subjects
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Billing Month */}
                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Billing Month *</label>
                                <input
                                    type="month"
                                    value={billingMonth}
                                    onChange={(e) => setBillingMonth(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    required
                                />
                            </div>

                            {/* Subject Selection */}
                            <div>
                                <label className="block text-gray-400 mb-2 text-sm font-semibold">
                                    Select Subjects for {board?.boardCourse}
                                </label>
                                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-2">
                                    {!board || !board.subjects || board.subjects.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
                                            <FaExclamationCircle className="mx-auto mb-2 text-xl" />
                                            <p className="text-sm italic">No subjects configured for this board.</p>
                                            <p className="text-[10px] mt-1 uppercase">Please check Master Data &gt; Boards</p>
                                        </div>
                                    ) : (
                                        board.subjects.map((item, idx) => {
                                            const subject = item.subjectId;
                                            if (!subject) return null;

                                            const subId = typeof subject === 'object' ? subject._id : subject;
                                            const subName = typeof subject === 'object' ? subject.subName : `Subject (${subId})`;

                                            return (
                                                <label
                                                    key={subId || idx}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedSubjectIds.includes(subId)
                                                        ? 'bg-cyan-500/10 border-cyan-500 ring-1 ring-cyan-500/30'
                                                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSubjectIds.includes(subId)}
                                                        onChange={() => handleSubjectChange(subId)}
                                                        className="w-4 h-4 text-cyan-500 rounded focus:ring-cyan-500 bg-gray-700 border-gray-600"
                                                    />
                                                    <div className="flex-1">
                                                        <span className="block text-white text-sm font-medium">{subName}</span>
                                                        <span className="block text-cyan-400 text-xs font-bold">
                                                            ₹{item.price?.toLocaleString() || 0}
                                                        </span>
                                                    </div>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Monthly Amount */}
                            <div className="bg-cyan-900/20 p-4 rounded-lg border border-cyan-500/30">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Monthly Amount (with GST)</span>
                                    <span className="text-cyan-400 text-xl font-bold">₹{paymentAmount.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Payment Method *</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="CARD">Card</option>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                    <option value="CHEQUE">Cheque</option>
                                </select>
                            </div>

                            {/* Received Date */}
                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Received Date *</label>
                                <input
                                    type="date"
                                    value={receivedDate}
                                    onChange={(e) => setReceivedDate(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    required
                                />
                                <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">The actual date money was received</p>
                            </div>

                            {/* Conditional Fields based on Selection */}
                            {(paymentMethod === "CHEQUE" || paymentMethod === "BANK_TRANSFER") ? (
                                <div className="space-y-4 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-400 mb-2 text-sm text-xs uppercase font-bold tracking-wider">Cheque No / Transaction ID *</label>
                                            <input
                                                type="text"
                                                value={transactionId}
                                                onChange={(e) => setTransactionId(e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                                placeholder="Enter reference number"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 mb-2 text-sm text-xs uppercase font-bold tracking-wider">Cheque/Payment Date *</label>
                                            <input
                                                type="date"
                                                value={chequeDate}
                                                onChange={(e) => setChequeDate(e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 mb-2 text-sm text-xs uppercase font-bold tracking-wider">Bank Name *</label>
                                        <input
                                            type="text"
                                            value={accountHolderName}
                                            onChange={(e) => setAccountHolderName(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                            placeholder="e.g. HDFC, ICICI, SBI..."
                                            required
                                        />
                                    </div>
                                </div>
                            ) : (
                                paymentMethod !== 'CASH' && (
                                    <div>
                                        <label className="block text-gray-400 mb-2 text-sm">Transaction ID / Ref *</label>
                                        <input
                                            type="text"
                                            value={transactionId}
                                            onChange={(e) => setTransactionId(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                            placeholder="Enter reference number"
                                            required
                                        />
                                    </div>
                                )
                            )}

                            {/* Submit Buttons */}
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <button
                                    type="button"
                                    onClick={handleUpdateSubjects}
                                    disabled={processing}
                                    className="bg-gray-800 hover:bg-gray-700 text-cyan-400 font-semibold py-3 px-6 rounded-lg border border-cyan-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    <FaSave /> {processing ? 'Processing...' : 'Update Subjects Only'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                                >
                                    <FaMoneyBillWave /> {processing ? 'Processing...' : 'Pay & Gen Bill'}
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-500 text-center uppercase font-bold">
                                'Update Subjects Only' will only save selections for the chosen month without recording payment.
                            </p>
                        </form>
                    </div>

                    {/* Right: Monthly Breakdown */}
                    <div className="bg-[#1a1f24] p-6 rounded-lg border border-gray-800">
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <FaCalendar className="text-cyan-500" />
                            Monthly Breakdown
                        </h2>

                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {monthlyBreakdown.map((month, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleMonthSelect(month)}
                                    className={`p-4 rounded-lg border transition-all cursor-pointer ${month.isPaid
                                        ? 'bg-green-900/10 border-green-500/20'
                                        : billingMonth === month.month
                                            ? 'bg-cyan-500/20 border-cyan-500 ring-1 ring-cyan-500'
                                            : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'
                                        } ${!month.isPaid && isFutureMonth(month.month) ? 'hover:scale-[1.02]' : ''}`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-white font-semibold">{month.monthName}</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${month.isPaid ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'
                                            }`}>
                                            {month.isPaid ? 'PAID' : 'PENDING'}
                                        </span>
                                    </div>

                                    {month.subjects.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            <p className="text-gray-400 text-xs">Subjects:</p>
                                            {month.subjects.map((sub, idx) => (
                                                <div key={idx} className="flex justify-between text-sm">
                                                    <span className="text-gray-300">{sub.name}</span>
                                                    <span className="text-cyan-400">₹{sub.price}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-3 pt-2 border-t border-gray-700 flex justify-between items-center">
                                        <div>
                                            <span className="text-gray-400 block text-[10px] uppercase">Total Amount</span>
                                            <span className="text-white font-bold">₹{month.totalAmount?.toLocaleString() || 0}</span>
                                        </div>
                                        {month.isPaid && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewBill(month);
                                                }}
                                                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold py-1.5 px-3 rounded border border-cyan-500/30 flex items-center gap-1 transition-all"
                                            >
                                                <FaFileInvoice /> View Bill
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary */}
                        <div className="mt-6 p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400 uppercase font-bold text-[10px]">Total Paid Amount</span>
                                <span className="text-cyan-400 font-bold">₹{admission?.totalPaidAmount?.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm mt-1">
                                <span className="text-gray-400 uppercase font-bold text-[10px]">Remaining Balance</span>
                                <span className="text-red-400 font-bold">₹{admission?.remainingAmount?.toLocaleString() || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bill Modal */}
            {showBillModal && (
                <BillGenerator
                    admission={admission}
                    installment={selectedInstallment}
                    onClose={() => setShowBillModal(false)}
                />
            )}
        </div>
    );
};

export default EditBoardSubjects;
