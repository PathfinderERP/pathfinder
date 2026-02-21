import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { FaEye, FaPlus, FaSearch, FaEdit, FaTrash, FaFilter, FaSync } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MultiSelectFilter from "../../components/common/MultiSelectFilter";
import usePermission from "../../hooks/usePermission";
import ExcelImportExport from "../../components/common/ExcelImportExport";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";
import { useTheme } from "../../context/ThemeContext";

const API_URL = import.meta.env.VITE_API_URL;

const TeacherList = () => {
    const navigate = useNavigate();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    // Permissions
    const canCreate = usePermission('academics', 'teachers', 'create');
    const canEdit = usePermission('academics', 'teachers', 'edit');
    const canDelete = usePermission('academics', 'teachers', 'delete');

    // Filter States
    const [filterNames, setFilterNames] = useState([]);
    const [filterEmails, setFilterEmails] = useState([]);
    const [filterEmployeeIds, setFilterEmployeeIds] = useState([]);
    const [filterMobiles, setFilterMobiles] = useState([]);
    const [filterDepartments, setFilterDepartments] = useState([]);
    const [filterBoards, setFilterBoards] = useState([]);
    const [filterDesignations, setFilterDesignations] = useState([]);
    const [filterSubjects, setFilterSubjects] = useState([]);
    const [filterTypes, setFilterTypes] = useState([]);
    const [filterCentres, setFilterCentres] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [viewOnly, setViewOnly] = useState(false);
    const [centres, setCentres] = useState([]);
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    // Form Data State
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobNum: "",
        employeeId: "",
        subject: "",
        centre: "",
        teacherDepartment: "",
        boardType: "",
        teacherType: "",
        designation: "",
        isDeptHod: false,
        isBoardHod: false,
        isSubjectHod: false
    });

    // Fetch Teachers
    const fetchTeachers = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/teacher/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setTeachers(data);
            } else {
                toast.error(data.message || "Failed to fetch teachers");
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Error fetching teachers");
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch Centres
    const fetchCentres = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
                if (storedUser.role !== 'superAdmin' && storedUser.centres) {
                    const filtered = data.filter(c => storedUser.centres.includes(c._id));
                    setCentres(filtered);
                } else {
                    setCentres(data);
                }
            }
        } catch (err) {
            console.error("Fetch Centres Error:", err);
        }
    }, []);

    useEffect(() => {
        fetchTeachers();
        fetchCentres();
    }, [fetchTeachers, fetchCentres]);

    // Handle Input Change
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (["isDeptHod", "isBoardHod", "isSubjectHod"].includes(name) && checked) {
            setFormData(prev => ({
                ...prev,
                isDeptHod: name === "isDeptHod",
                isBoardHod: name === "isBoardHod",
                isSubjectHod: name === "isSubjectHod"
            }));
            return;
        }
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const [editId, setEditId] = useState(null);

    const handleEdit = (teacher) => {
        setFormData({
            name: teacher.name,
            email: teacher.email,
            mobNum: teacher.mobNum,
            employeeId: teacher.employeeId,
            subject: teacher.subject,
            centre: teacher.centres?.[0]?._id || teacher.centres?.[0] || teacher.centre || "",
            teacherDepartment: teacher.teacherDepartment,
            boardType: teacher.boardType,
            teacherType: teacher.teacherType,
            designation: teacher.designation,
            isDeptHod: teacher.isDeptHod,
            isBoardHod: teacher.isBoardHod,
            isSubjectHod: teacher.isSubjectHod
        });
        setEditId(teacher._id);
        setShowModal(true);
        setViewOnly(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this teacher?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/teacher/delete/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Teacher deleted successfully");
                fetchTeachers();
            } else {
                const data = await response.json();
                toast.error(data.message || "Failed to delete teacher");
            }
        } catch (error) {
            console.error("Delete Error:", error);
            toast.error("Server error during delete");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const url = editId ? `${API_URL}/academics/teacher/update/${editId}` : `${API_URL}/academics/teacher/create`;
            const method = editId ? "PUT" : "POST";
            const response = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (response.ok) {
                toast.success(editId ? "Teacher updated successfully!" : "Teacher added successfully!");
                setShowModal(false);
                setEditId(null);
                fetchTeachers();
                setFormData({
                    name: "", email: "", mobNum: "", employeeId: "", subject: "",
                    centre: "", teacherDepartment: "", boardType: "", teacherType: "", designation: "",
                    isDeptHod: false, isBoardHod: false, isSubjectHod: false
                });
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (error) {
            console.error("Submit Error:", error);
            toast.error("Server error");
        }
    };

    const openAddModal = () => {
        setFormData({
            name: "", email: "", mobNum: "", employeeId: "", subject: "",
            centre: "", teacherDepartment: "", boardType: "", teacherType: "", designation: "",
            isDeptHod: false, isBoardHod: false, isSubjectHod: false
        });
        setEditId(null);
        setViewOnly(false);
        setShowModal(true);
    };

    const handleView = (teacher) => {
        setFormData({
            name: teacher.name,
            email: teacher.email,
            mobNum: teacher.mobNum,
            employeeId: teacher.employeeId,
            subject: teacher.subject,
            centre: teacher.centres?.[0]?._id || teacher.centres?.[0] || teacher.centre || "",
            teacherDepartment: teacher.teacherDepartment,
            boardType: teacher.boardType,
            teacherType: teacher.teacherType,
            designation: teacher.designation,
            isDeptHod: teacher.isDeptHod,
            isBoardHod: teacher.isBoardHod,
            isSubjectHod: teacher.isSubjectHod
        });
        setViewOnly(true);
        setEditId(null);
        setShowModal(true);
    };

    const getOptions = (key) => {
        const unique = [...new Set(teachers.map(t => t[key]).filter(Boolean))];
        return unique.map(val => ({ value: val, label: val }));
    };

    // Get centre options from all teachers' centres arrays
    const getCentreOptions = () => {
        const allCentres = [];
        teachers.forEach(t => {
            if (Array.isArray(t.centres)) {
                t.centres.forEach(c => {
                    const centreName = c?.centreName || c;
                    if (centreName && !allCentres.includes(centreName)) {
                        allCentres.push(centreName);
                    }
                });
            }
        });
        return allCentres.sort().map(val => ({ value: val, label: val }));
    };

    const nameOptions = getOptions('name');
    const emailOptions = getOptions('email');
    const empIdOptions = getOptions('employeeId');
    const mobileOptions = getOptions('mobNum');
    const deptOptions = getOptions('teacherDepartment');
    const boardOptions = getOptions('boardType');
    const desigOptions = getOptions('designation');
    const subjectOptions = getOptions('subject');
    const typeOptions = getOptions('teacherType');
    const centreOptions = getCentreOptions();

    const filteredTeachers = teachers.filter(t => {
        const matchesSearch =
            t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesName = filterNames.length === 0 || filterNames.includes(t.name);
        const matchesEmail = filterEmails.length === 0 || filterEmails.includes(t.email);
        const matchesEmpId = filterEmployeeIds.length === 0 || filterEmployeeIds.includes(t.employeeId);
        const matchesMobile = filterMobiles.length === 0 || filterMobiles.includes(t.mobNum);
        const matchesDept = filterDepartments.length === 0 || filterDepartments.includes(t.teacherDepartment);
        const matchesBoard = filterBoards.length === 0 || filterBoards.includes(t.boardType);
        const matchesDesig = filterDesignations.length === 0 || filterDesignations.includes(t.designation);
        const matchesSubject = filterSubjects.length === 0 || filterSubjects.includes(t.subject);
        const matchesType = filterTypes.length === 0 || filterTypes.includes(t.teacherType);

        // Centre filter - check if teacher has any of the selected centres
        const matchesCentre = filterCentres.length === 0 || (
            Array.isArray(t.centres) && t.centres.some(c => {
                const centreName = c?.centreName || c;
                return filterCentres.includes(centreName);
            })
        );

        return matchesSearch && matchesName && matchesEmail && matchesEmpId && matchesMobile &&
            matchesDept && matchesBoard && matchesDesig && matchesSubject && matchesType && matchesCentre;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredTeachers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);

    const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

    // --- Analytics Data Processing ---
    const getStatsData = (key) => {
        const counts = {};
        teachers.forEach(t => {
            const val = t[key] || "Unknown";
            counts[val] = (counts[val] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    };

    const deptChartData = getStatsData('teacherDepartment');
    const typeChartData = getStatsData('teacherType');
    const boardChartData = getStatsData('boardType');
    const subjectChartData = getStatsData('subject').slice(0, 5);

    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    const resetFilters = () => {
        setSearchTerm("");
        setFilterNames([]);
        setFilterEmails([]);
        setFilterEmployeeIds([]);
        setFilterMobiles([]);
        setFilterDepartments([]);
        setFilterBoards([]);
        setFilterDesignations([]);
        setFilterSubjects([]);
        setFilterTypes([]);
        setFilterCentres([]);
    };

    const teacherColumns = [
        { header: "Name", key: "name" },
        { header: "Email", key: "email" },
        { header: "Employee ID", key: "employeeId" },
        { header: "Mobile", key: "mobNum" },
        { header: "Centre", key: "centre" },
        { header: "Department", key: "teacherDepartment" },
        { header: "Board", key: "boardType" },
        { header: "Subject", key: "subject" },
        { header: "Designation", key: "designation" },
        { header: "Type", key: "teacherType" },
        { header: "Dept HOD", key: "isDeptHod" },
        { header: "Board HOD", key: "isBoardHod" },
        { header: "Subject HOD", key: "isSubjectHod" },
    ];

    const teacherMapping = {
        name: "name", email: "email", employeeId: "employeeId", mobNum: "phoneNumber",
        centre: "center", teacherDepartment: "department", boardType: "examArea",
        teacherType: "type", subject: "subject", designation: "designation",
        isDeptHod: "deptTypeHod", isBoardHod: "boardTypeHod", isSubjectHod: "subjectWiseHod"
    };

    const handleBulkImport = async (data) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/teacher/bulk-import`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (response.ok) {
                toast.success(result.message);
                fetchTeachers();
            } else {
                toast.error(result.message || "Import failed");
                result.stats?.errors?.slice(0, 3).forEach(err => toast.error(err));
            }
        } catch (error) {
            console.error("Bulk Import Error:", error);
            toast.error("Error processing import");
        }
    };

    const prepareExportData = (data) => {
        return data.map(t => ({
            ...t,
            centre: Array.isArray(t.centres) ? t.centres.map(c => c.centreName || c).join(", ") : t.centre || ""
        }));
    };

    return (
        <Layout activePage="Academics">
            <div className={`p-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900 bg-[#f8fafc]'}`}>
                <ToastContainer theme={theme} />
                <h1 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Teacher List</h1>

                {/* Analytics Section - Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Dept Stats - Bar Chart */}
                    <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200'} p-4 rounded-xl border shadow-lg h-[240px] flex flex-col`}>
                        <h3 className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-4 uppercase tracking-wider`}>Department Wise</h3>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%" minHeight={150} minWidth={100}>
                                <BarChart data={deptChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} vertical={false} />
                                    <XAxis dataKey="name" stroke={isDarkMode ? "#9ca3af" : "#6b7280"} fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke={isDarkMode ? "#9ca3af" : "#6b7280"} fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: isDarkMode ? '#111827' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb', color: isDarkMode ? '#fff' : '#000' }}
                                        itemStyle={{ color: '#22d3ee' }}
                                    />
                                    <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Board Stats - Pie Chart */}
                    <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200'} p-4 rounded-xl border shadow-lg h-[240px] flex flex-col`}>
                        <h3 className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-4 uppercase tracking-wider`}>Board Distribution</h3>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%" minHeight={150} minWidth={100}>
                                <PieChart>
                                    <Pie
                                        data={boardChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={55}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {boardChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#111827' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb', color: isDarkMode ? '#fff' : '#000' }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Type Stats - Donut Chart */}
                    <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200'} p-4 rounded-xl border shadow-lg h-[240px] flex flex-col`}>
                        <h3 className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-4 uppercase tracking-wider`}>Teacher Type</h3>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%" minHeight={150} minWidth={100}>
                                <PieChart>
                                    <Pie
                                        data={typeChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={65}
                                        dataKey="value"
                                    >
                                        {typeChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.name === 'Full Time' ? '#10b981' : '#f59e0b'} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#111827' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb', color: isDarkMode ? '#fff' : '#000' }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Subjects - Horizontal Bar Chart */}
                    <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200'} p-4 rounded-xl border shadow-lg h-[240px] flex flex-col`}>
                        <h3 className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-4 uppercase tracking-wider`}>Top 5 Subjects</h3>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%" minHeight={150} minWidth={100}>
                                <BarChart data={subjectChartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke={isDarkMode ? "#9ca3af" : "#6b7280"} fontSize={10} width={70} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: isDarkMode ? '#111827' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb', color: isDarkMode ? '#fff' : '#000' }}
                                        itemStyle={{ color: '#a855f7' }}
                                    />
                                    <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Filters Section */}
                <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200'} p-4 rounded-xl border shadow-lg mb-6`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <FaFilter /> <span className="font-semibold">Filters</span>
                        </div>
                        <div className="flex gap-2">
                            <ExcelImportExport
                                columns={teacherColumns}
                                mapping={teacherMapping}
                                data={teachers}
                                onImport={handleBulkImport}
                                onExport={() => teachers}
                                prepareExportData={prepareExportData}
                                fileName="Teacher_List"
                                templateName="Teacher_Import_Template"
                                isDarkMode={isDarkMode}
                            />
                            <button onClick={resetFilters} className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} text-sm flex items-center gap-1 transition-colors`}>
                                <FaSync /> Reset
                            </button>
                            {canCreate && (
                                <button
                                    onClick={openAddModal}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition shadow-md"
                                >
                                    <FaPlus /> Add Teacher
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-5 relative">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Global Search (Name, Email, ID)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'} pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:border-cyan-500 transition-colors`}
                            />
                        </div>

                        <MultiSelectFilter label="Name" placeholder="All Names" options={nameOptions} selectedValues={filterNames} onChange={setFilterNames} theme={theme} />
                        <MultiSelectFilter label="Email" placeholder="All Emails" options={emailOptions} selectedValues={filterEmails} onChange={setFilterEmails} theme={theme} />
                        <MultiSelectFilter label="Emp ID" placeholder="All IDs" options={empIdOptions} selectedValues={filterEmployeeIds} onChange={setFilterEmployeeIds} theme={theme} />
                        <MultiSelectFilter label="Mobile" placeholder="All Mobiles" options={mobileOptions} selectedValues={filterMobiles} onChange={setFilterMobiles} theme={theme} />
                        <MultiSelectFilter label="Dept" placeholder="All Depts" options={deptOptions} selectedValues={filterDepartments} onChange={setFilterDepartments} theme={theme} />
                        <MultiSelectFilter label="Board" placeholder="All Boards" options={boardOptions} selectedValues={filterBoards} onChange={setFilterBoards} theme={theme} />
                        <MultiSelectFilter label="Desig" placeholder="All Desigs" options={desigOptions} selectedValues={filterDesignations} onChange={setFilterDesignations} theme={theme} />
                        <MultiSelectFilter label="Subject" placeholder="All Subjects" options={subjectOptions} selectedValues={filterSubjects} onChange={setFilterSubjects} theme={theme} />
                        <MultiSelectFilter label="Type" placeholder="All Types" options={typeOptions} selectedValues={filterTypes} onChange={setFilterTypes} theme={theme} />
                        <MultiSelectFilter label="Centre" placeholder="All Centres" options={centreOptions} selectedValues={filterCentres} onChange={setFilterCentres} theme={theme} />
                    </div>
                </div>

                {/* Table */}
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-md'} rounded-lg border overflow-x-auto transition-colors duration-300`}>
                    <table className="w-full text-left border-collapse table-auto">
                        <thead>
                            <tr className={`text-xs uppercase border-b ${isDarkMode ? 'text-gray-400 border-gray-700 bg-[#131619]' : 'text-gray-500 border-gray-200 bg-gray-50'}`}>
                                <th className="p-4 font-semibold min-w-[200px]">Name</th>
                                <th className="p-4 font-semibold">Emp ID</th>
                                <th className="p-4 font-semibold">Email</th>
                                <th className="p-4 font-semibold">Mobile</th>
                                <th className="p-4 font-semibold">Centres</th>
                                <th className="p-4 font-semibold">Subject</th>
                                <th className="p-4 font-semibold">Designation</th>
                                <th className="p-4 font-semibold">Dept</th>
                                <th className="p-4 font-semibold">Board</th>
                                <th className="p-4 font-semibold">Type</th>
                                <th className="p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="11" className="p-8 text-center text-gray-500">Loading...</td></tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="p-8 text-center text-gray-500">
                                        No teachers found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((teacher) => (
                                    <tr
                                        key={teacher._id}
                                        className={`border-b transition-all duration-200 hover:shadow-lg group ${isDarkMode ? 'border-gray-800 hover:bg-[#2a323c]' : 'border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-900 border border-gray-700 overflow-hidden flex-shrink-0">
                                                    {teacher.profileImage && !teacher.profileImage.startsWith('undefined/') ? (
                                                        <img src={teacher.profileImage} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center text-xs font-bold text-cyan-500 ${isDarkMode ? 'bg-cyan-500/10' : 'bg-cyan-100'}`}>
                                                            {teacher.name?.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span
                                                        className={`font-bold transition-colors uppercase cursor-pointer hover:underline break-words max-w-[200px] ${isDarkMode ? 'text-white group-hover:text-cyan-400' : 'text-gray-900 group-hover:text-cyan-600'}`}
                                                        onClick={() => handleView(teacher)}
                                                        title="Click to view full details"
                                                    >
                                                        {teacher.name}
                                                    </span>
                                                    <span className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{teacher.designation || "Faculty"}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`p-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            <span className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-100 border-gray-200'} font-mono text-xs px-2 py-1 rounded border`}>
                                                {teacher.employeeId || "N/A"}
                                            </span>
                                        </td>
                                        <td className={`p-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{teacher.email}</td>
                                        <td className={`p-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{teacher.mobNum}</td>
                                        <td className={`p-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            {Array.isArray(teacher.centres) && teacher.centres.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {teacher.centres.map((c, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${isDarkMode ? 'bg-blue-900/50 text-blue-400 border border-blue-800' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}
                                                        >
                                                            {c?.centreName || c}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : "-"}
                                        </td>
                                        <td className={`p-4 text-sm ${isDarkMode ? 'text-white' : 'text-gray-800 font-medium'}`}>{teacher.subject || "-"}</td>
                                        <td className={`p-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{teacher.designation || "-"}</td>
                                        <td className={`p-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{teacher.teacherDepartment || "-"}</td>
                                        <td className={`p-4 text-sm ${isDarkMode ? 'text-white' : 'text-gray-800 font-medium'}`}>{teacher.boardType || "-"}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-semibold ${teacher.teacherType === 'Full Time' ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-yellow-900/50 text-yellow-400 border border-yellow-800'
                                                }`}>
                                                {teacher.teacherType || "-"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm">
                                            <div className="flex gap-3">
                                                <span
                                                    className="text-cyan-400 cursor-pointer flex items-center gap-1 hover:text-cyan-300 transition-colors p-1"
                                                    title="View Details"
                                                    onClick={() => navigate(`/academics/teacher/view/${teacher._id}`)}
                                                >
                                                    <FaEye />
                                                </span>
                                                {canEdit && (
                                                    <span
                                                        className="text-yellow-400 cursor-pointer flex items-center gap-1 hover:text-yellow-300 transition-colors p-1"
                                                        title="Edit"
                                                        onClick={() => handleEdit(teacher)}
                                                    >
                                                        <FaEdit />
                                                    </span>
                                                )}
                                                {canDelete && (
                                                    <span
                                                        className="text-red-400 cursor-pointer flex items-center gap-1 hover:text-red-300 transition-colors p-1"
                                                        title="Delete"
                                                        onClick={() => handleDelete(teacher._id)}
                                                    >
                                                        <FaTrash />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200'} p-4 rounded-xl border mt-6 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-lg transition-colors`}>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTeachers.length)} of {filteredTeachers.length} entries
                        </span>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rows per page:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className={`${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'} border rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500`}
                            >
                                {[10, 15, 20, 30, 50, 100].map(val => (
                                    <option key={val} value={val}>{val}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 sm:pb-0">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`px-3 py-1.5 rounded-lg border transition text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-[#131619] border-gray-700 text-gray-300 hover:bg-[#2a323c]' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                        >
                            Prev
                        </button>
                        <div className="flex gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                                <button
                                    key={number}
                                    onClick={() => handlePageChange(number)}
                                    className={`w-8 h-8 rounded-lg border text-xs flex items-center justify-center transition ${currentPage === number ? 'bg-blue-600 border-blue-600 text-white' : isDarkMode ? 'bg-[#131619] border-gray-700 text-gray-300 hover:bg-[#2a323c]' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-white'}`}
                                >
                                    {number}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-1.5 rounded-lg border transition text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-[#131619] border-gray-700 text-gray-300 hover:bg-[#2a323c]' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                        >
                            Next
                        </button>
                    </div>
                </div>


                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 backdrop-blur-sm p-4">
                        <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200'} w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border shadow-2xl animate-fade-in custom-scrollbar transition-colors`}>
                            <div className={`p-6 border-b flex justify-between items-center sticky top-0 z-10 ${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-100'}`}>
                                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {viewOnly ? "View Teacher Details" : editId ? "Edit Teacher" : "Add Teacher"}
                                </h2>
                                <button onClick={() => setShowModal(false)} className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} text-2xl`}>&times;</button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Row 1 */}
                                    <div>
                                        <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600 font-medium'}`}>Teacher Name <span className="text-red-500">*</span></label>
                                        <input type="text" name="name" required disabled={viewOnly} value={formData.name} onChange={handleChange}
                                            className={`w-full border rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none disabled:opacity-70 ${isDarkMode ? 'bg-[#13171c] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="Enter Teacher Name" />
                                    </div>
                                    <div>
                                        <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600 font-medium'}`}>Teacher Email <span className="text-red-500">*</span></label>
                                        <input type="email" name="email" required disabled={viewOnly} value={formData.email} onChange={handleChange}
                                            className={`w-full border rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none disabled:opacity-70 ${isDarkMode ? 'bg-[#13171c] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="abc@gmail.com" />
                                    </div>

                                    {/* Row 2 */}
                                    <div>
                                        <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600 font-medium'}`}>Phone Number <span className="text-red-500">*</span></label>
                                        <input type="text" name="mobNum" required disabled={viewOnly} value={formData.mobNum} onChange={handleChange}
                                            className={`w-full border rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none disabled:opacity-70 ${isDarkMode ? 'bg-[#13171c] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="9733..." />
                                    </div>
                                    <div>
                                        <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600 font-medium'}`}>Subject <span className="text-red-500">*</span></label>
                                        <input type="text" name="subject" required disabled={viewOnly} value={formData.subject} onChange={handleChange}
                                            className={`w-full border rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none disabled:opacity-70 ${isDarkMode ? 'bg-[#13171c] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="Select a subject" />
                                    </div>

                                    {/* Row 3 - Centre */}
                                    <div className="md:col-span-2">
                                        <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600 font-medium'}`}>Centre <span className="text-red-500">*</span></label>
                                        <select name="centre" required disabled={viewOnly} value={formData.centre} onChange={handleChange}
                                            className={`w-full border rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none disabled:opacity-70 ${isDarkMode ? 'bg-[#13171c] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}>
                                            <option value="">Select a Center</option>
                                            {centres.map((c) => (
                                                <option key={c._id} value={c._id}>{c.centreName}</option>
                                            ))}

                                        </select>
                                    </div>

                                    {/* Row 4 */}
                                    <div>
                                        <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600 font-medium'}`}>Teacher Department <span className="text-red-500">*</span></label>
                                        <select name="teacherDepartment" required disabled={viewOnly} value={formData.teacherDepartment} onChange={handleChange}
                                            className={`w-full border rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none disabled:opacity-70 ${isDarkMode ? 'bg-[#13171c] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}>
                                            <option value="">Select</option>
                                            <option value="Foundation">Foundation</option>
                                            <option value="Board">Board</option>
                                            <option value="All India">All India</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600 font-medium'}`}>Board Type <span className="text-red-500">*</span></label>
                                        <select name="boardType" required disabled={viewOnly} value={formData.boardType} onChange={handleChange}
                                            className={`w-full border rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none disabled:opacity-70 ${isDarkMode ? 'bg-[#13171c] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}>
                                            <option value="">Select</option>
                                            <option value="CBSE">CBSE</option>
                                            <option value="ICSE">ICSE</option>
                                            <option value="JEE">JEE</option>
                                            <option value="NEET">NEET</option>
                                        </select>
                                    </div>

                                    {/* Row 5 */}
                                    <div>
                                        <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600 font-medium'}`}>Teacher Type <span className="text-red-500">*</span></label>
                                        <select name="teacherType" required disabled={viewOnly} value={formData.teacherType} onChange={handleChange}
                                            className={`w-full border rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none disabled:opacity-70 ${isDarkMode ? 'bg-[#13171c] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}>
                                            <option value="">Select</option>
                                            <option value="Full Time">Full Time</option>
                                            <option value="Part Time">Part Time</option>
                                        </select>
                                    </div>
                                    <div>
                                        {/* Blank to balance or something else */}
                                    </div>

                                    {/* Row 6 */}
                                    <div>
                                        <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600 font-medium'}`}>Employee Id <span className="text-red-500">*</span></label>
                                        <input type="text" name="employeeId" required disabled={viewOnly} value={formData.employeeId} onChange={handleChange}
                                            className={`w-full border rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none disabled:opacity-70 ${isDarkMode ? 'bg-[#13171c] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="Enter ID" />
                                    </div>
                                    <div>
                                        <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600 font-medium'}`}>Designation <span className="text-red-500">*</span></label>
                                        <input type="text" name="designation" required disabled={viewOnly} value={formData.designation} onChange={handleChange}
                                            className={`w-full border rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none disabled:opacity-70 ${isDarkMode ? 'bg-[#13171c] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="Select a designation" />
                                    </div>
                                </div>

                                {/* Checkboxes */}
                                <div className={`flex flex-wrap gap-6 mt-4 border-t pt-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                    <label className={`flex items-center gap-2 cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-gray-700 font-medium'} ${viewOnly ? 'cursor-default' : ''}`}>
                                        <input type="checkbox" name="isDeptHod" disabled={viewOnly} checked={formData.isDeptHod} onChange={handleChange} className="w-4 h-4 rounded disabled:opacity-70" />
                                        <span>Dept Type HOD</span>
                                    </label>
                                    <label className={`flex items-center gap-2 cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-gray-700 font-medium'} ${viewOnly ? 'cursor-default' : ''}`}>
                                        <input type="checkbox" name="isBoardHod" disabled={viewOnly} checked={formData.isBoardHod} onChange={handleChange} className="w-4 h-4 rounded disabled:opacity-70" />
                                        <span>Board Type HOD</span>
                                    </label>
                                    <label className={`flex items-center gap-2 cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-gray-700 font-medium'} ${viewOnly ? 'cursor-default' : ''}`}>
                                        <input type="checkbox" name="isSubjectHod" disabled={viewOnly} checked={formData.isSubjectHod} onChange={handleChange} className="w-4 h-4 rounded disabled:opacity-70" />
                                        <span>Subject Wise HOD</span>
                                    </label>
                                </div>

                                {/* Footer Buttons */}
                                {!viewOnly && (
                                    <div className="mt-8 flex gap-4">
                                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-lg">
                                            {editId ? "Update" : "Add"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className={`w-full border font-bold py-3 rounded-lg transition ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-[#131619]' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default TeacherList;