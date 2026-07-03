import React, { useState } from "react";
import { FaTimes, FaSync, FaCheckSquare, FaSquare, FaUsers } from "react-icons/fa";
import { toast } from "react-toastify";

const ROLES = [
    { value: "admin", label: "Admin" },
    { value: "superAdmin", label: "Super Admin" },
    { value: "teacher", label: "Teacher" },
    { value: "telecaller", label: "Telecaller" },
    { value: "centralizedTelecaller", label: "Centralized Telecaller" },
    { value: "counsellor", label: "Counsellor" },
    { value: "RM", label: "RM" },
    { value: "Class_Coordinator", label: "Class Coordinator" },
    { value: "HOD", label: "HOD" },
    { value: "marketing", label: "Marketing" },
    { value: "centerIncharge", label: "Center Incharge" },
    { value: "zonalManager", label: "Zonal Manager" },
    { value: "hr", label: "HR" },
    { value: "accounts", label: "Accounts" },
    { value: "coordinator", label: "Coordinator" },
    { value: "digital", label: "Digital" },
    { value: "assistantZonalManager", label: "Asst. Zonal Manager" },
    { value: "assistantCenterIncharge", label: "Asst. Center Incharge" },
    { value: "supportStaff", label: "Support Staff" },
];

const BulkUpdateUserModal = ({ selectedUserIds, allCentres, allScripts, onClose, onSuccess, isDarkMode }) => {
    const [loading, setLoading] = useState(false);

    const [enabledFields, setEnabledFields] = useState({
        role: false,
        centres: false,
        isActive: false,
        canEditUsers: false,
        canDeleteUsers: false,
        teacherType: false,
        onlineOfflineType: false,
        teacherDepartment: false,
        boardType: false,
        subject: false,
        assignedScript: false,
    });

    const [formData, setFormData] = useState({
        role: "",
        centres: [],
        isActive: "",
        canEditUsers: "",
        canDeleteUsers: "",
        teacherType: "",
        onlineOfflineType: "",
        teacherDepartment: [],
        boardType: "",
        subject: "",
        assignedScript: "",
    });

    const toggleField = (field) => {
        setEnabledFields(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Handle multi-select for centres
    const handleCentresChange = (e) => {
        const selected = Array.from(e.target.selectedOptions).map(o => o.value);
        setFormData(prev => ({ ...prev, centres: selected }));
    };

    // Handle multi-select for teacherDepartment
    const handleTeacherDeptChange = (e) => {
        const selected = Array.from(e.target.selectedOptions).map(o => o.value);
        setFormData(prev => ({ ...prev, teacherDepartment: selected }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const updateData = {};
        let hasAtLeastOneField = false;

        Object.keys(enabledFields).forEach(field => {
            if (!enabledFields[field]) return;

            const val = formData[field];
            // For booleans stored as strings
            if (field === "isActive" || field === "canEditUsers" || field === "canDeleteUsers") {
                if (val !== "") {
                    updateData[field] = val === "true";
                    hasAtLeastOneField = true;
                }
            } else if (field === "centres" || field === "teacherDepartment") {
                if (Array.isArray(val) && val.length > 0) {
                    updateData[field] = val;
                    hasAtLeastOneField = true;
                }
            } else if (val !== "") {
                updateData[field] = val;
                hasAtLeastOneField = true;
            }
        });

        if (!hasAtLeastOneField) {
            toast.warning("Please enable and fill at least one field to update.");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/bulkUpdateUsers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ids: selectedUserIds, updateData }),
            });

            const data = await response.json();

            if (response.ok) {
                if (data.results?.failed > 0) {
                    toast.warning(data.message);
                } else {
                    toast.success(data.message || "Users updated successfully");
                }
                onSuccess();
            } else {
                toast.error(data.message || "Failed to update users");
            }
        } catch (error) {
            console.error("Bulk update error:", error);
            toast.error("An internal error occurred");
        } finally {
            setLoading(false);
        }
    };

    const fieldCard = (fieldKey, label, content) => {
        const isEnabled = enabledFields[fieldKey];
        return (
            <div className={`p-3 rounded-lg border transition-all ${isEnabled
                ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200')
                : (isDarkMode ? 'border-gray-800' : 'border-gray-200')
            }`}>
                <div
                    className="flex items-center gap-2 mb-2 cursor-pointer select-none"
                    onClick={() => toggleField(fieldKey)}
                >
                    {isEnabled
                        ? <FaCheckSquare className="text-cyan-500" size={13} />
                        : <FaSquare className={isDarkMode ? "text-gray-600" : "text-gray-400"} size={13} />
                    }
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isEnabled ? 'text-cyan-400' : isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Enable {label}
                    </span>
                </div>
                <label className={`block text-[11px] font-bold uppercase mb-1.5 tracking-wider ${isEnabled ? (isDarkMode ? 'text-cyan-400' : 'text-cyan-600') : 'text-gray-500'}`}>
                    {label}
                </label>
                {content(isEnabled)}
            </div>
        );
    };

    const selectClass = (isEnabled) =>
        `w-full px-3 py-2 rounded-[6px] border text-xs font-semibold outline-none transition-all appearance-none ${!isEnabled
            ? 'opacity-40 cursor-not-allowed ' + (isDarkMode ? 'bg-gray-900 border-gray-800 text-gray-600' : 'bg-gray-100 border-gray-200 text-gray-400')
            : isDarkMode
                ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500 cursor-pointer'
                : 'bg-white border-gray-300 text-gray-900 focus:border-cyan-500 cursor-pointer'
        }`;

    const multiSelectClass = (isEnabled) =>
        `w-full px-3 py-2 rounded-[6px] border text-xs font-semibold outline-none transition-all min-h-[80px] ${!isEnabled
            ? 'opacity-40 cursor-not-allowed ' + (isDarkMode ? 'bg-gray-900 border-gray-800 text-gray-600' : 'bg-gray-100 border-gray-200 text-gray-400')
            : isDarkMode
                ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500 cursor-pointer'
                : 'bg-white border-gray-300 text-gray-900 focus:border-cyan-500 cursor-pointer'
        }`;

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[70] p-4 backdrop-blur-md ${isDarkMode ? 'bg-black/70' : 'bg-gray-900/40'}`}>
            <div className={`w-full max-w-4xl rounded-xl border shadow-2xl overflow-hidden animate-scale-in ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-cyan-500/10' : 'bg-white border-gray-200'}`}>

                {/* Header */}
                <div className={`px-8 py-5 border-b flex justify-between items-start ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h3 className={`text-xl font-black uppercase tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaUsers className="text-cyan-500" />
                            Bulk Update Users ({selectedUserIds.length})
                        </h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                            Toggle checkbox next to any field to include it in the bulk update
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-all active:scale-95 ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                        {/* Role */}
                        {fieldCard("role", "User Role", (isEnabled) => (
                            <select
                                name="role"
                                disabled={!isEnabled}
                                value={formData.role}
                                onChange={handleChange}
                                className={selectClass(isEnabled)}
                            >
                                <option value="">Select Role</option>
                                {ROLES.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        ))}

                        {/* Active Status */}
                        {fieldCard("isActive", "Active Status", (isEnabled) => (
                            <select
                                name="isActive"
                                disabled={!isEnabled}
                                value={formData.isActive}
                                onChange={handleChange}
                                className={selectClass(isEnabled)}
                            >
                                <option value="">Select Status</option>
                                <option value="true">Active</option>
                                <option value="false">Deactivated</option>
                            </select>
                        ))}

                        {/* Assigned Script */}
                        {fieldCard("assignedScript", "Assigned Script", (isEnabled) => (
                            <select
                                name="assignedScript"
                                disabled={!isEnabled}
                                value={formData.assignedScript}
                                onChange={handleChange}
                                className={selectClass(isEnabled)}
                            >
                                <option value="">Select Script</option>
                                {allScripts.map(s => (
                                    <option key={s._id} value={s._id}>{s.scriptName}</option>
                                ))}
                            </select>
                        ))}

                        {/* Can Edit Users */}
                        {fieldCard("canEditUsers", "Can Edit Users", (isEnabled) => (
                            <select
                                name="canEditUsers"
                                disabled={!isEnabled}
                                value={formData.canEditUsers}
                                onChange={handleChange}
                                className={selectClass(isEnabled)}
                            >
                                <option value="">Select</option>
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                            </select>
                        ))}

                        {/* Can Delete Users */}
                        {fieldCard("canDeleteUsers", "Can Delete Users", (isEnabled) => (
                            <select
                                name="canDeleteUsers"
                                disabled={!isEnabled}
                                value={formData.canDeleteUsers}
                                onChange={handleChange}
                                className={selectClass(isEnabled)}
                            >
                                <option value="">Select</option>
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                            </select>
                        ))}

                        {/* Teacher Type */}
                        {fieldCard("teacherType", "Teacher Type", (isEnabled) => (
                            <select
                                name="teacherType"
                                disabled={!isEnabled}
                                value={formData.teacherType}
                                onChange={handleChange}
                                className={selectClass(isEnabled)}
                            >
                                <option value="">Select Type</option>
                                <option value="Full Time">Full Time</option>
                                <option value="Part Time">Part Time</option>
                                <option value="Full-time">Full-time</option>
                                <option value="Part-time">Part-time</option>
                            </select>
                        ))}

                        {/* Online/Offline Type */}
                        {fieldCard("onlineOfflineType", "Online/Offline", (isEnabled) => (
                            <select
                                name="onlineOfflineType"
                                disabled={!isEnabled}
                                value={formData.onlineOfflineType}
                                onChange={handleChange}
                                className={selectClass(isEnabled)}
                            >
                                <option value="">Select</option>
                                <option value="Online">Online</option>
                                <option value="Offline">Offline</option>
                            </select>
                        ))}

                        {/* Board Type */}
                        {fieldCard("boardType", "Board Type", (isEnabled) => (
                            <select
                                name="boardType"
                                disabled={!isEnabled}
                                value={formData.boardType}
                                onChange={handleChange}
                                className={selectClass(isEnabled)}
                            >
                                <option value="">Select Board</option>
                                <option value="JEE">JEE</option>
                                <option value="NEET">NEET</option>
                                <option value="CBSE">CBSE</option>
                                <option value="State Board">State Board</option>
                            </select>
                        ))}

                        {/* Subject */}
                        {fieldCard("subject", "Subject", (isEnabled) => (
                            <input
                                type="text"
                                name="subject"
                                disabled={!isEnabled}
                                value={formData.subject}
                                onChange={handleChange}
                                placeholder="e.g. Physics"
                                className={`w-full px-3 py-2 rounded-[6px] border text-xs font-semibold outline-none transition-all ${!isEnabled
                                    ? 'opacity-40 cursor-not-allowed ' + (isDarkMode ? 'bg-gray-900 border-gray-800 text-gray-600' : 'bg-gray-100 border-gray-200 text-gray-400')
                                    : isDarkMode
                                        ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500 placeholder-gray-600'
                                        : 'bg-white border-gray-300 text-gray-900 focus:border-cyan-500 placeholder-gray-400'
                                }`}
                            />
                        ))}

                        {/* Centres (multi-select) — spans 2 cols */}
                        <div className={`md:col-span-2 p-3 rounded-lg border transition-all ${enabledFields.centres
                            ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200')
                            : (isDarkMode ? 'border-gray-800' : 'border-gray-200')
                        }`}>
                            <div
                                className="flex items-center gap-2 mb-2 cursor-pointer select-none"
                                onClick={() => toggleField("centres")}
                            >
                                {enabledFields.centres
                                    ? <FaCheckSquare className="text-cyan-500" size={13} />
                                    : <FaSquare className={isDarkMode ? "text-gray-600" : "text-gray-400"} size={13} />
                                }
                                <span className={`text-[10px] font-black uppercase tracking-wider ${enabledFields.centres ? 'text-cyan-400' : isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Enable Centres
                                </span>
                            </div>
                            <label className={`block text-[11px] font-bold uppercase mb-1.5 tracking-wider ${enabledFields.centres ? (isDarkMode ? 'text-cyan-400' : 'text-cyan-600') : 'text-gray-500'}`}>
                                Assigned Centres <span className="normal-case text-[9px] opacity-70">(hold Ctrl/Cmd to select multiple)</span>
                            </label>
                            <select
                                multiple
                                disabled={!enabledFields.centres}
                                value={formData.centres}
                                onChange={handleCentresChange}
                                className={multiSelectClass(enabledFields.centres)}
                            >
                                {allCentres.map(c => (
                                    <option key={c._id} value={c._id}>{c.centreName}</option>
                                ))}
                            </select>
                            {enabledFields.centres && formData.centres.length > 0 && (
                                <p className="text-[10px] text-cyan-400 mt-1.5 font-bold">{formData.centres.length} centre(s) selected</p>
                            )}
                        </div>

                        {/* Teacher Department (multi-select) */}
                        <div className={`p-3 rounded-lg border transition-all ${enabledFields.teacherDepartment
                            ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200')
                            : (isDarkMode ? 'border-gray-800' : 'border-gray-200')
                        }`}>
                            <div
                                className="flex items-center gap-2 mb-2 cursor-pointer select-none"
                                onClick={() => toggleField("teacherDepartment")}
                            >
                                {enabledFields.teacherDepartment
                                    ? <FaCheckSquare className="text-cyan-500" size={13} />
                                    : <FaSquare className={isDarkMode ? "text-gray-600" : "text-gray-400"} size={13} />
                                }
                                <span className={`text-[10px] font-black uppercase tracking-wider ${enabledFields.teacherDepartment ? 'text-cyan-400' : isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Enable Dept
                                </span>
                            </div>
                            <label className={`block text-[11px] font-bold uppercase mb-1.5 tracking-wider ${enabledFields.teacherDepartment ? (isDarkMode ? 'text-cyan-400' : 'text-cyan-600') : 'text-gray-500'}`}>
                                Teacher Department
                            </label>
                            <select
                                multiple
                                disabled={!enabledFields.teacherDepartment}
                                value={formData.teacherDepartment}
                                onChange={handleTeacherDeptChange}
                                className={multiSelectClass(enabledFields.teacherDepartment)}
                            >
                                <option value="Foundation">Foundation</option>
                                <option value="All India">All India</option>
                                <option value="Board">Board</option>
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className={`flex justify-end gap-4 mt-8 pt-6 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-95 border ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-10 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? <><FaSync className="animate-spin" /> Updating...</> : <>Update {selectedUserIds.length} Users</>}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-scale-in { animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
            `}</style>
        </div>
    );
};

export default BulkUpdateUserModal;
