import React, { useState } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaMoneyBillWave, FaCheckCircle, FaClock, FaExclamationTriangle, FaFileInvoice } from "react-icons/fa";
import { toast } from "react-toastify";

const InstallmentPayment = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [financialData, setFinancialData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Search for students
    const handleSearch = async () => {
        if (!searchTerm || searchTerm.trim().length < 2) {
            toast.error("Please enter at least 2 characters to search");
            return;
        }

        setSearching(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/search?searchTerm=${encodeURIComponent(searchTerm)}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setSearchResults(data);
                if (data.length === 0) {
                    toast.info("No students found");
                }
            } else {
                toast.error("Search failed");
            }
        } catch (error) {
            console.error("Search Error:", error);
            toast.error("Error searching students");
        } finally {
            setSearching(false);
        }
    };

    // Get complete financial details
    const handleSelectStudent = async (studentId) => {
        setLoading(true);
        setSearchResults([]);
        setSearchTerm("");

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/student/${studentId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setFinancialData(data);
                setSelectedStudent(data.studentInfo);
            } else {
                toast.error("Failed to load financial details");
            }
        } catch (error) {
            console.error("Load Error:", error);
            toast.error("Error loading financial details");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "PAID":
            case "COMPLETED":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-emerald-500 bg-emerald-500/10 border-emerald-500/20 inline-flex items-center gap-1"><FaCheckCircle /> {status}</span>;
            case "PENDING":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-yellow-500 bg-yellow-500/10 border-yellow-500/20 inline-flex items-center gap-1"><FaClock /> {status}</span>;
            case "OVERDUE":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-1"><FaExclamationTriangle /> {status}</span>;
            case "PARTIAL":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-orange-500 bg-orange-500/10 border-orange-500/20 inline-flex items-center gap-1"><FaClock /> {status}</span>;
            case "PENDING_CLEARANCE":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-yellow-500 bg-yellow-500/10 border-yellow-500/20 inline-flex items-center gap-1"><FaClock /> IN PROGRESS</span>;
            case "REJECTED":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-1"><FaExclamationTriangle /> REJECTED</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-gray-500 bg-gray-500/10 border-gray-500/20">{status}</span>;
        }
    };

    // Payment Modal State
    const [showPayModal, setShowPayModal] = useState(false);
    const [activeInstallment, setActiveInstallment] = useState(null);
    const [activeAdmissionId, setActiveAdmissionId] = useState(null);
    const [payFormData, setPayFormData] = useState({
        paidAmount: 0,
        paymentMethod: "CASH",
        transactionId: "",
        accountHolderName: "",
        chequeDate: "",
        remarks: ""
    });

    const handleOpenPayModal = (admissionId, inst) => {
        setActiveAdmissionId(admissionId);
        setActiveInstallment(inst);
        setPayFormData({
            paidAmount: inst.amount,
            paymentMethod: "CASH",
            transactionId: "",
            accountHolderName: "",
            chequeDate: "",
            remarks: ""
        });
        setShowPayModal(true);
    };

    const handleRecordPayment = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/admission/update-payment-installment/${activeAdmissionId}/${activeInstallment.installmentNumber}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payFormData)
                }
            );

            if (response.ok) {
                toast.success(payFormData.paymentMethod === "CHEQUE" ? "Cheque recorded! Pending clearance." : "Payment successful!");
                setShowPayModal(false);
                // Refresh data
                fetchFinancialDetails(selectedStudent.studentId);
            } else {
                const err = await response.json();
                toast.error(err.message || "Failed to record payment");
            }
        } catch (error) {
            console.error("Payment Error:", error);
            toast.error("Error connecting to server");
        }
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">
                        Installment <span className="text-cyan-500">Payment</span>
                    </h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                        Search Student & View Complete Financial Details
                    </p>
                </div>

                {/* Search Section */}
                <div className="bg-[#131619] border border-gray-800 rounded-2xl p-8 mb-8">
                    <div className="flex gap-4">
                        <div className="flex-1 relative group">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="SEARCH BY NAME, EMAIL, OR ADMISSION NUMBER..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-gray-200 font-bold text-sm uppercase tracking-wider outline-none focus:border-cyan-500/50 transition-all"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={searching}
                            className="px-8 py-4 bg-cyan-500 text-black font-black uppercase text-sm tracking-widest rounded-xl hover:bg-cyan-400 transition-all disabled:opacity-50"
                        >
                            {searching ? "Searching..." : "Search"}
                        </button>
                    </div>

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                        <div className="mt-4 bg-black/40 border border-gray-800 rounded-xl overflow-hidden">
                            {searchResults.map((result, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleSelectStudent(result.studentId)}
                                    className="p-4 hover:bg-cyan-500/10 cursor-pointer border-b border-gray-800 last:border-b-0 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-white font-bold">{result.studentName}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {result.email} • {result.mobile}
                                                {result.admissionNumber && <span className="ml-2 text-cyan-500">• {result.admissionNumber}</span>}
                                            </div>
                                        </div>
                                        {result.course && (
                                            <div className="text-xs text-gray-500 font-bold uppercase">{result.course}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center p-20">
                        <div className="animate-spin h-12 w-12 border-t-2 border-cyan-500 rounded-full"></div>
                    </div>
                )}

                {/* Financial Details */}
                {!loading && financialData && (
                    <>
                        {/* Student Info Card */}
                        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-8 mb-8">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-3xl font-black text-white mb-2">{selectedStudent.name}</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <FaEnvelope className="text-cyan-500" />
                                            {selectedStudent.email}
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <FaPhone className="text-cyan-500" />
                                            {selectedStudent.mobile}
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <FaMapMarkerAlt className="text-cyan-500" />
                                            {selectedStudent.centre}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setFinancialData(null);
                                        setSelectedStudent(null);
                                    }}
                                    className="px-6 py-3 bg-gray-800 text-gray-300 font-bold uppercase text-xs rounded-xl hover:bg-gray-700 transition-all"
                                >
                                    Clear
                                </button>
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Total Admissions</div>
                                    <div className="text-2xl font-black text-white">{financialData.summary.totalAdmissions}</div>
                                </div>
                                <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Total Fees</div>
                                    <div className="text-2xl font-black text-white">₹{financialData.summary.totalFeesAcrossAll.toLocaleString()}</div>
                                </div>
                                <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-4">
                                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Total Paid</div>
                                    <div className="text-2xl font-black text-emerald-500">₹{financialData.summary.totalPaidAcrossAll.toLocaleString()}</div>
                                </div>
                                <div className="bg-black/40 border border-orange-500/20 rounded-xl p-4">
                                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Total Remaining</div>
                                    <div className="text-2xl font-black text-orange-500">₹{financialData.summary.totalRemainingAcrossAll.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* Admissions List */}
                        {financialData.admissions.map((admission, admIndex) => (
                            <div key={admIndex} className="bg-[#131619] border border-gray-800 rounded-2xl p-8 mb-6">
                                {/* Admission Header */}
                                <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-800">
                                    <div>
                                        <div className="flex items-center gap-4 mb-3">
                                            <h3 className="text-2xl font-black text-white">{admission.course}</h3>
                                            {getStatusBadge(admission.paymentStatus)}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500 text-xs uppercase block mb-1">Admission No.</span>
                                                <span className="text-cyan-500 font-black">{admission.admissionNumber}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 text-xs uppercase block mb-1">Date</span>
                                                <span className="text-white font-bold">{new Date(admission.admissionDate).toLocaleDateString('en-IN')}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 text-xs uppercase block mb-1">Session</span>
                                                <span className="text-white font-bold">{admission.academicSession}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 text-xs uppercase block mb-1">Centre</span>
                                                <span className="text-white font-bold">{admission.centre}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Fee Breakdown */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Base Fees</div>
                                        <div className="text-lg font-black text-white">₹{admission.baseFees.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Discount</div>
                                        <div className="text-lg font-black text-red-500">-₹{admission.discountAmount.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">GST</div>
                                        <div className="text-lg font-black text-white">₹{(admission.cgstAmount + admission.sgstAmount).toLocaleString()}</div>
                                    </div>
                                    <div className="bg-black/40 border border-cyan-500/20 rounded-xl p-4">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Total Fees</div>
                                        <div className="text-lg font-black text-cyan-500">₹{admission.totalFees.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-4">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Down Payment</div>
                                        <div className="text-lg font-black text-emerald-500">₹{admission.downPayment.toLocaleString()}</div>
                                    </div>
                                </div>

                                {/* Installment Details */}
                                <div className="mb-6">
                                    <h4 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                                        <FaFileInvoice className="text-cyan-500" />
                                        Installment Schedule
                                    </h4>
                                    <div className="bg-black/40 border border-gray-800 rounded-xl overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-900/50 border-b border-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                    <th className="p-4">Installment #</th>
                                                    <th className="p-4">Due Date</th>
                                                    <th className="p-4">Amount</th>
                                                    <th className="p-4">Paid Amount</th>
                                                    <th className="p-4">Payment Method</th>
                                                    <th className="p-4">Paid Date</th>
                                                    <th className="p-4">Status</th>
                                                    <th className="p-4 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800">
                                                {admission.paymentBreakdown && admission.paymentBreakdown.map((installment, idx) => (
                                                    <tr key={idx} className="hover:bg-cyan-500/[0.02] transition-colors">
                                                        <td className="p-4 text-cyan-500 font-black">#{installment.installmentNumber}</td>
                                                        <td className="p-4 text-gray-300">{new Date(installment.dueDate).toLocaleDateString('en-IN')}</td>
                                                        <td className="p-4 text-white font-bold">₹{installment.amount.toLocaleString()}</td>
                                                        <td className="p-4 text-emerald-400 font-bold">₹{installment.paidAmount?.toLocaleString() || 0}</td>
                                                        <td className="p-4 text-gray-400">{installment.paymentMethod || "-"}</td>
                                                        <td className="p-4 text-gray-300">{installment.paidDate ? new Date(installment.paidDate).toLocaleDateString('en-IN') : "-"}</td>
                                                        <td className="p-4">{getStatusBadge(installment.status)}</td>
                                                        <td className="p-4 text-right">
                                                            {(installment.status === "PENDING" || installment.status === "OVERDUE") && (
                                                                <button
                                                                    onClick={() => handleOpenPayModal(admission.admissionId, installment)}
                                                                    className="px-3 py-1 bg-cyan-500 text-black font-black text-[10px] uppercase rounded hover:bg-cyan-400 transition-all"
                                                                >
                                                                    Pay
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Payment History */}
                                {admission.paymentHistory && admission.paymentHistory.length > 0 && (
                                    <div>
                                        <h4 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                                            <FaMoneyBillWave className="text-emerald-500" />
                                            Payment History ({admission.paymentHistory.length} Transactions)
                                        </h4>
                                        <div className="bg-black/40 border border-gray-800 rounded-xl overflow-hidden">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-900/50 border-b border-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                        <th className="p-4">Date</th>
                                                        <th className="p-4">Installment #</th>
                                                        <th className="p-4">Amount</th>
                                                        <th className="p-4">Method</th>
                                                        <th className="p-4">Transaction ID</th>
                                                        <th className="p-4">Bill ID</th>
                                                        <th className="p-4">Recorded By</th>
                                                        <th className="p-4">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-800">
                                                    {admission.paymentHistory.map((payment, idx) => (
                                                        <tr key={idx} className="hover:bg-emerald-500/[0.02] transition-colors">
                                                            <td className="p-4 text-gray-300">{new Date(payment.createdAt).toLocaleDateString('en-IN')}</td>
                                                            <td className="p-4 text-cyan-500 font-black">#{payment.installmentNumber}</td>
                                                            <td className="p-4 text-white font-bold">₹{payment.paidAmount.toLocaleString()}</td>
                                                            <td className="p-4 text-gray-400">{payment.paymentMethod}</td>
                                                            <td className="p-4 text-gray-400 font-mono text-xs">{payment.transactionId || "-"}</td>
                                                            <td className="p-4 text-cyan-500 font-mono text-xs">{payment.billId || "-"}</td>
                                                            <td className="p-4 text-gray-400">{payment.recordedBy || "-"}</td>
                                                            <td className="p-4">{getStatusBadge(payment.status)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </>
                )}

                {/* Empty State */}
                {!loading && !financialData && (
                    <div className="text-center p-20">
                        <FaSearch className="text-6xl text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">
                            Search for a student to view their complete financial details
                        </p>
                    </div>
                )}

                {/* Record Payment Modal */}
                {showPayModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#131619] border border-gray-800 w-full max-w-lg rounded-[2rem] overflow-hidden animate-in fade-in zoom-in duration-300">
                            <div className="p-8 border-b border-gray-800 bg-gradient-to-r from-cyan-500/10 to-transparent">
                                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Record <span className="text-cyan-500">Payment</span></h2>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Installment # {activeInstallment?.installmentNumber}</p>
                            </div>

                            <div className="p-8 grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Amount to Pay (₹)</label>
                                    <input
                                        type="number"
                                        value={payFormData.paidAmount}
                                        onChange={(e) => setPayFormData({ ...payFormData, paidAmount: e.target.value })}
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold outline-none focus:border-cyan-500/50 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Payment Method</label>
                                    <select
                                        value={payFormData.paymentMethod}
                                        onChange={(e) => setPayFormData({ ...payFormData, paymentMethod: e.target.value })}
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold outline-none focus:border-cyan-500/50 transition-all appearance-none"
                                    >
                                        <option value="CASH">CASH</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CARD">CARD</option>
                                        <option value="BANK_TRANSFER">BANK TRANSFER</option>
                                        <option value="CHEQUE">CHEQUE</option>
                                    </select>
                                </div>

                                {payFormData.paymentMethod === "CHEQUE" ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cheque Number</label>
                                                <input
                                                    type="text"
                                                    value={payFormData.transactionId}
                                                    onChange={(e) => setPayFormData({ ...payFormData, transactionId: e.target.value })}
                                                    className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-cyan-500/50 transition-all"
                                                    placeholder="CHQXXXXXX"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cheque Date</label>
                                                <input
                                                    type="date"
                                                    value={payFormData.chequeDate}
                                                    onChange={(e) => setPayFormData({ ...payFormData, chequeDate: e.target.value })}
                                                    className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-cyan-500/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Bank Name</label>
                                            <input
                                                type="text"
                                                value={payFormData.accountHolderName}
                                                onChange={(e) => setPayFormData({ ...payFormData, accountHolderName: e.target.value })}
                                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-cyan-500/50 transition-all"
                                                placeholder="e.g. HDFC, SBI..."
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Ref / Transaction ID</label>
                                        <input
                                            type="text"
                                            value={payFormData.transactionId}
                                            onChange={(e) => setPayFormData({ ...payFormData, transactionId: e.target.value })}
                                            className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-cyan-500/50 transition-all"
                                            placeholder="Optional"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Remarks</label>
                                    <textarea
                                        value={payFormData.remarks}
                                        onChange={(e) => setPayFormData({ ...payFormData, remarks: e.target.value })}
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-cyan-500/50 transition-all resize-none h-20"
                                    />
                                </div>
                            </div>

                            <div className="p-8 border-t border-gray-800 flex gap-4 bg-black/40">
                                <button
                                    onClick={() => setShowPayModal(false)}
                                    className="flex-1 py-3 bg-gray-800 text-gray-300 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-gray-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRecordPayment}
                                    className="flex-1 py-3 bg-cyan-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
                                >
                                    Confirm Payment
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default InstallmentPayment;
