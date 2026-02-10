import React, { useState, useEffect, useCallback } from "react";
import { FaPlus, FaSearch, FaEdit, FaTrash, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaTable, FaTh, FaFileExcel, FaUndo } from "react-icons/fa";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";
import AddUserModal from "./AddUserModal";
import EditUserModal from "./EditUserModal";
import PermissionsDetailModal from "./PermissionsDetailModal";
import "./UserCardWave.css";
import { hasPermission, getAccessibleModules, PERMISSION_MODULES } from "../../config/permissions";
import ExcelImportExport from "../common/ExcelImportExport";


const UserManagementContent = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [filterRole, setFilterRole] = useState("all");
    const [selectedPermUser, setSelectedPermUser] = useState(null);
    const [showPermModal, setShowPermModal] = useState(false);
    const [viewMode, setViewMode] = useState("grid"); // "grid" or "table"
    const [filterCentre, setFilterCentre] = useState("all");
    const [filterTeacherType, setFilterTeacherType] = useState("all");
    const [filterDepartment, setFilterDepartment] = useState("all");
    const [filterBoardType, setFilterBoardType] = useState("all");
    const [allCentres, setAllCentres] = useState([]);
    const [allScripts, setAllScripts] = useState([]);


    const apiUrl = import.meta.env.VITE_API_URL;

    // Get current logged-in user's role
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const currentUserRole = currentUser.role || "";
    const isSuperAdminOrAdmin = currentUserRole === "superAdmin" || currentUserRole === "admin";
    const isSuperAdmin = currentUserRole === "superAdmin";

    // Check if current user can edit/delete other users
    // SuperAdmin always can, others need the specific permissions
    const canEditUsers = isSuperAdmin || hasPermission(currentUser.granularPermissions, 'userManagement', 'users', 'edit');
    const canDeleteUsers = isSuperAdmin || hasPermission(currentUser.granularPermissions, 'userManagement', 'users', 'delete');
    const canAddUsers = isSuperAdmin || hasPermission(currentUser.granularPermissions, 'userManagement', 'users', 'create');


    const fetchAuxiliaryData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const [centresRes, scriptsRes] = await Promise.all([
                fetch(`${apiUrl}/centre`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${apiUrl}/script/list`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (centresRes.ok) setAllCentres(await centresRes.json());
            if (scriptsRes.ok) setAllScripts(await scriptsRes.json());
        } catch (error) {
            console.error("Error fetching auxiliary data:", error);
        }
    }, [apiUrl]);

    const fetchUsers = useCallback(async () => {
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
    }, [apiUrl]);

    useEffect(() => {
        fetchUsers();
        fetchAuxiliaryData();
    }, [fetchUsers, fetchAuxiliaryData]);

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

    const getCentresDisplay = (user) => {
        if (user.centres && user.centres.length > 0) {
            return user.centres.map(c => `${c.centreName} (${c.enterCode})`).join(", ");
        }
        if (user.centre) {
            return `${user.centre.centreName} (${user.centre.enterCode})`;
        }
        return "N/A";
    };

    const handleResetFilters = () => {
        setSearchQuery("");
        setFilterRole("all");
        setFilterCentre("all");
        setFilterTeacherType("all");
        setFilterDepartment("all");
        setFilterBoardType("all");
        toast.info("Filters reset to default");
    };


    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.employeeId.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = filterRole === "all" || user.role === filterRole;

        const matchesCentre = filterCentre === "all" ||
            (user.centres && user.centres.some(c => c._id === filterCentre)) ||
            (user.centre && (user.centre._id === filterCentre || user.centre === filterCentre));

        const matchesTeacherType = filterTeacherType === "all" || user.teacherType === filterTeacherType;

        const matchesDepartment = filterDepartment === "all" || user.teacherDepartment === filterDepartment;

        const matchesBoardType = filterBoardType === "all" || user.boardType === filterBoardType;

        return matchesSearch && matchesRole && matchesCentre && matchesTeacherType && matchesDepartment && matchesBoardType;
    });

    // Analytics Summary
    const stats = {
        total: filteredUsers.length,
        superAdmin: filteredUsers.filter(u => u.role === "superAdmin").length,
        admin: filteredUsers.filter(u => u.role === "admin").length,
        teacher: filteredUsers.filter(u => u.role === "teacher").length,
        counsellor: filteredUsers.filter(u => u.role === "counsellor").length,
        telecaller: filteredUsers.filter(u => u.role === "telecaller").length,
        deptHod: filteredUsers.filter(u => u.isDeptHod).length
    };

    // Data for Pie Charts within cards
    const getPieData = (label) => {
        if (label === "Total Users") {
            return [
                { name: 'SuperAdmin', value: stats.superAdmin, color: '#ef4444' },
                { name: 'Admin', value: stats.admin, color: '#3b82f6' },
                { name: 'Teacher', value: stats.teacher, color: '#22c55e' },
                { name: 'Counsellor', value: stats.counsellor, color: '#f97316' },
                { name: 'Telecaller', value: stats.telecaller, color: '#a855f7' }
            ].filter(d => d.value > 0);
        }
        if (label === "Teacher") {
            return [
                { name: 'Full Time', value: filteredUsers.filter(u => u.role === 'teacher' && u.teacherType === 'Full Time').length, color: '#22c55e' },
                { name: 'Part Time', value: filteredUsers.filter(u => u.role === 'teacher' && u.teacherType === 'Part Time').length, color: '#10b981' }
            ].filter(d => d.value > 0);
        }
        if (label === "Admin" || label === "SuperAdmin" || label === "Counsellor" || label === "Telecaller") {
            const roleKey = label.toLowerCase();
            // Just show a simple distribution of something else, e.g., location or just a solid color proportion
            return [
                { name: label, value: stats[roleKey], color: '#ffffff50' },
                { name: 'Other', value: stats.total - stats[roleKey], color: '#00000020' }
            ].filter(d => d.value > 0);
        }
        return [];
    };

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

    const userColumns = [
        { header: "Name", key: "name" },
        { header: "Employee ID", key: "employeeId" },
        { header: "Email", key: "email" },
        { header: "Mobile", key: "mobNum" },
        { header: "Password", key: "password" },
        { header: "Role", key: "role" },
        { header: "Centres (Names, comma separated)", key: "centresDisplay" },
        { header: "Subject", key: "subject" },
        { header: "Teacher Department", key: "teacherDepartment" },
        { header: "Board Type", key: "boardType" },
        { header: "Teacher Type", key: "teacherType" },
        { header: "Designation", key: "designation" },
        { header: "Is Dept HOD (True/False)", key: "isDeptHod" },
        { header: "Is Board HOD (True/False)", key: "isBoardHod" },
        { header: "Is Subject HOD (True/False)", key: "isSubjectHod" },
        { header: "Granular Permissions (JSON)", key: "granularPermissions" },
        { header: "Assigned Script (Name)", key: "scriptName" }
    ];

    const userMapping = {
        name: "Name",
        employeeId: "Employee ID",
        email: "Email",
        mobNum: "Mobile",
        password: "Password",
        role: "Role",
        centresDisplay: "Centres (Names, comma separated)",
        subject: "Subject",
        teacherDepartment: "Teacher Department",
        boardType: "Board Type",
        teacherType: "Teacher Type",
        designation: "Designation",
        isDeptHod: "Is Dept HOD (True/False)",
        isBoardHod: "Is Board HOD (True/False)",
        isSubjectHod: "Is Subject HOD (True/False)",
        granularPermissions: "Granular Permissions (JSON)",
        scriptName: "Assigned Script (Name)"
    };

    const prepareExportData = (data) => {
        return data.map(user => ({
            ...user,
            centresDisplay: user.centres?.map(c => c.centreName).join(", ") || "",
            scriptName: user.assignedScript?.scriptName || "",
            granularPermissions: user.granularPermissions ? JSON.stringify(user.granularPermissions) : "",
            isDeptHod: user.isDeptHod ? "True" : "False",
            isBoardHod: user.isBoardHod ? "True" : "False",
            isSubjectHod: user.isSubjectHod ? "True" : "False"
        }));
    };

    const handleBulkImport = async (data) => {
        const processedData = data.map(item => {
            const mapped = {};
            // Direct mappings
            mapped.name = item.name;
            mapped.employeeId = item.employeeId;
            mapped.email = item.email;
            mapped.mobNum = item.mobNum;
            mapped.password = item.password;
            mapped.role = item.role;
            mapped.subject = item.subject;
            mapped.teacherDepartment = item.teacherDepartment;
            mapped.boardType = item.boardType;
            mapped.teacherType = item.teacherType;
            mapped.designation = item.designation;

            // Boolean conversions
            mapped.isDeptHod = String(item.isDeptHod).toLowerCase() === "true";
            mapped.isBoardHod = String(item.isBoardHod).toLowerCase() === "true";
            mapped.isSubjectHod = String(item.isSubjectHod).toLowerCase() === "true";

            // JSON parsing
            mapped.granularPermissions = item.granularPermissions || "{}";

            // Centre resolution
            if (item.centresDisplay) {
                const centreNames = item.centresDisplay.split(",").map(n => n.trim().toLowerCase());
                mapped.centres = allCentres
                    .filter(c => centreNames.includes(c.centreName.toLowerCase()))
                    .map(c => c._id);
            }

            // Script resolution
            if (item.scriptName) {
                const matchedScript = allScripts.find(s => s.scriptName.toLowerCase() === item.scriptName.toLowerCase());
                if (matchedScript) mapped.assignedScript = matchedScript._id;
            }

            return mapped;
        });

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/superAdmin/importUsers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(processedData),
            });

            const result = await response.json();
            if (response.ok || response.status === 207) {
                toast.success(result.message);
                fetchUsers();
            } else {
                toast.error(result.message || "Import failed");
            }
        } catch (error) {
            console.error("Import error:", error);
            toast.error("An error occurred during import");
        }
    };

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-[#131619]">
            <ToastContainer position="top-right" theme="dark" />

            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <h2 className="text-2xl font-bold text-white">User Management</h2>

                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="bg-[#1a1f24] p-1 rounded-lg border border-gray-800 flex">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded ${viewMode === "grid" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white"}`}
                            title="Grid View"
                        >
                            <FaTh />
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            className={`p-2 rounded ${viewMode === "table" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white"}`}
                            title="Table View"
                        >
                            <FaTable />
                        </button>
                    </div>

                    {/* Export/Import Component */}
                    {isSuperAdmin && (
                        <ExcelImportExport
                            columns={userColumns}
                            mapping={userMapping}
                            data={users}
                            onExport={() => filteredUsers}
                            onImport={handleBulkImport}
                            prepareExportData={prepareExportData}
                            fileName="User_List"
                            templateName="User_Import_Template"
                        />
                    )}

                    {/* Add User Button - Only for users with canEditUsers permission */}
                    {canAddUsers && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
                        >
                            <FaPlus /> Add User
                        </button>
                    )}
                </div>
            </div>

            {/* Analytics Summary Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {[
                    { label: "Total Users", count: stats.total, color: "from-cyan-500/20 to-blue-500/20", border: "border-cyan-500/30" },
                    { label: "SuperAdmin", count: stats.superAdmin, color: "from-red-500/20 to-orange-500/20", border: "border-red-500/30" },
                    { label: "Admin", count: stats.admin, color: "from-blue-500/20 to-indigo-500/20", border: "border-blue-500/30" },
                    { label: "Teacher", count: stats.teacher, color: "from-green-500/20 to-emerald-500/20", border: "border-green-500/30" },
                    { label: "Counsellor", count: stats.counsellor, color: "from-orange-500/20 to-yellow-500/20", border: "border-orange-500/30" },
                    { label: "Telecaller", count: stats.telecaller, color: "from-purple-500/20 to-pink-500/20", border: "border-purple-500/30" }
                ].map((item, idx) => (
                    <div key={idx} className={`bg-gradient-to-br ${item.color} ${item.border} border p-4 rounded-xl backdrop-blur-sm relative overflow-hidden flex items-center justify-between`}>
                        <div className="z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{item.label}</p>
                            <p className="text-2xl font-black text-white">{item.count}</p>
                        </div>

                        {/* Small Pie Chart Overlay */}
                        <div className="w-16 h-16 opacity-80">
                            <ResponsiveContainer width="100%" height="100%" minHeight={64} minWidth={64}>
                                <PieChart>
                                    <Pie
                                        data={getPieData(item.label)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={18}
                                        outerRadius={28}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {getPieData(item.label).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
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
                            className="w-full bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 font-medium"
                        />
                    </div>

                    {/* Multi Filters Row */}
                    <div className="flex flex-wrap gap-3">
                        {/* Centre Filter */}
                        <select
                            value={filterCentre}
                            onChange={(e) => setFilterCentre(e.target.value)}
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 text-sm font-medium"
                        >
                            <option value="all">All Centres</option>
                            {allCentres.map(c => (
                                <option key={c._id} value={c._id}>{c.centreName}</option>
                            ))}
                        </select>

                        {/* Role filter - Only show for SuperAdmin and Admin */}
                        {isSuperAdminOrAdmin && (
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 text-sm font-medium"
                            >
                                <option value="all">All Roles</option>
                                <option value="superAdmin">SuperAdmin</option>
                                <option value="admin">Admin</option>
                                <option value="teacher">Teacher</option>
                                <option value="telecaller">Telecaller</option>
                                <option value="counsellor">Counsellor</option>
                            </select>
                        )}

                        {/* Teacher Type Filter */}
                        <select
                            value={filterTeacherType}
                            onChange={(e) => setFilterTeacherType(e.target.value)}
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 text-sm font-medium"
                        >
                            <option value="all">All Types (FT/PT)</option>
                            <option value="Full Time">Full Time</option>
                            <option value="Part Time">Part Time</option>
                        </select>

                        {/* Department Filter */}
                        <select
                            value={filterDepartment}
                            onChange={(e) => setFilterDepartment(e.target.value)}
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 text-sm font-medium"
                        >
                            <option value="all">All Departments</option>
                            <option value="Foundation">Foundation</option>
                            <option value="All India">All India</option>
                            <option value="Board">Board</option>
                        </select>

                        {/* Board Type Filter */}
                        <select
                            value={filterBoardType}
                            onChange={(e) => setFilterBoardType(e.target.value)}
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 text-sm font-medium"
                        >
                            <option value="all">All Boards</option>
                            <option value="JEE">JEE</option>
                            <option value="NEET">NEET</option>
                            <option value="CBSE">CBSE</option>
                            <option value="ICSE">ICSE</option>
                            <option value="WBBSE">WBBSE</option>
                        </select>

                        {/* Reset Filters Button */}
                        <button
                            onClick={handleResetFilters}
                            className="bg-gray-800 text-gray-400 p-2 rounded-lg border border-gray-700 hover:text-white hover:bg-gray-700 transition-all"
                            title="Reset all filters"
                        >
                            <FaUndo />
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <p className="text-gray-400">Loading users...</p>
            ) : filteredUsers.length === 0 ? (
                <p className="text-gray-400">No users found.</p>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map((user) => (
                        <div key={user._id} className="user-card-wave-dramatic bg-[#1a1f24] p-6 rounded-xl border border-gray-800 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-16 h-16 rounded-full bg-cyan-900 flex items-center justify-center overflow-hidden border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                                        {user.profileImage ? (
                                            <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-cyan-400 font-bold text-xl">{user.name.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{user.name}</h3>
                                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded border ${getRoleBadgeColor(user.role)}`}>
                                            {getRoleDisplayName(user.role)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    {canEditUsers && (
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="p-2 bg-gray-800 text-yellow-400 rounded hover:bg-gray-700"
                                            title="Edit"
                                        >
                                            <FaEdit />
                                        </button>
                                    )}
                                    {canDeleteUsers && (
                                        <button
                                            onClick={() => handleDelete(user._id)}
                                            className="p-2 bg-gray-800 text-red-400 rounded hover:bg-gray-700"
                                            title="Delete"
                                        >
                                            <FaTrash />
                                        </button>
                                    )}
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
                                <div className="flex items-start gap-2">
                                    <FaMapMarkerAlt className="text-gray-500 mt-1" />
                                    <span className="break-words">{getCentresDisplay(user)}</span>
                                </div>
                                {user.role === "telecaller" && (
                                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-800/50">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                                        <span className="text-xs font-bold text-cyan-400">
                                            Script: {user.assignedScript?.scriptName || "Unassigned"}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Granular Permissions Display */}
                            <div className="mt-4 pt-4 border-t border-gray-800">
                                <p className="text-xs text-gray-500 mb-2">Permissions:</p>
                                <div
                                    className="flex flex-wrap gap-1 cursor-pointer hover:bg-gray-800/50 p-1 rounded transition-colors -ml-1 border border-transparent hover:border-gray-700"
                                    onClick={() => { setSelectedPermUser(user); setShowPermModal(true); }}
                                >
                                    {user.role === 'superAdmin' ? (
                                        <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded">
                                            Super Admin (All Access)
                                        </span>
                                    ) : (
                                        (() => {
                                            const modules = getAccessibleModules(user);
                                            if (modules.length === 0) return <span className="text-xs text-gray-500 italic">No permissions</span>;

                                            const displayModules = modules.slice(0, 3);
                                            const remaining = modules.length - 3;

                                            return (
                                                <>
                                                    {displayModules.map(modKey => (
                                                        <span key={modKey} className="text-xs bg-gray-800 text-cyan-400 px-2 py-1 rounded">
                                                            {PERMISSION_MODULES[modKey]?.label || modKey}
                                                        </span>
                                                    ))}
                                                    {remaining > 0 && (
                                                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                                                            +{remaining} more
                                                        </span>
                                                    )}
                                                </>
                                            );
                                        })()
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-800/50 text-gray-400 text-sm uppercase">
                                    <th className="p-4 border-b border-gray-800">Name</th>
                                    <th className="p-4 border-b border-gray-800">Role</th>
                                    <th className="p-4 border-b border-gray-800">Employee ID</th>
                                    <th className="p-4 border-b border-gray-800">Contact</th>
                                    <th className="p-4 border-b border-gray-800">Centres</th>
                                    <th className="p-4 border-b border-gray-800">Assigned Script</th>
                                    <th className="p-4 border-b border-gray-800 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {filteredUsers.map((user) => (
                                    <tr key={user._id} className="user-table-row-wave transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-cyan-900 flex items-center justify-center overflow-hidden border border-cyan-500/30">
                                                    {user.profileImage ? (
                                                        <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-cyan-400 font-bold text-sm">{user.name.charAt(0).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <span className="text-white font-medium">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded border ${getRoleBadgeColor(user.role)}`}>
                                                {getRoleDisplayName(user.role)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-400 text-sm">{user.employeeId}</td>
                                        <td className="p-4 text-gray-400 text-sm">
                                            <div className="flex flex-col">
                                                <span>{user.email}</span>
                                                <span className="text-xs text-gray-500">{user.mobNum}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-400 text-sm">
                                            <span className="text-gray-400">{getCentresDisplay(user)}</span>
                                        </td>
                                        <td className="p-4 text-gray-400 text-sm">
                                            <span className={user.role === 'telecaller' ? "text-cyan-400 font-bold" : ""}>
                                                {user.assignedScript?.scriptName || (user.role === 'telecaller' ? "Unassigned" : "N/A")}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {canEditUsers && (
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="p-2 text-yellow-400 hover:bg-gray-700 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                )}
                                                {canDeleteUsers && (
                                                    <button
                                                        onClick={() => handleDelete(user._id)}
                                                        className="p-2 text-red-400 hover:bg-gray-700 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Permissions Modal */}
            {showPermModal && selectedPermUser && (
                <PermissionsDetailModal
                    user={selectedPermUser}
                    onClose={() => {
                        setShowPermModal(false);
                        setSelectedPermUser(null);
                    }}
                />
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
