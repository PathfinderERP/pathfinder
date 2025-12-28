import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { FaPlus, FaEdit, FaEye, FaSearch, FaFileExcel, FaFilePdf, FaTrash, FaChevronLeft, FaChevronRight, FaFileUpload, FaFilter, FaFileAlt } from "react-icons/fa";
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
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : page === "..."
                        ? "text-gray-500 cursor-default"
                        : "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-[#252a30] hover:text-blue-600 dark:hover:text-white"
                    }`}
            >
                {page}
            </button>
        ));
    };

    const ImportOverviewModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#1a1f24] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transform transition-all">
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/10 rounded-lg text-blue-600">
                            <FaFileUpload size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Import Employee Data</h3>
                    </div>
                    <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                        <FaPlus className="rotate-45" size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4 h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl">
                            <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                                To ensure successful import, your Excel file must follow the specific column headers and data formats listed below.
                                <span className="block mt-1 font-bold">Note: All column names are Case-Insensitive.</span>
                            </p>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-1 gap-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Required Column Mapping</h4>
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
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800/60 group hover:border-blue-500/30 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-1.5 h-1.5 rounded-full ${item.req ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-gray-400'}`}></div>
                                                <span className="font-bold text-gray-800 dark:text-gray-200">{item.col}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400 italic font-medium">{item.format}</span>
                                                <span className="text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md font-bold">{item.example}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl mt-4">
                                <h4 className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">
                                    <FaFilter size={10} /> Pro Tip
                                </h4>
                                <p className="text-[11px] text-orange-800/80 dark:text-orange-300/80 leading-relaxed italic">
                                    Make sure all "Master Data" entries (Departments, Designations, Centres) exist in the system <strong>before</strong> importing. If the names don't match exactly, those records will be skipped to prevent data corruption.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center gap-2">
                            <FaFileExcel /> Download Sample Template
                        </button>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="px-6 py-2 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                            >
                                Cancel
                            </button>
                            <label className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition-all shadow-lg shadow-blue-500/20">
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Employee List</h1>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Showing <span className="text-gray-900 dark:text-white font-bold">{(pagination.currentPage - 1) * 10 + 1} to {Math.min(pagination.currentPage * 10, pagination.totalEmployees)}</span> of <span className="text-gray-900 dark:text-white font-bold">{pagination.totalEmployees}</span> employees
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        {canCreate && (
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="bg-[#1a1f24] hover:bg-[#252a30] text-gray-300 px-4 py-2.5 rounded-xl font-bold transition-all border border-gray-800 flex items-center gap-2 shadow-sm"
                            >
                                <FaFileUpload className="text-blue-400" /> Import
                            </button>
                        )}
                        <button
                            onClick={handleExportExcel}
                            className="bg-green-600/10 hover:bg-green-600/20 text-green-600 px-4 py-2.5 rounded-xl font-bold transition-all border border-green-600/20 flex items-center gap-2"
                        >
                            <FaFileExcel /> Excel
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="bg-red-600/10 hover:bg-red-600/20 text-red-600 px-4 py-2.5 rounded-xl font-bold transition-all border border-red-600/20 flex items-center gap-2"
                        >
                            <FaFilePdf /> PDF
                        </button>
                        {canCreate && (
                            <button
                                onClick={() => navigate("/hr/employee/add")}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
                            >
                                <FaPlus /> Add Employee
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-[#1a1f24] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                        <div className="lg:col-span-1 space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Search</label>
                            <div className="relative group">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Name, ID, Email..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Department</label>
                            <select
                                value={filters.department}
                                onChange={(e) => handleFilterChange("department", e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all text-sm appearance-none cursor-pointer"
                            >
                                <option value="">All Departments</option>
                                {departments.map(dept => (
                                    <option key={dept._id} value={dept._id}>{dept.departmentName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Designation</label>
                            <select
                                value={filters.designation}
                                onChange={(e) => handleFilterChange("designation", e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all text-sm appearance-none cursor-pointer"
                            >
                                <option value="">All Designations</option>
                                {designations.map(desig => (
                                    <option key={desig._id} value={desig._id}>{desig.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Centre</label>
                            <select
                                value={filters.centre}
                                onChange={(e) => handleFilterChange("centre", e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all text-sm appearance-none cursor-pointer"
                            >
                                <option value="">All Centres</option>
                                {centres.map(centre => (
                                    <option key={centre._id} value={centre._id}>{centre.centreName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange("status", e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all text-sm appearance-none cursor-pointer"
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
                            className="h-10 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-gray-300 dark:hover:border-gray-600 group"
                        >
                            <FaFilter className="group-hover:text-blue-500 transition-colors" /> Clear
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-[#1a1f24] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : employees.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-gray-500">
                            No employees found
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Employee ID
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Department
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Designation
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Centre
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {employees.map((employee) => (
                                        <tr
                                            key={employee._id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`w-2 h-2 rounded-full mr-2 ${employee.status === "Active" ? "bg-green-500" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`}></div>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {employee.employeeId}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0">
                                                        {employee.profileImage && !employee.profileImage.startsWith('undefined/') ? (
                                                            <img src={employee.profileImage} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-blue-500">
                                                                {employee.name?.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white uppercase">
                                                        {employee.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 lowercase">
                                                {employee.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full text-[11px] font-bold">
                                                    {employee.department?.departmentName || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-full text-[11px] font-bold">
                                                    {employee.designation?.name || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 rounded-full text-[11px] font-bold">
                                                    {employee.primaryCentre?.centreName || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => navigate(`/hr/employee/letters/${employee._id}`)}
                                                        className="p-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-500/10 rounded-lg transition-all"
                                                        title="Letters"
                                                    >
                                                        <FaFileAlt size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/hr/employee/view/${employee._id}`)}
                                                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-500/10 rounded-lg transition-all"
                                                        title="View"
                                                    >
                                                        <FaEye size={16} />
                                                    </button>
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => navigate(`/hr/employee/edit/${employee._id}`)}
                                                            className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 bg-green-500/10 rounded-lg transition-all"
                                                            title="Edit"
                                                        >
                                                            <FaEdit size={16} />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDelete(employee._id)}
                                                            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-red-500/10 rounded-lg transition-all"
                                                            title="Delete"
                                                        >
                                                            <FaTrash size={16} />
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

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-[#1a1f24] px-6 py-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 gap-4 transition-all">
                        <div className="flex items-center gap-4">
                            {/* Jump to Page */}
                            <form onSubmit={handleJumpPage} className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 font-medium">Go to:</span>
                                <input
                                    type="text"
                                    value={jumpPage}
                                    onChange={(e) => setJumpPage(e.target.value)}
                                    placeholder="Pg"
                                    className="w-12 h-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </form>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Previous Button */}
                            <button
                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                                className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-[#252a30] hover:text-blue-600 dark:hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            >
                                <FaChevronLeft size={14} />
                            </button>

                            {/* Page Numbers */}
                            {renderPageNumbers()}

                            {/* Next Button */}
                            <button
                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                disabled={pagination.currentPage === pagination.totalPages}
                                className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-[#252a30] hover:text-blue-600 dark:hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            >
                                <FaChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default EmployeeList;
