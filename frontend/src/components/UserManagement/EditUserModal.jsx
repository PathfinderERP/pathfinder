import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";

const EditUserModal = ({ user, onClose, onSuccess }) => {
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
        if (user) {
            setFormData({
                name: user.name || "",
                employeeId: user.employeeId || "",
                email: user.email || "",
                mobNum: user.mobNum || "",
                password: "", // Don't populate password
                role: user.role || "admin",
                centre: user.centre?._id || "",
                permissions: user.permissions || []
            });
        }
    }, [user]);

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
                centre: formData.centre || null,
                permissions: formData.permissions
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-[#1a1f24] rounded-xl w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-700 sticky top-0 bg-[#1a1f24] z-10">
                    <h3 className="text-xl font-bold text-white">Edit User</h3>
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
                            <label className="block text-gray-400 text-sm mb-1">New Password (leave blank to keep current)</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter new password" className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Role *</label>
                            <select name="role" required value={formData.role} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white">
                                {roles.map(role => (
                                    <option key={role} value={role}>{role === "superAdmin" ? "SuperAdmin" : role.charAt(0).toUpperCase() + role.slice(1)}</option>
                                ))}
                            </select>
                            {!isSuperAdmin && formData.role === "superAdmin" && (
                                <p className="text-xs text-yellow-500 mt-1">⚠️ Only SuperAdmin can create other SuperAdmins</p>
                            )}
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-gray-400 text-sm mb-1">Centre {formData.role !== "superAdmin" && "*"}</label>
                            <select
                                name="centre"
                                required={formData.role !== "superAdmin"}
                                value={formData.centre}
                                onChange={handleChange}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                                disabled={formData.role === "superAdmin"}
                            >
                                <option value="">Select Centre</option>
                                {centres.map(centre => (
                                    <option key={centre._id} value={centre._id}>{centre.centreName} ({centre.enterCode})</option>
                                ))}
                            </select>
                            {formData.role === "superAdmin" && (
                                <p className="text-xs text-gray-500 mt-1">SuperAdmin is not assigned to any centre</p>
                            )}
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
                            {loading ? "Updating..." : "Update User"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;
