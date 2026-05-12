import React, { useState, useEffect } from "react";
import { FaTimes, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "axios";

const AddCourseTargetModal = ({ onClose, onSuccess, centres, isDarkMode }) => {
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [targetLevel, setTargetLevel] = useState("COURSE"); // COURSE or DEPARTMENT
    const [formData, setFormData] = useState({
        centreId: "",
        courseId: "",
        departmentId: "",
        targetType: "MONTHLY",
        year: new Date().getFullYear(),
        month: new Date().toLocaleString('default', { month: 'long' }),
        quarter: "Q1",
        week: 1,
        targetCount: ""
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [coursesRes, deptsRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/course`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${import.meta.env.VITE_API_URL}/department`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setCourses(coursesRes.data || []);
                setAllDepartments(deptsRes.data.filter(d => d.showInAdmission !== false) || []);
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.centreId || !formData.targetCount) {
            return toast.warn("Please select a centre and target count");
        }

        if (targetLevel === "COURSE" && !formData.courseId) {
            return toast.warn("Please select a course");
        }

        if (targetLevel === "DEPARTMENT" && !formData.departmentId) {
            return toast.warn("Please select a department");
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let finalPayload = { ...formData };

            if (targetLevel === "COURSE") {
                const course = courses.find(c => c._id === formData.courseId);
                finalPayload.department = course?.department?._id || course?.department;
            } else {
                finalPayload.department = formData.departmentId;
                delete finalPayload.courseId; // Backend should handle missing courseId
            }

            await axios.post(`${import.meta.env.VITE_API_URL}/sales/course-target`, finalPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Target saved successfully");
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to save target");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden`}>
                <div className={`${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'} px-6 py-4 border-b border-inherit flex justify-between items-center`}>
                    <h3 className={`text-xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Set Performance Target
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Target Level Toggle */}
                    <div className="flex gap-2 p-1 bg-black/20 rounded-xl">
                        {["COURSE", "DEPARTMENT"].map(level => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => setTargetLevel(level)}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${targetLevel === level ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {level} LEVEL
                            </button>
                        ))}
                    </div>

                    {/* Centre Selection */}
                    <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Target Centre *</label>
                        <select
                            required
                            value={formData.centreId}
                            onChange={(e) => setFormData({ ...formData, centreId: e.target.value })}
                            className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                        >
                            <option value="">Select Centre</option>
                            {centres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                        </select>
                    </div>

                    {/* Dynamic Selection based on Level */}
                    {targetLevel === "COURSE" ? (
                        <div>
                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Target Course *</label>
                            <select
                                required
                                value={formData.courseId}
                                onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                                className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            >
                                <option value="">Select Course</option>
                                {courses.map(c => <option key={c._id} value={c._id}>{c.courseName}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Target Department *</label>
                            <select
                                required
                                value={formData.departmentId}
                                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            >
                                <option value="">Select Department</option>
                                {allDepartments.map(d => <option key={d._id} value={d._id}>{d.departmentName}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Cycle Type</label>
                            <select
                                value={formData.targetType}
                                onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                                className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            >
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="QUARTERLY">Quarterly</option>
                                <option value="YEARLY">Yearly</option>
                            </select>
                        </div>
                        <div>
                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Year</label>
                            <input
                                type="number"
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {formData.targetType === "MONTHLY" && (
                            <div>
                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Month</label>
                                <select
                                    value={formData.month}
                                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                    className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                >
                                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {formData.targetType === "QUARTERLY" && (
                            <div>
                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Quarter</label>
                                <select
                                    value={formData.quarter}
                                    onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
                                    className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                >
                                    <option value="Q1">Q1 (Apr-Jun)</option>
                                    <option value="Q2">Q2 (Jul-Sep)</option>
                                    <option value="Q3">Q3 (Oct-Dec)</option>
                                    <option value="Q4">Q4 (Jan-Mar)</option>
                                </select>
                            </div>
                        )}
                        {formData.targetType === "WEEKLY" && (
                            <div>
                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Week Number</label>
                                <input
                                    type="number"
                                    min="1" max="52"
                                    value={formData.week}
                                    onChange={(e) => setFormData({ ...formData, week: e.target.value })}
                                    className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                />
                            </div>
                        )}
                        <div className={formData.targetType === "YEARLY" ? "col-span-2" : ""}>
                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Goal Count *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                placeholder="e.g. 50"
                                value={formData.targetCount}
                                onChange={(e) => setFormData({ ...formData, targetCount: e.target.value })}
                                className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-95 mt-4"
                    >
                        {loading ? "Establishing Goal..." : <><FaSave /> Set Admission Goal</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddCourseTargetModal;
