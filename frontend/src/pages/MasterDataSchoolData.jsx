import React, { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import {
    FaPlus, FaEdit, FaTrash, FaSearch, FaFileImport, FaFileExport,
    FaSchool, FaUserGraduate, FaChalkboard, FaBook, FaTimes, FaCheck,
    FaFilter, FaMapMarkerAlt, FaChevronDown
} from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const EMPTY_FORM = { schoolName: "", studentName: "", className: "", board: "", area: "" };

// ─── Custom Multi-Select Dropdown ─────────────────────────────────────────────
const MultiSelect = ({ options, selected, onChange, placeholder = "All" }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const toggle = (val) => {
        onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
    };

    const label = selected.length === 0
        ? placeholder
        : selected.length === 1
            ? selected[0]
            : `${selected.length} selected`;

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between bg-gray-50 dark:bg-[#131619] border rounded-lg px-3 py-2.5 text-sm transition-all focus:outline-none ${open ? "border-blue-500 ring-1 ring-blue-500/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"}`}
            >
                <span className={`truncate font-medium ${selected.length > 0 ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                    {label}
                </span>
                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {selected.length > 0 && (
                        <span
                            onClick={(e) => { e.stopPropagation(); onChange([]); }}
                            className="text-[9px] bg-blue-600/20 text-blue-500 border border-blue-500/30 rounded px-1 py-0.5 font-black hover:bg-red-600/20 hover:text-red-400 cursor-pointer transition-colors"
                        >
                            ×{selected.length}
                        </span>
                    )}
                    <FaChevronDown className={`text-gray-400 text-[10px] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                </div>
            </button>

            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a2030] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto">
                    {options.length === 0 ? (
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest p-4 text-center">No options</p>
                    ) : (
                        options.map((opt, i) => {
                            const checked = selected.includes(opt);
                            return (
                                <div
                                    key={i}
                                    onClick={() => toggle(opt)}
                                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors text-sm ${checked ? "bg-blue-50 dark:bg-blue-600/10" : "hover:bg-gray-50 dark:hover:bg-white/5"}`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${checked ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600 bg-white dark:bg-[#131619]"}`}>
                                        {checked && <FaCheck className="text-white text-[8px]" />}
                                    </div>
                                    <span className={`font-medium ${checked ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>{opt}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const MasterDataSchoolData = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formLoading, setFormLoading] = useState(false);

    // Master data for dropdowns
    const [masterClasses, setMasterClasses] = useState([]);   // { _id, name }
    const [masterBoards, setMasterBoards] = useState([]);     // { _id, boardCourse }

    // Multi-select filter state (arrays)
    const [filterSearch, setFilterSearch] = useState("");
    const [filterSchools, setFilterSchools] = useState([]);
    const [filterClasses, setFilterClasses] = useState([]);
    const [filterBoards, setFilterBoards] = useState([]);
    const [filterAreas, setFilterAreas] = useState([]);

    // Derived unique values for filter dropdowns
    const [allSchools, setAllSchools] = useState([]);
    const [allAreas, setAllAreas] = useState([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 20;

    const importRef = useRef(null);
    const [importing, setImporting] = useState(false);
    const [importErrors, setImportErrors] = useState([]);
    const [showImportErrorsModal, setShowImportErrorsModal] = useState(false);

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    const BASE = `${import.meta.env.VITE_API_URL}/master-data/school-data`;

    // ── Fetch master class & board lists ─────────────────────────────────────
    const fetchMasterData = async () => {
        try {
            const [classRes, boardRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/class`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/board`, { headers })
            ]);
            if (classRes.ok) {
                const data = await classRes.json();
                setMasterClasses(Array.isArray(data) ? data : []);
            }
            if (boardRes.ok) {
                const data = await boardRes.json();
                setMasterBoards(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Failed to fetch master class/board", err);
        }
    };

    // ── Fetch records ─────────────────────────────────────────────────────────
    const fetchRecords = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterSearch) params.append("search", filterSearch);
            if (filterSchools.length > 0) params.append("schoolName", filterSchools.join(","));
            if (filterClasses.length > 0) params.append("className", filterClasses.join(","));
            if (filterBoards.length > 0) params.append("board", filterBoards.join(","));
            if (filterAreas.length > 0) params.append("area", filterAreas.join(","));
            params.append("page", page);
            params.append("limit", ITEMS_PER_PAGE);

            const res = await fetch(`${BASE}?${params}`, { headers });
            const data = await res.json();
            if (res.ok) {
                setRecords(data.data || []);
                setTotalPages(data.totalPages || 1);
                setTotalItems(data.totalItems || 0);
                setCurrentPage(data.currentPage || 1);
            } else {
                toast.error(data.message || "Failed to load records");
            }
        } catch {
            toast.error("Error loading school data");
        } finally {
            setLoading(false);
        }
    };

    // Fetch all records (no limit) to build filter option lists
    const fetchAllForFilterOptions = async () => {
        try {
            const res = await fetch(`${BASE}?limit=9999&page=1`, { headers });
            const data = await res.json();
            if (res.ok) {
                const all = data.data || [];
                setAllSchools([...new Set(all.map(r => r.schoolName).filter(Boolean))].sort());
                setAllAreas([...new Set(all.map(r => r.area).filter(Boolean))].sort());
            }
        } catch { /* silent */ }
    };

    useEffect(() => {
        fetchMasterData();
        fetchAllForFilterOptions();
    }, []);

    useEffect(() => {
        fetchRecords(1);
    }, [filterSearch, filterSchools, filterClasses, filterBoards, filterAreas]);

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const url = editingId ? `${BASE}/${editingId}` : BASE;
            const method = editingId ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(editingId ? "Record updated!" : "Record added!");
                setShowModal(false);
                setEditingId(null);
                setFormData(EMPTY_FORM);
                fetchRecords(currentPage);
                fetchAllForFilterOptions();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch {
            toast.error("Error saving record");
        } finally {
            setFormLoading(false);
        }
    };

    const handleEdit = (r) => {
        setFormData({ schoolName: r.schoolName, studentName: r.studentName, className: r.className, board: r.board, area: r.area || "" });
        setEditingId(r._id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this record? This cannot be undone.")) return;
        try {
            const res = await fetch(`${BASE}/${id}`, { method: "DELETE", headers });
            const data = await res.json();
            if (res.ok) {
                toast.success("Record deleted");
                fetchRecords(currentPage);
                fetchAllForFilterOptions();
            } else {
                toast.error(data.message || "Delete failed");
            }
        } catch {
            toast.error("Error deleting record");
        }
    };

    // ── Bulk Import ───────────────────────────────────────────────────────────
    const handleImportFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImporting(true);
        try {
            const ab = await file.arrayBuffer();
            const wb = XLSX.read(ab, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
            if (!rows.length) { toast.warn("No rows found in the file"); setImporting(false); return; }

            const res = await fetch(`${BASE}/bulk-import`, {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(rows)
            });
            const data = await res.json();
            if (res.ok) {
                const failedCount = data.failed?.length || 0;
                if (data.inserted > 0 && failedCount === 0) {
                    toast.success(`Successfully imported all ${data.inserted} records!`);
                } else if (data.inserted > 0 && failedCount > 0) {
                    toast.warn(`Imported ${data.inserted} records. ${failedCount} records failed validation.`);
                    setImportErrors(data.failed || []);
                    setShowImportErrorsModal(true);
                } else {
                    toast.error(`Import failed completely! All ${failedCount} records failed validation.`);
                    setImportErrors(data.failed || []);
                    setShowImportErrorsModal(true);
                }
                fetchRecords(1);
                fetchAllForFilterOptions();
            } else {
                toast.error(data.message || "Import failed");
            }
        } catch (err) {
            toast.error("Error processing file: " + err.message);
        } finally {
            setImporting(false);
            if (importRef.current) importRef.current.value = "";
        }
    };

    // ── Export ────────────────────────────────────────────────────────────────
    const handleExport = async () => {
        try {
            const res = await fetch(`${BASE}?limit=99999&page=1`, { headers });
            const data = await res.json();
            const exportData = (data.data || []).map(r => ({
                "School Name": r.schoolName, "Student Name": r.studentName,
                "Class": r.className, "Board": r.board, "Area": r.area || "",
                "Created At": new Date(r.createdAt).toLocaleDateString()
            }));
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "School Data");
            const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
                `SchoolData_${new Date().toISOString().split("T")[0]}.xlsx`);
        } catch { toast.error("Export failed"); }
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([{ "School Name": "", "Student Name": "", "Class": "", "Board": "", "Area": "" }]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "SchoolData_Template.xlsx");
    };

    const resetFilters = () => { setFilterSearch(""); setFilterSchools([]); setFilterClasses([]); setFilterBoards([]); setFilterAreas([]); };
    const activeCount = [filterSearch, filterSchools.length > 0, filterClasses.length > 0, filterBoards.length > 0, filterAreas.length > 0].filter(Boolean).length;

    // Derived class/board name lists for filters (from master data)
    const classNames = masterClasses.map(c => c.name);
    const boardNames = masterBoards.map(b => b.boardCourse);

    return (
        <Layout activePage="Master Data">
            <div className="space-y-6 animate-fade-in pb-10">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <FaSchool className="text-blue-500" /> School Data
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            Manage school-wise student records — <span className="font-bold text-blue-500">{totalItems.toLocaleString()}</span> total entries
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <FaFileExport className="text-xs" /> Template
                        </button>
                        <label className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg font-medium text-sm hover:bg-emerald-600 hover:text-white transition-all cursor-pointer">
                            <FaFileImport className="text-xs" />
                            {importing ? "Importing..." : "Bulk Import"}
                            <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="hidden" disabled={importing} />
                        </label>
                        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-lg font-medium text-sm hover:bg-blue-600 hover:text-white transition-all">
                            <FaFileExport className="text-xs" /> Export Excel
                        </button>
                        <button
                            onClick={() => { setFormData(EMPTY_FORM); setEditingId(null); setShowModal(true); }}
                            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-colors"
                        >
                            <FaPlus /> Add Record
                        </button>
                    </div>
                </div>

                {/* ── Multi-Select Filters ── */}
                <div className="bg-white dark:bg-[#1a1f24] rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <FaFilter className="text-blue-500 text-xs" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Filters</span>
                        {activeCount > 0 && (
                            <>
                                <span className="text-[9px] bg-blue-600/20 text-blue-500 border border-blue-500/30 rounded-full px-2 py-0.5 font-black">{activeCount} active</span>
                                <button onClick={resetFilters} className="text-[10px] text-red-400 hover:text-red-600 font-bold transition-colors ml-1">Reset All</button>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Search */}
                        <div className="lg:col-span-1 relative">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs z-10" />
                            <input
                                type="text"
                                placeholder="Search all fields..."
                                value={filterSearch}
                                onChange={e => setFilterSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#131619] text-gray-800 dark:text-white focus:outline-none focus:border-blue-500 transition-all"
                            />
                        </div>

                        {/* School multi-select */}
                        <div>
                            <MultiSelect
                                options={allSchools}
                                selected={filterSchools}
                                onChange={setFilterSchools}
                                placeholder="All Schools"
                            />
                        </div>

                        {/* Class multi-select — from master data */}
                        <div>
                            <MultiSelect
                                options={classNames}
                                selected={filterClasses}
                                onChange={setFilterClasses}
                                placeholder="All Classes"
                            />
                        </div>

                        {/* Board multi-select — from master data */}
                        <div>
                            <MultiSelect
                                options={boardNames}
                                selected={filterBoards}
                                onChange={setFilterBoards}
                                placeholder="All Boards"
                            />
                        </div>

                        {/* Area multi-select */}
                        <div>
                            <MultiSelect
                                options={allAreas}
                                selected={filterAreas}
                                onChange={setFilterAreas}
                                placeholder="All Areas"
                            />
                        </div>
                    </div>

                    {/* Active filter pills */}
                    {activeCount > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                            {filterSearch && (
                                <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                                    "{filterSearch}"
                                    <button onClick={() => setFilterSearch("")} className="hover:text-red-400 transition-colors">×</button>
                                </span>
                            )}
                            {filterSchools.map(s => (
                                <span key={s} className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-blue-200 dark:border-blue-500/20">
                                    <FaSchool className="text-[8px]" />{s}
                                    <button onClick={() => setFilterSchools(p => p.filter(v => v !== s))} className="hover:text-red-400 transition-colors">×</button>
                                </span>
                            ))}
                            {filterClasses.map(c => (
                                <span key={c} className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-600/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-amber-200 dark:border-amber-500/20">
                                    <FaChalkboard className="text-[8px]" />{c}
                                    <button onClick={() => setFilterClasses(p => p.filter(v => v !== c))} className="hover:text-red-400 transition-colors">×</button>
                                </span>
                            ))}
                            {filterBoards.map(b => (
                                <span key={b} className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-purple-200 dark:border-purple-500/20">
                                    <FaBook className="text-[8px]" />{b}
                                    <button onClick={() => setFilterBoards(p => p.filter(v => v !== b))} className="hover:text-red-400 transition-colors">×</button>
                                </span>
                            ))}
                            {filterAreas.map(a => (
                                <span key={a} className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                                    <FaMapMarkerAlt className="text-[8px]" />{a}
                                    <button onClick={() => setFilterAreas(p => p.filter(v => v !== a))} className="hover:text-red-400 transition-colors">×</button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Table ── */}
                <div className="bg-white dark:bg-[#1a1f24] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400 dark:text-gray-600">
                            <FaSchool className="text-4xl" />
                            <p className="font-bold uppercase text-xs tracking-widest">No records found</p>
                            <button onClick={() => { setFormData(EMPTY_FORM); setEditingId(null); setShowModal(true); }} className="text-blue-500 text-sm hover:underline">
                                Add the first record
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        {["#", "School Name", "Student Name", "Class", "Board", "Area", "Actions"].map((h, i) => (
                                            <th key={i} className="px-5 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {records.map((rec, idx) => (
                                        <tr key={rec._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-5 py-3.5 text-gray-400 dark:text-gray-600 text-xs font-bold">
                                                {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                                            </td>
                                            <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{rec.schoolName}</td>
                                            <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">{rec.studentName}</td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/40 whitespace-nowrap">
                                                    {rec.className}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-700/40 whitespace-nowrap">
                                                    {rec.board}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {rec.area ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/40">
                                                        <FaMapMarkerAlt className="text-[8px]" />{rec.area}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-gray-700">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => handleEdit(rec)} className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors" title="Edit">
                                                        <FaEdit size={15} />
                                                    </button>
                                                    <button onClick={() => handleDelete(rec._id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors" title="Delete">
                                                        <FaTrash size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems.toLocaleString()} records
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchRecords(p); }}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >← Prev</button>
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    const pg = i + 1;
                                    return (
                                        <button key={pg} onClick={() => { setCurrentPage(pg); fetchRecords(pg); }}
                                            className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${currentPage === pg ? "bg-blue-600 text-white shadow-lg" : "border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500"}`}
                                        >{pg}</button>
                                    );
                                })}
                                {totalPages > 5 && <span className="text-gray-400 px-1">...</span>}
                                <button
                                    onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchRecords(p); }}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >Next →</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Add / Edit Modal ── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1a1f24] rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-blue-600 to-blue-700">
                            <div className="flex items-center gap-3">
                                <FaSchool className="text-white text-xl" />
                                <h2 className="text-lg font-bold text-white">{editingId ? "Edit Record" : "Add School Record"}</h2>
                            </div>
                            <button onClick={() => { setShowModal(false); setEditingId(null); setFormData(EMPTY_FORM); }} className="text-white/70 hover:text-white transition-colors">
                                <FaTimes />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">

                            {/* School Name */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">
                                    <FaSchool className="inline mr-1.5 text-blue-500" /> School Name *
                                </label>
                                <input
                                    type="text" required
                                    value={formData.schoolName}
                                    onChange={e => setFormData(p => ({ ...p, schoolName: e.target.value }))}
                                    placeholder="Enter school name"
                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-[#131619] text-gray-800 dark:text-white outline-none transition-all"
                                />
                            </div>

                            {/* Student Name */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">
                                    <FaUserGraduate className="inline mr-1.5 text-emerald-500" /> Student Name *
                                </label>
                                <input
                                    type="text" required
                                    value={formData.studentName}
                                    onChange={e => setFormData(p => ({ ...p, studentName: e.target.value }))}
                                    placeholder="Enter student name"
                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-[#131619] text-gray-800 dark:text-white outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Class — from master data */}
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">
                                        <FaChalkboard className="inline mr-1.5 text-amber-500" /> Class *
                                    </label>
                                    <select
                                        required
                                        value={formData.className}
                                        onChange={e => setFormData(p => ({ ...p, className: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-[#131619] text-gray-800 dark:text-white outline-none transition-all appearance-none"
                                    >
                                        <option value="">Select Class</option>
                                        {masterClasses.map(c => (
                                            <option key={c._id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Board — from master data */}
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">
                                        <FaBook className="inline mr-1.5 text-purple-500" /> Board *
                                    </label>
                                    <select
                                        required
                                        value={formData.board}
                                        onChange={e => setFormData(p => ({ ...p, board: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-[#131619] text-gray-800 dark:text-white outline-none transition-all appearance-none"
                                    >
                                        <option value="">Select Board</option>
                                        {masterBoards.map(b => (
                                            <option key={b._id} value={b.boardCourse}>{b.boardCourse}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Area */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">
                                    <FaMapMarkerAlt className="inline mr-1.5 text-emerald-500" /> Area
                                </label>
                                <input
                                    type="text"
                                    value={formData.area}
                                    onChange={e => setFormData(p => ({ ...p, area: e.target.value }))}
                                    placeholder="e.g. South Delhi, Sector 12"
                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-[#131619] text-gray-800 dark:text-white outline-none transition-all"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); setEditingId(null); setFormData(EMPTY_FORM); }}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit" disabled={formLoading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {formLoading
                                        ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-4 h-4 inline-block"></span>
                                        : <FaCheck />
                                    }
                                    {formLoading ? "Saving..." : editingId ? "Update Record" : "Add Record"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Import Errors Modal ── */}
            {showImportErrorsModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1a1f24] rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-red-600 to-red-700">
                            <div className="flex items-center gap-3">
                                <FaFileImport className="text-white text-xl" />
                                <h2 className="text-lg font-bold text-white">Import Failures ({importErrors.length})</h2>
                            </div>
                            <button onClick={() => { setShowImportErrorsModal(false); setImportErrors([]); }} className="text-white/70 hover:text-white transition-colors">
                                <FaTimes />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                The following rows failed to import. Please check your template data, ensure required fields are not empty, and try again.
                            </p>
                            <div className="space-y-3">
                                {importErrors.map((err, idx) => (
                                    <div key={idx} className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="font-bold text-red-700 dark:text-red-400 shrink-0">Row #{idx + 1}</span>
                                            <span className="text-red-600 dark:text-red-400 font-semibold text-right break-words">{err.reason}</span>
                                        </div>
                                        <div className="text-[10px] font-mono text-gray-600 dark:text-gray-400 bg-white dark:bg-black/20 p-2 rounded border border-gray-100 dark:border-gray-800/50 overflow-x-auto max-w-full">
                                            {JSON.stringify(err.row, null, 2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-gray-50 dark:bg-[#131619] border-t border-gray-100 dark:border-gray-800 flex justify-end">
                            <button
                                onClick={() => { setShowImportErrorsModal(false); setImportErrors([]); }}
                                className="px-5 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-white text-sm font-bold rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default MasterDataSchoolData;
