import React, { useState, useEffect } from "react";
import { FaPlus, FaSearch, FaEdit, FaTrash, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AddUserModal from "./AddUserModal";
import EditUserModal from "./EditUserModal";

const UserManagementContent = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [filterRole, setFilterRole] = useState("all");
    const [openTooltipUserId, setOpenTooltipUserId] = useState(null);

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/superAdmin/getAllUsers`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setUsers(data.users);
            } else {
                toast.error("Failed to fetch users");
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Error fetching users");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/superAdmin/deleteUser/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                toast.success("User deleted successfully");
                fetchUsers();
            } else {
                toast.error("Failed to delete user");
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("Error deleting user");
        }
    };

    const handleEdit = (user) => {
        setSelectedUser(user);
        setShowEditModal(true);
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.employeeId.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = filterRole === "all" || user.role === filterRole;

        return matchesSearch && matchesRole;
    });

    const getRoleBadgeColor = (role) => {
        const colors = {
            superAdmin: "bg-red-500/20 text-red-400 border-red-500/50",
            admin: "bg-blue-500/20 text-blue-400 border-blue-500/50",
            teacher: "bg-green-500/20 text-green-400 border-green-500/50",
            telecaller: "bg-purple-500/20 text-purple-400 border-purple-500/50",
            counsellor: "bg-orange-500/20 text-orange-400 border-orange-500/50",
        };
        return colors[role] || "bg-gray-500/20 text-gray-400 border-gray-500/50";
    };

    const getRoleDisplayName = (role) => {
        if (role === "superAdmin") return "SuperAdmin";
        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-[#131619]">
            <ToastContainer position="top-right" theme="dark" />

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
                >
                    <FaPlus /> Add User
                </button>
            </div>

            <div className="bg-[#1a1f24] p-4 rounded-xl border border-gray-800 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or employee ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="teacher">Teacher</option>
                        <option value="telecaller">Telecaller</option>
                        <option value="counsellor">Counsellor</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-gray-400">Loading users...</p>
                ) : filteredUsers.length === 0 ? (
                    <p className="text-gray-400">No users found.</p>
                ) : (
                    filteredUsers.map((user) => (
                        <div key={user._id} className="bg-[#1a1f24] p-6 rounded-xl border border-gray-800 hover:border-cyan-500/50 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-cyan-900 flex items-center justify-center text-cyan-400 font-bold text-lg">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{user.name}</h3>
                                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded border ${getRoleBadgeColor(user.role)}`}>
                                            {getRoleDisplayName(user.role)}
                                        </span>
                                    </div>
                                </div>
                                {/* Buttons - Always visible on mobile, hover on desktop */}
                                <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(user)}
                                        className="p-2 bg-gray-800 text-yellow-400 rounded hover:bg-gray-700"
                                        title="Edit"
                                    >
                                        <FaEdit />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user._id)}
                                        className="p-2 bg-gray-800 text-red-400 rounded hover:bg-gray-700"
                                        title="Delete"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 text-gray-400 text-sm">
                                <div className="flex items-center gap-2">
                                    <FaUser className="text-gray-500" />
                                    <span>ID: {user.employeeId}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaEnvelope className="text-gray-500" />
                                    <span className="truncate">{user.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaPhone className="text-gray-500" />
                                    <span>{user.mobNum}</span>
                                </div>
                                {user.centre && (
                                    <div className="flex items-center gap-2">
                                        <FaMapMarkerAlt className="text-gray-500" />
                                        <span>{user.centre.centreName} ({user.centre.enterCode})</span>
                                    </div>
                                )}
                            </div>

                            {user.permissions && user.permissions.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-800">
                                    <p className="text-xs text-gray-500 mb-2">Permissions:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {user.permissions.slice(0, 3).map((perm, idx) => (
                                            <span key={idx} className="text-xs bg-gray-800 text-cyan-400 px-2 py-1 rounded">
                                                {perm}
                                            </span>
                                        ))}
                                        {user.permissions.length > 3 && (
                                            <div className="relative group">
                                                <span
                                                    className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded cursor-pointer"
                                                    onClick={() => setOpenTooltipUserId(openTooltipUserId === user._id ? null : user._id)}
                                                >
                                                    +{user.permissions.length - 3} more
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Permissions Modal - Centered overlay */}
            {openTooltipUserId && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
                    onClick={() => setOpenTooltipUserId(null)}
                >
                    <div
                        className="bg-gray-900 border border-cyan-500/50 rounded-lg p-4 shadow-2xl w-[90%] max-w-[400px] m-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-sm font-bold text-cyan-400">
                                All Permissions ({users.find(u => u._id === openTooltipUserId)?.permissions.length})
                            </p>
                            <button
                                onClick={() => setOpenTooltipUserId(null)}
                                className="text-gray-400 hover:text-white text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                            {users.find(u => u._id === openTooltipUserId)?.permissions.map((perm, idx) => (
                                <div key={idx} className="text-sm text-gray-300 flex items-center gap-2 bg-gray-800/50 p-2 rounded">
                                    <span className="text-cyan-500">•</span>
                                    <span className="break-words">{perm}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showAddModal && (
                <AddUserModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchUsers();
                    }}
                />
            )}

            {showEditModal && selectedUser && (
                <EditUserModal
                    user={selectedUser}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedUser(null);
                    }}
                    onSuccess={() => {
                        setShowEditModal(false);
                        setSelectedUser(null);
                        fetchUsers();
                    }}
                />
            )}
        </div>
    );
};

export default UserManagementContent;
