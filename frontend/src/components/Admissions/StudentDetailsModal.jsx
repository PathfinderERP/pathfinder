import React from 'react';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaSchool, FaBook, FaMapMarkerAlt, FaEdit, FaUserGraduate, FaPhoneAlt } from 'react-icons/fa';

const StudentDetailsModal = ({ student, onClose, onEdit, canEdit, isDarkMode }) => {
    if (!student) return null;

    const details = student.studentsDetails?.[0] || {};
    const exam = student.examSchema?.[0] || {};
    const guardian = student.guardians?.[0] || {};
    const sessionExam = student.sessionExamCourse?.[0] || {};
    const registrationDate = student.createdAt ? new Date(student.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A";

    const labelClass = "text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-2";
    const valueClass = `text-[13px] font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'} uppercase`;
    const sectionClass = `p-6 rounded-[4px] border transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className={`rounded-[4px] border border-gray-800 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`}>
                {/* Header */}
                <div className={`p-6 border-b flex items-center justify-between sticky top-0 z-10 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[4px] bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                <FaUserGraduate className="text-cyan-500 text-xl" />
                            </div>
                            <div>
                                <h2 className={`text-2xl font-black italic tracking-tighter uppercase leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Student Profile
                                </h2>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2">
                                    CORE DATA INTELLIGENCE <span className="mx-2 text-cyan-500">|</span> <span className="text-cyan-500">ID: {student._id?.slice(-8).toUpperCase()}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`px-4 py-2 rounded-[4px] border hidden sm:flex items-center gap-3 ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">ENROLLMENT DATE</span>
                            <span className="text-[10px] font-black text-cyan-500 italic uppercase">{registrationDate}</span>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-3 rounded-[4px] transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10' : 'bg-gray-100 text-gray-400 hover:text-gray-900 hover:bg-gray-200'}`}
                        >
                            <FaTimes className="text-lg" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className={`p-8 overflow-y-auto space-y-8 custom-scrollbar ${isDarkMode ? 'dark' : ''}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Personal Information */}
                        <div className={sectionClass}>
                            <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                <FaUser size={14} /> PERSONAL IDENTIFICATION
                            </h3>
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <div>
                                    <p className={labelClass}>STUDENT NAME</p>
                                    <p className={valueClass}>{details.studentName || "NOT RECORDED"}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>DATE OF BIRTH</p>
                                    <p className={valueClass}>{details.dateOfBirth || "NOT RECORDED"}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>GENDER BIOMETRIC</p>
                                    <span className={`px-3 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest border inline-block ${isDarkMode ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-600'}`}>
                                        {details.gender || "UNSET"}
                                    </span>
                                </div>
                                <div>
                                    <p className={labelClass}>BASE CENTRE</p>
                                    <p className={valueClass}>{details.centre || "CENTRAL HQ"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className={sectionClass}>
                            <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                <FaPhoneAlt size={14} /> COMMUNICATION CHANNELS
                            </h3>
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <div className="col-span-2">
                                    <p className={labelClass}><FaEnvelope className="text-cyan-500/50" /> DIGITAL MAILBOX</p>
                                    <p className={`${valueClass} break-all lowercase font-mono italic text-cyan-500`}>{details.studentEmail || "NO EMAIL ASSIGNED"}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>TELECOM LINE</p>
                                    <p className={valueClass}>{details.mobileNum || "INACTIVE"}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>ENCRYPTED WHATSAPP</p>
                                    <p className={valueClass}>{details.whatsappNumber || "INACTIVE"}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className={labelClass}><FaMapMarkerAlt className="text-cyan-500/50" /> GEO-ADDRESS</p>
                                    <p className={`${valueClass} font-medium tracking-normal text-[12px] capitalize`}>{details.address || "LOCATION DATA UNAVAILABLE"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Academic Information */}
                        <div className={sectionClass}>
                            <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                <FaSchool size={14} /> ACADEMIC RECORD
                            </h3>
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <div className="col-span-2">
                                    <p className={labelClass}>PRIMARY INSTITUTION</p>
                                    <p className={valueClass}>{details.schoolName || "NOT RECORDED"}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>EDUCATIONAL BOARD</p>
                                    <p className={valueClass}>{details.board || "NOT SET"}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>CURRENT CLASS</p>
                                    <span className={`px-3 py-1 rounded-[4px] text-[10px] font-black uppercase border inline-block ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                                        {exam.class || details.class || "UNSET"}
                                    </span>
                                </div>
                                <div>
                                    <p className={labelClass}>MARK PERFORMANCE (%)</p>
                                    <div className="flex items-center gap-3">
                                        <p className={valueClass}>{exam.scienceMathParcent || "0.00"}%</p>
                                        <div className={`h-1.5 w-16 rounded-full overflow-hidden flex-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                            <div className="h-full bg-cyan-500" style={{ width: `${exam.scienceMathParcent || 0}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className={labelClass}>AGGREGATE SCORE</p>
                                    <p className={valueClass}>{exam.markAgregate || "0"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Exam & Course Information */}
                        <div className={sectionClass}>
                            <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                <FaBook size={14} /> ENROLLED SCHEMAS
                            </h3>
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <div>
                                    <p className={labelClass}>ACADEMIC PROGRAMME</p>
                                    <p className={valueClass}>{details.programme || "N/A"}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>EXAM TAG (TARGET)</p>
                                    <p className={valueClass}>{sessionExam.examTag || exam.examName || "NONE"}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>TARGET MATRIX</p>
                                    <p className={valueClass}>{sessionExam.targetExams || "UNSET"}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className={labelClass}>CORE TRACK COURSE</p>
                                    <p className={`${valueClass} text-cyan-500`}>{student.course?.courseName || "PENDING SELECTION"}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>DEPARTMENT HQ</p>
                                    <p className={valueClass}>{student.department?.departmentName || "GENERAL"}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>ACTIVE SESSION</p>
                                    <p className={valueClass}>{sessionExam.session || "2024-25"}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className={labelClass}>BATCH ALLOCATIONS</p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {student.batches && student.batches.length > 0 ? (
                                            student.batches.map(batch => (
                                                <span key={batch._id} className={`px-3 py-1 rounded-[4px] text-[9px] font-black uppercase border underline decoration-yellow-500/30 underline-offset-2 ${isDarkMode ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'bg-yellow-50 border-yellow-200 text-yellow-600 shadow-sm'}`}>
                                                    {batch.batchName}
                                                </span>
                                            ))
                                        ) : (
                                            <p className="text-gray-500 font-bold italic text-[10px] uppercase">UNALLOCATED INVENTORY</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Guardian Information */}
                        <div className={`${sectionClass} md:col-span-2`}>
                            <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                <FaUser size={14} /> GUARDIAN / SECONDARY IDENTIFICATION
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                                <div>
                                    <p className={labelClass}>GUARDIAN NAME</p>
                                    <p className={valueClass}>{guardian.guardianName || "NOT RECORDED"}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>CONTACT SECURE</p>
                                    <p className={valueClass}>{guardian.guardianMobile || "INACTIVE"}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>GUARDIAN EMAIL</p>
                                    <p className={`${valueClass} lowercase font-mono italic text-[11px]`}>{guardian.guardianEmail || "NO EMAIL"}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>PROFESSIONAL VECTOR</p>
                                    <p className={valueClass}>{guardian.occupation || "NOT SET"}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>ANNUAL REVENUE</p>
                                    <p className={valueClass}>{guardian.annualIncome || " undisclosed"}</p>
                                </div>
                                <div>
                                    <p className={labelClass}>CREDENTIALS</p>
                                    <p className={valueClass}>{guardian.qualification || "NOT RECORDED"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-6 border-t flex justify-end gap-3 sticky bottom-0 z-10 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    <button
                        onClick={onClose}
                        className={`px-8 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700' : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-300 shadow-sm'}`}
                    >
                        HALT ENGINE (CLOSE)
                    </button>
                    {canEdit && (
                        <button
                            onClick={onEdit}
                            className="px-8 py-3 bg-cyan-600 text-white text-[10px] font-black uppercase tracking-widest rounded-[4px] hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center gap-3"
                        >
                            <FaEdit /> MODIFY CORE DATA
                        </button>
                    )}
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: ${isDarkMode ? '#0f1215' : 'transparent'}; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#d1d5db'}; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? '#374151' : '#9ca3af'}; }
            `}</style>
        </div>
    );
};

export default StudentDetailsModal;
