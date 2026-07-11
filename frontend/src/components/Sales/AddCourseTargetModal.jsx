import React, { useState, useEffect } from "react";
import { FaTimes, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "axios";
import CustomMultiSelect from "../common/CustomMultiSelect";

const AddCourseTargetModal = ({ onClose, onSuccess, centres, isDarkMode, initialData }) => {
    const [loading, setLoading] = useState(false);
    const [allDepartments, setAllDepartments] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [formData, setFormData] = useState({
        centreId: initialData?.centreId || "",
        departmentId: initialData?.departmentId || "",
        examTags: initialData?.examTags || [],
        targetType: initialData?.targetType || "MONTHLY",
        year: initialData?.year || new Date().getFullYear(),
        month: initialData?.month || new Date().toLocaleString('default', { month: 'long' }),
        quarter: initialData?.quarter || "Q1",
        week: initialData?.week || 1,
        targetCount: initialData?.targetCount || ""
    });

    useEffect(() => {
        if (initialData && examTags.length > 0) {
            // Map simple IDs to {value, label} for CustomMultiSelect if needed
            // But if initialData already provides objects or we can find them from examTags state
            if (initialData.examTags && typeof initialData.examTags[0] === 'string') {
                const mappedTags = initialData.examTags.map(id => {
                    const found = examTags.find(t => t._id === id);
                    return found ? { value: found._id, label: found.tagName || found.name } : null;
                }).filter(Boolean);
                setFormData(prev => ({ ...prev, examTags: mappedTags }));
            }
        }
    }, [initialData, examTags]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [deptsRes, examTagsRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/department`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${import.meta.env.VITE_API_URL}/examTag`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setAllDepartments(deptsRes.data.filter(d => d.showInAdmission !== false) || []);
                setExamTags(examTagsRes.data || []);
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.centreId || !formData.targetCount || !formData.departmentId) {
            return toast.warn("Please select a centre, department and target count");
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const finalPayload = { 
                ...formData,
                department: formData.departmentId,
                examTags: formData.examTags.map(tag => tag.value) // Extract IDs only
            };

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
                        {initialData ? 'Update Performance Target' : 'Set Performance Target'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Centre Selection */}
                    <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Target Centre *</label>
                        <CustomMultiSelect
                            isMulti={false}
                            options={centres.map(c => ({ value: c._id, label: c.centreName }))}
                            value={formData.centreId ? { value: formData.centreId, label: centres.find(c => c._id === formData.centreId)?.centreName || "Select Centre" } : null}
                            onChange={(val) => setFormData({ ...formData, centreId: val ? val.value : "" })}
                            placeholder="Select Centre"
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {/* Department Selection */}
                    <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Target Department *</label>
                        <CustomMultiSelect
                            isMulti={false}
                            options={allDepartments.map(d => ({ value: d._id, label: d.departmentName }))}
                            value={formData.departmentId ? { value: formData.departmentId, label: allDepartments.find(d => d._id === formData.departmentId)?.departmentName || "Select Department" } : null}
                            onChange={(val) => setFormData({ ...formData, departmentId: val ? val.value : "" })}
                            placeholder="Select Department"
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {/* Exam Tag Selection (Optional - Multiple) */}
                    <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Exam Tags (Optional)</label>
                        <CustomMultiSelect
                            options={examTags.map(tag => ({
                                value: tag._id,
                                label: tag.tagName || tag.name
                            }))}
                            value={formData.examTags}
                            onChange={(vals) => setFormData({ ...formData, examTags: vals || [] })}
                            placeholder="Select Exam Tags"
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Cycle Type</label>
                            <select
                                value={formData.targetType}
                                onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                                className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
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
                            <>
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
                                <div>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Week Number</label>
                                    <input
                                        type="number"
                                        min="1" max="6"
                                        value={formData.week}
                                        onChange={(e) => setFormData({ ...formData, week: e.target.value })}
                                        className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                    />
                                </div>
                            </>
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
                        {loading ? "Establishing Goal..." : <><FaSave /> {initialData ? 'Update Admission Goal' : 'Set Admission Goal'}</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddCourseTargetModal;
