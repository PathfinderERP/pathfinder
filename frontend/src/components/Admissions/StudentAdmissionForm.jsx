import React, { useState, useEffect } from "react";
import { FaArrowLeft, FaSave } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "../../context/ThemeContext";

const StudentAdmissionForm = () => {
    const navigate = useNavigate();
    const { studentId } = useParams();
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

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
        // eslint-disable-next-line
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
            <div className={`flex-1 p-6 flex items-center justify-center ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
                <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Loading student details...</p>
            </div>
        );
    }

    const details = student.studentsDetails?.[0] || {};
    const exam = student.examSchema?.[0] || {};
    const status = student.studentStatus?.[0] || {};

    return (
        <div className={`flex-1 p-6 overflow-y-auto ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
            <ToastContainer position="top-right" autoClose={3000} theme={isDarkMode ? "dark" : "colored"} />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/admissions")}
                        className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-[#1a1f24] text-gray-300 hover:bg-gray-800' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'}`}
                    >
                        <FaArrowLeft />
                    </button>
                    <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Student Admission</h2>
                </div>
            </div>

            {/* Student Information Card */}
            <div className={`p-6 rounded-xl border mb-6 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Student Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Name</p>
                        <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{details.studentName || "N/A"}</p>
                    </div>
                    <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Class</p>
                        <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{exam.class || "N/A"}</p>
                    </div>
                    <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>School</p>
                        <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{details.schoolName || "N/A"}</p>
                    </div>
                    <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Mobile</p>
                        <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{details.mobileNum || "N/A"}</p>
                    </div>
                    <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Lead Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${status.status === "Hot" ? "bg-red-500/10 text-red-500" :
                            status.status === "Cold" ? "bg-blue-500/10 text-blue-500" :
                                "bg-gray-500/10 text-gray-500"
                            }`}>
                            {status.status || "N/A"}
                        </span>
                    </div>
                    <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Science/Math %</p>
                        <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{exam.scienceMathParcent || "N/A"}</p>
                    </div>
                </div>
            </div>

            {/* Admission Form */}
            <form onSubmit={handleSubmit} className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <h3 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Admission Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <div>
                        <label className={`block text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Admission Date *</label>
                        <input
                            type="date"
                            name="admissionDate"
                            required
                            value={admissionData.admissionDate}
                            onChange={handleChange}
                            className={`border rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Batch Name *</label>
                        <input
                            type="text"
                            name="batchName"
                            required
                            value={admissionData.batchName}
                            onChange={handleChange}
                            placeholder="e.g., JEE-2025-A"
                            className={`border rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Fee Amount *</label>
                        <input
                            type="number"
                            name="feeAmount"
                            required
                            value={admissionData.feeAmount}
                            onChange={handleChange}
                            placeholder="Enter fee amount"
                            className={`border rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Payment Mode *</label>
                        <select
                            name="paymentMode"
                            required
                            value={admissionData.paymentMode}
                            onChange={handleChange}
                            className={`border rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
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
                            <label className={`block text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Transaction ID *
                                <span className="text-xs text-cyan-500 ml-2">(Required for online payments)</span>
                            </label>
                            <input
                                type="text"
                                name="transactionId"
                                required
                                value={admissionData.transactionId}
                                onChange={handleChange}
                                placeholder="Enter transaction ID"
                                className={`border rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                            />
                        </div>
                    )}

                    <div>
                        <label className={`block text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Receipt Number *</label>
                        <input
                            type="text"
                            name="receiptNumber"
                            required
                            value={admissionData.receiptNumber}
                            onChange={handleChange}
                            placeholder="e.g., RCP-2025-1001"
                            className={`border rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Remarks</label>
                        <input
                            type="text"
                            name="remarks"
                            value={admissionData.remarks}
                            onChange={handleChange}
                            placeholder="Optional remarks"
                            className={`border rounded-lg px-4 py-3 w-full focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-cyan-500 text-black font-semibold py-3 rounded-lg hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                    <FaSave />
                    {loading ? "Processing..." : "Confirm Admission"}
                </button>
            </form>
        </div>
    );
};

export default StudentAdmissionForm;
