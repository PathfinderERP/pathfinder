import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaEdit, FaChalkboardTeacher, FaFileExcel, FaSync, FaFilter, FaChevronDown } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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

const PartTimeTeachers = () => {
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

    // Options for Filters (mocked initially, could be fetched)
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
        fetchFilterOptions(); // Initial fetch
    }, [currentPage, searchTerm, filters]); // Re-fetch when any filter changes

    const fetchFilterOptions = async () => {
        try {
            const token = localStorage.getItem("token");
            // Fetch unique values for filters (Ideally backend endpoints, here we might aggregate from `teachers` if list is small, 
            // but effectively we should likely have dedicated master data calls. For now, let's use some common ones or fetch from master data endpoints if available.)
            // Or extract from a larger fetch. Let's start with empty and perhaps populate dynamically?
            // Actually, best to fetch master data.

            // Mocking for now as per immediate requirement, or assuming we can get from existing list if not paginated? 
            // Pagination makes client-side Unique extraction partial.
            // Let's rely on backend filtering mostly, but for Options, let's try to fetch master data if possible.
            // Using placeholder fetch for now.

            // Fetch Subjects, Boards, Departments from Master Data endpoints
            // Assuming endpoints exist: /api/master-data/subject, /api/master-data/department, etc.
            // Let's hardcode generic lists for now if specific endpoints aren't verified, or fetch all teachers once to extract?
            // User requested "refresh filters", so likely data driven.
            // I'll add a separate useEffect to fetch master data options if readily available.
            // Let's fetch from existing master data endpoints I see in other files.

            const [deptRes, boardRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers: { Authorization: `Bearer ${token}` } }),
                // Board is often just an enum or free text in User model. Let's use common ones.
            ]);

            const deptData = deptRes.ok ? await deptRes.json() : [];
            const departments = Array.isArray(deptData) ? deptData.map(d => d.departmentName) : [];

            // Subjects - usually huge list. Let's hardcode common ones + extracting from current list if possible?
            // For now, let's use a static list + user input search might be better, but "Multiple Selection" implies checkboxes.
            // I'll use a static common list for Subjects and Boards to start.

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

            // Construct Query String
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
                limit: 0, // Request all
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
            <div className="p-4 space-y-6">
                <ToastContainer position="top-right" theme="dark" />

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                <FaChalkboardTeacher size={24} />
                            </span>
                            Part Time Teachers
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">Manage part-time faculty and their fee structures</p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-[#1a1f24] p-4 rounded-2xl border border-gray-800 space-y-4 shadow-xl">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-64 group">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-gray-900/50 border border-gray-700 text-white pl-12 pr-4 py-2 rounded-xl focus:outline-none focus:border-purple-500/50 transition-all text-xs font-medium"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 items-center">
                            <MultiSelectDropdown
                                label="Subject"
                                options={options.subjects}
                                selected={filters.subjects}
                                onChange={(vals) => setFilters({ ...filters, subjects: vals })}
                            />
                            <MultiSelectDropdown
                                label="Board"
                                options={options.boards}
                                selected={filters.boards}
                                onChange={(vals) => setFilters({ ...filters, boards: vals })}
                            />
                            <MultiSelectDropdown
                                label="Dept"
                                options={options.departments}
                                selected={filters.departments}
                                onChange={(vals) => setFilters({ ...filters, departments: vals })}
                            />
                            <MultiSelectDropdown
                                label="Fee Type"
                                options={["HOURLY", "CLASS_WISE", "DAY_WISE"]}
                                selected={filters.feeTypes}
                                onChange={(vals) => setFilters({ ...filters, feeTypes: vals })}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-4 border-t border-gray-800">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1">
                                <span className="text-gray-500 text-[10px] font-bold uppercase">Rate Range:</span>
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={filters.minRate}
                                    onChange={(e) => setFilters({ ...filters, minRate: e.target.value })}
                                    className="w-16 bg-transparent text-white text-xs text-center focus:outline-none"
                                />
                                <span className="text-gray-600">-</span>
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={filters.maxRate}
                                    onChange={(e) => setFilters({ ...filters, maxRate: e.target.value })}
                                    className="w-16 bg-transparent text-white text-xs text-center focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleRefreshFilters}
                                className="px-4 py-2 bg-gray-800 text-gray-400 hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors border border-gray-700 hover:border-gray-500"
                            >
                                <FaSync /> Refresh Filters
                            </button>
                            <button
                                onClick={handleExport}
                                className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/50 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors"
                            >
                                <FaFileExcel /> Export Excel
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-900/50 border-b border-gray-800">
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Name</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Email</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Mobile</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Subject</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Designation</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Department</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Board</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Fee Rate</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Loading Teachers...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : teachers.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">No part-time teachers found</td>
                                    </tr>
                                ) : (
                                    teachers.map((teacher) => (
                                        <tr key={teacher._id} className="hover:bg-purple-500/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="text-white font-bold text-sm tracking-tight">{teacher.name?.toUpperCase()}</span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 text-xs">{teacher.email || "N/A"}</td>
                                            <td className="px-6 py-4 text-gray-400 text-xs font-mono">{teacher.mobile || "N/A"}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-gray-300 text-xs">{teacher.subject || "N/A"}</span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 text-xs">{teacher.designation || "N/A"}</td>
                                            <td className="px-6 py-4 text-gray-400 text-xs">{teacher.department || "N/A"}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-[10px] font-black uppercase text-gray-400">
                                                    {teacher.boardType || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {teacher.rate ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-green-400 font-bold text-sm">₹{teacher.rate}</span>
                                                        <span className="text-[10px] text-gray-500 uppercase font-black">{teacher.feeType?.replace("_", " ")}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Not Set</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleEdit(teacher)}
                                                    className="px-3 py-1.5 bg-gray-800 hover:bg-purple-600 text-white rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ml-auto"
                                                >
                                                    <FaEdit size={12} />
                                                    {teacher.rate ? "Edit" : "Set"} Fee
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
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest text-center">Page {currentPage} of {totalPages}<br /><span className="text-[10px] text-gray-600">{totalItems} Results</span></span>
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

            {/* Edit/Add Fee Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1f24] w-full max-w-md rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
                            <h3 className="text-lg font-black text-white tracking-tight">
                                Manage Fee Structure
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors">
                                ✕
                            </button>
                        </div>

                        <div className="px-6 pt-6 pb-2">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-lg">
                                    {formData.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">{formData.name}</h4>
                                    <p className="text-gray-400 text-xs">{formData.subject} • {formData.email}</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 pt-0 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Fee Type</label>
                                    <select
                                        name="feeType"
                                        value={formData.feeType}
                                        onChange={handleInputChange}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors appearance-none"
                                    >
                                        <option value="HOURLY">Hourly Rate</option>
                                        <option value="CLASS_WISE">Per Class Rate</option>
                                        <option value="DAY_WISE">Per Day Rate</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Rate Amount (₹)</label>
                                    <input
                                        type="number"
                                        name="rate"
                                        required
                                        min="0"
                                        value={formData.rate}
                                        onChange={handleInputChange}
                                        placeholder="Enter amount..."
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors font-bold text-lg"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/20"
                                >
                                    Save Fee
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default PartTimeTeachers;
