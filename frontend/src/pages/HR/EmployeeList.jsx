import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { FaPlus, FaEdit, FaEye, FaSearch, FaFileExcel, FaFilePdf, FaTrash, FaChevronLeft, FaChevronRight, FaFileUpload, FaFilter, FaFileAlt, FaIdCard, FaBuilding, FaMapMarkerAlt, FaEnvelope, FaUsers, FaChartPie, FaSun, FaMoon } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import usePermission from "../../hooks/usePermission";
import {
    CartesianGrid,
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import ExcelImportExport from "../../components/common/ExcelImportExport";
import { useTheme } from "../../context/ThemeContext";
import CustomMultiSelect from "../../components/common/CustomMultiSelect";
import { TableRowSkeleton, CardSkeleton } from "../../components/common/Skeleton";

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-[#1a1f24] border border-gray-200 dark:border-gray-700/50 p-4 rounded-[2px] shadow-2xl backdrop-blur-sm">
                <p className="text-gray-900 dark:text-white text-sm font-black mb-2 uppercase tracking-widest border-b border-gray-200 dark:border-gray-800 pb-2">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-3 text-xs font-bold py-1">
                        <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(entry.color,0.5)]" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-gray-600 dark:text-gray-400 uppercase tracking-tight">{entry.name}:</span>
                        <span className="text-gray-900 dark:text-white font-mono ml-auto">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const EmployeeList = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [showImportModal, setShowImportModal] = useState(false);
    const [filters, setFilters] = useState({
        department: [],
        designation: [],
        centre: [],
        status: []
    });
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalEmployees: 0
    });
    const [jumpPage, setJumpPage] = useState("");
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';

    // Permission checks
    const canCreate = usePermission('hrManpower', 'employees', 'create');
    const canEdit = usePermission('hrManpower', 'employees', 'edit');
    const canDelete = usePermission('hrManpower', 'employees', 'delete');

    // Master data for filters
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [centres, setCentres] = useState([]);
    const [allEmployeesDropdown, setAllEmployeesDropdown] = useState([]);


    const fetchAnalytics = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee/analytics`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setAnalyticsLoading(false);
        }
    }, []);

    const fetchMasterData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [deptRes, desigRes, centreRes, empRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/designation`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/hr/employee/dropdown`, { headers })
            ]);

            if (deptRes.ok) setDepartments(await deptRes.json());
            if (desigRes.ok) setDesignations(await desigRes.json());
            if (centreRes.ok) setCentres(await centreRes.json());
            if (empRes.ok) setAllEmployeesDropdown(await empRes.json());
        } catch (error) {
            console.error("Error fetching master data:", error);
        }
    }, []);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                page: pagination.currentPage,
                limit: 10,
                ...(search && { search }),
                ...(filters.department?.length > 0 && { department: filters.department.map(d => d.value).join(",") }),
                ...(filters.designation?.length > 0 && { designation: filters.designation.map(d => d.value).join(",") }),
                ...(filters.centre?.length > 0 && { centre: filters.centre.map(c => c.value).join(",") }),
                ...(filters.status?.length > 0 && { status: filters.status.map(s => s.value).join(",") })
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
    }, [search, filters, pagination.currentPage]);

    useEffect(() => {
        fetchMasterData();
        fetchAnalytics();
    }, [fetchMasterData, fetchAnalytics]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value || [] }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleClearFilters = () => {
        setSearch("");
        setFilters({
            department: [],
            designation: [],
            centre: [],
            status: []
        });
        setPagination(prev => ({ ...prev, currentPage: 1 }));
        toast.info("Filters cleared");
    };

    const employeeColumns = [
        { header: "Employee ID", key: "employeeId" },
        { header: "Name", key: "name" },
        { header: "Email", key: "email" },
        { header: "Phone Number", key: "phoneNumber" },
        { header: "WhatsApp Number", key: "whatsappNumber" },
        { header: "Date of Birth", key: "dateOfBirth" },
        { header: "Gender", key: "gender" },
        { header: "Blood Group", key: "bloodGroup" },
        { header: "Spouse Name", key: "spouseName" },
        { header: "Date of Joining", key: "dateOfJoining" },
        { header: "Department", key: "department" },
        { header: "Designation", key: "designation" },
        { header: "Primary Centre", key: "primaryCentre" },
        { header: "Grade", key: "grade" },
        { header: "Manager", key: "manager" },
        { header: "Employment Type", key: "typeOfEmployment" },
        { header: "Working Hours", key: "workingHours" },
        { header: "Current Salary", key: "currentSalary" },
        { header: "Status", key: "status" },
        { header: "Address", key: "address" },
        { header: "City", key: "city" },
        { header: "State", key: "state" },
        { header: "Pin Code", key: "pinCode" },
        { header: "Aadhar Number", key: "aadharNumber" },
        { header: "PAN Number", key: "panNumber" },
        { header: "Bank Name", key: "bankName" },
        { header: "Branch Name", key: "branchName" },
        { header: "Account Number", key: "accountNumber" },
        { header: "IFSC Code", key: "ifscCode" },
    ];

    const employeeMapping = {
        employeeId: "Employee ID",
        name: "Name",
        email: "Email",
        phoneNumber: "Phone Number",
        whatsappNumber: "WhatsApp Number",
        dateOfBirth: "Date of Birth",
        gender: "Gender",
        bloodGroup: "Blood Group",
        spouseName: "Spouse Name",
        dateOfJoining: "Date of Joining",
        department: "Department",
        designation: "Designation",
        primaryCentre: "Primary Centre",
        grade: "Grade",
        manager: "Manager",
        typeOfEmployment: "Employment Type",
        workingHours: "Working Hours",
        currentSalary: "Current Salary",
        status: "Status",
        address: "Address",
        city: "City",
        state: "State",
        pinCode: "Pin Code",
        aadharNumber: "Aadhar Number",
        panNumber: "PAN Number",
        bankName: "Bank Name",
        branchName: "Branch Name",
        accountNumber: "Account Number",
        ifscCode: "IFSC Code",
    };

    const prepareExportData = (data) => {
        return data.map(emp => ({
            ...emp,
            department: emp.department?.departmentName || "",
            designation: emp.designation?.name || "",
            primaryCentre: emp.primaryCentre?.centreName || "",
            manager: emp.manager?.name || "",
            dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString() : "",
            dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString() : "",
        }));
    };

    const handleExportAllFiltered = async () => {
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                limit: 100000, // Large limit to get all filtered records
                ...(search && { search }),
                ...(filters.department?.length > 0 && { department: filters.department.map(d => d.value).join(",") }),
                ...(filters.designation?.length > 0 && { designation: filters.designation.map(d => d.value).join(",") }),
                ...(filters.centre?.length > 0 && { centre: filters.centre.map(c => c.value).join(",") }),
                ...(filters.status?.length > 0 && { status: filters.status.map(s => s.value).join(",") })
            });

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/hr/employee?${params}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.ok) {
                const data = await response.json();
                return data.employees || [];
            } else {
                toast.error("Failed to fetch data for export");
                return [];
            }
        } catch (error) {
            console.error("Export fetch error:", error);
            toast.error("Error fetching data for export");
            return [];
        }
    };

    const handleBulkDataImport = async (data) => {
        try {
            const processedData = data.map(item => {
                const mapped = {};
                Object.keys(employeeMapping).forEach(key => {
                    const excelHeader = employeeMapping[key];
                    if (item[excelHeader] !== undefined) {
                        mapped[key] = item[excelHeader];
                    }
                });

                // Resolve Reference Names to IDs
                if (mapped.department) {
                    const dept = departments.find(d => d.departmentName?.toLowerCase() === mapped.department.toLowerCase());
                    mapped.department = dept ? dept._id : null;
                }
                if (mapped.designation) {
                    const desig = designations.find(d => d.name?.toLowerCase() === mapped.designation.toLowerCase());
                    mapped.designation = desig ? desig._id : null;
                }
                if (mapped.primaryCentre) {
                    const centre = centres.find(c => c.centreName?.toLowerCase() === mapped.primaryCentre.toLowerCase());
                    mapped.primaryCentre = centre ? centre._id : null;
                }
                if (mapped.manager) {
                    const mgr = allEmployeesDropdown.find(e => e.name?.toLowerCase() === mapped.manager.toLowerCase());
                    mapped.manager = mgr ? mgr._id : null;
                }

                // Format numbers
                if (mapped.workingHours) mapped.workingHours = Number(mapped.workingHours);
                if (mapped.currentSalary) mapped.currentSalary = Number(mapped.currentSalary);

                return mapped;
            });

            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee/bulk/import`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(processedData)
            });

            const result = await response.json();
            if (response.ok) {
                toast.success(result.message);
                fetchEmployees();
                fetchAnalytics();
            } else {
                toast.error(result.message || "Import failed");
                if (result.stats?.failed > 0) {
                    console.error("Import errors:", result.stats.errors);
                }
            }
        } catch (error) {
            console.error("Import error:", error);
            toast.error("Error during import processing");
        }
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
                className={`min-w-[40px] h-10 flex items-center justify-center rounded-[2px] font-medium transition-all ${page === currentPage
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
            <div className="bg-white dark:bg-[#131619] w-full max-w-2xl rounded-[2px] shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transform transition-all">
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/10 rounded-[2px] text-cyan-500">
                            <FaFileUpload size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import Employee Data</h3>
                    </div>
                    <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-white transition-colors">
                        <FaPlus className="rotate-45" size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4 h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="bg-cyan-900/10 border border-cyan-500/20 p-4 rounded-[2px]">
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
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-800/40 rounded-[2px] border border-gray-800/60 group hover:border-cyan-500/30 transition-all">
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

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                        <button className="text-cyan-500 hover:text-cyan-400 text-sm font-bold flex items-center gap-2">
                            <FaFileExcel /> Download Sample Template
                        </button>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="px-6 py-2 rounded-[2px] text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                            >
                                Cancel
                            </button>
                            <label className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-black font-bold rounded-[2px] cursor-pointer transition-all shadow-lg shadow-cyan-600/20">
                                Select File
                                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={() => {
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
        <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
            <Layout activePage="HR & Manpower">
                <div className="p-6 md:p-8 max-w-[1800px] mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                        <div>
                            <h1 className={`text-4xl font-black mb-2 tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                All <span className="text-cyan-500">Employees</span>
                            </h1>
                            <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} font-bold text-[10px] uppercase tracking-[0.3em] flex items-center gap-2`}>
                                Human Resource & Manpower Management
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <button
                                onClick={toggleTheme}
                                className={`p-3 rounded-[2px] border transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${isDarkMode ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500 hover:text-white'}`}
                            >
                                {isDarkMode ? <><FaSun /> Day Mode</> : <><FaMoon /> Night Mode</>}
                            </button>

                            <ExcelImportExport
                                columns={employeeColumns}
                                mapping={employeeMapping}
                                data={employees}
                                onImport={handleBulkDataImport}
                                onExport={handleExportAllFiltered}
                                prepareExportData={prepareExportData}
                                fileName="Employee_List"
                                templateName="Employee_Import_Template"
                                extraButtons={
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={handleExportPDF}
                                            className={`px-5 py-3 rounded-[2px] font-black uppercase text-[10px] tracking-widest transition-all border flex items-center gap-2 shadow-sm ${isDarkMode ? 'bg-[#1a1f24] text-gray-400 border-gray-800 hover:text-white dark:hover:bg-[#252a30]' : 'bg-white text-gray-600 border-gray-200 hover:text-gray-900 hover:bg-gray-100'}`}
                                        >
                                            <FaFilePdf className="text-red-500" /> PDF
                                        </button>
                                        <button
                                            onClick={() => setShowImportModal(true)}
                                            className={`px-5 py-3 rounded-[2px] font-black uppercase text-[10px] tracking-widest transition-all border flex items-center gap-2 shadow-sm ${isDarkMode ? 'bg-[#1a1f24] text-gray-400 border-gray-800 hover:text-white dark:hover:bg-[#252a30]' : 'bg-white text-gray-600 border-gray-200 hover:text-gray-900 hover:bg-gray-100'}`}
                                        >
                                            <FaPlus className="text-cyan-500 rotate-45" /> Import
                                        </button>
                                    </div>
                                }
                            />
                            {canCreate && (
                                <button
                                    onClick={() => navigate("/hr/employee/add")}
                                    className="px-6 py-3 bg-cyan-500 text-black hover:bg-cyan-400 rounded-[2px] shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest"
                                >
                                    <FaPlus /> Add Employee
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Analytics Dashboard */}
                    {!analyticsLoading && analytics && (
                        <div className="space-y-6">
                            {/* Key Stats Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border p-6 rounded-[2px] hover:border-cyan-500/30 transition-all group relative overflow-hidden`}>
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full -mr-12 -mt-12 transition-all group-hover:bg-cyan-500/10"></div>
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <div className="p-2 bg-cyan-500/10 rounded-[2px]">
                                            <FaUsers className="text-cyan-500 text-xl" />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Live Force</span>
                                    </div>
                                    <p className={`text-4xl font-black tracking-tighter relative z-10 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {analytics.totalEmployees}
                                    </p>
                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 relative z-10">Total Workforce</p>
                                </div>

                                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border p-6 rounded-[2px] hover:border-cyan-500/30 transition-all group relative overflow-hidden`}>
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full -mr-12 -mt-12 transition-all group-hover:bg-cyan-500/10"></div>
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <div className="p-2 bg-cyan-500/10 rounded-[2px]">
                                            <FaUsers className="text-cyan-500 text-xl" />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Teachers</span>
                                    </div>
                                    <p className="text-4xl font-black text-cyan-500 tracking-tighter relative z-10 bg-gradient-to-br from-cyan-400 to-cyan-600 bg-clip-text text-transparent">
                                        {analytics.teachersCount || 0}
                                    </p>
                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 relative z-10">Educational Staff</p>
                                </div>

                                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border p-6 rounded-[2px] hover:border-emerald-500/30 transition-all group relative overflow-hidden`}>
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 transition-all group-hover:bg-emerald-500/10"></div>
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <div className="p-2 bg-emerald-500/10 rounded-[2px]">
                                            <FaUsers className="text-emerald-500 text-xl" />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Other Staff</span>
                                    </div>
                                    <p className="text-4xl font-black text-emerald-500 tracking-tighter relative z-10 bg-gradient-to-br from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                                        {analytics.staffCount || 0}
                                    </p>
                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 relative z-10">Administrative & Ops</p>
                                </div>

                                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border p-6 rounded-[2px] hover:border-cyan-500/30 transition-all group relative overflow-hidden`}>
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 transition-all group-hover:bg-amber-500/10"></div>
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <div className="p-2 bg-amber-500/10 rounded-[2px]">
                                            <FaMapMarkerAlt className="text-amber-500 text-xl" />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Network</span>
                                    </div>
                                    <p className="text-4xl font-black text-amber-500 tracking-tighter relative z-10 bg-gradient-to-br from-amber-400 to-amber-600 bg-clip-text text-transparent">
                                        {analytics.totalCentres || analytics.centreDistribution.length}
                                    </p>
                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 relative z-10">Total Locations</p>
                                </div>
                            </div>

                            {/* Charts Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {/* Department Distribution Pie Chart */}
                                {/* Department Distribution Bar Chart - Scrollable to show ALL */}
                                <div className="bg-white dark:bg-[#131619] border border-gray-200 dark:border-gray-800 rounded-[2px] p-6 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <FaChartPie className="text-4xl text-cyan-500" />
                                    </div>
                                    <h3 className="text-gray-400 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-cyan-500 rounded-full"></span>
                                        Department Distribution
                                    </h3>
                                    <div className="h-72 w-full overflow-x-auto custom-scrollbar">
                                        <div
                                            className="h-full"
                                            style={{ width: `${Math.max(analytics.departmentDistribution.length * 70, 400)}px` }}
                                        >
                                            <BarChart
                                                width={Math.max(analytics.departmentDistribution.length * 70, 400)}
                                                height={260}
                                                data={analytics.departmentDistribution.map(d => ({
                                                    name: d._id || "Unassigned",
                                                    count: d.count
                                                }))}
                                                barSize={20}
                                                margin={{ top: 10, right: 10, left: -20, bottom: 60 }}
                                            >
                                                <defs>
                                                    <linearGradient id="deptGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
                                                        <stop offset="100%" stopColor="#0891b2" stopOpacity={0.6} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} opacity={0.2} vertical={false} />
                                                <XAxis
                                                    dataKey="name"
                                                    stroke="#9ca3af"
                                                    fontSize={9}
                                                    fontWeight="bold"
                                                    tickLine={true}
                                                    axisLine={true}
                                                    angle={-45}
                                                    textAnchor="end"
                                                    interval={0}
                                                    strokeOpacity={0.4}
                                                />
                                                <YAxis
                                                    stroke="#9ca3af"
                                                    fontSize={9}
                                                    fontWeight="bold"
                                                    tickLine={false}
                                                    axisLine={false}
                                                    strokeOpacity={0.4}
                                                />
                                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                                <Bar dataKey="count" fill="url(#deptGradient)" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </div>
                                    </div>
                                </div>

                                {/* Designation Distribution Bar Chart - Scrollable to show ALL */}
                                <div className="bg-white dark:bg-[#131619] border border-gray-200 dark:border-gray-800 rounded-[2px] p-6 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <FaChartPie className="text-4xl text-emerald-500" />
                                    </div>
                                    <h3 className="text-gray-400 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                                        Designation Distribution
                                    </h3>
                                    <div className="h-72 w-full overflow-x-auto custom-scrollbar">
                                        <div
                                            className="h-full"
                                            style={{ width: `${Math.max(analytics.designationDistribution.length * 60, 400)}px` }}
                                        >
                                            <BarChart
                                                width={Math.max(analytics.designationDistribution.length * 60, 400)}
                                                height={260}
                                                data={analytics.designationDistribution.map(d => ({
                                                    name: d._id || "Unassigned",
                                                    count: d.count
                                                }))}
                                                barSize={20}
                                                margin={{ top: 10, right: 10, left: -20, bottom: 60 }}
                                            >
                                                <defs>
                                                    <linearGradient id="desigGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                                        <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} opacity={0.2} vertical={false} />
                                                <XAxis
                                                    dataKey="name"
                                                    stroke="#9ca3af"
                                                    fontSize={9}
                                                    fontWeight="bold"
                                                    tickLine={true}
                                                    axisLine={true}
                                                    angle={-45}
                                                    textAnchor="end"
                                                    interval={0}
                                                    strokeOpacity={0.4}
                                                />
                                                <YAxis
                                                    stroke="#9ca3af"
                                                    fontSize={9}
                                                    fontWeight="bold"
                                                    tickLine={false}
                                                    axisLine={false}
                                                    strokeOpacity={0.4}
                                                />
                                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                                <Bar dataKey="count" fill="url(#desigGradient)" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </div>
                                    </div>
                                </div>

                                {/* Monthly Joining Trend Area Chart */}
                                <div className="bg-white dark:bg-[#131619] border border-gray-200 dark:border-gray-800 rounded-[2px] p-6 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <FaUsers className="text-4xl text-blue-500" />
                                    </div>
                                    <h3 className="text-gray-400 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                                        Monthly Joining Trend
                                    </h3>
                                    <div className="h-72 w-full">
                                        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={100}>
                                            <AreaChart data={analytics.monthlyJoiningTrend.map(m => ({
                                                name: `${m._id.month}/${m._id.year}`,
                                                count: m.count
                                            }))}>
                                                <defs>
                                                    <linearGradient id="colorJoining" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area type="monotone" dataKey="count" stroke="#06b6d4" fillOpacity={1} fill="url(#colorJoining)" strokeWidth={2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Centre Distribution Bar Chart - Left Side */}
                                <div className="bg-white dark:bg-[#131619] border border-gray-200 dark:border-gray-800 rounded-[2px] p-6 shadow-xl lg:col-span-2 overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <FaMapMarkerAlt className="text-6xl text-amber-500" />
                                    </div>
                                    <h3 className="text-gray-400 font-black uppercase tracking-widest text-xs mb-8 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
                                        Geographic Distribution
                                    </h3>
                                    <div className="h-80 w-full overflow-x-auto custom-scrollbar">
                                        <div
                                            className="h-full"
                                            style={{ width: `${Math.max(analytics.centreDistribution.length * 80, 600)}px` }}
                                        >
                                            <BarChart
                                                width={Math.max(analytics.centreDistribution.length * 80, 600)}
                                                height={300}
                                                data={analytics.centreDistribution.map(c => ({
                                                    name: c._id || "Unassigned",
                                                    count: c.count
                                                }))}
                                                barSize={32}
                                                margin={{ top: 20, right: 30, left: 10, bottom: 80 }}
                                            >
                                                <defs>
                                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                                                        <stop offset="100%" stopColor="#d97706" stopOpacity={0.6} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} opacity={0.2} vertical={false} />
                                                <XAxis
                                                    dataKey="name"
                                                    stroke="#9ca3af"
                                                    fontSize={10}
                                                    fontWeight="bold"
                                                    tickLine={true}
                                                    axisLine={true}
                                                    angle={-45}
                                                    textAnchor="end"
                                                    interval={0}
                                                    strokeOpacity={0.4}
                                                />
                                                <YAxis
                                                    stroke="#9ca3af"
                                                    fontSize={10}
                                                    fontWeight="bold"
                                                    tickLine={false}
                                                    axisLine={false}
                                                    strokeOpacity={0.4}
                                                />
                                                <Tooltip
                                                    content={<CustomTooltip />}
                                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                                />
                                                <Bar dataKey="count" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Employment Breakdown */}
                                <div className="bg-white dark:bg-[#131619] border border-gray-200 dark:border-gray-800 rounded-[2px] p-6 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <FaUsers className="text-4xl text-cyan-500" />
                                    </div>
                                    <h3 className="text-gray-400 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-cyan-500 rounded-full"></span>
                                        Teacher Breakdown (FT/PT)
                                    </h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={100}>
                                            <PieChart>
                                                <Pie
                                                    data={analytics.teacherStaffEmployment?.filter(d => d._id.isTeacher).map(d => ({
                                                        name: (d._id.employment || "Full-time").toUpperCase(),
                                                        value: d.count
                                                    })) || []}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={70}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {(analytics.teacherStaffEmployment?.filter(d => d._id.isTeacher) || []).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={['#06b6d4', '#0ea5e9', '#3b82f6'][index % 3]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-[#131619] border border-gray-200 dark:border-gray-800 rounded-[2px] p-6 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <FaUsers className="text-4xl text-emerald-500" />
                                    </div>
                                    <h3 className="text-gray-400 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                                        Admin Staff Breakdown
                                    </h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={100}>
                                            <PieChart>
                                                <Pie
                                                    data={analytics.teacherStaffEmployment?.filter(d => !d._id.isTeacher).map(d => ({
                                                        name: (d._id.employment || "Regular").toUpperCase(),
                                                        value: d.count
                                                    })) || []}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={70}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {(analytics.teacherStaffEmployment?.filter(d => !d._id.isTeacher) || []).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={['#10b981', '#059669', '#34d399'][index % 3]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Demographics Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {/* Gender Distribution Pie Chart */}
                                <div className="bg-white dark:bg-[#131619] border border-gray-200 dark:border-gray-800 rounded-[2px] p-6 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <FaUsers className="text-4xl text-pink-500" />
                                    </div>
                                    <h3 className="text-gray-400 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-pink-500 rounded-full"></span>
                                        Gender Stats
                                    </h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={100}>
                                            <PieChart>
                                                <Pie
                                                    data={analytics.genderDistribution.map(d => ({ name: d._id || 'Not Specified', value: d.count }))}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {analytics.genderDistribution.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={['#ec4899', '#3b82f6', '#9ca3af'][index % 3]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* State Distribution Pie Chart */}
                                <div className="bg-white dark:bg-[#131619] border border-gray-200 dark:border-gray-800 rounded-[2px] p-6 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <FaMapMarkerAlt className="text-4xl text-orange-500" />
                                    </div>
                                    <h3 className="text-gray-400 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                                        State Wise
                                    </h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={100}>
                                            <PieChart>
                                                <Pie
                                                    data={analytics.stateDistribution?.map(d => ({ name: d._id || 'Unknown', value: d.count })) || []}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {(analytics.stateDistribution || []).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={['#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4'][index % 5]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* City Distribution Pie Chart */}
                                <div className="bg-white dark:bg-[#131619] border border-gray-200 dark:border-gray-800 rounded-[2px] p-6 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <FaBuilding className="text-4xl text-indigo-500" />
                                    </div>
                                    <h3 className="text-gray-400 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                                        City Wise
                                    </h3>
                                    <div className="h-64 w-full overflow-y-auto custom-scrollbar">
                                        <div className="h-[300px] w-full min-w-[300px]">
                                            <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={100}>
                                                <PieChart>
                                                    <Pie
                                                        data={analytics.cityDistribution?.map(d => ({ name: d._id || 'Unknown', value: d.count })) || []}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {(analytics.cityDistribution || []).map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#d946ef', '#0ea5e9', '#14b8a6'][index % 5]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend
                                                        layout="vertical"
                                                        verticalAlign="middle"
                                                        align="right"
                                                        wrapperStyle={{ fontSize: '10px', paddingLeft: '10px' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border p-8 space-y-6 rounded-[2px]`}>
                        <div className="flex items-center gap-3">
                            <span className="p-2 bg-cyan-500/10 text-cyan-500 rounded-[2px]">
                                <FaFilter size={12} />
                            </span>
                            <h3 className={`text-[12px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Organizational Filters</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                            <div className="space-y-2">
                                <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Search</label>
                                <div className="relative group">
                                    <FaSearch className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-600 group-focus-within:text-cyan-500' : 'text-gray-400 group-focus-within:text-cyan-600'} transition-colors`} />
                                    <input
                                        type="text"
                                        placeholder="NAME / ID..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className={`w-full pl-10 pr-4 py-3 bg-transparent border rounded-[2px] transition-all text-xs font-bold uppercase tracking-wider placeholder:text-gray-700 outline-none ${isDarkMode ? 'text-white border-gray-800 focus:border-cyan-500/50' : 'text-gray-900 border-gray-200 focus:border-cyan-500/50'}`}
                                    />
                                </div>
                            </div>

                            {[
                                { label: "Department", value: filters.department, key: "department", options: departments.map(d => ({ value: d._id, label: d.departmentName?.toUpperCase() || "" })) },
                                { label: "Designation", value: filters.designation, key: "designation", options: designations.map(d => ({ value: d._id, label: d.name?.toUpperCase() || "" })) },
                                { label: "Centre", value: filters.centre, key: "centre", options: centres.map(c => ({ value: c._id, label: c.centreName?.toUpperCase() || "" })) }
                            ].map((filter, idx) => (
                                <div key={idx} className="space-y-2">
                                    <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{filter.label}</label>
                                    <CustomMultiSelect
                                        placeholder={`ALL ${filter.label.toUpperCase()}S`}
                                        options={filter.options}
                                        value={filter.value}
                                        onChange={(val) => handleFilterChange(filter.key, val)}
                                    />
                                </div>
                            ))}

                            <div className="space-y-2">
                                <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Status</label>
                                <CustomMultiSelect
                                    placeholder="ALL STATUS"
                                    options={[
                                        { value: "Active", label: "ACTIVE" },
                                        { value: "Inactive", label: "INACTIVE" },
                                        { value: "Resigned", label: "RESIGNED" },
                                        { value: "Terminated", label: "TERMINATED" }
                                    ]}
                                    value={filters.status}
                                    onChange={(val) => handleFilterChange("status", val)}
                                />
                            </div>




                            <div className="flex items-end">
                                <button
                                    onClick={handleClearFilters}
                                    className={`w-full h-[41px] flex items-center justify-center gap-2 border rounded-[2px] text-[10px] font-black uppercase tracking-widest transition-all group ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-red-500 hover:border-red-500/50' : 'bg-gray-100 border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-500/50'}`}
                                >
                                    <FaFilter className="group-hover:text-red-500 transition-colors" size={10} /> Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-[2px] overflow-hidden transition-all`}>
                        {loading ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={`${isDarkMode ? 'bg-[#0a0a0b] border-gray-800' : 'bg-gray-50 border-gray-200'} border-b`}>
                                            <th className={`px-6 py-5 text-left text-[9px] font-black uppercase tracking-widest w-16 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>S/N</th>
                                            {["Employee Structure", "Contact Vector", "Operational Unit", "Designation", "Centre Unit", "Status", "Manual Overrides"].map((head, i) => (
                                                <th key={i} className={`px-6 py-5 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {head}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                                        {[...Array(10)].map((_, i) => (
                                            <TableRowSkeleton key={i} isDarkMode={isDarkMode} columns={8} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : employees.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-4">
                                <FaSearch size={30} className="opacity-20" />
                                <p className="font-black uppercase tracking-[0.2em] text-[10px]">No active employee vectors found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full">
                                    <thead>
                                        <tr className={`${isDarkMode ? 'bg-[#0a0a0b] border-gray-800' : 'bg-gray-50 border-gray-200'} border-b`}>
                                            <th className={`px-6 py-5 text-left text-[9px] font-black uppercase tracking-widest w-16 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>S/N</th>
                                            {["Employee Structure", "Contact Vector", "Operational Unit", "Designation", "Centre Unit", "Status", "Manual Overrides"].map((head, i) => (
                                                <th key={i} className={`px-6 py-5 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {head}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                                        {employees.map((employee, index) => (
                                            <tr key={employee._id} className={`${isDarkMode ? 'hover:bg-cyan-500/5' : 'hover:bg-gray-50'} transition-all group cursor-pointer`}>
                                                <td className={`px-6 py-4 text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {(pagination.currentPage - 1) * 10 + index + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-[2px] border overflow-hidden flex-shrink-0 transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 group-hover:border-cyan-500/50' : 'bg-gray-100 border-gray-300 group-hover:border-cyan-500/50'}`}>
                                                            {employee.profileImage && !employee.profileImage.startsWith('undefined/') ? (
                                                                <img src={employee.profileImage} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[11px] font-black text-cyan-500 uppercase">
                                                                    {employee.name?.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className={`text-[11px] font-black uppercase tracking-tight transition-all ${isDarkMode ? 'text-white group-hover:text-cyan-400' : 'text-gray-900 group-hover:text-cyan-600'}`}>
                                                                {employee.name}
                                                            </div>
                                                            <div className="text-[8px] font-bold text-gray-500 uppercase mt-1 tracking-wider">
                                                                {employee.employeeId}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{employee.email}</div>
                                                    <div className="text-[9px] font-black text-cyan-500 uppercase tracking-widest mt-0.5">{employee.phoneNumber || "NO CONTACT"}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        <FaBuilding className="text-cyan-500/50" size={10} />
                                                        {employee.department?.departmentName || "N/A"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-[2px] inline-block ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                                        {employee.designation?.name || "N/A"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`text-[10px] font-black uppercase tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        <FaMapMarkerAlt className="text-cyan-500/50" size={10} />
                                                        {employee.primaryCentre?.centreName || "N/A"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1 rounded-[2px] text-[8px] font-black uppercase tracking-widest border ${employee.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                                                        {employee.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => navigate(`/hr/employee/letters/${employee._id}`)}
                                                            className={`p-2 rounded-[2px] transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-cyan-500/20' : 'bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-cyan-100'}`}
                                                            title="Letters"
                                                        >
                                                            <FaFileAlt size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/hr/employee/view/${employee._id}`)}
                                                            className={`p-2 rounded-[2px] transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-blue-500/20' : 'bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-blue-100'}`}
                                                            title="View"
                                                        >
                                                            <FaEye size={12} />
                                                        </button>
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => navigate(`/hr/employee/edit/${employee._id}`)}
                                                                className={`p-2 rounded-[2px] transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-emerald-500/20' : 'bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-emerald-100'}`}
                                                                title="Edit"
                                                            >
                                                                <FaEdit size={12} />
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => handleDelete(employee._id)}
                                                                className={`p-2 rounded-[2px] transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-red-500 hover:bg-red-500/10' : 'bg-gray-100 text-gray-500 hover:text-red-600 hover:bg-red-100'}`}
                                                                title="Delete"
                                                            >
                                                                <FaTrash size={12} />
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
                            <div className="grid grid-cols-1 gap-4">
                                {[...Array(6)].map((_, i) => (
                                    <CardSkeleton key={i} isDarkMode={isDarkMode} />
                                ))}
                            </div>
                        ) : employees.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#131619] rounded-[2px] border border-gray-200 dark:border-gray-800 border-dashed">
                                <p className="text-gray-500 dark:text-gray-300 text-sm uppercase">No employees found</p>
                            </div>
                        ) : (
                            employees.map((employee) => (
                                <div key={employee._id} className="bg-[#131619] rounded-[2px] p-5 border border-gray-800 shadow-lg relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${employee.status === "Active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                                            {employee.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-14 h-14 rounded-[2px] bg-gray-800 border-2 border-gray-700 overflow-hidden flex-shrink-0 shadow-lg">
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
                                        <div className="bg-black/30 p-3 rounded-[2px] border border-gray-800/50">
                                            <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Department</div>
                                            <div className="text-xs text-gray-300 font-bold truncate">{employee.department?.departmentName || "N/A"}</div>
                                        </div>
                                        <div className="bg-black/30 p-3 rounded-[2px] border border-gray-800/50">
                                            <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Role</div>
                                            <div className="text-xs text-gray-300 font-bold truncate">{employee.designation?.name || "N/A"}</div>
                                        </div>
                                        <div className="bg-black/30 p-3 rounded-[2px] border border-gray-800/50 col-span-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <FaEnvelope size={10} className="text-gray-600" />
                                                <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Contact</span>
                                            </div>
                                            <div className="text-xs text-gray-300 font-medium truncate font-mono">{employee.email}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-800">
                                        <button onClick={() => navigate(`/hr/employee/view/${employee._id}`)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-[2px] text-xs font-bold transition-all">
                                            View
                                        </button>
                                        {canEdit && (
                                            <button onClick={() => navigate(`/hr/employee/edit/${employee._id}`)} className="flex-1 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 rounded-[2px] text-xs font-bold transition-all border border-cyan-500/20">
                                                Edit
                                            </button>
                                        )}
                                        <button onClick={() => navigate(`/hr/employee/letters/${employee._id}`)} className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded-[2px] text-gray-400 hover:text-white">
                                            <FaFileAlt />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className={`flex flex-col md:flex-row items-center justify-between px-6 py-4 rounded-[2px] border gap-4 transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <div className="flex items-center gap-4">
                                <form onSubmit={handleJumpPage} className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Jump:</span>
                                    <input
                                        type="text"
                                        value={jumpPage}
                                        onChange={(e) => setJumpPage(e.target.value)}
                                        placeholder="PG"
                                        className={`w-12 h-10 border rounded-[2px] text-center text-xs outline-none transition-all font-bold ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                    />
                                </form>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                                    disabled={pagination.currentPage === 1}
                                    className={`w-10 h-10 flex items-center justify-center rounded-[2px] transition-all ${isDarkMode ? 'text-gray-500 hover:bg-gray-800 hover:text-white disabled:opacity-10' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30'}`}
                                >
                                    <FaChevronLeft size={12} />
                                </button>
                                <div className="flex gap-1 overflow-x-auto max-w-[200px] md:max-w-none no-scrollbar">
                                    {renderPageNumbers()}
                                </div>
                                <button
                                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                                    disabled={pagination.currentPage === pagination.totalPages}
                                    className={`w-10 h-10 flex items-center justify-center rounded-[2px] transition-all ${isDarkMode ? 'text-gray-500 hover:bg-gray-800 hover:text-white disabled:opacity-10' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30'}`}
                                >
                                    <FaChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                    )}
                    {showImportModal && <ImportOverviewModal />}
                </div>
            </Layout>
        </div>
    );
};

export default EmployeeList;
