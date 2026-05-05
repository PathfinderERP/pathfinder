import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaEdit, FaChalkboardTeacher, FaFileExcel, FaSync, FaFilter, FaChevronDown, FaTimes } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
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
                className={`flex items-center justify-between w-full md:w-56 px-5 py-3 border rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-300 hover:border-purple-500/50' : 'bg-white border-gray-200 text-gray-700 hover:border-purple-500/50 shadow-sm'}`}
                type="button"
            >
                <span className="truncate">{selected.length > 0 ? `${selected.length} ${label} MAP` : `PARAM: ${label}`}</span>
                <FaChevronDown className={`ml-2 text-[10px] transform transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className={`absolute z-[100] w-72 mt-3 border rounded-[1.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] p-3 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300 ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                    {options.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-[10px] font-black uppercase tracking-widest italic">No matching vectors</div>
                    ) : (
                        options.map((option) => (
                            <div
                                key={option}
                                onClick={() => toggleOption(option)}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all mb-1 group ${isDarkMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-purple-50 text-gray-700'}`}
                            >
                                <div className={`w-4 h-4 rounded-lg border transition-all flex items-center justify-center ${selected.includes(option) ? "bg-purple-500 border-purple-500 shadow-lg shadow-purple-500/30" : (isDarkMode ? 'border-gray-600 group-hover:border-purple-500/50' : 'border-gray-300 shadow-inner group-hover:border-purple-500/50')}`}>
                                    {selected.includes(option) && <span className="text-white text-[10px] font-black">✓</span>}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{option}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const PartTimeTeachers = () => {
    const { isDarkMode } = useTheme();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState(null);

    // Filter States
    const [filters, setFilters] = useState({
        subjects: [],
        boards: [],
        departments: [],
        feeTypes: [],
        minRate: "",
        maxRate: ""
    });

    // Options for Filters
    const [options, setOptions] = useState({
        subjects: [],
        boards: [],
        departments: []
    });

    const [formData, setFormData] = useState({
        teacherId: "",
        name: "",
        email: "",
        subject: "",
        feeType: "HOURLY",
        rate: ""
    });

    useEffect(() => {
        fetchTeachers();
        fetchFilterOptions();
    }, [currentPage, searchTerm, filters]);

    const fetchFilterOptions = async () => {
        try {
            const token = localStorage.getItem("token");
            const [deptRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            const deptData = deptRes.ok ? await deptRes.json() : [];
            const departments = Array.isArray(deptData) ? deptData.map(d => d.departmentName) : [];

            setOptions(prev => ({
                ...prev,
                departments: departments.length ? departments : ["Foundation", "Board", "All India"],
                boards: ["CBSE", "ICSE", "IGCSE", "State Board", "NEET", "JEE"],
                subjects: ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Science", "Generic"]
            }));

        } catch (error) {
            console.error("Error fetching filter options", error);
        }
    };

    const fetchTeachers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                page: currentPage,
                limit: 10,
                search: searchTerm,
                subjects: filters.subjects.join(","),
                boards: filters.boards.join(","),
                departments: filters.departments.join(","),
                feeTypes: filters.feeTypes.join(","),
                minRate: filters.minRate,
                maxRate: filters.maxRate
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/finance/part-time-teachers?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setTeachers(data.teachers);
                setTotalPages(data.totalPages);
                setTotalItems(data.totalItems);
            } else {
                toast.error(data.message || "Failed to fetch teachers");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                limit: 0,
                search: searchTerm,
                subjects: filters.subjects.join(","),
                boards: filters.boards.join(","),
                departments: filters.departments.join(","),
                feeTypes: filters.feeTypes.join(","),
                minRate: filters.minRate,
                maxRate: filters.maxRate
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/finance/part-time-teachers?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();

            if (response.ok && data.teachers) {
                const exportData = data.teachers.map(t => ({
                    Name: t.name,
                    Email: t.email,
                    Mobile: t.mobile,
                    Subject: t.subject,
                    Designation: t.designation,
                    Department: t.department,
                    Board: t.boardType,
                    "Fee Type": t.feeType || "Not Set",
                    "Rate (INR)": t.rate || 0
                }));

                const worksheet = XLSX.utils.json_to_sheet(exportData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "PartTimeTeachers");
                const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
                const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
                saveAs(blob, "Part_Time_Teachers_Report.xlsx");
                toast.success("Export successful!");
            }
        } catch (error) {
            console.error("Export Error:", error);
            toast.error("Failed to export data");
        }
    };

    const handleRefreshFilters = () => {
        setFilters({
            subjects: [],
            boards: [],
            departments: [],
            feeTypes: [],
            minRate: "",
            maxRate: ""
        });
        setSearchTerm("");
        setCurrentPage(1);
        toast.info("Filters reset");
    };

    const handleEdit = (teacher) => {
        setEditingTeacher(teacher);
        setFormData({
            teacherId: teacher._id,
            name: teacher.name,
            email: teacher.email,
            subject: teacher.subject,
            feeType: teacher.feeType || "HOURLY",
            rate: teacher.rate || ""
        });
        setShowModal(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/finance/part-time-teachers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    teacherId: formData.teacherId,
                    feeType: formData.feeType,
                    rate: formData.rate
                })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success("Fee structure updated successfully");
                setShowModal(false);
                fetchTeachers();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Network error. Please try again.");
        }
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className={`p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20 transition-all duration-500 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 mb-12">
                    <div>
                        <h1 className={`text-4xl font-black italic uppercase tracking-tighter mb-3 flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <span className="p-3 bg-purple-500/10 rounded-2xl text-purple-500 shadow-inner">
                                <FaChalkboardTeacher size={28} />
                            </span>
                            Faculty <span className="text-purple-500">Asset Management</span>
                        </h1>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] italic">
                            Authorized mapping of part-time instructional nodes & compensation structures
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className={`p-8 rounded-[2.5rem] border space-y-8 shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
                        <div className="relative w-full xl:w-96 group">
                            <FaSearch className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isDarkMode ? 'text-gray-600 group-focus-within:text-purple-400' : 'text-gray-400 group-focus-within:text-purple-600'}`} />
                            <input
                                type="text"
                                placeholder="TRACE BY IDENTITY OR STREAM..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full border py-4 rounded-2xl focus:outline-none transition-all duration-300 text-[10px] font-black uppercase tracking-[0.2em] pl-14 pr-6 ${isDarkMode ? 'bg-white/5 border-gray-800 text-white placeholder:text-gray-700 focus:border-purple-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500/50 shadow-inner'}`}
                            />
                        </div>

                        <div className="flex flex-wrap gap-4 items-center justify-center md:justify-end flex-1">
                            <MultiSelectDropdown
                                label="SUBJECT"
                                options={options.subjects}
                                selected={filters.subjects}
                                onChange={(vals) => setFilters({ ...filters, subjects: vals })}
                            />
                            <MultiSelectDropdown
                                label="BOARD"
                                options={options.boards}
                                selected={filters.boards}
                                onChange={(vals) => setFilters({ ...filters, boards: vals })}
                            />
                            <MultiSelectDropdown
                                label="DEPT"
                                options={options.departments}
                                selected={filters.departments}
                                onChange={(vals) => setFilters({ ...filters, departments: vals })}
                            />
                            <MultiSelectDropdown
                                label="PROTOCOL"
                                options={["HOURLY", "CLASS_WISE", "DAY_WISE"]}
                                selected={filters.feeTypes}
                                onChange={(vals) => setFilters({ ...filters, feeTypes: vals })}
                            />
                        </div>
                    </div>

                    <div className={`flex flex-col md:flex-row gap-6 items-center justify-between pt-8 border-t transition-colors ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-4 border rounded-2xl px-6 py-3 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-200 shadow-inner'}`}>
                                <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest italic">Compensation Horizon:</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="MIN"
                                        value={filters.minRate}
                                        onChange={(e) => setFilters({ ...filters, minRate: e.target.value })}
                                        className={`w-16 bg-transparent text-[10px] font-black text-center focus:outline-none placeholder:text-gray-700 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                                    />
                                    <span className="text-gray-700 font-black">---</span>
                                    <input
                                        type="number"
                                        placeholder="MAX"
                                        value={filters.maxRate}
                                        onChange={(e) => setFilters({ ...filters, maxRate: e.target.value })}
                                        className={`w-16 bg-transparent text-[10px] font-black text-center focus:outline-none placeholder:text-gray-700 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={handleRefreshFilters}
                                className={`px-6 py-3 border rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-500 border-gray-800 hover:text-white hover:bg-white/10' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 hover:text-gray-900 shadow-sm'}`}
                            >
                                <FaSync size={10} /> Reset Parameters
                            </button>
                            <button
                                onClick={handleExport}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-emerald-600/20"
                            >
                                <FaFileExcel size={12} /> Export Intelligence
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className={`rounded-[3rem] border shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden mt-12 transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[1400px]">
                            <thead>
                                <tr className={`border-b transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Authorized Personnel</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Comm Node (Email)</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Mobile Map</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Instructional Stream</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Rank/Role</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Sector</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Curriculum</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Asset Valuation</th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y transition-all duration-500 ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="px-8 py-40 text-center">
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="w-16 h-16 border-4 border-purple-500/10 border-t-purple-500 rounded-full animate-spin"></div>
                                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] italic animate-pulse">Syncing Personnel Data Map...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : teachers.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-8 py-32 text-center text-gray-600 font-black uppercase tracking-[0.4em] italic text-xs">No active faculty nodes found in sector</td>
                                    </tr>
                                ) : (
                                    teachers.map((teacher) => (
                                        <tr key={teacher._id} className={`transition-all duration-300 group ${isDarkMode ? 'hover:bg-purple-500/[0.03]' : 'hover:bg-purple-500/[0.02]'}`}>
                                            <td className="px-8 py-6">
                                                <span className={`font-black text-base italic uppercase tracking-tighter transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{teacher.name}</span>
                                            </td>
                                            <td className={`px-8 py-6 text-[11px] font-bold tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{teacher.email?.toLowerCase() || "VOID"}</td>
                                            <td className={`px-8 py-6 text-[11px] font-black tracking-[0.1em] tabular-nums ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{teacher.mobile || "VOID"}</td>
                                            <td className="px-8 py-6">
                                                <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{teacher.subject || "UNDEFINED"}</span>
                                            </td>
                                            <td className={`px-8 py-6 text-[10px] font-black uppercase tracking-[0.1em] italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{teacher.designation || "STAFF"}</td>
                                            <td className={`px-8 py-6 text-[10px] font-black uppercase tracking-[0.1em] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{teacher.department || "GENERIC"}</td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-500 group-hover:text-purple-400 group-hover:border-purple-500/30' : 'bg-gray-100 border-gray-200 text-gray-500 group-hover:text-purple-600 shadow-inner'}`}>
                                                    {teacher.boardType || "ALL"}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                {teacher.rate ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-emerald-500 font-black text-lg tracking-tighter tabular-nums italic leading-none">₹{teacher.rate.toLocaleString()}</span>
                                                        <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest mt-1.5 border-t border-gray-800/20 pt-1">{teacher.feeType?.replace("_", " ")}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] text-red-500/50 font-black uppercase tracking-[0.2em] italic border-b border-red-500/20 pb-1">Uninitialized Structure</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button
                                                    onClick={() => handleEdit(teacher)}
                                                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl transition-all duration-300 text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-3 ml-auto shadow-lg shadow-purple-500/20 active:scale-95"
                                                >
                                                    <FaEdit size={10} />
                                                    {teacher.rate ? "MOD_STRUCTURE" : "INIT_ASSET"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className={`p-8 border-t flex flex-col md:flex-row justify-between items-center gap-6 transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100 shadow-inner'}`}>
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white border border-gray-800' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm'}`}
                        >
                            Previous Horizon
                        </button>
                        <div className="flex flex-col items-center">
                            <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] text-center mb-1">Sector Depth: {currentPage} / {totalPages}</span>
                            <span className="text-[9px] text-gray-600 dark:text-gray-700 font-black uppercase tracking-widest italic">{totalItems} Total Nodes Mapped</span>
                        </div>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white border border-gray-800' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm'}`}
                        >
                            Next Horizon
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit/Add Fee Modal */}
            {showModal && (
                <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300 ${isDarkMode ? 'bg-black/90' : 'bg-gray-900/60'}`}>
                    <div className={`w-full max-w-xl rounded-[3rem] border shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500 animate-in zoom-in-95 duration-500 ${isDarkMode ? 'bg-[#0f1215] border-gray-800' : 'bg-white border-gray-100'}`}>
                        <div className={`p-10 border-b flex justify-between items-center relative overflow-hidden ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl"></div>
                            <div>
                                <h3 className={`text-2xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    ASSET COMPENSATION <span className="text-purple-500">MAPPING</span>
                                </h3>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Configuring structural valuation protocol</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className={`p-4 rounded-2xl transition-all active:scale-90 ${isDarkMode ? 'hover:bg-white/10 text-gray-500 hover:text-white' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-900'}`}>
                                <FaTimes size={18} />
                            </button>
                        </div>

                        <div className="p-10">
                            <div className={`flex items-center gap-6 p-6 rounded-[2rem] mb-10 transition-all ${isDarkMode ? 'bg-white/5 border border-gray-800' : 'bg-gray-50 border border-gray-100 shadow-inner'}`}>
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-4xl shadow-xl shadow-purple-500/30 italic">
                                    {formData.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className={`font-black text-2xl italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formData.name}</h4>
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">{formData.subject} • {formData.email?.toLowerCase()}</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2 italic">Valuation Protocol</label>
                                        <div className="relative">
                                            <select
                                                name="feeType"
                                                value={formData.feeType}
                                                onChange={handleInputChange}
                                                className={`w-full border px-6 py-4 rounded-2xl focus:outline-none transition-all duration-300 appearance-none font-black text-[11px] uppercase tracking-widest ${isDarkMode ? 'bg-white/5 border-gray-800 text-white focus:border-purple-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-purple-500/50 shadow-sm'}`}
                                            >
                                                <option value="HOURLY">HOURLY RATE MAP</option>
                                                <option value="CLASS_WISE">PER CLASS PROTOCOL</option>
                                                <option value="DAY_WISE">PER DIEM SEQUENCE</option>
                                            </select>
                                            <FaChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-2 italic">Asset Value (INR)</label>
                                        <div className="relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-xl italic leading-none">₹</span>
                                            <input
                                                type="number"
                                                name="rate"
                                                required
                                                min="0"
                                                value={formData.rate}
                                                onChange={handleInputChange}
                                                placeholder="0.00"
                                                className={`w-full border px-12 py-4 rounded-2xl focus:outline-none transition-all duration-300 font-black text-xl italic tracking-tighter tabular-nums ${isDarkMode ? 'bg-white/5 border-gray-800 text-white focus:border-purple-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-purple-500/50 shadow-sm'}`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-6 pt-6 border-t border-gray-800/10">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-500 hover:text-white border border-gray-800' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'}`}
                                    >
                                        Abort Mapping
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-12 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-[0_15px_30px_rgba(139,92,246,0.3)] active:scale-95"
                                    >
                                        Finalize Compensation Structure
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default PartTimeTeachers;
