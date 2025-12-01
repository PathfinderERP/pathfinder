import React, { useState, useEffect } from "react";
import { FaArrowLeft, FaSave } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const StudentAdmissionForm = () => {
    const navigate = useNavigate();
    const { studentId } = useParams();
    const [loading, setLoading] = useState(false);
    const [student, setStudent] = useState(null);

    const [admissionData, setAdmissionData] = useState({
        admissionDate: "",
        batchName: "",
        feeAmount: "",
        paymentMode: "",
        transactionId: "",
        receiptNumber: "",
        remarks: ""
    });

    useEffect(() => {
        fetchStudentDetails();
    }, [studentId]);

    const fetchStudentDetails = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/normalAdmin/getStudent/${studentId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setStudent(data);
            } else {
                toast.error("Failed to fetch student details");
            }
        } catch (error) {
            console.error("Error fetching student:", error);
            toast.error("Error loading student details");
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        // If payment mode is changing to Cash or Cheque, clear transaction ID
        if (name === "paymentMode" && (value === "Cash" || value === "Cheque")) {
            setAdmissionData({
                ...admissionData,
                [name]: value,
                transactionId: "" // Clear transaction ID for cash/cheque
            });
        } else {
            setAdmissionData({ ...admissionData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check if payment mode requires transaction ID
        const onlinePaymentModes = ["UPI", "Card", "Net Banking"];
        const isOnlinePayment = onlinePaymentModes.includes(admissionData.paymentMode);

        // Validate transaction ID for online payments
        if (isOnlinePayment && !admissionData.transactionId.trim()) {
            toast.error("Transaction ID is required for online payment methods");
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/normalAdmin/admitStudent/${studentId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(admissionData),
            });

            const result = await response.json();

            if (response.ok) {
                toast.success("Student admitted successfully! Enrollment status updated.");
                setTimeout(() => {
                    navigate("/admissions");
                }, 2000);
            } else {
                toast.error(result.message || "Failed to admit student");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("An error occurred while admitting student");
        } finally {
            setLoading(false);
        }
    };

    if (!student) {
        return (
            <div className="flex-1 p-6 bg-[#131619] flex items-center justify-center">
                <p className="text-white">Loading student details...</p>
            </div>
        );
    }

    const details = student.studentsDetails?.[0] || {};
    const exam = student.examSchema?.[0] || {};
    const status = student.studentStatus?.[0] || {};

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-[#131619]">
            <ToastContainer position="top-right" autoClose={3000} theme="dark" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/admissions")}
                        className="p-2 bg-[#1a1f24] text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        <FaArrowLeft />
                    </button>
                    <h2 className="text-2xl font-bold text-white">Student Admission</h2>
                </div>
            </div>

            {/* Student Information Card */}
            <div className="bg-[#1a1f24] p-6 rounded-xl border border-gray-800 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Student Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p className="text-gray-400 text-sm">Name</p>
                        <p className="text-white font-semibold">{details.studentName || "N/A"}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Class</p>
                        <p className="text-white font-semibold">{exam.class || "N/A"}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">School</p>
                        <p className="text-white font-semibold">{details.schoolName || "N/A"}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Mobile</p>
                        <p className="text-white font-semibold">{details.mobileNum || "N/A"}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Lead Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${status.status === "Hot" ? "bg-red-500/10 text-red-400" :
                            status.status === "Cold" ? "bg-blue-500/10 text-blue-400" :
                                "bg-gray-500/10 text-gray-400"
                            }`}>
                            {status.status || "N/A"}
                        </span>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Science/Math %</p>
                        <p className="text-white font-semibold">{exam.scienceMathParcent || "N/A"}</p>
                    </div>
                </div>
            </div>

            {/* Admission Form */}
            <form onSubmit={handleSubmit} className="bg-[#1a1f24] p-6 rounded-xl border border-gray-800">
                <h3 className="text-xl font-bold text-white mb-6">Admission Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Admission Date *</label>
                        <input
                            type="date"
                            name="admissionDate"
                            required
                            value={admissionData.admissionDate}
                            onChange={handleChange}
                            className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Batch Name *</label>
                        <input
                            type="text"
                            name="batchName"
                            required
                            value={admissionData.batchName}
                            onChange={handleChange}
                            placeholder="e.g., JEE-2025-A"
                            className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Fee Amount *</label>
                        <input
                            type="number"
                            name="feeAmount"
                            required
                            value={admissionData.feeAmount}
                            onChange={handleChange}
                            placeholder="Enter fee amount"
                            className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Payment Mode *</label>
                        <select
                            name="paymentMode"
                            required
                            value={admissionData.paymentMode}
                            onChange={handleChange}
                            className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full"
                        >
                            <option value="">Select Payment Mode</option>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                            <option value="Net Banking">Net Banking</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>

                    {/* Conditional Transaction ID field - only for online payments */}
                    {["UPI", "Card", "Net Banking"].includes(admissionData.paymentMode) && (
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">
                                Transaction ID *
                                <span className="text-xs text-cyan-400 ml-2">(Required for online payments)</span>
                            </label>
                            <input
                                type="text"
                                name="transactionId"
                                required
                                value={admissionData.transactionId}
                                onChange={handleChange}
                                placeholder="Enter transaction ID"
                                className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Receipt Number *</label>
                        <input
                            type="text"
                            name="receiptNumber"
                            required
                            value={admissionData.receiptNumber}
                            onChange={handleChange}
                            placeholder="e.g., RCP-2025-1001"
                            className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Remarks</label>
                        <input
                            type="text"
                            name="remarks"
                            value={admissionData.remarks}
                            onChange={handleChange}
                            placeholder="Optional remarks"
                            className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-cyan-500 text-black font-semibold py-3 rounded-lg hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2"
                >
                    <FaSave />
                    {loading ? "Processing..." : "Confirm Admission"}
                </button>
            </form>
        </div>
    );
};

export default StudentAdmissionForm;
