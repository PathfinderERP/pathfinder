import React, { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const StudentRegistrationForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [centres, setCentres] = useState([]);
    const [examTags, setExamTags] = useState([]);

    const indianStates = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
        "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
        "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
        "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
        "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
    ];

    const [formData, setFormData] = useState({
        // Student Details
        studentName: "",
        dateOfBirth: "",
        gender: "",
        centre: "",
        board: "",
        state: "",
        studentEmail: "",
        mobileNum: "",
        whatsappNumber: "",
        schoolName: "",
        pincode: "",
        source: "",
        address: "",

        // Guardian Details
        guardianName: "",
        qualification: "",
        guardianEmail: "",
        guardianMobile: "",
        occupation: "",
        annualIncome: "",
        organizationName: "",
        designation: "",
        officeAddress: "",

        // Exam Schema
        examName: "",
        class: "",
        examStatus: "",
        markAgregate: "",
        scienceMathParcent: "",

        // Section
        sectionType: "",

        // Session Exam Course
        session: "",
        examTag: "",
        targetExams: "",

        // Student Status
        status: "",
        enrolledStatus: "Not Enrolled",
    });

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setCentres(data);
            } else {
                console.error("Failed to fetch centres");
            }
        } catch (error) {
            console.error("Error fetching centres:", error);
        }
    };

    const fetchExamTags = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/examTag/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setExamTags(data);
            } else {
                console.error("Failed to fetch exam tags");
            }
        } catch (error) {
            console.error("Error fetching exam tags:", error);
        }
    };

    useEffect(() => {
        fetchCentres();
        fetchExamTags();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");

            // Construct payload based on StudentSchema structure
            const payload = {
                studentsDetails: [
                    {
                        studentName: formData.studentName,
                        dateOfBirth: formData.dateOfBirth,
                        gender: formData.gender,
                        centre: formData.centre,
                        board: formData.board,
                        state: formData.state,
                        studentEmail: formData.studentEmail,
                        mobileNum: formData.mobileNum,
                        whatsappNumber: formData.whatsappNumber,
                        schoolName: formData.schoolName,
                        pincode: formData.pincode,
                        source: formData.source,
                        address: formData.address,
                        // Nested schemas inside StudentsDetailsSchema
                        guardians: [
                            {
                                guardianName: formData.guardianName,
                                qualification: formData.qualification,
                                guardianEmail: formData.guardianEmail,
                                guardianMobile: formData.guardianMobile,
                                occupation: formData.occupation,
                                annualIncome: formData.annualIncome,
                                organizationName: formData.organizationName,
                                designation: formData.designation,
                                officeAddress: formData.officeAddress,
                            }
                        ],
                        examSchema: [
                            {
                                examName: formData.examName,
                                class: formData.class,
                                examStatus: formData.examStatus,
                                markAgregate: formData.markAgregate,
                                scienceMathParcent: formData.scienceMathParcent,
                            }
                        ]
                    }
                ],
                // Root level schemas in StudentSchema
                guardians: [
                    {
                        guardianName: formData.guardianName,
                        qualification: formData.qualification,
                        guardianEmail: formData.guardianEmail,
                        guardianMobile: formData.guardianMobile,
                        occupation: formData.occupation,
                        annualIncome: formData.annualIncome,
                        organizationName: formData.organizationName,
                        designation: formData.designation,
                        officeAddress: formData.officeAddress,
                    }
                ],
                examSchema: [
                    {
                        examName: formData.examName,
                        class: formData.class,
                        examStatus: formData.examStatus,
                        markAgregate: formData.markAgregate,
                        scienceMathParcent: formData.scienceMathParcent,
                    }
                ],
                section: formData.sectionType ? [{ type: formData.sectionType }] : [],
                sessionExamCourse: [
                    {
                        session: formData.session,
                        examTag: formData.examTag,
                        targetExams: formData.targetExams,
                    }
                ],
                studentStatus: [
                    {
                        status: formData.status,
                        enrolledStatus: formData.enrolledStatus,
                    }
                ]
            };

            console.log("📤 Sending student registration payload:", JSON.stringify(payload, null, 2));

            const response = await fetch(`${import.meta.env.VITE_API_URL}/normalAdmin/createStudent`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("❌ Student Registration Failed!", data);
                const errorMsg = data.details || data.message || "Failed to register student";
                toast.error(errorMsg);
            } else {
                console.log("✅ Student registered successfully!");
                toast.success("Student registered successfully!");
                // Optional: Reset form or navigate
                // navigate("/admissions");
            }
        } catch (err) {
            console.error("❌ Network or Server Error:", err);
            toast.error("Server error. Please try again.");
        }
        setLoading(false);
    };

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-[#131619] text-gray-300">
            <ToastContainer position="top-right" theme="dark" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Student Registration</h2>
                <button
                    onClick={() => navigate("/admissions")}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a1f24] text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
                >
                    <FaArrowLeft /> Back to Leads
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Registration Form */}
                <div className="bg-[#1a1f24] p-6 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
                        <span className="text-xl">📝</span>
                        <h3 className="text-xl font-bold text-white">Registration Form</h3>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Student Details Section */}
                        <div>
                            <h4 className="text-lg font-semibold text-cyan-400 mb-3">Student Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <input type="text" name="studentName" required value={formData.studentName} onChange={handleChange} placeholder="Student Name *" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="date" name="dateOfBirth" required value={formData.dateOfBirth} onChange={handleChange} className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <select name="gender" required value={formData.gender} onChange={handleChange} className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full">
                                    <option value="">Select Gender *</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                                <select name="centre" required value={formData.centre} onChange={handleChange} className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full">
                                    <option value="">Select Centre *</option>
                                    {centres.map((centre) => (
                                        <option key={centre._id} value={centre.centreName}>{centre.centreName}</option>
                                    ))}
                                </select>
                                <input type="text" name="board" required value={formData.board} onChange={handleChange} placeholder="Board *" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <select name="state" required value={formData.state} onChange={handleChange} className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full">
                                    <option value="">Select State *</option>
                                    {indianStates.map((state) => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                                <input type="email" name="studentEmail" required value={formData.studentEmail} onChange={handleChange} placeholder="Student Email *" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="text" name="mobileNum" required pattern="[0-9]{10}" value={formData.mobileNum} onChange={handleChange} placeholder="Mobile Number (10 digits) *" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="text" name="whatsappNumber" required pattern="[0-9]{10}" value={formData.whatsappNumber} onChange={handleChange} placeholder="WhatsApp Number (10 digits) *" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="text" name="schoolName" required value={formData.schoolName} onChange={handleChange} placeholder="School Name *" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="text" name="pincode" required value={formData.pincode} onChange={handleChange} placeholder="Pincode *" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="text" name="source" value={formData.source} onChange={handleChange} placeholder="Source" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <textarea name="address" required value={formData.address} onChange={handleChange} placeholder="Address *" rows="2" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full md:col-span-2 lg:col-span-3 resize-none"></textarea>
                            </div>
                        </div>

                        {/* Guardian Details Section */}
                        <div>
                            <h4 className="text-lg font-semibold text-cyan-400 mb-3">Guardian Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <input type="text" name="guardianName" value={formData.guardianName} onChange={handleChange} placeholder="Guardian Name" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="text" name="qualification" value={formData.qualification} onChange={handleChange} placeholder="Qualification" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="email" name="guardianEmail" value={formData.guardianEmail} onChange={handleChange} placeholder="Guardian Email" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="text" name="guardianMobile" value={formData.guardianMobile} onChange={handleChange} placeholder="Guardian Mobile" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} placeholder="Occupation" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="text" name="annualIncome" value={formData.annualIncome} onChange={handleChange} placeholder="Annual Income" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="text" name="organizationName" value={formData.organizationName} onChange={handleChange} placeholder="Organization Name" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="text" name="designation" value={formData.designation} onChange={handleChange} placeholder="Designation" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="text" name="officeAddress" value={formData.officeAddress} onChange={handleChange} placeholder="Office Address" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                            </div>
                        </div>

                        {/* Exam Details Section */}
                        <div>
                            <h4 className="text-lg font-semibold text-cyan-400 mb-3">Exam Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <input type="text" name="examName" required value={formData.examName} onChange={handleChange} placeholder="Exam Name *" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <select name="class" required value={formData.class} onChange={handleChange} className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full">
                                    <option value="">Select Class *</option>
                                    <option value="8">Class 8</option>
                                    <option value="9">Class 9</option>
                                    <option value="10">Class 10</option>
                                    <option value="11">Class 11</option>
                                    <option value="12">Class 12</option>
                                </select>
                                <input type="text" name="examStatus" required value={formData.examStatus} onChange={handleChange} placeholder="Exam Status *" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="text" name="markAgregate" required value={formData.markAgregate} onChange={handleChange} placeholder="Mark Aggregate *" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="text" name="scienceMathParcent" required value={formData.scienceMathParcent} onChange={handleChange} placeholder="Science/Math Percent *" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                            </div>
                        </div>

                        {/* Course & Section Details */}
                        <div>
                            <h4 className="text-lg font-semibold text-cyan-400 mb-3">Course & Section</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <input type="text" name="sectionType" value={formData.sectionType} onChange={handleChange} placeholder="Section Type" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <input type="text" name="session" value={formData.session} onChange={handleChange} placeholder="Session" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                                <select name="examTag" value={formData.examTag} onChange={handleChange} className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full">
                                    <option value="">Select Exam Tag</option>
                                    {examTags.map((tag) => (
                                        <option key={tag._id} value={tag.name}>{tag.name}</option>
                                    ))}
                                </select>
                                <input type="text" name="targetExams" value={formData.targetExams} onChange={handleChange} placeholder="Target Exams" className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full" />
                            </div>
                        </div>

                        {/* Student Status */}
                        <div>
                            <h4 className="text-lg font-semibold text-cyan-400 mb-3">Student Status</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <select name="status" required value={formData.status} onChange={handleChange} className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full">
                                    <option value="">Select Lead Status *</option>
                                    <option value="Hot">Hot Lead</option>
                                    <option value="Cold">Cold Lead</option>
                                    <option value="Negative">Negative</option>
                                </select>
                                <select name="enrolledStatus" required value={formData.enrolledStatus} onChange={handleChange} className="bg-[#131619] border border-gray-700 rounded-lg px-4 py-3 text-white w-full">
                                    <option value="Not Enrolled">Not Enrolled</option>
                                    <option value="Enrolled">Enrolled</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-cyan-500 text-black font-bold py-3 rounded-lg hover:bg-cyan-400 transition-colors mt-4"
                        >
                            {loading ? "Registering..." : "Register Student"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default StudentRegistrationForm;
