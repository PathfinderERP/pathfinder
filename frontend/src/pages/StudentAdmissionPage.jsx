import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaArrowLeft, FaCalculator, FaMoneyBillWave, FaFileInvoice } from 'react-icons/fa';
import BillGenerator from '../components/Finance/BillGenerator';

const StudentAdmissionPage = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [student, setStudent] = useState(null);
    const [courses, setCourses] = useState([]);
    const [classes, setClasses] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);

    const [formData, setFormData] = useState({
        courseId: "",
        classId: "",
        examTagId: "",
        departmentId: "", // Optional, can be set from course
        centre: "", // New field
        academicSession: "",
        downPayment: 0,
        numberOfInstallments: 1,
        studentImage: "",
        remarks: "",
        feeWaiver: 0
    });

    const [feeBreakdown, setFeeBreakdown] = useState({
        baseFees: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        totalFees: 0,
        downPayment: 0,
        remainingAmount: 0,
        installmentAmount: 0,

        previousBalance: 0,
        paymentSchedule: []
    });

    const [billModal, setBillModal] = useState({ show: false, admission: null, installment: null });
    const [createdAdmission, setCreatedAdmission] = useState(null);

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (formData.courseId) {
            const course = courses.find(c => c._id === formData.courseId);
            setSelectedCourse(course);

            // Auto-set department from course if available
            if (course && course.department) {
                setFormData(prev => ({ ...prev, departmentId: course.department._id || course.department }));
            }

            if (course) {
                calculateFees(course);
            }
        }
    }, [formData.courseId, formData.downPayment, formData.numberOfInstallments, formData.feeWaiver]);

    // Pre-select course and set Centre when student/courses are loaded
    useEffect(() => {
        if (student) {
            // Set Centre from student details
            const studentCentre = student.studentsDetails?.[0]?.centre || "";

            setFormData(prev => ({
                ...prev,
                centre: studentCentre
            }));

            if (courses.length > 0 && !formData.courseId) {
                const registeredCourse = student.sessionExamCourse?.[0]?.targetExams;
                if (registeredCourse) {
                    // Try to find course by name
                    const matchedCourse = courses.find(c => c.courseName === registeredCourse);
                    if (matchedCourse) {
                        setFormData(prev => ({ ...prev, courseId: matchedCourse._id }));
                    }
                }
            }
        }
    }, [student, courses]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };

            const [studentRes, coursesRes, classesRes, tagsRes] = await Promise.all([
                fetch(`${apiUrl}/normalAdmin/getStudent/${studentId}`, { headers }),
                fetch(`${apiUrl}/course`, { headers }),
                fetch(`${apiUrl}/class`, { headers }),
                fetch(`${apiUrl}/examTag`, { headers })
            ]);

            if (studentRes.ok) setStudent(await studentRes.json());
            if (coursesRes.ok) setCourses(await coursesRes.json());
            if (classesRes.ok) setClasses(await classesRes.json());
            if (tagsRes.ok) setExamTags(await tagsRes.json());

        } catch (err) {
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    const calculateFees = (course) => {
        const baseFees = course.feesStructure.reduce((sum, fee) => sum + fee.value, 0);
        const feeWaiver = parseFloat(formData.feeWaiver) || 0;

        // Calculate Taxable Amount (Base Fees - Waiver)
        const taxableAmount = Math.max(0, baseFees - feeWaiver);

        // Calculate CGST (9%) and SGST (9%)
        const cgstAmount = Math.round(taxableAmount * 0.09);
        const sgstAmount = Math.round(taxableAmount * 0.09);

        // Total Fees with Previous Balance
        const previousBalance = student?.carryForwardBalance || 0;
        const totalFees = taxableAmount + cgstAmount + sgstAmount + previousBalance;

        const downPayment = parseFloat(formData.downPayment) || 0;
        const remainingAmount = Math.max(0, totalFees - downPayment);
        const numberOfInstallments = parseInt(formData.numberOfInstallments) || 1;
        const installmentAmount = Math.ceil(remainingAmount / numberOfInstallments);

        // Generate payment schedule
        const paymentSchedule = [];
        const currentDate = new Date();

        for (let i = 0; i < numberOfInstallments; i++) {
            const dueDate = new Date(currentDate);
            dueDate.setMonth(dueDate.getMonth() + i + 1);

            paymentSchedule.push({
                installmentNumber: i + 1,
                dueDate: dueDate.toLocaleDateString(),
                amount: i === numberOfInstallments - 1
                    ? remainingAmount - (installmentAmount * (numberOfInstallments - 1))
                    : installmentAmount
            });
        }

        setFeeBreakdown({
            baseFees,
            cgstAmount,
            sgstAmount,
            previousBalance,
            totalFees,
            downPayment,
            remainingAmount,
            installmentAmount,
            paymentSchedule
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/admission/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId,
                    ...formData
                })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Admission created successfully!");
                setCreatedAdmission(data.admission);

                // If down payment was made, automatically open bill generator
                if (data.admission.downPayment > 0) {
                    toast.success("Admission created! Generating bill...", { autoClose: 3000 });
                    setBillModal({
                        show: true,
                        admission: data.admission,
                        installment: {
                            installmentNumber: 0,
                            amount: data.admission.downPayment,
                            paidAmount: data.admission.downPayment,
                            paidDate: new Date(),
                            paymentMethod: "CASH" // Default or from form data
                        }
                    });
                } else {
                    setTimeout(() => navigate("/admissions"), 2000);
                }
            } else {
                toast.error(data.message || "Failed to create admission");
            }
        } catch (err) {
            toast.error("Server error");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !student) {
        return (
            <div className="flex-1 bg-[#131619] p-6 flex items-center justify-center">
                <p className="text-white">Loading...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#131619] p-6 overflow-y-auto text-white">
            <ToastContainer position="top-right" theme="dark" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/admissions")}
                        className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        <FaArrowLeft />
                    </button>
                    <h2 className="text-2xl font-bold text-cyan-400">Student Admission</h2>
                </div>
            </div>

            {/* Student Info Card */}
            {student && (
                <div className="bg-[#1a1f24] p-4 rounded-lg border border-gray-800 mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Student Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-gray-400 text-sm">Name</label>
                            <p className="text-white font-medium">{student.studentsDetails?.[0]?.studentName}</p>
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm">Email</label>
                            <p className="text-white font-medium">{student.studentsDetails?.[0]?.studentEmail}</p>
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm">Mobile</label>
                            <p className="text-white font-medium">{student.studentsDetails?.[0]?.mobileNum}</p>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Admission Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#1a1f24] p-6 rounded-lg border border-gray-800">
                        <h3 className="text-lg font-semibold text-white mb-4">Admission Details</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Centre</label>
                                <input
                                    type="text"
                                    name="centre"
                                    value={formData.centre}
                                    readOnly
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-400 cursor-not-allowed focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Class</label>
                                <select
                                    name="classId"
                                    value={formData.classId}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                >
                                    <option value="">Select Class</option>
                                    {classes.map(cls => (
                                        <option key={cls._id} value={cls._id}>{cls.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Exam Tag *</label>
                                <select
                                    name="examTagId"
                                    value={formData.examTagId}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    required
                                >
                                    <option value="">Select Exam Tag</option>
                                    {examTags.map(tag => (
                                        <option key={tag._id} value={tag._id}>{tag.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Course *</label>
                                <select
                                    name="courseId"
                                    value={formData.courseId}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    required
                                >
                                    <option value="">Select Course</option>
                                    {courses.map(course => (
                                        <option key={course._id} value={course._id}>{course.courseName}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Academic Session *</label>
                                <input
                                    type="text"
                                    name="academicSession"
                                    value={formData.academicSession}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    placeholder="e.g. 2025-2026"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Student Image URL</label>
                                <input
                                    type="text"
                                    name="studentImage"
                                    value={formData.studentImage}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-gray-400 mb-2 text-sm">Remarks</label>
                            <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleInputChange}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                rows="3"
                                placeholder="Additional notes..."
                            />
                        </div>
                    </div>

                    {/* Payment Configuration */}
                    <div className="bg-[#1a1f24] p-6 rounded-lg border border-gray-800">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <FaMoneyBillWave className="text-cyan-400" />
                            Payment Configuration
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Fee Waiver (Discount) ₹</label>
                                <input
                                    type="number"
                                    name="feeWaiver"
                                    value={formData.feeWaiver}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    min="0"
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Down Payment (₹) *</label>
                                <input
                                    type="number"
                                    name="downPayment"
                                    value={formData.downPayment}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    min="0"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 mb-2 text-sm">Number of Installments *</label>
                                <input
                                    type="number"
                                    name="numberOfInstallments"
                                    value={formData.numberOfInstallments}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    min="1"
                                    max="24"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Fee Breakdown */}
                <div className="space-y-6">
                    {selectedCourse && (
                        <>
                            {/* Course Fee Structure */}
                            <div className="bg-[#1a1f24] p-6 rounded-lg border border-gray-800">
                                <h3 className="text-lg font-semibold text-white mb-4">Course Fee Structure</h3>
                                <div className="space-y-2">
                                    {selectedCourse.feesStructure.map((fee, index) => (
                                        <div key={index} className="flex justify-between items-center p-2 bg-gray-800 rounded">
                                            <span className="text-gray-300">{fee.feesType}</span>
                                            <span className="text-white font-medium">₹{fee.value.toLocaleString()}</span>
                                        </div>
                                    ))}

                                    <div className="border-t border-gray-700 my-2 pt-2 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Base Fees</span>
                                            <span className="text-white">₹{feeBreakdown.baseFees.toLocaleString()}</span>
                                        </div>
                                        {formData.feeWaiver > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-green-400">Fee Waiver</span>
                                                <span className="text-green-400">-₹{parseFloat(formData.feeWaiver).toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">CGST (9%)</span>
                                            <span className="text-white">₹{feeBreakdown.cgstAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">SGST (9%)</span>
                                            <span className="text-white">₹{feeBreakdown.sgstAmount.toLocaleString()}</span>
                                        </div>
                                        {feeBreakdown.previousBalance > 0 && (
                                            <div className="flex justify-between items-center bg-yellow-500/10 p-2 rounded">
                                                <span className="text-yellow-400">Previous Balance (Carry Forward)</span>
                                                <span className="text-yellow-400 font-bold">+₹{feeBreakdown.previousBalance.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-cyan-500/20 rounded border border-cyan-500/50 mt-3">
                                        <span className="text-cyan-400 font-semibold">Total Fees (with GST)</span>
                                        <span className="text-cyan-400 font-bold text-lg">₹{feeBreakdown.totalFees.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Breakdown */}
                            <div className="bg-[#1a1f24] p-6 rounded-lg border border-gray-800">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <FaCalculator className="text-cyan-400" />
                                    Payment Breakdown
                                </h3>

                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Total Fees</span>
                                        <span className="text-white font-medium">₹{feeBreakdown.totalFees.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Down Payment</span>
                                        <span className="text-green-400 font-medium">-₹{feeBreakdown.downPayment.toLocaleString()}</span>
                                    </div>
                                    <div className="border-t border-gray-700 pt-2 flex justify-between">
                                        <span className="text-gray-400">Remaining Amount</span>
                                        <span className="text-white font-semibold">₹{feeBreakdown.remainingAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Per Installment</span>
                                        <span className="text-cyan-400 font-medium">₹{feeBreakdown.installmentAmount.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Payment Schedule */}
                                {feeBreakdown.paymentSchedule.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="text-sm font-semibold text-gray-300 mb-2">Payment Schedule</h4>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {feeBreakdown.paymentSchedule.map((payment, index) => (
                                                <div key={index} className="flex justify-between items-center p-2 bg-gray-800 rounded text-sm">
                                                    <div>
                                                        <span className="text-gray-400">Installment {payment.installmentNumber}</span>
                                                        <p className="text-xs text-gray-500">{payment.dueDate}</p>
                                                    </div>
                                                    <span className="text-white font-medium">₹{payment.amount.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !selectedCourse}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating Admission..." : "Create Admission"}
                    </button>
                </div>
            </form>

            {/* Success/Bill Generation Modal */}
            {createdAdmission && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1f24] rounded-xl border border-gray-700 p-6 max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaMoneyBillWave className="text-3xl text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Admission Successful!</h3>
                        <p className="text-gray-400 mb-6">
                            Student has been successfully admitted to {createdAdmission.course?.courseName}.
                        </p>

                        <div className="space-y-3">
                            {createdAdmission.downPayment > 0 && (
                                <button
                                    onClick={() => setBillModal({
                                        show: true,
                                        admission: createdAdmission,
                                        installment: { installmentNumber: 0, amount: createdAdmission.downPayment, paidDate: new Date() }
                                    })}
                                    className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg flex items-center justify-center gap-2"
                                >
                                    <FaFileInvoice /> Generate Bill (Down Payment)
                                </button>
                            )}

                            <button
                                onClick={() => navigate("/admissions")}
                                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg"
                            >
                                Go to Admissions List
                            </button>
                        </div>
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
        </div>
    );
};

export default StudentAdmissionPage;
