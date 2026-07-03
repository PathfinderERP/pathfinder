import React, { useState, useEffect } from "react";
import { FaTimes, FaEdit, FaSync, FaCheckSquare, FaSquare, FaUsers } from "react-icons/fa";
import { toast } from "react-toastify";

const BulkUpdateEmployeeModal = ({ selectedEmployeeIds, onClose, onSuccess, isDarkMode }) => {
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [centres, setCentres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [enabledFields, setEnabledFields] = useState({
        status: false,
        department: false,
        designation: false,
        primaryCentre: false,
        typeOfEmployment: false,
        gender: false,
        probationPeriod: false,
    });

    const [formData, setFormData] = useState({
        status: "",
        department: "",
        designation: "",
        primaryCentre: "",
        typeOfEmployment: "",
        gender: "",
        probationPeriod: "",
    });

    useEffect(() => {
        const fetchData = async () => {
            setFetching(true);
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };
                const apiUrl = import.meta.env.VITE_API_URL;

                const [deptRes, desigRes, centreRes] = await Promise.all([
                    fetch(`${apiUrl}/department`, { headers }),
                    fetch(`${apiUrl}/designation`, { headers }),
                    fetch(`${apiUrl}/centre`, { headers }),
                ]);

                if (deptRes.ok) setDepartments(await deptRes.json());
                if (desigRes.ok) setDesignations(await desigRes.json());
                if (centreRes.ok) setCentres(await centreRes.json());
            } catch (err) {
                console.error("Error fetching modal data:", err);
                toast.error("Failed to load form data");
            } finally {
                setFetching(false);
            }
        };
        fetchData();
    }, []);

    const toggleField = (field) => {
        setEnabledFields(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const updateData = {};
        let hasAtLeastOneField = false;

        Object.keys(enabledFields).forEach(field => {
            if (enabledFields[field] && formData[field] !== "") {
                updateData[field] = formData[field];
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
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee/bulk/update`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ids: selectedEmployeeIds, updateData }),
            });

            const data = await response.json();

            if (response.ok) {
                if (data.results?.failed > 0) {
                    toast.warning(data.message);
                } else {
                    toast.success(data.message || "Employees updated successfully");
                }
                onSuccess();
            } else {
                toast.error(data.message || "Failed to update employees");
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

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[70] p-4 backdrop-blur-md ${isDarkMode ? 'bg-black/70' : 'bg-gray-900/40'}`}>
            <div className={`w-full max-w-3xl rounded-xl border shadow-2xl overflow-hidden animate-scale-in ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-cyan-500/10' : 'bg-white border-gray-200'}`}>

                {/* Header */}
                <div className={`px-8 py-5 border-b flex justify-between items-start ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h3 className={`text-xl font-black uppercase tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaUsers className="text-cyan-500" />
                            Bulk Update Employees ({selectedEmployeeIds.length})
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
                {fetching ? (
                    <div className="flex items-center justify-center h-48">
                        <FaSync className="animate-spin text-cyan-500 text-2xl" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={`p-8 max-h-[75vh] overflow-y-auto custom-scrollbar ${isDarkMode ? '' : ''}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                            {/* Status */}
                            {fieldCard("status", "Status", (isEnabled) => (
                                <select
                                    name="status"
                                    disabled={!isEnabled}
                                    value={formData.status}
                                    onChange={handleChange}
                                    className={selectClass(isEnabled)}
                                >
                                    <option value="">Select Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Resigned">Resigned</option>
                                    <option value="Terminated">Terminated</option>
                                </select>
                            ))}

                            {/* Department */}
                            {fieldCard("department", "Department", (isEnabled) => (
                                <select
                                    name="department"
                                    disabled={!isEnabled}
                                    value={formData.department}
                                    onChange={handleChange}
                                    className={selectClass(isEnabled)}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(dept => (
                                        <option key={dept._id} value={dept._id}>{dept.departmentName}</option>
                                    ))}
                                </select>
                            ))}

                            {/* Designation */}
                            {fieldCard("designation", "Designation", (isEnabled) => (
                                <select
                                    name="designation"
                                    disabled={!isEnabled}
                                    value={formData.designation}
                                    onChange={handleChange}
                                    className={selectClass(isEnabled)}
                                >
                                    <option value="">Select Designation</option>
                                    {designations.map(d => (
                                        <option key={d._id} value={d._id}>{d.name}</option>
                                    ))}
                                </select>
                            ))}

                            {/* Primary Centre */}
                            {fieldCard("primaryCentre", "Primary Centre", (isEnabled) => (
                                <select
                                    name="primaryCentre"
                                    disabled={!isEnabled}
                                    value={formData.primaryCentre}
                                    onChange={handleChange}
                                    className={selectClass(isEnabled)}
                                >
                                    <option value="">Select Centre</option>
                                    {centres.map(c => (
                                        <option key={c._id} value={c._id}>{c.centreName}</option>
                                    ))}
                                </select>
                            ))}

                            {/* Type of Employment */}
                            {fieldCard("typeOfEmployment", "Employment Type", (isEnabled) => (
                                <select
                                    name="typeOfEmployment"
                                    disabled={!isEnabled}
                                    value={formData.typeOfEmployment}
                                    onChange={handleChange}
                                    className={selectClass(isEnabled)}
                                >
                                    <option value="">Select Type</option>
                                    <option value="Full Time">Full Time</option>
                                    <option value="Part Time">Part Time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Internship">Internship</option>
                                </select>
                            ))}

                            {/* Gender */}
                            {fieldCard("gender", "Gender", (isEnabled) => (
                                <select
                                    name="gender"
                                    disabled={!isEnabled}
                                    value={formData.gender}
                                    onChange={handleChange}
                                    className={selectClass(isEnabled)}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            ))}

                            {/* Probation Period */}
                            {fieldCard("probationPeriod", "Probation Period", (isEnabled) => (
                                <select
                                    name="probationPeriod"
                                    disabled={!isEnabled}
                                    value={formData.probationPeriod}
                                    onChange={handleChange}
                                    className={selectClass(isEnabled)}
                                >
                                    <option value="">Select</option>
                                    <option value="true">Yes (On Probation)</option>
                                    <option value="false">No (Confirmed)</option>
                                </select>
                            ))}
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
                                disabled={loading || fetching}
                                className="px-10 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? <><FaSync className="animate-spin" /> Updating...</> : <>Update {selectedEmployeeIds.length} Employees</>}
                            </button>
                        </div>
                    </form>
                )}
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

export default BulkUpdateEmployeeModal;
