import React from 'react';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaSchool, FaBook, FaMapMarkerAlt } from 'react-icons/fa';

const StudentDetailsModal = ({ student, onClose }) => {
    if (!student) return null;

    const details = student.studentsDetails?.[0] || {};
    const exam = student.examSchema?.[0] || {};
    const guardian = student.guardians?.[0] || {};
    const sessionExam = student.sessionExamCourse?.[0] || {};
    const studentStatusList = student.studentStatus || [];
    const currentStatusObj = studentStatusList.length > 0 ? studentStatusList[studentStatusList.length - 1] : {};

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f24] rounded-xl border border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-[#1a1f24] border-b border-gray-800 p-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <FaUser className="text-cyan-400" />
                        Student Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <FaTimes className="text-gray-400 text-xl" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Personal Information */}
                    <div className="bg-[#131619] p-6 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <FaUser className="text-cyan-400" />
                            Personal Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-gray-400 text-sm">Student Name</p>
                                <p className="text-white font-medium">{details.studentName || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Date of Birth</p>
                                <p className="text-white font-medium">{details.dateOfBirth || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Gender</p>
                                <p className="text-white font-medium">{details.gender || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Centre</p>
                                <p className="text-white font-medium">{details.centre || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-[#131619] p-6 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <FaPhone className="text-cyan-400" />
                            Contact Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-gray-400 text-sm">Email</p>
                                <p className="text-white font-medium">{details.studentEmail || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Mobile</p>
                                <p className="text-white font-medium">{details.mobileNum || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">WhatsApp</p>
                                <p className="text-white font-medium">{details.whatsappNumber || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Address</p>
                                <p className="text-white font-medium">{details.address || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Academic Information */}
                    <div className="bg-[#131619] p-6 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <FaSchool className="text-cyan-400" />
                            Academic Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-gray-400 text-sm">School Name</p>
                                <p className="text-white font-medium">{details.schoolName || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Board</p>
                                <p className="text-white font-medium">{details.board || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Class</p>
                                <p className="text-white font-medium">{exam.class || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">State</p>
                                <p className="text-white font-medium">{details.state || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Science/Math %</p>
                                <p className="text-white font-medium">{exam.scienceMathParcent || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Aggregate Marks</p>
                                <p className="text-white font-medium">{exam.markAgregate || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Exam & Course Information */}
                    <div className="bg-[#131619] p-6 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <FaBook className="text-cyan-400" />
                            Exam & Course Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-gray-400 text-sm">Exam Tag</p>
                                <p className="text-white font-medium">{sessionExam.examTag || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Target Exams</p>
                                <p className="text-white font-medium">{sessionExam.targetExams || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Session</p>
                                <p className="text-white font-medium">{sessionExam.session || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Lead Status</p>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${currentStatusObj.status === "Hot" ? "bg-red-500/10 text-red-400" :
                                        currentStatusObj.status === "Cold" ? "bg-blue-500/10 text-blue-400" :
                                            "bg-gray-500/10 text-gray-400"
                                    }`}>
                                    {currentStatusObj.status || "N/A"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Guardian Information */}
                    <div className="bg-[#131619] p-6 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <FaUser className="text-cyan-400" />
                            Guardian Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-gray-400 text-sm">Guardian Name</p>
                                <p className="text-white font-medium">{guardian.guardianName || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Guardian Mobile</p>
                                <p className="text-white font-medium">{guardian.guardianMobile || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Guardian Email</p>
                                <p className="text-white font-medium">{guardian.guardianEmail || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Occupation</p>
                                <p className="text-white font-medium">{guardian.occupation || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Annual Income</p>
                                <p className="text-white font-medium">{guardian.annualIncome || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Qualification</p>
                                <p className="text-white font-medium">{guardian.qualification || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-[#1a1f24] border-t border-gray-800 p-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentDetailsModal;
