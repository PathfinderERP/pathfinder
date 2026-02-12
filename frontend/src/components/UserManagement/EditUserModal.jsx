import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import GranularPermissionsEditor from "./GranularPermissionsEditor";
import { useTheme } from "../../context/ThemeContext";

const EditUserModal = ({ user, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: "",
        employeeId: "",
        email: "",
        mobNum: "",
        password: "",
        role: "admin",
        centres: [],
        permissions: [],
        granularPermissions: {},
        canDeleteUsers: false,
        assignedScript: ""
    });
    const [centres, setCentres] = useState([]);
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [permissionsConfig, setPermissionsConfig] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const { theme } = useTheme();

    const isDarkMode = theme === 'dark';

    // Filter centres based on search
    const filteredCentres = centres.filter(centre =>
        centre.centreName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isAllSelected = filteredCentres.length > 0 && filteredCentres.every(c => formData.centres.includes(c._id));

    const handleSelectAll = () => {
        if (isAllSelected) {
            // Deselect all filtered
            const filteredIds = filteredCentres.map(c => c._id);
            setFormData(prev => ({
                ...prev,
                centres: prev.centres.filter(id => !filteredIds.includes(id))
            }));
        } else {
            // Select all filtered
            const filteredIds = filteredCentres.map(c => c._id);
            setFormData(prev => ({
                ...prev,
                centres: [...new Set([...prev.centres, ...filteredIds])]
            }));
        }
    };

    // Load permissions config
    useEffect(() => {
        import("../../config/permissions").then(module => {
            setPermissionsConfig(module.PERMISSION_MODULES);
        });
    }, []);

    // Get current logged-in user to check if they're SuperAdmin
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = currentUser.role === "superAdmin";

    const roles = isSuperAdmin
        ? ["admin", "teacher", "telecaller", "counsellor", "marketing", "superAdmin"]
        : ["admin", "teacher", "telecaller", "counsellor", "marketing"];

    useEffect(() => {
        fetchCentres();
        fetchScripts();
        if (user) {
            // Handle both new 'centres' array and legacy 'centre' field
            let userCentres = [];
            if (user.centres && Array.isArray(user.centres)) {
                userCentres = user.centres.map(c => c._id || c);
            } else if (user.centre) {
                userCentres = [user.centre._id || user.centre];
            }

            let granularPermissions = user.granularPermissions || {};

            // If user is superAdmin, force all permissions to true if config is loaded
            if (user.role === "superAdmin" && permissionsConfig) {
                const allPerms = {};
                Object.entries(permissionsConfig).forEach(([modKey, modData]) => {
                    allPerms[modKey] = {};
                    Object.keys(modData.sections).forEach(secKey => {
                        allPerms[modKey][secKey] = {
                            create: true,
                            edit: true,
                            delete: true
                        };
                    });
                });
                granularPermissions = allPerms;
            }

            setFormData({
                name: user.name || "",
                employeeId: user.employeeId || "",
                email: user.email || "",
                mobNum: user.mobNum || "",
                password: "", // Don't populate password
                role: user.role || "admin",
                centres: userCentres,
                permissions: user.permissions || [],
                granularPermissions: granularPermissions,
                canEditUsers: user.canEditUsers || false,
                canDeleteUsers: user.canDeleteUsers || false,
                assignedScript: user.assignedScript?._id || user.assignedScript || ""
            });
        }
    }, [user, permissionsConfig]); // Added permissionsConfig dependency

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setCentres(data);
            } else {
                toast.error("Failed to fetch centres");
            }
        } catch (error) {
            console.error("Error fetching centres:", error);
        }
    };

    const fetchScripts = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/script/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setScripts(data);
            }
        } catch (error) {
            console.error("Error fetching scripts:", error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            // Auto-populate permissions if role is SuperAdmin
            if (name === "role" && value === "superAdmin" && permissionsConfig) {
                const allPerms = {};
                Object.entries(permissionsConfig).forEach(([modKey, modData]) => {
                    allPerms[modKey] = {};
                    Object.keys(modData.sections).forEach(secKey => {
                        allPerms[modKey][secKey] = {
                            create: true,
                            edit: true,
                            delete: true
                        };
                    });
                });
                newData.granularPermissions = allPerms;
            }
            // Default access for Marketing and Counsellor when switching role
            else if (name === "role" && (value === "marketing" || value === "counsellor") && permissionsConfig) {
                const defaultPerms = {};
                // Employee Center
                if (permissionsConfig.employeeCenter) {
                    defaultPerms.employeeCenter = {};
                    Object.keys(permissionsConfig.employeeCenter.sections).forEach(sectionKey => {
                        defaultPerms.employeeCenter[sectionKey] = {
                            create: true,
                            edit: true,
                            delete: true
                        };
                    });
                }
                // Lead Management
                if (permissionsConfig.leadManagement) {
                    defaultPerms.leadManagement = {};
                    Object.keys(permissionsConfig.leadManagement.sections).forEach(sectionKey => {
                        defaultPerms.leadManagement[sectionKey] = {
                            view: true,
                            create: true,
                            edit: true,
                            delete: true
                        };
                    });
                }
                // Admissions
                if (permissionsConfig.admissions) {
                    const admissionPerms = {};
                    Object.keys(permissionsConfig.admissions.sections).forEach(sectionKey => {
                        if (['allLeads', 'enrolledStudents'].includes(sectionKey)) {
                            admissionPerms[sectionKey] = {
                                view: true,
                                create: true,
                                edit: true,
                                delete: false
                            };
                        }
                    });
                    defaultPerms.admissions = admissionPerms;
                }
                newData.granularPermissions = defaultPerms;
            }
            // If switching TO a regular role (not superAdmin and not marketing/counsellor)
            else if (name === "role" && value !== "superAdmin" && permissionsConfig) {
                if (!newData.granularPermissions.employeeCenter) {
                    const empCenterPerms = {};
                    if (permissionsConfig.employeeCenter) {
                        Object.keys(permissionsConfig.employeeCenter.sections).forEach(sectionKey => {
                            empCenterPerms[sectionKey] = {
                                create: true,
                                edit: true,
                                delete: true
                            };
                        });
                        newData.granularPermissions = {
                            ...newData.granularPermissions,
                            employeeCenter: empCenterPerms
                        };
                    }
                }
            }

            return newData;
        });
    };

    const handleCentreChange = (centreId) => {
        const updatedCentres = formData.centres.includes(centreId)
            ? formData.centres.filter(c => c !== centreId)
            : [...formData.centres, centreId];
        setFormData({ ...formData, centres: updatedCentres });
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");

            // Prepare update data
            const updateData = {
                name: formData.name,
                employeeId: formData.employeeId,
                email: formData.email,
                mobNum: formData.mobNum,
                role: formData.role,
                centres: formData.centres,
                permissions: formData.permissions,
                granularPermissions: formData.granularPermissions,
                canEditUsers: formData.canEditUsers,
                canDeleteUsers: formData.canDeleteUsers,
                assignedScript: formData.assignedScript
            };

            // Only include password if it's been changed
            if (formData.password && formData.password.trim() !== "") {
                updateData.password = formData.password;
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/updateUser/${user._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updateData),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("User updated successfully");
                onSuccess();
            } else {
                toast.error(data.message || "Failed to update user");
            }
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("Error updating user");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
            <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200 shadow-2xl'} rounded-xl w-full max-w-2xl border max-h-[90vh] overflow-y-auto transition-all`}>
                <div className={`flex justify-between items-center p-6 border-b ${isDarkMode ? 'border-gray-700 bg-[#1a1f24]' : 'border-gray-100 bg-white'} sticky top-0 z-10`}>
                    <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit User Profile</h3>
                    <button onClick={onClose} className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition-colors`}>
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={`block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs font-black uppercase tracking-widest mb-1`}>Name *</label>
                            <input type="text" name="name" required value={formData.name} onChange={handleChange} className={`w-full ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded-lg p-2.5 focus:border-cyan-500 outline-none transition-all`} />
                        </div>
                        <div>
                            <label className={`block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs font-black uppercase tracking-widest mb-1`}>Employee ID *</label>
                            <input type="text" name="employeeId" required value={formData.employeeId} onChange={handleChange} className={`w-full ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded-lg p-2.5 focus:border-cyan-500 outline-none transition-all`} />
                        </div>
                        <div>
                            <label className={`block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs font-black uppercase tracking-widest mb-1`}>Email *</label>
                            <input type="email" name="email" required value={formData.email} onChange={handleChange} className={`w-full ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded-lg p-2.5 focus:border-cyan-500 outline-none transition-all`} />
                        </div>
                        <div>
                            <label className={`block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs font-black uppercase tracking-widest mb-1`}>Mobile Number *</label>
                            <input type="text" name="mobNum" required value={formData.mobNum} onChange={handleChange} className={`w-full ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded-lg p-2.5 focus:border-cyan-500 outline-none transition-all`} />
                        </div>
                        <div>
                            <label className={`block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs font-black uppercase tracking-widest mb-1`}>Password (Leave blank to keep current)</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} className={`w-full ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded-lg p-2.5 focus:border-cyan-500 outline-none transition-all`} />
                        </div>
                        <div>
                            <label className={`block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs font-black uppercase tracking-widest mb-1`}>Role *</label>
                            <select name="role" required value={formData.role} onChange={handleChange} className={`w-full ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded-lg p-2.5 focus:border-cyan-500 outline-none transition-all font-bold`}>
                                {roles.map(role => (
                                    <option key={role} value={role}>{role === "superAdmin" ? "SuperAdmin" : role.charAt(0).toUpperCase() + role.slice(1)}</option>
                                ))}
                            </select>
                            {!isSuperAdmin && formData.role === "superAdmin" && (
                                <p className="text-xs text-yellow-500 mt-1">⚠️ Only SuperAdmin can create other SuperAdmins</p>
                            )}
                        </div>
                        {formData.role === "telecaller" && (
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest mb-1 text-cyan-500">Operational Script *</label>
                                <select
                                    name="assignedScript"
                                    required
                                    value={formData.assignedScript}
                                    onChange={handleChange}
                                    className={`w-full border rounded-lg p-2.5 outline-none font-bold transition-all ${isDarkMode ? 'bg-[#131619] border-cyan-500/50 text-white focus:border-cyan-500' : 'bg-cyan-50 border-cyan-200 text-gray-900 focus:border-cyan-500'}`}
                                >
                                    <option value="">Select a Script</option>
                                    {scripts.map(script => (
                                        <option key={script._id} value={script._id}>{script.scriptName}</option>
                                    ))}
                                </select>
                                <p className="text-[9px] text-cyan-600 mt-1 uppercase font-black tracking-widest animate-pulse">Analytics will be updated for this script</p>
                            </div>
                        )}
                        <div className="md:col-span-2">
                            <label className={`block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs font-black uppercase tracking-widest mb-1`}>Assigned Centres {formData.role !== "superAdmin" && "*"}</label>

                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    placeholder="Search centres..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`flex-1 text-sm border rounded-lg px-3 py-1.5 outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                />
                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    disabled={filteredCentres.length === 0 || formData.role === "superAdmin"}
                                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${isDarkMode
                                        ? 'bg-[#131619] border-gray-700 text-cyan-400 hover:bg-gray-800'
                                        : 'bg-white border-gray-200 text-cyan-600 hover:bg-gray-50'}`}
                                >
                                    {isAllSelected ? "Deselect All" : "Select All"}
                                </button>
                            </div>

                            <div className={`grid grid-cols-2 md:grid-cols-3 gap-2 border rounded-lg p-4 max-h-48 overflow-y-auto transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700' : 'bg-gray-50 border-gray-200 shadow-inner'}`}>
                                {filteredCentres.length > 0 ? (
                                    filteredCentres.map(centre => (
                                        <label key={centre._id} className="flex items-center gap-2 cursor-pointer group p-1 hover:bg-cyan-500/10 rounded transition-all">
                                            <input
                                                type="checkbox"
                                                checked={formData.centres.includes(centre._id)}
                                                onChange={() => handleCentreChange(centre._id)}
                                                disabled={formData.role === "superAdmin"}
                                                className="w-4 h-4 rounded border-gray-400 bg-transparent text-cyan-500 focus:ring-cyan-500"
                                            />
                                            <span className={`text-[11px] font-bold uppercase tracking-tight ${formData.role === "superAdmin" ? "text-gray-600 opacity-50" : isDarkMode ? "text-gray-400 group-hover:text-cyan-400" : "text-gray-600 group-hover:text-cyan-600"} transition-colors`}>
                                                {centre.centreName}
                                            </span>
                                        </label>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-4 text-xs text-gray-500">
                                        No centres found matching "{searchTerm}"
                                    </div>
                                )}
                            </div>
                            {formData.role === "superAdmin" && (
                                <p className="text-xs text-gray-500 mt-1">SuperAdmin is not assigned to any centre</p>
                            )}
                        </div>
                    </div>

                    {/* Granular Permissions Editor */}
                    <div className={`pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                        <GranularPermissionsEditor
                            granularPermissions={formData.granularPermissions}
                            onChange={(newPermissions) => setFormData({ ...formData, granularPermissions: newPermissions })}
                        />
                    </div>

                    <div className={`flex justify-end gap-3 mt-6 pt-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                        <button type="button" onClick={onClose} className={`px-5 py-2 rounded-lg font-bold transition-all ${isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}>Cancel</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 bg-cyan-500 text-white font-black uppercase tracking-widest text-xs rounded-lg hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0">
                            {loading ? "Synchronizing..." : "Update User Vector"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;
