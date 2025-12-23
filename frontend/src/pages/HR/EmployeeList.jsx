import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { FaPlus, FaEdit, FaEye, FaSearch, FaFileExcel, FaFilePdf } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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

    const handleExportExcel = () => {
        if (employees.length === 0) {
            toast.warn("No data to export");
            return;
        }

        const exportData = employees.map(emp => ({
            "Employee ID": emp.employeeId,
            "Name": emp.name,
            "Email": emp.email,
            "Department": emp.department?.name || "",
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

    return (
        <Layout activePage="HR & Manpower">
            <div className="space-y-6 animate-fade-in pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Employee List</h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Showing {employees.length} of {pagination.totalEmployees} employees
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleExportExcel}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <FaFileExcel /> Excel
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <FaFilePdf /> PDF
                        </button>
                        <button
                            onClick={() => navigate("/hr/employee/add")}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <FaPlus /> Add
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                        <select
                            value={filters.department}
                            onChange={(e) => handleFilterChange("department", e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        >
                            <option value="">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept._id} value={dept._id}>{dept.name}</option>
                            ))}
                        </select>
                        <select
                            value={filters.designation}
                            onChange={(e) => handleFilterChange("designation", e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        >
                            <option value="">All Designations</option>
                            {designations.map(desig => (
                                <option key={desig._id} value={desig._id}>{desig.name}</option>
                            ))}
                        </select>
                        <select
                            value={filters.centre}
                            onChange={(e) => handleFilterChange("centre", e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        >
                            <option value="">All Centres</option>
                            {centres.map(centre => (
                                <option key={centre._id} value={centre._id}>{centre.centreName}</option>
                            ))}
                        </select>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange("status", e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        >
                            <option value="">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Resigned">Resigned</option>
                            <option value="Terminated">Terminated</option>
                        </select>
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
                                                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {employee.employeeId}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {employee.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {employee.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                    {employee.department?.name || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                    {employee.designation?.name || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                                    {employee.primaryCentre?.centreName || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => navigate(`/hr/employee/view/${employee._id}`)}
                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                        title="View"
                                                    >
                                                        <FaEye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/hr/employee/edit/${employee._id}`)}
                                                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                                        title="Edit"
                                                    >
                                                        <FaEdit size={18} />
                                                    </button>
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
                    <div className="flex items-center justify-between bg-white dark:bg-[#1a1f24] px-6 py-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                            disabled={pagination.currentPage === 1}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Page {pagination.currentPage} of {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                            disabled={pagination.currentPage === pagination.totalPages}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default EmployeeList;
