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
import { hasPermission, getAccessibleModules, PERMISSION_MODULES, hasModuleAccess } from "../../config/permissions";
import ExcelImportExport from "../common/ExcelImportExport";
import { useTheme } from "../../context/ThemeContext";
import { TableRowSkeleton, CardSkeleton } from "../common/Skeleton";
import CustomMultiSelect from "../common/CustomMultiSelect";


const UserManagementContent = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedPermUser, setSelectedPermUser] = useState(null);
    const [showPermModal, setShowPermModal] = useState(false);
    const [viewMode, setViewMode] = useState("grid"); // "grid" or "table"
    const [filterRole, setFilterRole] = useState([]);
    const [filterCentre, setFilterCentre] = useState([]);
    const [filterTeacherType, setFilterTeacherType] = useState([]);
    const [filterDepartment, setFilterDepartment] = useState([]);
    const [filterBoardType, setFilterBoardType] = useState([]);
    const [filterStatus, setFilterStatus] = useState([]); // [{value: 'active', label: 'Active'}, {value: 'deactivated', label: 'Deactivated'}]
    const [allCentres, setAllCentres] = useState([]);
    const [allScripts, setAllScripts] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [allBoards, setAllBoards] = useState([]);
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';


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
    const canDeactivateUsers = isSuperAdmin || (hasPermission(currentUser.granularPermissions, 'userManagement', 'users', 'edit') && (hasModuleAccess(currentUser.granularPermissions, 'employeeCenter') || hasModuleAccess(currentUser.granularPermissions, 'hrManpower')));


    const fetchAuxiliaryData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const [centresRes, scriptsRes, departmentsRes, boardsRes] = await Promise.all([
                fetch(`${apiUrl}/centre`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${apiUrl}/script/list`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${apiUrl}/department`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${apiUrl}/board`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (centresRes.ok) setAllCentres(await centresRes.json());
            if (scriptsRes.ok) setAllScripts(await scriptsRes.json());
            if (departmentsRes.ok) setAllDepartments(await departmentsRes.json());
            if (boardsRes.ok) setAllBoards(await boardsRes.json());
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
                const data = await response.json();
                toast.error(data.message || "Failed to delete user");
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
        setFilterRole([]);
        setFilterCentre([]);
        setFilterTeacherType([]);
        setFilterDepartment([]);
        setFilterBoardType([]);
        setFilterStatus([]);
        toast.info("Filters reset to default");
    };

    const handleToggleStatus = async (id, currentStatus, e) => {
        if (e) e.stopPropagation();
        const action = currentStatus ? "deactivate" : "activate";
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/superAdmin/toggleStatus/${id}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message);
                fetchUsers();
            } else {
                const error = await response.json();
                toast.error(error.message || `Failed to ${action} user`);
            }
        } catch (error) {
            console.error(`Error ${action}ing user:`, error);
            toast.error(`Error ${action}ing user`);
        }
    };


    const filteredUsers = users.filter(user => {
        const matchesSearch =
            (user.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (user.employeeId?.toLowerCase() || "").includes(searchQuery.toLowerCase());

        const matchesRole = filterRole.length === 0 || filterRole.some(f => f.value === user.role);

        const matchesCentre = filterCentre.length === 0 || filterCentre.some(f =>
            (user.centres && user.centres.some(c => c._id === f.value)) ||
            (user.centre && (user.centre._id === f.value || user.centre === f.value))
        );

        const matchesTeacherType = filterTeacherType.length === 0 || filterTeacherType.some(f => f.value === user.teacherType);

        const matchesDepartment = filterDepartment.length === 0 || filterDepartment.some(f => f.value === user.teacherDepartment || (f.label === user.teacherDepartment));

        const matchesBoardType = filterBoardType.length === 0 || filterBoardType.some(f => f.value === user.boardType || (f.label === user.boardType));

        const matchesStatus = filterStatus.length === 0 || filterStatus.some(f => {
            if (f.value === 'active') return user.isActive !== false;
            if (f.value === 'deactivated') return user.isActive === false;
            return true;
        });

        return matchesSearch && matchesRole && matchesCentre && matchesTeacherType && matchesDepartment && matchesBoardType && matchesStatus;
    });

    // Analytics Summary
    const stats = {
        total: filteredUsers.length,
        superAdmin: filteredUsers.filter(u => u.role === "superAdmin").length,
        admin: filteredUsers.filter(u => u.role === "admin").length,
        teacher: filteredUsers.filter(u => u.role === "teacher").length,
        counsellor: filteredUsers.filter(u => u.role === "counsellor").length,
        telecaller: filteredUsers.filter(u => u.role === "telecaller").length,
        marketing: filteredUsers.filter(u => u.role === "marketing").length,
        centerIncharge: filteredUsers.filter(u => u.role === "centerIncharge").length,
        zonalManager: filteredUsers.filter(u => u.role === "zonalManager").length,
        zonalHead: filteredUsers.filter(u => u.role === "zonalHead").length,
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
                { name: 'Telecaller', value: stats.telecaller, color: '#a855f7' },
                { name: 'Marketing', value: stats.marketing, color: '#ec4899' },
                { name: 'CenterIncharge', value: stats.centerIncharge, color: '#06b6d4' },
                { name: 'ZonalManager', value: stats.zonalManager, color: '#6366f1' },
                { name: 'ZonalHead', value: stats.zonalHead, color: '#4f46e5' }
            ].filter(d => d.value > 0);
        }
        if (label === "Teacher") {
            return [
                { name: 'Full Time', value: filteredUsers.filter(u => u.role === 'teacher' && u.teacherType === 'Full Time').length, color: '#22c55e' },
                { name: 'Part Time', value: filteredUsers.filter(u => u.role === 'teacher' && u.teacherType === 'Part Time').length, color: '#10b981' }
            ].filter(d => d.value > 0);
        }
        if (label === "Admin" || label === "SuperAdmin" || label === "Counsellor" || label === "Telecaller" || label === "Marketing" || label === "CenterIncharge" || label === "ZonalManager" || label === "ZonalHead") {
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
            marketing: "bg-pink-500/20 text-pink-400 border-pink-500/50",
            centerIncharge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
            zonalManager: "bg-indigo-500/20 text-indigo-400 border-indigo-500/50",
            zonalHead: "bg-blue-600/20 text-blue-300 border-blue-600/50",
        };
        return colors[role] || "bg-gray-500/20 text-gray-400 border-gray-500/50";
    };

    const getRoleDisplayName = (role) => {
        if (role === "superAdmin") return "SuperAdmin";
        if (role === "centerIncharge") return "Center Incharge";
        if (role === "zonalManager") return "Zonal Manager";
        if (role === "zonalHead") return "Zonal Head";
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
        <div className={`flex-1 p-6 overflow-y-auto ${isDarkMode ? 'bg-[#131619]' : 'bg-[#f8fafc]'}`}>
            <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>User Management</h2>

                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-1 rounded-lg border flex`}>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded ${viewMode === "grid" ? "bg-cyan-500/20 text-cyan-400" : isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
                            title="Grid View"
                        >
                            <FaTh />
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            className={`p-2 rounded ${viewMode === "table" ? "bg-cyan-500/20 text-cyan-400" : isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
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
                    { label: "Telecaller", count: stats.telecaller, color: "from-purple-500/20 to-pink-500/20", border: "border-purple-500/30" },
                    { label: "Marketing", count: stats.marketing, color: "from-pink-500/20 to-rose-500/20", border: "border-pink-500/30" },
                    { label: "CenterIncharge", count: stats.centerIncharge, color: "from-cyan-500/20 to-blue-500/20", border: "border-cyan-500/30" },
                    { label: "ZonalManager", count: stats.zonalManager, color: "from-indigo-500/20 to-blue-500/20", border: "border-indigo-500/30" },
                    { label: "ZonalHead", count: stats.zonalHead, color: "from-blue-600/20 to-indigo-600/20", border: "border-blue-600/30" }
                ].map((item, idx) => (
                    <div key={idx} className={`bg-gradient-to-br ${item.count > 0 ? item.color : isDarkMode ? 'from-gray-800/20 to-gray-900/20' : 'from-gray-100 to-gray-200'} ${item.count > 0 ? item.border : isDarkMode ? 'border-gray-800' : 'border-gray-200'} border p-4 rounded-xl backdrop-blur-sm relative overflow-hidden flex items-center justify-between`}>
                        <div className="z-10">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>{item.label}</p>
                            <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.count}</p>
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

            <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-4 rounded-xl border mb-6`}>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or employee ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-200'} pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:border-cyan-500 font-medium transition-all`}
                        />
                    </div>

                    {/* Multi Filters Row */}
                    <div className="flex flex-wrap gap-3 items-center flex-1">
                        {/* Centre Filter */}
                        <div className="min-w-[180px]">
                            <CustomMultiSelect
                                options={allCentres.map(c => ({ value: c._id, label: c.centreName }))}
                                value={filterCentre}
                                onChange={setFilterCentre}
                                placeholder="All Centres"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {/* Role filter - Only show for SuperAdmin and Admin */}
                        {isSuperAdminOrAdmin && (
                            <div className="min-w-[180px]">
                                <CustomMultiSelect
                                    options={[
                                        { value: 'superAdmin', label: 'SuperAdmin' },
                                        { value: 'admin', label: 'Admin' },
                                        { value: 'teacher', label: 'Teacher' },
                                        { value: 'telecaller', label: 'Telecaller' },
                                        { value: 'counsellor', label: 'Counsellor' },
                                        { value: 'marketing', label: 'Marketing' },
                                        { value: 'centerIncharge', label: 'Center Incharge' },
                                        { value: 'zonalManager', label: 'Zonal Manager' },
                                        { value: 'zonalHead', label: 'Zonal Head' }
                                    ]}
                                    value={filterRole}
                                    onChange={setFilterRole}
                                    placeholder="All Roles"
                                    isDarkMode={isDarkMode}
                                />
                            </div>
                        )}

                        {/* Teacher Type Filter */}
                        <div className="min-w-[180px]">
                            <CustomMultiSelect
                                options={[
                                    { value: 'Full Time', label: 'Full Time' },
                                    { value: 'Part Time', label: 'Part Time' }
                                ]}
                                value={filterTeacherType}
                                onChange={setFilterTeacherType}
                                placeholder="All Types (FT/PT)"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {/* Department Filter */}
                        <div className="min-w-[180px]">
                            <CustomMultiSelect
                                options={allDepartments.map(d => ({ value: d._id, label: d.name }))}
                                value={filterDepartment}
                                onChange={setFilterDepartment}
                                placeholder="All Departments"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {/* Board Type Filter */}
                        <div className="min-w-[180px]">
                            <CustomMultiSelect
                                options={allBoards.map(b => ({ value: b._id, label: b.boardName }))}
                                value={filterBoardType}
                                onChange={setFilterBoardType}
                                placeholder="All Boards"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="min-w-[180px]">
                            <CustomMultiSelect
                                options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'deactivated', label: 'Deactivated' }
                                ]}
                                value={filterStatus}
                                onChange={setFilterStatus}
                                placeholder="All Status"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {/* Reset Filters Button */}
                        <button
                            onClick={handleResetFilters}
                            className={`p-2.5 rounded-lg border transition-all h-[38px] flex items-center justify-center ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-500 border-gray-200 hover:text-gray-900 hover:bg-gray-200'}`}
                            title="Reset all filters"
                        >
                            <FaUndo />
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <CardSkeleton key={i} isDarkMode={isDarkMode} />
                        ))}
                    </div>
                ) : (
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} rounded-xl border overflow-hidden`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className={`${isDarkMode ? 'bg-gray-800/50 text-gray-400' : 'bg-gray-50 text-gray-500'} text-sm uppercase`}>
                                        <th className="p-4 border-b border-gray-800">Name</th>
                                        <th className="p-4 border-b border-gray-800">Role</th>
                                        <th className="p-4 border-b border-gray-800">Employee ID</th>
                                        <th className="p-4 border-b border-gray-800">Contact</th>
                                        <th className="p-4 border-b border-gray-800 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...Array(10)].map((_, i) => (
                                        <TableRowSkeleton key={i} isDarkMode={isDarkMode} columns={5} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            ) : filteredUsers.length === 0 ? (
                <div className={`p-12 text-center rounded-xl border border-dashed ${isDarkMode ? 'bg-gray-800/20 border-gray-700 text-gray-500' : 'bg-gray-50 border-gray-300 text-gray-400'}`}>
                    <p className="font-bold uppercase tracking-[0.2em] text-sm">No user vectors found</p>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map((user) => (
                        <div key={user._id} className={`user-card-wave-dramatic ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-xl border transition-all group relative overflow-hidden`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-16 h-16 rounded-full ${user.isActive === false ? 'bg-red-900/20 border-red-500/30' : isDarkMode ? 'bg-cyan-900 border-cyan-500/30' : 'bg-cyan-100 border-cyan-200'} flex items-center justify-center overflow-hidden border-2 shadow-lg relative`}>
                                        {user.profileImage ? (
                                            <img src={user.profileImage} alt={user.name} className={`w-full h-full object-cover ${user.isActive === false ? 'grayscale opacity-50' : ''}`} />
                                        ) : (
                                            <span className={`${user.isActive === false ? 'text-red-400' : 'text-cyan-400'} font-bold text-xl`}>{user.name.charAt(0).toUpperCase()}</span>
                                        )}
                                        {user.isActive === false && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 backdrop-blur-[1px]">
                                                <span className="text-[8px] font-black uppercase tracking-tighter text-white bg-red-600 px-1 rounded-[1px] shadow-lg">OFF</span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.name}</h3>
                                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded border ${getRoleBadgeColor(user.role)}`}>
                                            {getRoleDisplayName(user.role)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    {canEditUsers && (
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className={`p-2 rounded transition-all ${isDarkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-yellow-600 hover:bg-yellow-500 hover:text-white'}`}
                                                title="Edit"
                                            >
                                                <FaEdit />
                                            </button>
                                            {canDeactivateUsers && (
                                                <button
                                                    onClick={(e) => handleToggleStatus(user._id, user.isActive !== false, e)}
                                                    className={`p-2 rounded transition-all ${user.isActive === false ? (isDarkMode ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-green-100 text-green-600 hover:bg-green-500 hover:text-white') : (isDarkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-600 hover:bg-red-500 hover:text-white')}`}
                                                    title={user.isActive === false ? "Activate" : "Deactivate"}
                                                >
                                                    <FaUndo className={user.isActive === false ? "" : "rotate-180"} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {canDeleteUsers && (
                                        <button
                                            onClick={() => handleDelete(user._id)}
                                            className={`p-2 rounded transition-all ${isDarkMode ? 'bg-gray-800 text-red-400 hover:bg-gray-700' : 'bg-gray-100 text-red-600 hover:bg-red-500 hover:text-white'}`}
                                            title="Delete"
                                        >
                                            <FaTrash />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className={`space-y-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
                                <div className="flex items-center gap-2">
                                    <FaUser className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                                    <span className="font-mono">{user.employeeId}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaEnvelope className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                                    <span className="truncate">{user.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaPhone className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                                    <span>{user.mobNum}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <FaMapMarkerAlt className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`} />
                                    <span className="break-words">{getCentresDisplay(user)}</span>
                                </div>

                                {user.isActive === false && (
                                    <div className="mt-4 p-2.5 bg-red-500/10 border-2 border-red-500/20 rounded-xl relative overflow-hidden">
                                        <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
                                        <div className="relative flex flex-col items-center justify-center text-center">
                                            <span className="text-red-500 text-[12px] font-black uppercase tracking-[0.2em] leading-none mb-1">
                                                DEACTIVATED
                                            </span>
                                            <span className="text-red-400 text-[8px] font-black uppercase tracking-widest opacity-80">
                                                NO ACCESS OF ERP
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {user.role === "telecaller" && (
                                    <div className={`flex items-center gap-2 mt-3 pt-2 border-t ${isDarkMode ? 'border-gray-800/50' : 'border-gray-100'}`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                                        <span className="text-xs font-black uppercase tracking-widest text-cyan-500">
                                            Script: {user.assignedScript?.scriptName || "Unassigned"}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Granular Permissions Display */}
                            <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-2`}>Access Level:</p>
                                <div
                                    className={`flex flex-wrap gap-1 cursor-pointer p-1 rounded transition-all -ml-1 border border-transparent ${isDarkMode ? 'hover:bg-gray-800/50 hover:border-gray-700' : 'hover:bg-gray-50 hover:border-gray-200'}`}
                                    onClick={() => { setSelectedPermUser(user); setShowPermModal(true); }}
                                >
                                    {user.role === 'superAdmin' ? (
                                        <span className="text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded-[2px]">
                                            Full System Access
                                        </span>
                                    ) : (
                                        (() => {
                                            const modules = getAccessibleModules(user);
                                            if (modules.length === 0) return <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 italic">No modules assigned</span>;

                                            const displayModules = modules.slice(0, 3);
                                            const remaining = modules.length - 3;

                                            return (
                                                <>
                                                    {displayModules.map(modKey => (
                                                        <span key={modKey} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-[2px] ${isDarkMode ? 'bg-gray-800 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                                                            {PERMISSION_MODULES[modKey]?.label || modKey}
                                                        </span>
                                                    ))}
                                                    {remaining > 0 && (
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-[2px] ${isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                                                            +{remaining} MORE
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
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl border overflow-hidden transition-all`}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`${isDarkMode ? 'bg-gray-800/50 text-gray-400' : 'bg-gray-50 text-gray-500'} text-sm uppercase`}>
                                    <th className={`p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} font-black tracking-widest text-[10px]`}>Structure</th>
                                    <th className={`p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} font-black tracking-widest text-[10px]`}>Role</th>
                                    <th className={`p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} font-black tracking-widest text-[10px]`}>Employee ID</th>
                                    <th className={`p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} font-black tracking-widest text-[10px]`}>Communication</th>
                                    <th className={`p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} font-black tracking-widest text-[10px]`}>Assigned Units</th>
                                    <th className={`p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} font-black tracking-widest text-[10px]`}>Operational Script</th>
                                    <th className={`p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} font-black tracking-widest text-[10px] text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {filteredUsers.map((user) => (
                                    <tr key={user._id} className={`${isDarkMode ? 'hover:bg-cyan-500/5' : 'hover:bg-gray-50'} transition-all group`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border ${isDarkMode ? 'bg-cyan-900 border-cyan-500/30' : 'bg-cyan-100 border-cyan-200'}`}>
                                                    {user.profileImage ? (
                                                        <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-cyan-400 font-bold text-sm">{user.name.charAt(0).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`font-black uppercase tracking-tight ${isDarkMode ? 'text-white group-hover:text-cyan-400' : 'text-gray-900 group-hover:text-cyan-600'}`}>{user.name}</span>
                                                    {user.isActive === false && (
                                                        <span className="text-[8px] font-black uppercase tracking-[0.15em] bg-red-600 text-white px-1.5 py-0.5 rounded-[2px] w-fit mt-0.5 animate-pulse shadow-sm">
                                                            DEACTIVATED
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-block px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded border ${getRoleBadgeColor(user.role)}`}>
                                                {getRoleDisplayName(user.role)}
                                            </span>
                                        </td>
                                        <td className={`p-4 font-mono text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{user.employeeId}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className={`text-[11px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{user.email}</span>
                                                <span className="text-[10px] text-gray-500 font-bold">{user.mobNum}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[11px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{getCentresDisplay(user)}</span>
                                        </td>
                                        <td className="p-4 text-gray-400 text-sm">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${user.role === 'telecaller' ? "text-cyan-500" : isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
                                                {user.assignedScript?.scriptName || (user.role === 'telecaller' ? "UNASSIGNED" : "N/A")}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {canEditUsers && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleEdit(user)}
                                                            className={`p-2 rounded transition-all ${isDarkMode ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-yellow-600 hover:bg-yellow-100'}`}
                                                            title="Edit"
                                                        >
                                                            <FaEdit size={14} />
                                                        </button>
                                                        {canDeactivateUsers && (
                                                            <button
                                                                onClick={(e) => handleToggleStatus(user._id, user.isActive !== false, e)}
                                                                className={`p-2 rounded transition-all ${user.isActive === false ? 'text-green-500 hover:bg-green-500/10' : 'text-red-500 hover:bg-red-500/10'}`}
                                                                title={user.isActive === false ? "Activate" : "Deactivate"}
                                                            >
                                                                <FaUndo size={14} className={user.isActive === false ? "" : "rotate-180"} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {canDeleteUsers && (
                                                    <button
                                                        onClick={() => handleDelete(user._id)}
                                                        className={`p-2 rounded transition-all ${isDarkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-100'}`}
                                                        title="Delete"
                                                    >
                                                        <FaTrash size={14} />
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
