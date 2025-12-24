
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { FaSearch, FaExchangeAlt, FaArrowRight, FaMoneyBillWave, FaCalculator } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const CourseTransfer = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedAdmission, setSelectedAdmission] = useState(null);
    const [studentAdmissions, setStudentAdmissions] = useState([]);

    // Transfer Form State
    const [courses, setCourses] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [formData, setFormData] = useState({
        newCourseId: "",
        newExamTagId: "",
        newAcademicSession: "",
        sessions: [],
        feeWaiver: 0,
        numberOfInstallments: 1
    });

    const [sessions, setSessions] = useState([]);

    const [feeReview, setFeeReview] = useState(null);

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        // Fetch dropdown data
        const fetchDropdowns = async () => {
            try {
                const token = localStorage.getItem("token");
                const [coursesRes, tagsRes, sessionsRes] = await Promise.all([
                    fetch(`${apiUrl}/course`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${apiUrl}/examTag`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${apiUrl}/session/list`, { headers: { Authorization: `Bearer ${token}` } })
                ]);

                if (coursesRes.ok) setCourses(await coursesRes.json());
                if (tagsRes.ok) setExamTags(await tagsRes.json());
                if (sessionsRes.ok) setSessions(await sessionsRes.json());
            } catch (err) {
                console.error(err);
            }
        };
        fetchDropdowns();
    }, []);

    useEffect(() => {
        if (selectedAdmission && formData.newCourseId) {
            calculateTransferFees();
        }
    }, [formData, selectedAdmission]);

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/admission/search?query=${searchTerm}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setSearchResults(data);
                if (data.length === 0) toast.info("No admissions found");
            }
        } catch (err) {
            toast.error("Search failed");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAdmission = async (admission) => {
        // Fetch all admissions for this student
        try {
            const token = localStorage.getItem("token");
            const studentId = admission.student?._id;

            if (studentId) {
                const response = await fetch(`${apiUrl}/admission/search?query=${studentId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setStudentAdmissions(data);
                } else {
                    setStudentAdmissions([admission]);
                }
            } else {
                setStudentAdmissions([admission]);
            }
        } catch (err) {
            console.error(err);
            setStudentAdmissions([admission]);
        }

        setSelectedAdmission(admission);
        setSearchResults([]); // Clear search list
        setSearchTerm("");
        // Pre-fill session
        setFormData(prev => ({
            ...prev,
            newAcademicSession: admission.academicSession // Default to same session
        }));
    };

    const handleCourseChange = (courseId) => {
        const admission = studentAdmissions.find(ad => ad.course._id === courseId);
        if (admission) {
            setSelectedAdmission(admission);
        }
    };

    const calculateTransferFees = () => {
        const newCourse = courses.find(c => c._id === formData.newCourseId);
        if (!newCourse) return;

        const baseFees = newCourse.feesStructure.reduce((sum, fee) => sum + fee.value, 0);
        const feeWaiver = parseFloat(formData.feeWaiver) || 0;
        const taxableAmount = Math.max(0, baseFees - feeWaiver);
        const cgstAmount = Math.round(taxableAmount * 0.09);
        const sgstAmount = Math.round(taxableAmount * 0.09);
        const totalNewFees = taxableAmount + cgstAmount + sgstAmount;

        const creditAmount = selectedAdmission.totalPaidAmount || 0;
        const remainingAmount = Math.max(0, totalNewFees - creditAmount);

        const installments = parseInt(formData.numberOfInstallments) || 1;
        const installmentAmount = Math.ceil(remainingAmount / installments);

        setFeeReview({
            baseFees,
            cgstAmount,
            sgstAmount,
            totalNewFees,
            creditAmount,
            remainingAmount,
            installmentAmount,
            newCourseName: newCourse.courseName
        });
    };

    const handleSubmitTransfer = async () => {
        if (!selectedAdmission || !formData.newCourseId || !formData.newAcademicSession) {
            toast.error("Please fill all required fields");
            return;
        }

        if (!window.confirm(`Are you sure you want to transfer ${selectedAdmission.student?.studentsDetails?.[0]?.studentName} from ${selectedAdmission.course?.courseName} to ${feeReview?.newCourseName}?`)) {
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/admission/transfer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    admissionId: selectedAdmission._id,
                    ...formData
                })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success("Course transferred successfully!");
                setSelectedAdmission(null);
                setFormData({
                    newCourseId: "",
                    newExamTagId: "",
                    newAcademicSession: "",
                    feeWaiver: 0,
                    numberOfInstallments: 1
                });
                setFeeReview(null);
            } else {
                toast.error(data.message || "Transfer failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error processing transfer");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout activePage="Course Management">
            <ToastContainer position="top-right" theme="dark" />
            <div className="flex-1 bg-[#131619] p-6 text-white overflow-y-auto">
                <div className="flex items-center gap-3 mb-6">
                    <FaExchangeAlt className="text-cyan-400 text-2xl" />
                    <h2 className="text-2xl font-bold">Course Transfer</h2>
                </div>

                {/* Search Section */}
                {!selectedAdmission && (
                    <div className="max-w-3xl mx-auto bg-[#1a1f24] p-8 rounded-xl border border-gray-800 mb-8">
                        <h3 className="text-xl font-semibold mb-4 text-center">Search Student Admission</h3>
                        <form onSubmit={handleSearch} className="flex gap-4">
                            <input
                                type="text"
                                placeholder="Enter Admission ID or Student Name"
                                className="flex-1 bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
                            >
                                {loading ? "Searching..." : <><FaSearch /> Search</>}
                            </button>
                        </form>
                    </div>
                )}

                {/* Search Results List */}
                {!selectedAdmission && searchResults.length > 0 && (
                    <div className="max-w-4xl mx-auto bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-[#252b32] text-gray-400">
                                <tr>
                                    <th className="p-4">Enrollment ID</th>
                                    <th className="p-4">Student Name</th>
                                    <th className="p-4">Course</th>
                                    <th className="p-4">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {searchResults.map(adm => (
                                    <tr key={adm._id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                        <td className="p-4 font-mono text-cyan-400">{adm.admissionNumber}</td>
                                        <td className="p-4">{adm.student?.studentsDetails?.[0]?.studentName}</td>
                                        <td className="p-4">{adm.course?.courseName}</td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleSelectAdmission(adm)}
                                                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-sm font-semibold"
                                            >
                                                Select
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Transfer Workflow */}
                {selectedAdmission && (
                    <div className="max-w-5xl mx-auto space-y-6">
                        {/* Header / Cancel */}
                        <div className="flex justify-between items-center bg-[#1a1f24] p-4 rounded-lg border border-gray-800">
                            <div>
                                <h3 className="text-lg font-bold">Transferring Student: {selectedAdmission.student?.studentsDetails?.[0]?.studentName}</h3>
                                <p className="text-sm text-gray-400">Enrollment ID: {selectedAdmission.admissionNumber}</p>
                            </div>
                            <button
                                onClick={() => { setSelectedAdmission(null); setFeeReview(null); setStudentAdmissions([]); }}
                                className="text-gray-400 hover:text-white underline"
                            >
                                Cancel / Search Again
                            </button>
                        </div>

                        {/* Transfer Form Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Left: Previous Course Info */}
                            <div className="bg-[#1a1f24] p-6 rounded-xl border border-gray-800 h-fit">
                                <h4 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-2">Course From</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-gray-500">Current Course</label>
                                        {/* Dropdown for selecting course */}
                                        <select
                                            value={selectedAdmission.course?._id}
                                            onChange={(e) => handleCourseChange(e.target.value)}
                                            className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg text-white p-3 focus:outline-none focus:border-cyan-500"
                                        >
                                            {studentAdmissions.map(adm => (
                                                <option
                                                    key={adm._id}
                                                    value={adm.course?._id}
                                                    disabled={adm.paymentStatus === 'COMPLETED'}
                                                >
                                                    {adm.course?.courseName} {adm.paymentStatus === 'COMPLETED' ? '(Completed)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">Fees Paid Till Date</label>
                                        <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg text-green-400 font-bold text-xl">
                                            ₹{selectedAdmission.totalPaidAmount?.toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">Total Course Fees</label>
                                        <div className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300">
                                            ₹{selectedAdmission.totalFees?.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm text-gray-500">Academic Session</label>
                                            <div className="text-gray-300">{selectedAdmission.academicSession}</div>
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-500">Admission Date</label>
                                            <div className="text-gray-300">{new Date(selectedAdmission.admissionDate).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: New Course Selection */}
                            <div className="bg-[#1a1f24] p-6 rounded-xl border border-gray-800">
                                <h4 className="text-lg font-semibold text-cyan-400 mb-4 border-b border-gray-700 pb-2">Course To</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-gray-400 mb-2 text-sm">Select Session</label>
                                        <select
                                            value={formData.newAcademicSession}
                                            onChange={(e) => setFormData({ ...formData, newAcademicSession: e.target.value })}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                                        >
                                            <option value="">Select Session</option>
                                            {sessions.map(session => (
                                                <option key={session._id} value={session.sessionName}>{session.sessionName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 mb-2 text-sm">Select Exam Tag</label>
                                        <select
                                            value={formData.newExamTagId}
                                            onChange={(e) => setFormData({ ...formData, newExamTagId: e.target.value })}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                                        >
                                            <option value="">Select Tag</option>
                                            {examTags.map(tag => (
                                                <option key={tag._id} value={tag._id}>{tag.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 mb-2 text-sm">Select New Course *</label>
                                        <select
                                            value={formData.newCourseId}
                                            onChange={(e) => setFormData({ ...formData, newCourseId: e.target.value })}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white focus:border-cyan-500"
                                        >
                                            <option value="">Select Course</option>
                                            {courses.filter(c => c._id !== selectedAdmission.course?._id).map(course => {
                                                // Calculate total fees for this potential course
                                                const base = course.feesStructure.reduce((sum, fee) => sum + fee.value, 0);
                                                // Estimate tax (18%) to get total check
                                                // Note: Ideally compare base or total. Assuming default total.
                                                const totalEst = base * 1.18;
                                                const isDisabled = totalEst < selectedAdmission.totalFees; // Disable if less amount

                                                return (
                                                    <option
                                                        key={course._id}
                                                        value={course._id}
                                                        disabled={isDisabled}
                                                        className={isDisabled ? "text-gray-600" : ""}
                                                    >
                                                        {course.courseName} {isDisabled ? '(Fees too low)' : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-400 mb-2 text-sm">Fee Waiver (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.feeWaiver}
                                                onChange={(e) => setFormData({ ...formData, feeWaiver: e.target.value })}
                                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 mb-2 text-sm">Installments</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="12"
                                                value={formData.numberOfInstallments}
                                                onChange={(e) => setFormData({ ...formData, numberOfInstallments: e.target.value })}
                                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fee Structure Review */}
                        {feeReview && (
                            <div className="bg-[#1a1f24] p-6 rounded-xl border border-gray-800 mt-6">
                                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <FaCalculator /> New Fee Structure Review
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-900 rounded-lg">
                                    <div>
                                        <p className="text-sm text-gray-500">Base Fees</p>
                                        <p className="text-lg font-bold text-white">₹{feeReview.baseFees.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Taxes (18%)</p>
                                        <p className="text-lg font-bold text-gray-300">₹{(feeReview.cgstAmount + feeReview.sgstAmount).toLocaleString()}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-gray-500 uppercase">Total New Fees</p>
                                        <p className="text-2xl font-bold text-cyan-400">₹{feeReview.totalNewFees.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center my-4">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                                        <FaArrowRight className="text-gray-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-green-900/10 p-4 rounded border border-green-800/30">
                                        <p className="text-sm text-green-500 mb-1">Less: Paid in Previous Course</p>
                                        <p className="text-2xl font-bold text-green-400">-₹{feeReview.creditAmount.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-yellow-900/10 p-4 rounded border border-yellow-800/30">
                                        <p className="text-sm text-yellow-500 mb-1">Net Payable Amount</p>
                                        <p className="text-2xl font-bold text-yellow-400">₹{feeReview.remainingAmount.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
                                        <p className="text-sm text-gray-400 mb-1">Per Installment ({formData.numberOfInstallments})</p>
                                        <p className="text-xl font-bold text-white">₹{feeReview.installmentAmount.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={handleSubmitTransfer}
                                        disabled={loading}
                                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-2 transition-transform hover:scale-105"
                                    >
                                        {loading ? "Processing..." : "Confirm & Transfer Course"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CourseTransfer;
