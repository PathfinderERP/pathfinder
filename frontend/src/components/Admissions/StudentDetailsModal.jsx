import React, { useState } from 'react';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaSchool, FaBook, FaMapMarkerAlt, FaEdit, FaUserGraduate, FaPhoneAlt, FaHistory, FaSync } from 'react-icons/fa';
import { toast } from 'react-toastify';

const StudentDetailsModal = ({ student, onClose, onEdit, canEdit, isDarkMode }) => {
    const [isServiceCallOpen, setIsServiceCallOpen] = useState(false);
    const [serviceCallForm, setServiceCallForm] = useState({
        servicePurpose: 'EMI Purpose',
        status: 'Neutral',
        remarks: '',
        nextFollowUpDate: ''
    });
    const [isSubmittingServiceCall, setIsSubmittingServiceCall] = useState(false);
    const [serviceCallHistory, setServiceCallHistory] = useState([]);
    const [loadingServiceCallHistory, setLoadingServiceCallHistory] = useState(false);

    if (!student) return null;

    const details = student.studentsDetails?.[0] || {};
    const exam = student.examSchema?.[0] || {};
    const guardian = student.guardians?.[0] || {};
    const sessionExam = student.sessionExamCourse?.[0] || {};
    const registrationDate = student.createdAt ? new Date(student.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A";

    const labelClass = "text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-2";
    const valueClass = `text-[13px] font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'} uppercase`;
    const sectionClass = `p-6 rounded-[4px] border transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`;

    const handleOpenServiceCallModal = async () => {
        setServiceCallForm({
            servicePurpose: 'EMI Purpose',
            status: 'Neutral',
            remarks: '',
            nextFollowUpDate: ''
        });
        setIsServiceCallOpen(true);

        const sId = student._id;
        const admId = student.latestAdmission?._id || student.admissionId || null;
        if (sId || admId) {
            setLoadingServiceCallHistory(true);
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`${import.meta.env.VITE_API_URL}/student-service-call/history?studentId=${sId || ''}&admissionId=${admId || ''}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setServiceCallHistory(data.history || []);
                }
            } catch (err) {
                console.error("Error fetching service call history:", err);
            } finally {
                setLoadingServiceCallHistory(false);
            }
        }
    };

    const handleSubmitServiceCall = async (e) => {
        e.preventDefault();
        if (!serviceCallForm.servicePurpose) {
            toast.error("Please select a Service Purpose.");
            return;
        }
        if (!serviceCallForm.nextFollowUpDate) {
            toast.error("Next Follow Up Date is mandatory.");
            return;
        }

        setIsSubmittingServiceCall(true);
        try {
            const token = localStorage.getItem("token");
            const payload = {
                studentId: student._id || null,
                admissionId: student.latestAdmission?._id || student.admissionId || null,
                studentName: details.studentName || student.studentName || "Student",
                enrollmentNo: details.enrollmentNo || details.admissionNo || student.admissionNumber || student.uid || "",
                studentPhone: details.mobileNum || student.mobileNum || student.phone || "",
                centreName: details.centre || student.centre || "",
                servicePurpose: serviceCallForm.servicePurpose,
                status: serviceCallForm.status || "Neutral",
                remarks: serviceCallForm.remarks,
                nextFollowUpDate: serviceCallForm.nextFollowUpDate
            };

            const res = await fetch(`${import.meta.env.VITE_API_URL}/student-service-call`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Service call logged & added to call reports!");
                setIsServiceCallOpen(false);
            } else {
                const errData = await res.json();
                toast.error(errData.message || "Failed to log service call.");
            }
        } catch (err) {
            console.error("Error submitting service call:", err);
            toast.error("Failed to log service call due to network error.");
        } finally {
            setIsSubmittingServiceCall(false);
        }
    };

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
                                    CORE DATA INTELLIGENCE <span className="mx-2 text-cyan-500">|</span> <span className="text-cyan-500">ID: {student.uid || student._id?.slice(-8).toUpperCase()}</span>
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
                            <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FaUser size={14} /> PERSONAL IDENTIFICATION
                                </div>
                                {(student.updatedBy || student.updatedAt) && (
                                    <div className="flex flex-col items-end">
                                        <span className="text-[7px] font-black tracking-tighter text-gray-500">Audit Trace</span>
                                        <span className="text-[8px] font-black tracking-widest text-cyan-500">
                                            {student.updatedBy || "SYSTEM"} <span className="mx-1 opacity-20">|</span> {new Date(student.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })} {new Date(student.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )}
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
                                    <p className={`${valueClass} break-all normal-case font-mono italic text-cyan-500`}>{details.studentEmail || "NO EMAIL ASSIGNED"}</p>
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
                                    <p className={`${valueClass} normal-case font-mono italic text-[11px]`}>{guardian.guardianEmail || "NO EMAIL"}</p>
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
                        onClick={handleOpenServiceCallModal}
                        className="px-6 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-[4px] hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center gap-2"
                    >
                        <FaPhoneAlt size={12} /> SERVICE CALL
                    </button>
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

            {/* Service Calling Modal Overlay */}
            {isServiceCallOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[8px] border shadow-2xl ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                        {/* Modal Header */}
                        <div className={`sticky top-0 z-10 flex items-center justify-between p-5 border-b backdrop-blur-md ${isDarkMode ? 'bg-[#131619]/90 border-gray-800' : 'bg-white/90 border-gray-200'}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-[6px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <FaPhoneAlt size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black uppercase tracking-wider">Student Service Calling</h2>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                                        Log Service Feedback &amp; Follow-up Details
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsServiceCallOpen(false)}
                                className={`p-2 rounded-[4px] transition-all ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                            >
                                <FaTimes size={16} />
                            </button>
                        </div>

                        {/* Student Details Header Summary */}
                        <div className="p-5 border-b border-gray-800/50 bg-emerald-500/5">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px]">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Student Name</span>
                                    <span className="font-black text-emerald-400 uppercase">
                                        {details.studentName || student.studentName || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Enrollment No</span>
                                    <span className="font-bold text-gray-300">
                                        {details.enrollmentNo || details.admissionNo || student.admissionNumber || student.uid || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Mobile No</span>
                                    <span className="font-bold text-gray-300">
                                        {details.mobileNum || student.mobileNum || student.phone || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Centre</span>
                                    <span className="font-bold text-gray-300">
                                        {details.centre || student.centre || "Main Centre"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSubmitServiceCall} className="p-6 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Service Purpose Dropdown */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                        Service Purpose <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={serviceCallForm.servicePurpose}
                                        onChange={(e) => setServiceCallForm({ ...serviceCallForm, servicePurpose: e.target.value })}
                                        required
                                        className={`w-full p-3 rounded-[4px] border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#181b1e] border-gray-800 text-white focus:border-emerald-500' : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-emerald-500'}`}
                                    >
                                        <option value="EMI Purpose">EMI Purpose</option>
                                        <option value="Cross Selling">Cross Selling</option>
                                        <option value="Any Other Dispute">Any Other Dispute</option>
                                        <option value="Attendance & Academic Issue">Attendance &amp; Academic Issue</option>
                                        <option value="General Service Calling">General Service Calling</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                {/* Next Follow Up Date (Mandatory) */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                        Next Follow Up Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={serviceCallForm.nextFollowUpDate}
                                        onChange={(e) => setServiceCallForm({ ...serviceCallForm, nextFollowUpDate: e.target.value })}
                                        className={`w-full p-3 rounded-[4px] border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#181b1e] border-gray-800 text-white focus:border-emerald-500' : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-emerald-500'}`}
                                    />
                                </div>
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                    Remarks / Call Notes
                                </label>
                                <textarea
                                    rows={3}
                                    value={serviceCallForm.remarks}
                                    onChange={(e) => setServiceCallForm({ ...serviceCallForm, remarks: e.target.value })}
                                    placeholder="Enter call details, EMI agreement, dispute resolution, or cross-selling feedback..."
                                    className={`w-full p-3 rounded-[4px] border text-[11px] font-medium outline-none transition-all ${isDarkMode ? 'bg-[#181b1e] border-gray-800 text-white focus:border-emerald-500' : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-emerald-500'}`}
                                />
                            </div>

                            {/* Submit Controls */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setIsServiceCallOpen(false)}
                                    className={`px-5 py-2.5 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingServiceCall}
                                    className="px-6 py-2.5 rounded-[4px] bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmittingServiceCall ? (
                                        <><FaSync className="animate-spin" size={12} /> Logging Call...</>
                                    ) : (
                                        <><FaPhoneAlt size={12} /> Submit Service Call</>
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* Call History Section */}
                        <div className="p-6 border-t border-gray-800 bg-black/20">
                            <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                                <FaHistory size={12} className="text-emerald-400" />
                                Previous Service Call History ({serviceCallHistory.length})
                            </h3>
                            {loadingServiceCallHistory ? (
                                <p className="text-[10px] text-gray-500 font-bold uppercase animate-pulse">Loading service call logs...</p>
                            ) : serviceCallHistory.length === 0 ? (
                                <p className="text-[10px] text-gray-500 italic">No previous service calls logged for this student.</p>
                            ) : (
                                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                                    {serviceCallHistory.map((item, idx) => (
                                        <div key={idx} className={`p-3 rounded-[4px] border text-[11px] ${isDarkMode ? 'bg-[#181b1e] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className="flex items-center justify-between font-bold mb-1">
                                                <span className="text-emerald-400 uppercase">{item.servicePurpose}</span>
                                                <span className="text-gray-500 text-[10px] font-mono">{item.callDate || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '')}</span>
                                            </div>
                                            <p className="text-gray-300 font-normal">{item.remarks || "No remarks provided"}</p>
                                            <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-800/50">
                                                <span>Caller: <strong className="text-gray-400">{item.userName || "Staff"}</strong> ({item.userRole || "User"})</span>
                                                <span>Next Follow-up: <strong className="text-emerald-400">{item.nextFollowUpDate || "N/A"}</strong></span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
