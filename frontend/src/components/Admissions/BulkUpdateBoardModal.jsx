import React, { useState, useEffect } from "react";
import { FaTimes, FaEdit, FaSave, FaCheckSquare, FaSquare } from "react-icons/fa";
import { toast } from "react-toastify";

const BulkUpdateBoardModal = ({
    selectedIds,
    activeTab,
    onClose,
    onSuccess,
    sessions = [],
    allowedCentres,
    classes,
    departments,
    boards,
    examTags,
    activeEmployees,
    isDarkMode
}) => {
    const [enabledFields, setEnabledFields] = useState({
        academicSession: false,
        centre: false,
        lastClass: false,
        department: false,
        programme: false,
        boardId: false,
        examTag: false,
        counselledBy: false,
        createdBy: false
    });

    const [formData, setFormData] = useState({
        academicSession: "",
        centre: "",
        lastClass: "",
        department: "",
        programme: "",
        boardId: "",
        examTag: "",
        counselledBy: "",
        createdBy: ""
    });

    const [counselledByOptions, setCounselledByOptions] = useState([]);
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

    // Auto-fetch active users when centre changes to populate counsellor/admitted by dropdowns
    useEffect(() => {
        const fetchCentreUsers = async (centreName) => {
            if (!centreName) {
                setCounselledByOptions([]);
                return;
            }
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/getAllUsers`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await response.json();
                if (response.ok && data.users) {
                    const userList = Array.isArray(data.users) ? data.users : [];
                    const filtered = userList.filter((user) => {
                        if (user.isActive === false) return false;
                        const userRole = (user.role || "").toLowerCase().trim();
                        // Exclude teacher, hr, accounts, coordinator, class_coordinator, hod
                        const isExcludedRole = ["teacher", "hr", "accounts", "coordinator", "class_coordinator", "hod"].includes(userRole.replace(/\s+/g, ""));
                        if (isExcludedRole) return false;

                        const hasMatchingCentre = 
                            (user.primaryCentre && user.primaryCentre.centreName && user.primaryCentre.centreName.toLowerCase() === centreName.toLowerCase()) ||
                            (user.centres && user.centres.some(c => c.centreName && c.centreName.toLowerCase() === centreName.toLowerCase()));

                        return hasMatchingCentre;
                    });
                    setCounselledByOptions(filtered);
                }
            } catch (error) {
                console.error("Error fetching users for centre:", error);
            }
        };

        if (formData.centre) {
            fetchCentreUsers(formData.centre);
        } else {
            setCounselledByOptions(activeEmployees || []);
        }
    }, [formData.centre, activeEmployees]);

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
            const response = await fetch(`${import.meta.env.VITE_API_URL}/board-admission/bulk-update`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ids: selectedIds,
                    type: activeTab,
                    updateData
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || "Records updated successfully");
                onSuccess();
            } else {
                toast.error(data.message || "Failed to update records");
            }
        } catch (error) {
            console.error("Error updating board records in bulk:", error);
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
                            Bulk Update Board {activeTab === "Counselling" ? "Counselling" : "Admissions"} ({selectedIds.length})
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
                                {sessions.filter(s => s.isGlobalActive).map(s => (
                                    <option key={s._id} value={s.sessionName}>
                                        {s.sessionName.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Centre */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.centre ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('centre')}>
                                {enabledFields.centre ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Centre</span>
                            </div>
                            <label className={labelClasses(enabledFields.centre)}>Centre</label>
                            <select
                                name="centre"
                                disabled={!enabledFields.centre}
                                value={formData.centre}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.centre)}
                            >
                                <option value="">SELECT CENTRE...</option>
                                {allowedCentres.map(c => (
                                    <option key={c} value={c}>{c.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                        {/* Last Class */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.lastClass ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('lastClass')}>
                                {enabledFields.lastClass ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Class</span>
                            </div>
                            <label className={labelClasses(enabledFields.lastClass)}>Target Class</label>
                            <select
                                name="lastClass"
                                disabled={!enabledFields.lastClass}
                                value={formData.lastClass}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.lastClass)}
                            >
                                <option value="">SELECT CLASS...</option>
                                {classes.map(c => (
                                    <option key={c._id} value={c.name || c.className}>{(c.name || c.className).toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                        {/* Department */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.department ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('department')}>
                                {enabledFields.department ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Department</span>
                            </div>
                            <label className={labelClasses(enabledFields.department)}>Department</label>
                            <select
                                name="department"
                                disabled={!enabledFields.department}
                                value={formData.department}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.department)}
                            >
                                <option value="">SELECT DEPARTMENT...</option>
                                {departments.map(d => (
                                    <option key={d._id} value={d._id}>{d.departmentName.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                        {/* Programme */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.programme ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('programme')}>
                                {enabledFields.programme ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Programme</span>
                            </div>
                            <label className={labelClasses(enabledFields.programme)}>Programme</label>
                            <select
                                name="programme"
                                disabled={!enabledFields.programme}
                                value={formData.programme}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.programme)}
                            >
                                <option value="">SELECT PROGRAMME...</option>
                                <option value="CRP">CRP</option>
                                <option value="NCRP">NCRP</option>
                            </select>
                        </div>

                        {/* Target Board */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.boardId ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('boardId')}>
                                {enabledFields.boardId ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Board</span>
                            </div>
                            <label className={labelClasses(enabledFields.boardId)}>Primary Target Board</label>
                            <select
                                name="boardId"
                                disabled={!enabledFields.boardId}
                                value={formData.boardId}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.boardId)}
                            >
                                <option value="">SELECT BOARD...</option>
                                {boards.map(b => (
                                    <option key={b._id} value={b._id}>{b.boardCourse.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                        {/* Target Exam Tag */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.examTag ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`}>
                            <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleField('examTag')}>
                                {enabledFields.examTag ? <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-500" />}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-750'}`}>Enable Exam Tag</span>
                            </div>
                            <label className={labelClasses(enabledFields.examTag)}>Target Exam Identifier</label>
                            <select
                                name="examTag"
                                disabled={!enabledFields.examTag}
                                value={formData.examTag}
                                onChange={handleChange}
                                className={selectClasses(enabledFields.examTag)}
                            >
                                <option value="">SELECT EXAM TAG...</option>
                                {examTags.map(tag => (
                                    <option key={tag._id} value={tag._id}>{tag.name.toUpperCase()}</option>
                                ))}
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
                                <option value="">CHOOSE COUNSELLOR...</option>
                                 {counselledByOptions.map(u => (
                                     <option key={u._id} value={u._id}>{(u.name || "").toUpperCase()} ({(u.role || "").toUpperCase()})</option>
                                 ))}
                             </select>
                         </div>
 
                         {/* Admitted By */}
                         {activeTab !== "Counselling" && (
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
                                     <option value="">CHOOSE ADMITTING OFFICER...</option>
                                     {counselledByOptions.map(u => (
                                         <option key={u._id} value={u._id}>{(u.name || "").toUpperCase()} ({(u.role || "").toUpperCase()})</option>
                                     ))}
                                 </select>
                             </div>
                         )}

                    </div>

                    {/* Submit Section */}
                    <div className="flex gap-4 pt-4 border-t border-gray-800/10 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-6 py-3.5 rounded-[4px] border text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'}`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3.5 rounded-[4px] bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-cyan-500/25 ml-auto disabled:opacity-50 transition-all"
                        >
                            {loading ? "Updating..." : "Apply Bulk Update"}
                            {!loading && <FaSave />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulkUpdateBoardModal;
