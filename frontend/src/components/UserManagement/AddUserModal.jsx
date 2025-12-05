import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";

const AddUserModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: "",
        employeeId: "",
        email: "",
        mobNum: "",
        password: "",
        role: "admin",
        centre: "",
        permissions: []
    });
    const [centres, setCentres] = useState([]);
    const [loading, setLoading] = useState(false);

    // Get current logged-in user to check if they're SuperAdmin
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = currentUser.role === "superAdmin";

    const roles = isSuperAdmin
        ? ["admin", "teacher", "telecaller", "counsellor", "superAdmin"]
        : ["admin", "teacher", "telecaller", "counsellor"];

    const availablePermissions = [
        "CEO Control Tower",
        "Admissions & Sales",
        "Academics",
        "Finance & Fees",
        "HR & Manpower",
        "Operations",
        "Digital Portal",
        "Marketing & CRM",
        "Franchise Mgmt",
        "Master Data",
        "Course Management",
        "User Management"
    ];

    useEffect(() => {
        fetchCentres();
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

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePermissionChange = (permission) => {
        const updatedPermissions = formData.permissions.includes(permission)
            ? formData.permissions.filter(p => p !== permission)
            : [...formData.permissions, permission];
        setFormData({ ...formData, permissions: updatedPermissions });
    };

    // Quick fill all permissions for SuperAdmin
    const handleQuickFillSuperAdmin = () => {
        setFormData({
            ...formData,
            role: "superAdmin",
            permissions: [...availablePermissions]
        });
        toast.success("All permissions selected for SuperAdmin!");
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
                    {/* Quick Fill SuperAdmin Button */}
                    {isSuperAdmin && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-red-400 font-semibold">Quick Create SuperAdmin</p>
                                    <p className="text-xs text-gray-400 mt-1">Automatically select all permissions and set role to SuperAdmin</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleQuickFillSuperAdmin}
                                    className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-400 transition-colors"
                                >
                                    Quick Fill
                                </button>
                            </div>
                        </div>
                    )}

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
                        <div className="md:col-span-2">
                            <label className="block text-gray-400 text-sm mb-1">Centre *</label>
                            <select name="centre" required value={formData.centre} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white">
                                <option value="">Select Centre</option>
                                {centres.map(centre => (
                                    <option key={centre._id} value={centre._id}>{centre.centreName} ({centre.enterCode})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-700">
                        <label className="block text-cyan-400 font-semibold mb-3">Permissions (Access Control)</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {availablePermissions.map(permission => (
                                <label key={permission} className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={formData.permissions.includes(permission)}
                                        onChange={() => handlePermissionChange(permission)}
                                        className="w-4 h-4 rounded border-gray-600 bg-[#131619] text-cyan-500 focus:ring-offset-[#1a1f24] focus:ring-cyan-500"
                                    />
                                    <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{permission}</span>
                                </label>
                            ))}
                        </div>
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
