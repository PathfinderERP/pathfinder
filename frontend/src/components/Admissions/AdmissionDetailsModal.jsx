import React, { useState } from 'react';
import { FaTimes, FaUser, FaGraduationCap, FaMoneyBillWave, FaCalendar, FaCheckCircle, FaExclamationCircle, FaFileInvoice } from 'react-icons/fa';
import { toast } from 'react-toastify';
import BillGenerator from '../Finance/BillGenerator';

const AdmissionDetailsModal = ({ admission, onClose, onUpdate }) => {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedInstallment, setSelectedInstallment] = useState(null);
    const [paymentData, setPaymentData] = useState({
        paidAmount: 0,
        paymentMethod: "CASH",
        transactionId: "",
        remarks: ""
    });
    const [billModal, setBillModal] = useState({ show: false, admission: null, installment: null });

    const apiUrl = import.meta.env.VITE_API_URL;

    if (!admission) return null;

    const student = admission.student?.studentsDetails?.[0] || {};
    const guardian = admission.student?.guardians?.[0] || {};
    const exam = admission.student?.examSchema?.[0] || {};

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();

        // Check if payment method requires transaction ID
        const onlinePaymentMethods = ["UPI", "CARD", "BANK_TRANSFER"];
        const isOnlinePayment = onlinePaymentMethods.includes(paymentData.paymentMethod);

        // Validate transaction ID for online payments
        if (isOnlinePayment && !paymentData.transactionId.trim()) {
            toast.error("Transaction ID is required for online payment methods");
            return;
        }

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
                setShowPaymentModal(false);
                onUpdate();
            } else {
                toast.error(data.message || "Failed to update payment");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    const openPaymentModal = (installment) => {
        setSelectedInstallment(installment);
        setPaymentData({
            paidAmount: installment.amount,
            paymentMethod: "CASH",
            transactionId: "",
            remarks: ""
        });
        setShowPaymentModal(true);
    };

    const getInstallmentStatusColor = (status) => {
        switch (status) {
            case "PAID":
                return "bg-green-500/10 text-green-400";
            case "OVERDUE":
                return "bg-red-500/10 text-red-400";
            case "PENDING":
                return "bg-yellow-500/10 text-yellow-400";
            default:
                return "bg-gray-500/10 text-gray-400";
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto p-4">
                <div className="bg-[#1a1f24] rounded-lg w-full max-w-6xl border border-gray-700 shadow-xl max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-[#1a1f24] border-b border-gray-700 p-6 flex justify-between items-center z-10">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Admission Details</h2>
                            <p className="text-cyan-400 font-mono text-sm mt-1">{admission.admissionNumber}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    // Close this modal and open edit modal
                                    onClose();
                                    // You'll need to pass an onEdit callback from parent
                                    if (window.openEditModal) {
                                        window.openEditModal(admission);
                                    }
                                }}
                                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors flex items-center gap-2"
                            >
                                <FaUser />
                                Edit Student Details
                            </button>
                            <button onClick={onClose} className="text-gray-400 hover:text-white">
                                <FaTimes size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Student Information */}
                        <div className="bg-[#131619] p-6 rounded-lg border border-gray-800">
                            <div className="flex items-center gap-3 mb-4">
                                <FaUser className="text-cyan-400" />
                                <h3 className="text-xl font-semibold text-white">Student Information</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-gray-400 text-sm">Full Name</label>
                                    <p className="text-white font-medium">{student.studentName || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Email</label>
                                    <p className="text-white font-medium">{student.studentEmail || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Mobile</label>
                                    <p className="text-white font-medium">{student.mobileNum || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Date of Birth</label>
                                    <p className="text-white font-medium">{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Gender</label>
                                    <p className="text-white font-medium">{student.gender || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">School</label>
                                    <p className="text-white font-medium">{student.schoolName || "N/A"}</p>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-gray-400 text-sm">Address</label>
                                    <p className="text-white font-medium">{student.address || "N/A"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Guardian Information */}
                        <div className="bg-[#131619] p-6 rounded-lg border border-gray-800">
                            <h3 className="text-xl font-semibold text-white mb-4">Guardian Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-gray-400 text-sm">Guardian Name</label>
                                    <p className="text-white font-medium">{guardian.guardianName || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Qualification</label>
                                    <p className="text-white font-medium">{guardian.qualification || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Guardian Mobile</label>
                                    <p className="text-white font-medium">{guardian.guardianMobile || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Guardian Email</label>
                                    <p className="text-white font-medium">{guardian.guardianEmail || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Occupation</label>
                                    <p className="text-white font-medium">{guardian.occupation || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Annual Income</label>
                                    <p className="text-white font-medium">{guardian.annualIncome || "N/A"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Course & Academic Details */}
                        <div className="bg-[#131619] p-6 rounded-lg border border-gray-800">
                            <div className="flex items-center gap-3 mb-4">
                                <FaGraduationCap className="text-cyan-400" />
                                <h3 className="text-xl font-semibold text-white">Course & Academic Details</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-gray-400 text-sm">Course</label>
                                    <p className="text-white font-medium">{admission.course?.courseName || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Centre</label>
                                    <p className="text-white font-medium">{admission.department?.departmentName || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Class</label>
                                    <p className="text-white font-medium">{admission.class?.name || exam.class || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Exam Tag</label>
                                    <p className="text-white font-medium">{admission.examTag?.name || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Academic Session</label>
                                    <p className="text-white font-medium">{admission.academicSession}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Admission Date</label>
                                    <p className="text-white font-medium">{new Date(admission.admissionDate).toLocaleDateString()}</p>
                                </div>
                                {exam.scienceMathParcent && (
                                    <div>
                                        <label className="text-gray-400 text-sm">Science/Math %</label>
                                        <p className="text-white font-medium">{exam.scienceMathParcent}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Fee Structure */}
                        <div className="bg-[#131619] p-6 rounded-lg border border-gray-800">
                            <div className="flex items-center gap-3 mb-4">
                                <FaMoneyBillWave className="text-cyan-400" />
                                <h3 className="text-xl font-semibold text-white">Fee Structure</h3>
                            </div>
                            <div className="space-y-3">
                                {admission.feeStructureSnapshot?.map((fee, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 bg-gray-800 rounded">
                                        <span className="text-gray-300">{fee.feesType}</span>
                                        <div className="text-right">
                                            <span className="text-white font-medium">₹{fee.value?.toLocaleString()}</span>
                                            {fee.discount !== "0%" && (
                                                <span className="text-green-400 text-sm ml-2">({fee.discount} off)</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div className="border-t border-gray-700 my-2 pt-2 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Base Fees</span>
                                        <span className="text-white">₹{admission.baseFees?.toLocaleString()}</span>
                                    </div>
                                    {admission.discountAmount > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-green-400">Fee Waiver</span>
                                            <span className="text-green-400">-₹{admission.discountAmount?.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">CGST (9%)</span>
                                        <span className="text-white">₹{(admission.cgstAmount || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">SGST (9%)</span>
                                        <span className="text-white">₹{(admission.sgstAmount || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-cyan-500/20 rounded border border-cyan-500/50 mt-3">
                                    <span className="text-cyan-400 font-semibold">Total Fees</span>
                                    <span className="text-cyan-400 font-bold text-lg">₹{admission.totalFees?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-green-500/20 rounded">
                                    <span className="text-green-400">Down Payment</span>
                                    <span className="text-green-400 font-semibold">₹{admission.downPayment?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-yellow-500/20 rounded">
                                    <span className="text-yellow-400">Remaining Amount</span>
                                    <span className="text-yellow-400 font-semibold">₹{admission.remainingAmount?.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Schedule */}
                        <div className="bg-[#131619] p-6 rounded-lg border border-gray-800">
                            <div className="flex items-center gap-3 mb-4">
                                <FaCalendar className="text-cyan-400" />
                                <h3 className="text-xl font-semibold text-white">Payment Schedule</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-800 text-gray-400 text-sm">
                                            <th className="p-3 text-left">Installment</th>
                                            <th className="p-3 text-left">Due Date</th>
                                            <th className="p-3 text-left">Amount</th>
                                            <th className="p-3 text-left">Paid</th>
                                            <th className="p-3 text-left">Method</th>
                                            <th className="p-3 text-left">Status</th>
                                            <th className="p-3 text-left">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {admission.paymentBreakdown?.map((payment, index) => (
                                            <tr key={index} className="border-t border-gray-800">
                                                <td className="p-3 text-white">#{payment.installmentNumber}</td>
                                                <td className="p-3 text-gray-300">{new Date(payment.dueDate).toLocaleDateString()}</td>
                                                <td className="p-3 text-white font-medium">₹{payment.amount?.toLocaleString()}</td>
                                                <td className="p-3 text-green-400">₹{payment.paidAmount?.toLocaleString() || 0}</td>
                                                <td className="p-3 text-gray-300">{payment.paymentMethod || "-"}</td>
                                                <td className="p-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getInstallmentStatusColor(payment.status)}`}>
                                                        {payment.status}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    {payment.status !== "PAID" ? (
                                                        <button
                                                            onClick={() => openPaymentModal(payment)}
                                                            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition-colors"
                                                        >
                                                            Pay Now
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setBillModal({ show: true, admission: admission, installment: payment })}
                                                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-cyan-400 text-sm rounded transition-colors flex items-center gap-1"
                                                        >
                                                            <FaFileInvoice /> Bill
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Payment Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <FaCheckCircle className="text-green-400" />
                                    <span className="text-gray-400 text-sm">Total Paid</span>
                                </div>
                                <p className="text-green-400 text-2xl font-bold">₹{admission.totalPaidAmount?.toLocaleString()}</p>
                            </div>
                            <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <FaExclamationCircle className="text-yellow-400" />
                                    <span className="text-gray-400 text-sm">Pending</span>
                                </div>
                                <p className="text-yellow-400 text-2xl font-bold">
                                    ₹{(admission.totalFees - admission.totalPaidAmount)?.toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-cyan-500/10 p-4 rounded-lg border border-cyan-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-gray-400 text-sm">Payment Status</span>
                                </div>
                                <p className="text-cyan-400 text-xl font-bold">{admission.paymentStatus}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedInstallment && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
                    <div className="bg-[#1a1f24] p-6 rounded-lg w-full max-w-md border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Record Payment</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Installment #{selectedInstallment.installmentNumber}</label>
                                <p className="text-white">Due Amount: ₹{selectedInstallment.amount?.toLocaleString()}</p>
                            </div>
                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Paid Amount *</label>
                                <input
                                    type="number"
                                    value={paymentData.paidAmount}
                                    onChange={(e) => setPaymentData({ ...paymentData, paidAmount: parseFloat(e.target.value) })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Payment Method *</label>
                                <select
                                    value={paymentData.paymentMethod}
                                    onChange={(e) => {
                                        const newMethod = e.target.value;
                                        // Clear transaction ID if switching to Cash or Cheque
                                        if (newMethod === "CASH" || newMethod === "CHEQUE") {
                                            setPaymentData({ ...paymentData, paymentMethod: newMethod, transactionId: "" });
                                        } else {
                                            setPaymentData({ ...paymentData, paymentMethod: newMethod });
                                        }
                                    }}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="CARD">Card</option>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                    <option value="CHEQUE">Cheque</option>
                                </select>
                            </div>

                            {/* Conditional Transaction ID field - only for online payments */}
                            {["UPI", "CARD", "BANK_TRANSFER"].includes(paymentData.paymentMethod) && (
                                <div>
                                    <label className="block text-gray-400 mb-2 text-sm">
                                        Transaction ID *
                                        <span className="text-xs text-cyan-400 ml-2">(Required for online payments)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={paymentData.transactionId}
                                        onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                        placeholder="Enter transaction ID"
                                        required
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Remarks</label>
                                <textarea
                                    value={paymentData.remarks}
                                    onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    rows="2"
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg"
                                >
                                    Submit Payment
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
        </>
    );
};

export default AdmissionDetailsModal;
