import React, { useState } from "react";
import { FaTimes, FaEdit, FaSync, FaSave, FaCheckSquare, FaSquare } from "react-icons/fa";
import { toast } from "react-toastify";

const BulkUpdateStudentModal = ({
    selectedAdmissionIds,
    onClose,
    onSuccess,
    sessions,
    allowedCentres,
    classes,
    departments,
    courses,
    examTags,
    activeEmployees,
    isDarkMode,
    boards = []
}) => {
    const [enabledFields, setEnabledFields] = useState({
        academicSession: false,
        centre: false,
        board: false,
        class: false,
        department: false,
        course: false,
        examTag: false,
        admissionStatus: false,
        counselledBy: false,
        createdBy: false, // Admitted By
        courseDeactivation: false
    });

    const [formData, setFormData] = useState({
        academicSession: "",
        centre: "",
        board: "",
        class: "",
        department: "",
        course: "",
        examTag: "",
        admissionStatus: "",
        counselledBy: "",
        createdBy: "",
        courseDeactivation: ""
    });

    const [loading, setLoading] = useState(false);

    const toggleField = (field) => {
        setEnabledFields(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Construct updateData with only enabled fields
        const updateData = {};
        let hasAtLeastOneField = false;

        Object.keys(enabledFields).forEach(field => {
            if (enabledFields[field]) {
                updateData[field] = formData[field];
                hasAtLeastOneField = true;
            }
        });

        if (!hasAtLeastOneField) {
            toast.warning("Please select at least one field to update.");
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admission/bulk-update`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ids: selectedAdmissionIds,
                    updateData
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || "Enrolled students updated successfully");
                onSuccess();
            } else {
                toast.error(data.message || "Failed to update enrolled students");
            }
        } catch (error) {
            console.error("Error updating enrolled students:", error);
            toast.error("An internal error occurred");
        } finally {
            setLoading(false);
        }
    };

    const selectClasses = (isEnabled) => `w-full px-4 py-2.5 rounded-[4px] border text-xs font-semibold outline-none transition-all appearance-none cursor-pointer ${
        !isEnabled ? 'bg-gray-800/10 border-gray-800/20 text-gray-500 cursor-not-allowed opacity-50' : 
        isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 
        'bg-gray-50 border-gray-300 text-gray-900 focus:border-cyan-500'
    }`;

    const labelClasses = (isEnabled) => `block text-[11px] font-bold uppercase mb-1.5 ml-1 tracking-wider ${isEnabled ? (isDarkMode ? 'text-cyan-400' : 'text-cyan-600') : 'text-gray-500'}`;

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[70] p-4 overflow-y-auto backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/70' : 'bg-white/60'}`}>
            <div className={`w-full max-w-4xl rounded-lg border shadow-2xl transition-all overflow-hidden scale-in ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-cyan-500/10' : 'bg-white border-gray-200 shadow-lg'}`}>

                {/* Header */}
                <div className={`px-8 py-5 border-b flex justify-between items-center transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h3 className={`text-xl font-black uppercase tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaEdit className="text-cyan-500" />
                            Bulk Update Enrolled Students ({selectedAdmissionIds.length})
                        </h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Toggle the checkbox next to any field to include it in the bulk update override</p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`transition-all p-2 rounded-lg active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={`p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                        {/* Session */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.academicSession ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('academicSession')}>
                                {enabledFields.academicSession ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Session</span>
                            </div>
                            <label className={labelClasses(enabledFields.academicSession)}>Academic Session</label>
                            <select
                                name="academicSession"
                                disabled={!enabledFields.academicSession}
                                value={formData.academicSession}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.academicSession)}
                            >
                                <option value="">-- SELECT SESSION --</option>
                                {sessions.filter(sess => sess.isGlobalActive).map(sess => (
                                    <option key={sess._id} value={sess.sessionName}>{sess.sessionName}</option>
                                ))}
                            </select>
                        </div>

                        {/* Registered Centre */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.centre ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('centre')}>
                                {enabledFields.centre ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Centre</span>
                            </div>
                            <label className={labelClasses(enabledFields.centre)}>Registered Centre</label>
                            <select
                                name="centre"
                                disabled={!enabledFields.centre}
                                value={formData.centre}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.centre)}
                            >
                                <option value="">Select Centre</option>
                                {allowedCentres.map(c => (
                                    <option key={c} value={c}>{c.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                        {/* Board */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.board ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('board')}>
                                {enabledFields.board ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Board</span>
                            </div>
                            <label className={labelClasses(enabledFields.board)}>Affiliation Board</label>
                            <select
                                name="board"
                                disabled={!enabledFields.board}
                                value={formData.board}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.board)}
                            >
                                <option value="">Select Board</option>
                                {boards.map(b => (
                                    <option key={b._id} value={b.boardCourse}>{b.boardCourse.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                        {/* Class */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.class ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('class')}>
                                {enabledFields.class ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Class</span>
                            </div>
                            <label className={labelClasses(enabledFields.class)}>Class</label>
                            <select
                                name="class"
                                disabled={!enabledFields.class}
                                value={formData.class}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.class)}
                            >
                                <option value="">Select Class</option>
                                {classes.map(cls => (
                                    <option key={cls._id} value={cls._id}>{cls.className || cls.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Department */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.department ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('department')}>
                                {enabledFields.department ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Dept</span>
                            </div>
                            <label className={labelClasses(enabledFields.department)}>Department</label>
                            <select
                                name="department"
                                disabled={!enabledFields.department}
                                value={formData.department}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.department)}
                            >
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept._id} value={dept._id}>{dept.departmentName}</option>
                                ))}
                            </select>
                        </div>

                        {/* Course */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.course ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('course')}>
                                {enabledFields.course ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Course</span>
                            </div>
                            <label className={labelClasses(enabledFields.course)}>Course</label>
                            <select
                                name="course"
                                disabled={!enabledFields.course}
                                value={formData.course}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.course)}
                            >
                                <option value="">Select Course</option>
                                {courses.map(course => (
                                    <option key={course._id} value={course._id}>{course.courseName}</option>
                                ))}
                            </select>
                        </div>

                        {/* Course Status (Deactivation / Reactivation) */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.courseDeactivation ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('courseDeactivation')}>
                                {enabledFields.courseDeactivation ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Course Status Update</span>
                            </div>
                            <label className={labelClasses(enabledFields.courseDeactivation)}>Course Status</label>
                            <select
                                name="courseDeactivation"
                                disabled={!enabledFields.courseDeactivation}
                                value={formData.courseDeactivation}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.courseDeactivation)}
                            >
                                <option value="">Select Option</option>
                                <option value="DEACTIVATE">Deactivate Courses</option>
                                <option value="REACTIVATE">Reactivate Courses</option>
                            </select>
                        </div>

                        {/* Exam Tag */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.examTag ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('examTag')}>
                                {enabledFields.examTag ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Exam Tag</span>
                            </div>
                            <label className={labelClasses(enabledFields.examTag)}>Exam Tag</label>
                            <select
                                name="examTag"
                                disabled={!enabledFields.examTag}
                                value={formData.examTag}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.examTag)}
                            >
                                <option value="">Select Exam Tag</option>
                                {examTags.map(tag => (
                                    <option key={tag._id} value={tag._id}>{tag.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Admission Status */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.admissionStatus ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('admissionStatus')}>
                                {enabledFields.admissionStatus ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Status</span>
                            </div>
                            <label className={labelClasses(enabledFields.admissionStatus)}>Admission Status</label>
                            <select
                                name="admissionStatus"
                                disabled={!enabledFields.admissionStatus}
                                value={formData.admissionStatus}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.admissionStatus)}
                            >
                                <option value="">Select Status</option>
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                                <option value="CANCELLED">CANCELLED</option>
                                <option value="COMPLETED">COMPLETED</option>
                                <option value="TRANSFERRED">TRANSFERRED</option>
                            </select>
                        </div>

                        {/* Counselled By */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.counselledBy ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('counselledBy')}>
                                {enabledFields.counselledBy ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Counselled By</span>
                            </div>
                            <label className={labelClasses(enabledFields.counselledBy)}>Counselled By</label>
                            <select
                                name="counselledBy"
                                disabled={!enabledFields.counselledBy}
                                value={formData.counselledBy}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.counselledBy)}
                            >
                                <option value="">Select Counselor</option>
                                {activeEmployees.map(emp => (
                                    <option key={emp._id} value={emp._id}>{emp.name.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                        {/* Admitted By */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.createdBy ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('createdBy')}>
                                {enabledFields.createdBy ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Admitted By</span>
                            </div>
                            <label className={labelClasses(enabledFields.createdBy)}>Admitted By</label>
                            <select
                                name="createdBy"
                                disabled={!enabledFields.createdBy}
                                value={formData.createdBy}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.createdBy)}
                            >
                                <option value="">Select Admin</option>
                                {activeEmployees.map(emp => (
                                    <option key={emp._id} value={emp._id}>{emp.name.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                    </div>

                    {/* Submit Actions */}
                    <div className={`flex justify-end gap-4 mt-10 pt-6 border-t transition-all ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-8 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 border ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-10 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg ${isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/30'}`}
                        >
                            {loading ? <FaSync className="animate-spin" /> : <>Update Selected Students</>}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#333' : '#d1d5db'}; border-radius: 4px; }
            `}</style>
        </div>
    );
};

export default BulkUpdateStudentModal;
