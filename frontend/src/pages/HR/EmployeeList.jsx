import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { FaPlus, FaEdit, FaEye, FaSearch, FaFileExcel, FaFilePdf, FaTrash, FaChevronLeft, FaChevronRight, FaFileUpload, FaFilter, FaFileAlt, FaIdCard, FaBuilding, FaMapMarkerAlt, FaEnvelope } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import usePermission from "../../hooks/usePermission";

const EmployeeList = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({
        department: "",
        designation: "",
        centre: "",
        status: ""
    });
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalEmployees: 0
    });
    const [jumpPage, setJumpPage] = useState("");
    const [showImportModal, setShowImportModal] = useState(false);

    // Permission checks
    const canCreate = usePermission('hrManpower', 'employees', 'create');
    const canEdit = usePermission('hrManpower', 'employees', 'edit');
    const canDelete = usePermission('hrManpower', 'employees', 'delete');

    // Master data for filters
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [centres, setCentres] = useState([]);

    useEffect(() => {
        fetchMasterData();
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, [search, filters, pagination.currentPage]);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [deptRes, desigRes, centreRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/designation`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers })
            ]);

            if (deptRes.ok) setDepartments(await deptRes.json());
            if (desigRes.ok) setDesignations(await desigRes.json());
            if (centreRes.ok) setCentres(await centreRes.json());
        } catch (error) {
            console.error("Error fetching master data:", error);
        }
    };

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                page: pagination.currentPage,
                limit: 10,
                ...(search && { search }),
                ...(filters.department && { department: filters.department }),
                ...(filters.designation && { designation: filters.designation }),
                ...(filters.centre && { centre: filters.centre }),
                ...(filters.status && { status: filters.status })
            });

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/hr/employee?${params}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setEmployees(data.employees);
                setPagination({
                    currentPage: data.currentPage,
                    totalPages: data.totalPages,
                    totalEmployees: data.totalEmployees
                });
            } else {
                toast.error("Failed to fetch employees");
            }
        } catch (error) {
            console.error("Error fetching employees:", error);
            toast.error("Error fetching employees");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleClearFilters = () => {
        setSearch("");
        setFilters({
            department: "",
            designation: "",
            centre: "",
            status: ""
        });
        setPagination(prev => ({ ...prev, currentPage: 1 }));
        toast.info("Filters cleared");
    };

    const handleExportExcel = () => {
        if (employees.length === 0) {
            toast.warn("No data to export");
            return;
        }

        const exportData = employees.map(emp => ({
            "Employee ID": emp.employeeId,
            "Name": emp.name,
            "Email": emp.email,
            "Department": emp.department?.departmentName || "",
            "Designation": emp.designation?.name || "",
            "Centre": emp.primaryCentre?.centreName || "",
            "Status": emp.status
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Employees");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(data, `Employees_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleExportPDF = () => {
        if (employees.length === 0) {
            toast.warn("No data to export");
            return;
        }
        window.print();
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success("Employee deleted successfully");
                fetchEmployees();
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to delete employee");
            }
        } catch (error) {
            console.error("Error deleting employee:", error);
            toast.error("Error deleting employee");
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, currentPage: newPage }));
        }
    };

    const handleJumpPage = (e) => {
        e.preventDefault();
        const pageNum = parseInt(jumpPage);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pagination.totalPages) {
            handlePageChange(pageNum);
            setJumpPage("");
        } else {
            toast.error(`Please enter a page between 1 and ${pagination.totalPages}`);
        }
    };

    const renderPageNumbers = () => {
        const pages = [];
        const { currentPage, totalPages } = pagination;

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push("...");
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1);
                pages.push("...");
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push("...");
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push("...");
                pages.push(totalPages);
            }
        }

        return pages.map((page, index) => (
            <button
                key={index}
                onClick={() => typeof page === "number" && handlePageChange(page)}
                disabled={page === "..."}
                className={`min-w-[40px] h-10 flex items-center justify-center rounded-lg font-medium transition-all ${page === currentPage
                    ? "bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20"
                    : page === "..."
                        ? "text-gray-500 cursor-default"
                        : "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-[#252a30] hover:text-cyan-500 dark:hover:text-cyan-400"
                    }`}
            >
                {page}
            </button>
        ));
    };

    const ImportOverviewModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#131619] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-800 overflow-hidden transform transition-all">
                <div className="px-6 py-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500">
                            <FaFileUpload size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-white">Import Employee Data</h3>
                    </div>
                    <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-white transition-colors">
                        <FaPlus className="rotate-45" size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4 h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="bg-cyan-900/10 border border-cyan-500/20 p-4 rounded-xl">
                            <p className="text-sm text-cyan-200 leading-relaxed">
                                To ensure successful import, your Excel file must follow the specific column headers and data formats listed below.
                                <span className="block mt-1 font-bold">Note: All column names are Case-Insensitive.</span>
                            </p>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-1 gap-3">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Required Column Mapping</h4>
                                <div className="space-y-2">
                                    {[
                                        { col: "Name", req: true, format: "Text (Full Name)", example: "John Doe" },
                                        { col: "Email", req: true, format: "Valid Email String", example: "john@example.com" },
                                        { col: "Phone Number", req: true, format: "10 Digit Number", example: "9876543210" },
                                        { col: "DOB", req: true, format: "DD/MM/YYYY", example: "15/08/1995" },
                                        { col: "Joining Date", req: true, format: "DD/MM/YYYY", example: "01/01/2024" },
                                        { col: "Gender", req: true, format: "Male | Female | Other", example: "Male" },
                                        { col: "Department", req: true, format: "Existing Dept Name", example: "IT Department" },
                                        { col: "Designation", req: true, format: "Existing Desig Name", example: "Software Engineer" },
                                        { col: "Primary Centre", req: true, format: "Existing Centre Name", example: "Kolkata H.O" },
                                        { col: "Employment Type", req: true, format: "Full-time | Part-time | Contract | Intern", example: "Full-time" },
                                        { col: "Salary", req: false, format: "Numeric (Monthly)", example: "25000" }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-800/40 rounded-xl border border-gray-800/60 group hover:border-cyan-500/30 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-1.5 h-1.5 rounded-full ${item.req ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-gray-400'}`}></div>
                                                <span className="font-bold text-gray-200">{item.col}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] text-gray-400 italic font-medium uppercase tracking-wider">{item.format}</span>
                                                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-md font-bold">{item.example}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                        <button className="text-cyan-500 hover:text-cyan-400 text-sm font-bold flex items-center gap-2">
                            <FaFileExcel /> Download Sample Template
                        </button>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="px-6 py-2 rounded-xl text-gray-400 font-bold hover:bg-gray-800 transition-all"
                            >
                                Cancel
                            </button>
                            <label className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-black font-bold rounded-xl cursor-pointer transition-all shadow-lg shadow-cyan-600/20">
                                Select File
                                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => {
                                    toast.info("Importing processing feature coming soon...");
                                    setShowImportModal(false);
                                }} />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <Layout activePage="HR & Manpower">
            {showImportModal && <ImportOverviewModal />}
            <div className="space-y-6 animate-fade-in pb-10">
                {/* Header */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">All <span className="text-cyan-500">Employees</span></h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                            Showing <span className="text-white">{(pagination.currentPage - 1) * 10 + 1}-{Math.min(pagination.currentPage * 10, pagination.totalEmployees)}</span> of <span className="text-white">{pagination.totalEmployees}</span>
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {canCreate && (
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="bg-[#1a1f24] hover:bg-[#252a30] text-gray-400 hover:text-white px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border border-gray-800 flex items-center gap-2 shadow-sm"
                            >
                                <FaFileUpload className="text-blue-500" /> Import
                            </button>
                        )}
                        <button
                            onClick={handleExportExcel}
                            className="bg-[#1a1f24] hover:bg-[#252a30] text-gray-400 hover:text-white px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border border-gray-800 flex items-center gap-2 shadow-sm"
                        >
                            <FaFileExcel className="text-green-500" /> Excel
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="bg-[#1a1f24] hover:bg-[#252a30] text-gray-400 hover:text-white px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border border-gray-800 flex items-center gap-2 shadow-sm"
                        >
                            <FaFilePdf className="text-red-500" /> PDF
                        </button>
                        {canCreate && (
                            <button
                                onClick={() => navigate("/hr/employee/add")}
                                className="bg-cyan-500 hover:bg-cyan-600 text-black px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                            >
                                <FaPlus /> Add Employee
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-[#131619] p-6 rounded-[2rem] shadow-xl border border-gray-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 items-end">
                        <div className="lg:col-span-1 space-y-2">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Search</label>
                            <div className="relative group">
                                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="NAME / ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-[#1a1f24] border border-gray-800 rounded-xl focus:border-cyan-500/50 outline-none text-white transition-all text-xs font-bold uppercase tracking-wider placeholder:text-gray-700"
                                />
                            </div>
                        </div>

                        {[
                            { label: "Department", value: filters.department, key: "department", options: departments, optKey: "departmentName" },
                            { label: "Designation", value: filters.designation, key: "designation", options: designations, optKey: "name" },
                            { label: "Centre", value: filters.centre, key: "centre", options: centres, optKey: "centreName" }
                        ].map((filter, idx) => (
                            <div key={idx} className="space-y-2">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{filter.label}</label>
                                <select
                                    value={filter.value}
                                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                                    className="w-full px-4 py-3 bg-[#1a1f24] border border-gray-800 rounded-xl focus:border-cyan-500/50 outline-none text-white transition-all text-xs font-bold uppercase tracking-wider appearance-none cursor-pointer text-gray-400"
                                >
                                    <option value="">All {filter.label}s</option>
                                    {filter.options.map(opt => (
                                        <option key={opt._id} value={opt._id}>{opt[filter.optKey]}</option>
                                    ))}
                                </select>
                            </div>
                        ))}

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange("status", e.target.value)}
                                className="w-full px-4 py-3 bg-[#1a1f24] border border-gray-800 rounded-xl focus:border-cyan-500/50 outline-none text-white transition-all text-xs font-bold uppercase tracking-wider appearance-none cursor-pointer text-gray-400"
                            >
                                <option value="">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Resigned">Resigned</option>
                                <option value="Terminated">Terminated</option>
                            </select>
                        </div>

                        <button
                            onClick={handleClearFilters}
                            className="h-[46px] flex items-center justify-center gap-2 bg-gray-800 hover:bg-red-500/20 hover:text-red-500 text-gray-400 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-red-500/20 group"
                        >
                            <FaFilter className="group-hover:text-red-500 transition-colors" /> Clear
                        </button>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-[#131619] rounded-[2rem] shadow-xl border border-gray-800 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div>
                        </div>
                    ) : employees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <FaSearch size={40} className="mb-4 opacity-20" />
                            <p className="font-black uppercase tracking-widest text-sm">No employees found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[#1a1f24]/50 border-b border-gray-800">
                                    <tr>
                                        {["Employee", "Email", "Department", "Designation", "Centre", "Status", "Actions"].map((head, i) => (
                                            <th key={i} className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                {head}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {employees.map((employee) => (
                                        <tr key={employee._id} className="hover:bg-cyan-500/[0.02] transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-700 overflow-hidden flex-shrink-0 group-hover:border-cyan-500/50 transition-colors">
                                                        {employee.profileImage && !employee.profileImage.startsWith('undefined/') ? (
                                                            <img src={employee.profileImage} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-cyan-500">
                                                                {employee.name?.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">
                                                            {employee.name}
                                                        </div>
                                                        <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-0.5">
                                                            {employee.employeeId}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-400 lowercase font-mono">
                                                {employee.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-gray-300">
                                                    <FaBuilding className="text-gray-600" />
                                                    {employee.department?.departmentName || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-800/50 px-2 py-1 rounded">
                                                    {employee.designation?.name || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                                    <FaMapMarkerAlt className="text-gray-600" />
                                                    {employee.primaryCentre?.centreName || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${employee.status === "Active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                                                    {employee.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => navigate(`/hr/employee/letters/${employee._id}`)}
                                                        className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-cyan-500/20 rounded-lg transition-all"
                                                        title="Letters"
                                                    >
                                                        <FaFileAlt size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/hr/employee/view/${employee._id}`)}
                                                        className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-blue-500/20 rounded-lg transition-all"
                                                        title="View"
                                                    >
                                                        <FaEye size={14} />
                                                    </button>
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => navigate(`/hr/employee/edit/${employee._id}`)}
                                                            className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-emerald-500/20 rounded-lg transition-all"
                                                            title="Edit"
                                                        >
                                                            <FaEdit size={14} />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDelete(employee._id)}
                                                            className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-red-500/20 rounded-lg transition-all"
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
                    )}
                </div>

                {/* Mobile Card View (md:hidden) */}
                <div className="md:hidden grid grid-cols-1 gap-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-cyan-500"></div>
                        </div>
                    ) : employees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-[#131619] rounded-2xl border border-gray-800 border-dashed">
                            <p className="text-gray-500 font-bold uppercase text-xs">No employees found</p>
                        </div>
                    ) : (
                        employees.map((employee) => (
                            <div key={employee._id} className="bg-[#131619] rounded-2xl p-5 border border-gray-800 shadow-lg relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${employee.status === "Active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                                        {employee.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-14 h-14 rounded-2xl bg-gray-800 border-2 border-gray-700 overflow-hidden flex-shrink-0 shadow-lg">
                                        {employee.profileImage && !employee.profileImage.startsWith('undefined/') ? (
                                            <img src={employee.profileImage} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-lg font-black text-cyan-500 bg-gray-900">
                                                {employee.name?.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none mb-1">{employee.name}</h3>
                                        <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">{employee.employeeId}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-5">
                                    <div className="bg-black/30 p-3 rounded-xl border border-gray-800/50">
                                        <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Department</div>
                                        <div className="text-xs text-gray-300 font-bold truncate">{employee.department?.departmentName || "N/A"}</div>
                                    </div>
                                    <div className="bg-black/30 p-3 rounded-xl border border-gray-800/50">
                                        <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Role</div>
                                        <div className="text-xs text-gray-300 font-bold truncate">{employee.designation?.name || "N/A"}</div>
                                    </div>
                                    <div className="bg-black/30 p-3 rounded-xl border border-gray-800/50 col-span-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaEnvelope size={10} className="text-gray-600" />
                                            <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Contact</span>
                                        </div>
                                        <div className="text-xs text-gray-300 font-medium truncate font-mono">{employee.email}</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-800">
                                    <button onClick={() => navigate(`/hr/employee/view/${employee._id}`)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold transition-all">
                                        View
                                    </button>
                                    {canEdit && (
                                        <button onClick={() => navigate(`/hr/employee/edit/${employee._id}`)} className="flex-1 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 rounded-lg text-xs font-bold transition-all border border-cyan-500/20">
                                            Edit
                                        </button>
                                    )}
                                    <button onClick={() => navigate(`/hr/employee/letters/${employee._id}`)} className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded-lg text-gray-400 hover:text-white">
                                        <FaFileAlt />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex flex-col md:flex-row items-center justify-between bg-[#131619] px-6 py-4 rounded-xl shadow-sm border border-gray-800 gap-4 transition-all">
                        <div className="flex items-center gap-4">
                            <form onSubmit={handleJumpPage} className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Go to:</span>
                                <input
                                    type="text"
                                    value={jumpPage}
                                    onChange={(e) => setJumpPage(e.target.value)}
                                    placeholder="Pg"
                                    className="w-12 h-10 bg-[#1a1f24] border border-gray-800 rounded-lg text-center text-xs text-white focus:border-cyan-500 outline-none transition-all font-bold"
                                />
                            </form>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                                className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            >
                                <FaChevronLeft size={12} />
                            </button>
                            <div className="flex gap-1 overflow-x-auto max-w-[200px] md:max-w-none no-scrollbar">
                                {renderPageNumbers()}
                            </div>
                            <button
                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                disabled={pagination.currentPage === pagination.totalPages}
                                className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            >
                                <FaChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default EmployeeList;
