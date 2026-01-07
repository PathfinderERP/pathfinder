import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaChevronDown, FaMoneyBillWave, FaFileInvoiceDollar } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";

const MultiSelectDropdown = ({ label, options, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (option) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onChange(newSelected);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full md:w-48 px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs font-bold text-gray-300 uppercase tracking-wider hover:border-purple-500/50 transition-colors"
                type="button"
            >
                <span className="truncate">{selected.length > 0 ? `${selected.length} ${label} Selected` : `Select ${label}`}</span>
                <FaChevronDown className={`ml-2 transform transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-64 mt-2 bg-[#1a1f24] border border-gray-700 rounded-xl shadow-2xl p-2 max-h-60 overflow-y-auto">
                    {options.length === 0 ? (
                        <div className="p-2 text-center text-gray-500 text-xs">No options found</div>
                    ) : (
                        options.map((option) => (
                            <div
                                key={option}
                                onClick={() => toggleOption(option)}
                                className="flex items-center gap-3 p-2 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors group"
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selected.includes(option) ? "bg-purple-500 border-purple-500" : "border-gray-600 group-hover:border-purple-400"}`}>
                                    {selected.includes(option) && <span className="text-white text-[10px]">✓</span>}
                                </div>
                                <span className="text-gray-300 text-xs font-medium">{option}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const PayEmployee = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Filter States
    const [filters, setFilters] = useState({
        departments: [],
        designations: [],
        centres: [],
        months: [], // Although month/year are mostly for processing, user might want to filter "who was paid in X" - but usually this list is "Who TO Pay". 
        // The prompt implies "Total all the employees details will be appear with all the filters...". 
        // Let's list ALL active employees primarily.
        years: []
    });

    // Options
    const [options, setOptions] = useState({
        departments: [],
        designations: [],
        centres: []
    });

    useEffect(() => {
        fetchOptions();
        fetchEmployees();
    }, [currentPage, searchTerm, filters]); // Fetch on changes

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem("token");
            const [deptRes, desigRes, centreRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/master-data/department`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${import.meta.env.VITE_API_URL}/master-data/designation`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${import.meta.env.VITE_API_URL}/master-data/centre`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const depts = deptRes.ok ? await deptRes.json() : [];
            const desigs = desigRes.ok ? await desigRes.json() : [];
            const centres = centreRes.ok ? await centreRes.json() : [];

            setOptions({
                departments: depts.map(d => d.departmentName),
                designations: desigs.map(d => d.name),
                centres: centres.map(c => c.centreName)
            });

        } catch (error) {
            console.error("Error fetching options:", error);
        }
    };

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                page: currentPage,
                limit: 10,
                search: searchTerm,
                departments: filters.departments.join(","),
                designations: filters.designations.join(","),
                centres: filters.centres.join(",")
            });

            // Re-use HR employee fetch or create a dedicated one for Payroll?
            // Re-using HR `getEmployees` might be okay if it supports these filters.
            // But usually Payroll needs specific Salary info upfront. 
            // Better to create a dedicated endpoint: /api/finance/payroll/employees
            const response = await fetch(`${import.meta.env.VITE_API_URL}/finance/payroll/employees?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await response.json();
            if (response.ok) {
                setEmployees(data.employees);
                setTotalPages(data.totalPages);
                setTotalItems(data.totalItems);
            } else {
                toast.error(data.message || "Failed to fetch employees");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    const handleProceed = (employeeId) => {
        navigate(`/finance/pay-employee/${employeeId}`);
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 space-y-6">
                <ToastContainer position="top-right" theme="dark" />

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="p-2 bg-green-500/10 rounded-lg text-green-400">
                                <FaMoneyBillWave size={24} />
                            </span>
                            Pay Employee
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">Process monthly salary payments and generate payslips</p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-[#1a1f24] p-4 rounded-2xl border border-gray-800 space-y-4 shadow-xl">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-64 group">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-green-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search Employee..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-gray-900/50 border border-gray-700 text-white pl-12 pr-4 py-2 rounded-xl focus:outline-none focus:border-green-500/50 transition-all text-xs font-medium"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 items-center">
                            <MultiSelectDropdown
                                label="Department"
                                options={options.departments}
                                selected={filters.departments}
                                onChange={(vals) => setFilters({ ...filters, departments: vals })}
                            />
                            <MultiSelectDropdown
                                label="Designation"
                                options={options.designations}
                                selected={filters.designations}
                                onChange={(vals) => setFilters({ ...filters, designations: vals })}
                            />
                            <MultiSelectDropdown
                                label="Centre"
                                options={options.centres}
                                selected={filters.centres}
                                onChange={(vals) => setFilters({ ...filters, centres: vals })}
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-900/50 border-b border-gray-800">
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Employee Details</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Designation</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Department</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Centre</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Loading Employees...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : employees.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">No employees found</td>
                                    </tr>
                                ) : (
                                    employees.map((emp) => (
                                        <tr key={emp._id} className="hover:bg-green-500/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-bold overflow-hidden border border-gray-700">
                                                        {emp.profileImage ? (
                                                            <img src={emp.profileImage} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            emp.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-white font-bold text-sm tracking-tight">{emp.name}</div>
                                                        <div className="text-gray-500 text-[10px] uppercase font-mono tracking-wider">{emp.employeeId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 text-xs">{emp.designation?.name || "N/A"}</td>
                                            <td className="px-6 py-4 text-gray-400 text-xs">{emp.department?.departmentName || "N/A"}</td>
                                            <td className="px-6 py-4 text-gray-400 text-xs">{emp.primaryCentre?.centreName || "N/A"}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${emp.status === "Active" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                                                    {emp.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleProceed(emp._id)}
                                                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ml-auto shadow-lg shadow-green-500/20"
                                                >
                                                    Proceed <FaFileInvoiceDollar />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="p-4 border-t border-gray-800 bg-gray-900/30 flex justify-between items-center">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold uppercase disabled:opacity-50 hover:bg-gray-700 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold uppercase disabled:opacity-50 hover:bg-gray-700 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default PayEmployee;
