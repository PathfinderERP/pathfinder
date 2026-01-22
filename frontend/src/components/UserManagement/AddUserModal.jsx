import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import GranularPermissionsEditor from "./GranularPermissionsEditor";

const AddUserModal = ({ onClose, onSuccess }) => {
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
        canEditUsers: false,
        canDeleteUsers: false,
        assignedScript: ""
    });
    const [centres, setCentres] = useState([]);
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [permissionsConfig, setPermissionsConfig] = useState(null);

    // Initialize with Employee Center access
    useEffect(() => {
        import("../../config/permissions").then(module => {
            const config = module.PERMISSION_MODULES;
            setPermissionsConfig(config);

            // Set default Employee Center permissions for new user
            const defaultPerms = {};
            if (config.employeeCenter) {
                defaultPerms.employeeCenter = {};
                Object.keys(config.employeeCenter.sections).forEach(sectionKey => {
                    defaultPerms.employeeCenter[sectionKey] = {
                        create: true,
                        edit: true,
                        delete: true
                    };
                });
            }
            setFormData(prev => ({ ...prev, granularPermissions: defaultPerms }));
        });
    }, []);

    // Get current logged-in user to check if they're SuperAdmin
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = currentUser.role === "superAdmin";

    const roles = isSuperAdmin
        ? ["admin", "teacher", "telecaller", "counsellor", "Class_Coordinator", "superAdmin"]
        : ["admin", "teacher", "telecaller", "counsellor", "Class_Coordinator"];

    useEffect(() => {
        fetchCentres();
        fetchScripts();
    }, []);

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
            // If changing FROM superAdmin TO something else, maybe reset or keep Employee Center?
            // User said "for the super admin their all checkbok... be marked"
            // So if they switch back, we should probably keep employee center at least.
            else if (name === "role" && prev.role === "superAdmin" && permissionsConfig) {
                const defaultPerms = {};
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
                newData.granularPermissions = defaultPerms;
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
            const response = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/createAccountbyAdmin`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("User added successfully");
                onSuccess();
            } else {
                toast.error(data.message || "Failed to add user");
            }
        } catch (error) {
            console.error("Error adding user:", error);
            toast.error("Error adding user");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-[#1a1f24] rounded-xl w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-700 sticky top-0 bg-[#1a1f24] z-10">
                    <h3 className="text-xl font-bold text-white">Add New User</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <FaTimes size={20} />
                    </button>
                </div>


                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Name *</label>
                            <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Employee ID *</label>
                            <input type="text" name="employeeId" required value={formData.employeeId} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Email *</label>
                            <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Mobile Number *</label>
                            <input type="text" name="mobNum" required value={formData.mobNum} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Password *</label>
                            <input type="password" name="password" required value={formData.password} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Role *</label>
                            <select name="role" required value={formData.role} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white">
                                {roles.map(role => (
                                    <option key={role} value={role}>{role === "superAdmin" ? "SuperAdmin" : role.charAt(0).toUpperCase() + role.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        {formData.role === "telecaller" && (
                            <div>
                                <label className="block text-gray-400 text-sm mb-1 text-cyan-400 font-bold">Assign Calling Script *</label>
                                <select
                                    name="assignedScript"
                                    required
                                    value={formData.assignedScript}
                                    onChange={handleChange}
                                    className="w-full bg-[#131619] border border-cyan-500/50 rounded-lg p-2 text-white focus:border-cyan-500"
                                >
                                    <option value="">Select a Script</option>
                                    {scripts.map(script => (
                                        <option key={script._id} value={script._id}>{script.scriptName}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-cyan-500/70 mt-1 uppercase font-bold tracking-wider">Analysis will be based on this script</p>
                            </div>
                        )}
                        <div className="md:col-span-2">
                            <label className="block text-gray-400 text-sm mb-1">Centres {formData.role !== "superAdmin" && "*"}</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-[#131619] border border-gray-700 rounded-lg p-3 max-h-40 overflow-y-auto">
                                {centres.map(centre => (
                                    <label key={centre._id} className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={formData.centres.includes(centre._id)}
                                            onChange={() => handleCentreChange(centre._id)}
                                            disabled={formData.role === "superAdmin"}
                                            className="w-4 h-4 rounded border-gray-600 bg-[#1a1f24] text-cyan-500 focus:ring-offset-[#1a1f24] focus:ring-cyan-500"
                                        />
                                        <span className={`text-sm ${formData.role === "superAdmin" ? "text-gray-600" : "text-gray-400 group-hover:text-white"} transition-colors`}>
                                            {centre.centreName} ({centre.enterCode})
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {/* {formData.role !== "superAdmin" && (
                                <label className="flex items-start gap-3 p-3 border border-orange-500/30 bg-orange-500/10 rounded-lg cursor-pointer group hover:bg-orange-500/20 transition-all mt-4">
                                    <input
                                        type="checkbox"
                                        checked={formData.canEditUsers}
                                        onChange={(e) => setFormData({ ...formData, canEditUsers: e.target.checked })}
                                        className="w-5 h-5 mt-0.5 rounded border-gray-600 bg-[#131619] text-orange-500 focus:ring-offset-[#1a1f24] focus:ring-orange-500"
                                    />
                                    <div>
                                        <span className="text-sm font-semibold text-orange-300 group-hover:text-orange-200 transition-colors">
                                            Can Edit Other Users
                                        </span>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Grant this user permission to edit other users of the same or lower role.
                                            Without this permission, they will not see edit buttons for other users.
                                        </p>
                                    </div>
                                </label>
                            )} */}

                            {/* {formData.role !== "superAdmin" && (
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={formData.canDeleteUsers}
                                        onChange={(e) => setFormData({ ...formData, canDeleteUsers: e.target.checked })}
                                        className="w-5 h-5 mt-0.5 rounded border-gray-600 bg-[#131619] text-red-500 focus:ring-offset-[#1a1f24] focus:ring-red-500"
                                    />
                                    <div>
                                        <span className="text-sm font-semibold text-red-300 group-hover:text-red-200 transition-colors">
                                            Can Delete Other Users
                                        </span>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Grant this user permission to delete other users of the same or lower role. 
                                            Without this permission, they will not see delete buttons for other users.
                                        </p>
                                    </div>
                                </label>
                            )} */}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-700">
                        <GranularPermissionsEditor
                            granularPermissions={formData.granularPermissions}
                            onChange={(newPermissions) => setFormData({ ...formData, granularPermissions: newPermissions })}
                        />
                    </div>


                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400">
                            {loading ? "Adding..." : "Add User"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddUserModal;
