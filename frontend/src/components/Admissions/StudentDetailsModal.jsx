import React from 'react';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaSchool, FaBook, FaMapMarkerAlt, FaEdit } from 'react-icons/fa';

const StudentDetailsModal = ({ student, onClose, onEdit, canEdit }) => {
    if (!student) return null;

    const details = student.studentsDetails?.[0] || {};
    const exam = student.examSchema?.[0] || {};
    const guardian = student.guardians?.[0] || {};
    const sessionExam = student.sessionExamCourse?.[0] || {};
    const registrationDate = student.createdAt ? new Date(student.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A";

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f24] rounded-xl border border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-[#1a1f24] border-b border-gray-800 p-6 flex items-center justify-between">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <FaUser className="text-cyan-400" />
                            Student Details
                        </h2>
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">
                            Registered on: <span className="text-cyan-400 font-mono italic lowercase">{registrationDate}</span>
                        </span>
                    </div>
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
                                <p className="text-gray-400 text-sm">Course</p>
                                <p className="text-white font-medium">{student.course?.courseName || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Department</p>
                                <p className="text-white font-medium">{student.department?.departmentName || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Session</p>
                                <p className="text-white font-medium">{sessionExam.session || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Allocated Batches</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {student.batches && student.batches.length > 0 ? (
                                        student.batches.map(batch => (
                                            <span key={batch._id} className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded text-[10px] font-bold border border-yellow-500/20">
                                                {batch.batchName}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 font-medium italic text-xs">No batches assigned</p>
                                    )}
                                </div>
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
                <div className="sticky bottom-0 bg-[#1a1f24] border-t border-gray-800 p-6 flex justify-end gap-4">
                    {canEdit && (
                        <button
                            onClick={onEdit}
                            className="px-6 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors flex items-center gap-2"
                        >
                            <FaEdit />
                            Edit Student
                        </button>
                    )}
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
