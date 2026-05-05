import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaChevronDown, FaMoneyBillWave, FaFileInvoiceDollar } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

const MultiSelectDropdown = ({ label, options, selected, onChange }) => {
    const { isDarkMode } = useTheme();
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
                className={`flex items-center justify-between w-full md:w-56 px-5 py-3 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400 hover:border-purple-500/50' : 'bg-white border-gray-200 text-gray-600 hover:border-purple-500/50 shadow-sm'}`}
                type="button"
            >
                <span className="truncate">{selected.length > 0 ? `${selected.length} ${label} Selected` : `Select ${label}`}</span>
                <FaChevronDown className={`ml-2 transform transition-transform duration-300 ${isOpen ? "rotate-180 text-purple-500" : ""}`} />
            </button>

            {isOpen && (
                <div className={`absolute z-[100] w-72 mt-2 border rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-3 max-h-72 overflow-y-auto animate-in slide-in-from-top-2 duration-300 ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-100'}`}>
                    {options.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-[10px] font-black uppercase tracking-widest italic">No nodes found</div>
                    ) : (
                        options.map((option) => (
                            <div
                                key={option}
                                onClick={() => toggleOption(option)}
                                className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all group ${isDarkMode ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-purple-500/[0.03] text-gray-700'}`}
                            >
                                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${selected.includes(option) ? "bg-purple-600 border-purple-600 shadow-lg shadow-purple-600/30" : (isDarkMode ? 'border-gray-700 group-hover:border-purple-500' : 'border-gray-200 group-hover:border-purple-500 shadow-inner')}`}>
                                    {selected.includes(option) && <span className="text-white text-[10px] font-black">✓</span>}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${selected.includes(option) ? 'text-purple-500' : ''}`}>{option}</span>
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
    const { isDarkMode } = useTheme();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
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
        months: [], 
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
    }, [currentPage, searchTerm, filters]);

    const fetchOptions = async () => {
        try {
            const token = localStorage.getItem("token");
            const [deptRes, desigRes, centreRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${import.meta.env.VITE_API_URL}/designation`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const depts = deptRes.ok ? await deptRes.json() : [];
            const desigs = desigRes.ok ? await desigRes.json() : [];
            const centres = centreRes.ok ? await centreRes.json() : [];

            setOptions({
                departments: [...new Set(depts.map(d => d.departmentName))],
                designations: [...new Set(desigs.map(d => d.name))],
                centres: [...new Set(centres
                    .filter(c =>
                        user.role === 'superAdmin' ||
                        (user.centres && user.centres.some(uc => uc._id === c._id || uc.centreName === c.centreName))
                    )
                    .map(c => c.centreName))]
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
            <div className={`p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20 transition-all duration-500 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
                    <div>
                        <h1 className={`text-4xl font-black italic uppercase tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Pay <span className="text-purple-500">Employee</span>
                        </h1>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest italic">
                            Authorized Payroll Disbursal & Fiscal Control
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className={`p-8 rounded-[2rem] border space-y-6 shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                        <div className="relative w-full lg:w-96 group">
                            <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors duration-300" />
                            <input
                                type="text"
                                placeholder="IDENTIFY EMPLOYEE NODE..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full border py-3.5 rounded-2xl focus:outline-none transition-all text-[11px] font-black uppercase tracking-widest pl-14 pr-6 ${isDarkMode ? 'bg-white/5 border-gray-800 text-white focus:border-purple-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500/50 shadow-inner'}`}
                            />
                        </div>

                        <div className="flex flex-wrap gap-4 items-center justify-center lg:justify-end w-full">
                            <MultiSelectDropdown
                                label="Division"
                                options={options.departments}
                                selected={filters.departments}
                                onChange={(vals) => setFilters({ ...filters, departments: vals })}
                            />
                            <MultiSelectDropdown
                                label="Rank"
                                options={options.designations}
                                selected={filters.designations}
                                onChange={(vals) => setFilters({ ...filters, designations: vals })}
                            />
                            <MultiSelectDropdown
                                label="Entity"
                                options={options.centres}
                                selected={filters.centres}
                                onChange={(vals) => setFilters({ ...filters, centres: vals })}
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className={`rounded-[2.5rem] border shadow-2xl overflow-hidden mt-10 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className={`border-b transition-all duration-300 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                    <th className="px-8 py-6 text-left">Employee Intelligence</th>
                                    <th className="px-8 py-6 text-left">Rank</th>
                                    <th className="px-8 py-6 text-left">Division</th>
                                    <th className="px-8 py-6 text-left">Node</th>
                                    <th className="px-8 py-6 text-left">Status</th>
                                    <th className="px-8 py-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-32 text-center">
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] italic animate-pulse">Syncing Employee Nodes...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : employees.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-24 text-center text-gray-600 font-black uppercase tracking-[0.4em] italic text-xs">No active nodes detected</td>
                                    </tr>
                                ) : (
                                    employees.map((emp) => (
                                        <tr key={emp._id} className={`transition-all group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-purple-500/[0.02]'}`}>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-5">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black overflow-hidden border shadow-inner transition-all duration-300 group-hover:border-purple-500/50 ${isDarkMode ? 'bg-white/5 text-gray-400 border-gray-800' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                        {emp.profileImage ? (
                                                            <img src={emp.profileImage} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                                        ) : (
                                                            <span className="text-xl italic">{emp.name.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className={`font-black text-base uppercase italic tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{emp.name}</div>
                                                        <div className="text-gray-500 text-[9px] uppercase font-black tracking-[0.2em] mt-1.5 italic">ID: {emp.employeeId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`px-8 py-6 text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{emp.designation?.name || "N/A"}</td>
                                            <td className={`px-8 py-6 text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{emp.department?.departmentName || "N/A"}</td>
                                            <td className={`px-8 py-6 text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{emp.primaryCentre?.centreName || "N/A"}</td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${emp.status === "Active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                                                    {emp.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button
                                                    onClick={() => handleProceed(emp._id)}
                                                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ml-auto shadow-xl shadow-purple-600/20 active:scale-95"
                                                >
                                                    Authorize <FaFileInvoiceDollar size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className={`p-8 border-t flex flex-col md:flex-row justify-between items-center gap-6 transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">
                            Disbursal Map: Page {currentPage} OF {totalPages}
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                                className={`px-8 py-3.5 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-20 ${isDarkMode ? 'bg-white/5 border-gray-800 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'}`}
                            >
                                Previous
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                className={`px-8 py-3.5 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-20 ${isDarkMode ? 'bg-white/5 border-gray-800 text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default PayEmployee;
