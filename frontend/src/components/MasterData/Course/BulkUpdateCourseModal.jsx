import React, { useState } from "react";
import { FaTimes, FaEdit, FaSync, FaSave, FaCheckSquare, FaSquare } from "react-icons/fa";
import { toast } from "react-toastify";

const BulkUpdateCourseModal = ({ selectedCourseIds, onClose, onSuccess, classes, departments, examTags, sessions, isDarkMode }) => {
    const [enabledFields, setEnabledFields] = useState({
        courseSession: false,
        department: false,
        class: false,
        examTag: false,
        courseDuration: false,
        coursePeriod: false,
        mode: false,
        courseType: false,
        programme: false
    });

    const [formData, setFormData] = useState({
        courseSession: "",
        department: "",
        class: "",
        examTag: "",
        courseDuration: "",
        coursePeriod: "",
        mode: "",
        courseType: "",
        programme: ""
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

        // Construct the update data only using enabled fields
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
            const response = await fetch(`${import.meta.env.VITE_API_URL}/course/bulk-update`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ids: selectedCourseIds,
                    updateData
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || "Courses updated successfully");
                onSuccess();
            } else {
                toast.error(data.message || "Failed to update courses");
            }
        } catch (error) {
            console.error("Error updating courses:", error);
            toast.error("An internal error occurred");
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = (isEnabled) => `w-full px-4 py-2.5 rounded-[8px] border text-xs font-semibold outline-none transition-all ${
        !isEnabled ? 'bg-gray-800/10 border-gray-850/20 text-gray-500 cursor-not-allowed opacity-50' : 
        isDarkMode ? 'bg-[#131619] border-gray-700 text-white placeholder-gray-600 focus:border-cyan-500' : 
        'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-cyan-500'
    }`;

    const selectClasses = (isEnabled) => `w-full px-4 py-2.5 rounded-[8px] border text-xs font-semibold outline-none transition-all appearance-none cursor-pointer ${
        !isEnabled ? 'bg-gray-800/10 border-gray-850/20 text-gray-500 cursor-not-allowed opacity-50' : 
        isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 
        'bg-gray-50 border-gray-300 text-gray-900 focus:border-cyan-500'
    }`;

    const labelClasses = (isEnabled) => `block text-[11px] font-bold uppercase mb-1.5 ml-1 tracking-wider ${isEnabled ? (isDarkMode ? 'text-cyan-400' : 'text-cyan-600') : 'text-gray-500'}`;

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[70] p-4 overflow-y-auto backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/70' : 'bg-white/60'}`}>
            <div className={`w-full max-w-3xl rounded-xl border shadow-2xl transition-all overflow-hidden scale-in ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-cyan-500/10' : 'bg-white border-gray-200'}`}>

                {/* Header */}
                <div className={`px-8 py-5 border-b flex justify-between items-center transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h3 className={`text-xl font-bold uppercase tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaEdit className="text-cyan-500" />
                            Bulk Update Selected Courses ({selectedCourseIds.length})
                        </h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Toggle the checkbox next to any field to include it in the bulk update</p>
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

                        {/* Course Session */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.courseSession ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-250')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('courseSession')}>
                                {enabledFields.courseSession ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Enable Session</span>
                            </div>
                            <label className={labelClasses(enabledFields.courseSession)}>Session</label>
                            <select
                                name="courseSession"
                                disabled={!enabledFields.courseSession}
                                value={formData.courseSession}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.courseSession)}
                            >
                                <option value="">Select Session</option>
                                {sessions.map(sess => (
                                    <option key={sess._id} value={sess.sessionName}>{sess.sessionName}</option>
                                ))}
                            </select>
                        </div>

                        {/* Department */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.department ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-250')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('department')}>
                                {enabledFields.department ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Enable Dept</span>
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

                        {/* Class */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.class ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-250')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('class')}>
                                {enabledFields.class ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Enable Class</span>
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
                                    <option key={cls._id} value={cls._id}>{cls.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Exam Tag */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.examTag ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-250')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('examTag')}>
                                {enabledFields.examTag ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Enable Exam Tag</span>
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

                        {/* Course Duration */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.courseDuration ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-255')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('courseDuration')}>
                                {enabledFields.courseDuration ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Enable Duration</span>
                            </div>
                            <label className={labelClasses(enabledFields.courseDuration)}>Duration (Months)</label>
                            <input
                                type="text"
                                name="courseDuration"
                                disabled={!enabledFields.courseDuration}
                                value={formData.courseDuration}
                                onChange={handleChange}
                                className={inputClasses(enabledFields.courseDuration)}
                                placeholder="e.g. 12"
                            />
                        </div>

                        {/* Course Period */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.coursePeriod ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-250')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('coursePeriod')}>
                                {enabledFields.coursePeriod ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Enable Period</span>
                            </div>
                            <label className={labelClasses(enabledFields.coursePeriod)}>Period</label>
                            <select
                                name="coursePeriod"
                                disabled={!enabledFields.coursePeriod}
                                value={formData.coursePeriod}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.coursePeriod)}
                            >
                                <option value="">Select Period</option>
                                <option value="Yearly">Yearly</option>
                                <option value="Monthly">Monthly</option>
                            </select>
                        </div>

                        {/* Mode */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.mode ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-250')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('mode')}>
                                {enabledFields.mode ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Enable Mode</span>
                            </div>
                            <label className={labelClasses(enabledFields.mode)}>Mode</label>
                            <select
                                name="mode"
                                disabled={!enabledFields.mode}
                                value={formData.mode}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.mode)}
                            >
                                <option value="">Select Mode</option>
                                <option value="OFFLINE">OFFLINE</option>
                                <option value="ONLINE">ONLINE</option>
                            </select>
                        </div>

                        {/* Course Type */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.courseType ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-250')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('courseType')}>
                                {enabledFields.courseType ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Enable Type</span>
                            </div>
                            <label className={labelClasses(enabledFields.courseType)}>Course Type</label>
                            <select
                                name="courseType"
                                disabled={!enabledFields.courseType}
                                value={formData.courseType}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.courseType)}
                            >
                                <option value="">Select Type</option>
                                <option value="INSTATION">INSTATION</option>
                                <option value="OUTSTATION">OUTSTATION</option>
                            </select>
                        </div>

                        {/* Programme */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.programme ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-250')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('programme')}>
                                {enabledFields.programme ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Enable Programme</span>
                            </div>
                            <label className={labelClasses(enabledFields.programme)}>Programme</label>
                            <select
                                name="programme"
                                disabled={!enabledFields.programme}
                                value={formData.programme}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.programme)}
                            >
                                <option value="">Select Programme</option>
                                <option value="CRP">CRP</option>
                                <option value="NCRP">NCRP</option>
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
                            {loading ? <FaSync className="animate-spin" /> : <>Update Selected Courses</>}
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

export default BulkUpdateCourseModal;
