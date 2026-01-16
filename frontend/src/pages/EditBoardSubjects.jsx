import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaSave, FaCalendar } from 'react-icons/fa';

const EditBoardSubjects = () => {
    const { admissionId } = useParams();
    const navigate = useNavigate();
    const apiUrl = import.meta.env.VITE_API_URL;

    const [loading, setLoading] = useState(true);
    const [admission, setAdmission] = useState(null);
    const [board, setBoard] = useState(null);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
    const [billingMonth, setBillingMonth] = useState('');
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [transactionId, setTransactionId] = useState('');
    const [receivedDate, setReceivedDate] = useState('');
    const [monthlyBreakdown, setMonthlyBreakdown] = useState([]);

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
                setBoard(admissionData.board);
                setSelectedSubjectIds(admissionData.selectedSubjects?.map(s => s.subject._id || s.subject) || []);
            }

            // Fetch monthly breakdown
            const breakdownRes = await fetch(`${apiUrl}/admission/${admissionId}/monthly-breakdown`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const breakdownData = await breakdownRes.json();

            if (breakdownRes.ok) {
                setMonthlyBreakdown(breakdownData.monthlyBreakdown || []);
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
            if (prev.includes(subjectId)) {
                return prev.filter(id => id !== subjectId);
            } else {
                return [...prev, subjectId];
            }
        });
    };

    const calculateMonthlyFees = () => {
        if (!board || selectedSubjectIds.length === 0) return 0;

        const selectedSubs = board.subjects.filter(s =>
            s.subjectId && selectedSubjectIds.includes(s.subjectId._id)
        );

        const monthlyFees = selectedSubs.reduce((sum, s) => sum + (s.price || 0), 0);
        const cgst = Math.round(monthlyFees * 0.09);
        const sgst = Math.round(monthlyFees * 0.09);

        return monthlyFees + cgst + sgst;
    };

    useEffect(() => {
        setPaymentAmount(calculateMonthlyFees());
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
                    receivedDate
                })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Monthly bill generated successfully!');
                fetchAdmissionData(); // Refresh data
                // Reset form
                setBillingMonth('');
                setTransactionId('');
                setReceivedDate('');
            } else {
                toast.error(data.message || 'Failed to generate bill');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('An error occurred');
        }
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
                        <h2 className="text-xl font-semibold text-white mb-4">Generate Monthly Bill</h2>

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
                                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                                    {board?.subjects?.map((item) => {
                                        const subject = item.subjectId;
                                        if (!subject) return null;

                                        return (
                                            <label
                                                key={subject._id}
                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedSubjectIds.includes(subject._id)
                                                        ? 'bg-cyan-500/10 border-cyan-500'
                                                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSubjectIds.includes(subject._id)}
                                                    onChange={() => handleSubjectChange(subject._id)}
                                                    className="w-4 h-4 text-cyan-500 rounded focus:ring-cyan-500 bg-gray-700 border-gray-600"
                                                />
                                                <div className="flex-1">
                                                    <span className="block text-white text-sm font-medium">{subject.subName}</span>
                                                    <span className="block text-cyan-400 text-xs font-bold">
                                                        ₹{item.price?.toLocaleString() || 0}
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })}
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

                            {/* Transaction ID */}
                            {paymentMethod !== 'CASH' && (
                                <div>
                                    <label className="block text-gray-400 mb-2 text-sm">Transaction ID / Ref</label>
                                    <input
                                        type="text"
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                        placeholder="Optional"
                                    />
                                </div>
                            )}

                            {/* Received Date */}
                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Received Date</label>
                                <input
                                    type="date"
                                    value={receivedDate}
                                    onChange={(e) => setReceivedDate(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all"
                            >
                                <FaSave /> Generate Bill & Record Payment
                            </button>
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
                                    className={`p-4 rounded-lg border ${month.isPaid
                                            ? 'bg-green-900/20 border-green-500/30'
                                            : 'bg-gray-800 border-gray-700'
                                        }`}
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

                                    <div className="mt-3 pt-2 border-t border-gray-700 flex justify-between">
                                        <span className="text-gray-400">Total Amount</span>
                                        <span className="text-white font-bold">₹{month.totalAmount?.toLocaleString() || 0}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditBoardSubjects;
