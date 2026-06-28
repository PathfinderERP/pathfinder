import React, { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import {
    FaPlus, FaEdit, FaTrash, FaSearch, FaFileImport, FaFileExport,
    FaSchool, FaUserGraduate, FaChalkboard, FaBook, FaTimes, FaCheck,
    FaFilter, FaMapMarkerAlt, FaChevronDown, FaBuilding, FaPhone, FaCalendarAlt
} from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const EMPTY_FORM = { schoolName: "", studentName: "", className: "", board: "", phoneNumber: "", secondaryPhoneNumber: "", year: "", area: "", centre: "" };

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
    const [activeCentres, setActiveCentres] = useState([]);   // { _id, centreName }

    // Multi-select filter state (arrays)
    const [filterSearch, setFilterSearch] = useState("");
    const [filterSchools, setFilterSchools] = useState([]);
    const [filterClasses, setFilterClasses] = useState([]);
    const [filterBoards, setFilterBoards] = useState([]);
    const [filterAreas, setFilterAreas] = useState([]);
    const [filterCentres, setFilterCentres] = useState([]);   // array of centre _id strings
    const [filterDuplicates, setFilterDuplicates] = useState(false);

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
    const [importStatusMessage, setImportStatusMessage] = useState("");
    const [importErrors, setImportErrors] = useState([]);
    const [showImportErrorsModal, setShowImportErrorsModal] = useState(false);

    // ── Bulk Selection ────────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectAllMatching, setSelectAllMatching] = useState(false);
    const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
    const [bulkUpdateLoading, setBulkUpdateLoading] = useState(false);
    // Fields enabled for bulk update: key = fieldName, value = { enabled, value }
    const BULK_EMPTY = {
        className: { enabled: false, value: "" },
        board: { enabled: false, value: "" },
        phoneNumber: { enabled: false, value: "" },
        secondaryPhoneNumber: { enabled: false, value: "" },
        year: { enabled: false, value: "" },
        area: { enabled: false, value: "" },
        centre: { enabled: false, value: "" },
    };
    const [bulkFields, setBulkFields] = useState(BULK_EMPTY);

    const allPageSelected = records.length > 0 && records.every(r => selectedIds.has(r._id));
    const toggleSelectAll = () => {
        if (allPageSelected || selectAllMatching) {
            setSelectedIds(new Set());
            setSelectAllMatching(false);
        } else {
            setSelectedIds(prev => { const n = new Set(prev); records.forEach(r => n.add(r._id)); return n; });
        }
    };
    const toggleSelectRow = (id) => {
        if (selectAllMatching) {
            const n = new Set();
            records.forEach(r => {
                if (r._id !== id) n.add(r._id);
            });
            setSelectedIds(n);
            setSelectAllMatching(false);
        } else {
            setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
        }
    };
    const clearSelection = () => {
        setSelectedIds(new Set());
        setSelectAllMatching(false);
    };

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    const BASE = `${import.meta.env.VITE_API_URL}/master-data/school-data`;

    // ── Fetch master class, board & active centres lists ──────────────────────
    const fetchMasterData = async () => {
        try {
            const [classRes, boardRes, centreRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/class`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/board`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers })
            ]);
            if (classRes.ok) {
                const data = await classRes.json();
                setMasterClasses(Array.isArray(data) ? data : []);
            }
            if (boardRes.ok) {
                const data = await boardRes.json();
                setMasterBoards(Array.isArray(data) ? data : []);
            }
            if (centreRes.ok) {
                const data = await centreRes.json();
                // Only active centres
                const active = Array.isArray(data) ? data.filter(c => c.status !== "deactive") : [];
                setActiveCentres(active);
            }
        } catch (err) {
            console.error("Failed to fetch master data", err);
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
            if (filterCentres.length > 0) params.append("centre", filterCentres.join(","));
            if (filterDuplicates) params.append("onlyDuplicates", "true");
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

    // Fetch distinct schools & areas from backend to build filter option lists
    const fetchAllForFilterOptions = async () => {
        try {
            const res = await fetch(`${BASE}/distinct-fields`, { headers });
            const data = await res.json();
            if (res.ok) {
                setAllSchools(data.schools || []);
                setAllAreas(data.areas || []);
            }
        } catch { /* silent */ }
    };

    useEffect(() => {
        fetchMasterData();
        fetchAllForFilterOptions();
    }, []);

    useEffect(() => {
        clearSelection();
        fetchRecords(1);
    }, [filterSearch, filterSchools, filterClasses, filterBoards, filterAreas, filterCentres, filterDuplicates]);

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
        setFormData({
            schoolName: r.schoolName,
            studentName: r.studentName,
            className: r.className,
            board: r.board,
            phoneNumber: r.phoneNumber || "",
            secondaryPhoneNumber: r.secondaryPhoneNumber || "",
            year: r.year || "",
            area: r.area || "",
            centre: r.centre?._id || r.centre || ""
        });
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
                setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
                fetchRecords(currentPage);
                fetchAllForFilterOptions();
            } else {
                toast.error(data.message || "Delete failed");
            }
        } catch {
            toast.error("Error deleting record");
        }
    };

    // ── Bulk Operations ───────────────────────────────────────────────────────
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0 && !selectAllMatching) return;
        const confirmMsg = selectAllMatching
            ? `Delete all ${totalItems.toLocaleString()} records matching active filters? This cannot be undone.`
            : `Delete ${selectedIds.size} selected record(s)? This cannot be undone.`;
        if (!window.confirm(confirmMsg)) return;

        const activeFilters = {
            search: filterSearch,
            schoolName: filterSchools.join(","),
            className: filterClasses.join(","),
            board: filterBoards.join(","),
            area: filterAreas.join(","),
            centre: filterCentres.join(","),
            onlyDuplicates: filterDuplicates ? "true" : "false"
        };

        try {
            const res = await fetch(`${BASE}/bulk-delete`, {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                    ids: [...selectedIds],
                    selectAllMatching,
                    filters: activeFilters
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                clearSelection();
                fetchRecords(1);
                fetchAllForFilterOptions();
            } else {
                toast.error(data.message || "Bulk delete failed");
            }
        } catch {
            toast.error("Error during bulk delete");
        }
    };

    const handleBulkUpdate = async () => {
        const updates = {};
        Object.entries(bulkFields).forEach(([field, { enabled, value }]) => {
            if (enabled) updates[field] = value;
        });
        if (Object.keys(updates).length === 0) {
            toast.warn("Please enable and set at least one field to update.");
            return;
        }

        const confirmMsg = selectAllMatching
            ? `Update all ${totalItems.toLocaleString()} records matching active filters?`
            : `Update ${selectedIds.size} selected record(s)?`;
        if (!window.confirm(confirmMsg)) return;

        setBulkUpdateLoading(true);

        const activeFilters = {
            search: filterSearch,
            schoolName: filterSchools.join(","),
            className: filterClasses.join(","),
            board: filterBoards.join(","),
            area: filterAreas.join(","),
            centre: filterCentres.join(","),
            onlyDuplicates: filterDuplicates ? "true" : "false"
        };

        try {
            const res = await fetch(`${BASE}/bulk-update`, {
                method: "PUT",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                    ids: [...selectedIds],
                    selectAllMatching,
                    filters: activeFilters,
                    updates
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                setShowBulkUpdateModal(false);
                setBulkFields(BULK_EMPTY);
                clearSelection();
                fetchRecords(currentPage);
                fetchAllForFilterOptions();
            } else {
                toast.error(data.message || "Bulk update failed");
            }
        } catch {
            toast.error("Error during bulk update");
        } finally {
            setBulkUpdateLoading(false);
        }
    };

    // ── Bulk Import ───────────────────────────────────────────────────────────
    const handleImportFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImporting(true);
        setImportStatusMessage("Reading file...");
        setImportErrors([]);

        // Set up tab close/refresh warning
        const handleBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = "An import is in progress. Are you sure you want to leave?";
            return event.returnValue;
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        try {
            const ab = await file.arrayBuffer();
            const wb = XLSX.read(ab, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
            
            if (!rows.length) {
                toast.warn("No rows found in the file");
                setImporting(false);
                setImportStatusMessage("");
                window.removeEventListener("beforeunload", handleBeforeUnload);
                return;
            }

            setImportStatusMessage("Saving to database...");
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
            } else {
                toast.error(data.message || "Import failed");
            }

            fetchRecords(1);
            fetchAllForFilterOptions();

        } catch (err) {
            toast.error("Error processing file: " + err.message);
        } finally {
            setImporting(false);
            setImportStatusMessage("");
            window.removeEventListener("beforeunload", handleBeforeUnload);
            if (importRef.current) importRef.current.value = "";
        }
    };

    // ── Export ────────────────────────────────────────────────────────────────
    const handleExport = async () => {
        try {
            const res = await fetch(`${BASE}?limit=99999&page=1`, { headers });
            const data = await res.json();
            const exportData = (data.data || []).map(r => ({
                "School Name": r.schoolName,
                "Student Name": r.studentName,
                "Class": r.className,
                "Board": r.board,
                "Phone Number": r.phoneNumber || "",
                "Secondary Phone Number": r.secondaryPhoneNumber || "",
                "Year": r.year || "",
                "Area": r.area || "",
                "Centre Name": r.centre?.centreName || "",
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
        // Build list of active centre names as a hint in the second sample row
        const centreHint = activeCentres.map(c => c.centreName).join(" / ") || "Centre Name Here";
        const ws = XLSX.utils.json_to_sheet([
            {
                "School Name": "", "Student Name": "", "Class": "", "Board": "",
                "Phone Number": "", "Secondary Phone Number": "", "Year": "",
                "Area": "", "Centre Name": ""
            },
            {
                "School Name": "-- Centre Name must exactly match one of the active centres --",
                "Student Name": "", "Class": "", "Board": "",
                "Phone Number": "e.g. 9876543210", "Secondary Phone Number": "e.g. 9876543211", "Year": "e.g. 2025",
                "Area": "", "Centre Name": centreHint
            }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "SchoolData_Template.xlsx");
    };

    const resetFilters = () => { setFilterSearch(""); setFilterSchools([]); setFilterClasses([]); setFilterBoards([]); setFilterAreas([]); setFilterCentres([]); setFilterDuplicates(false); };
    const activeCount = [filterSearch, filterSchools.length > 0, filterClasses.length > 0, filterBoards.length > 0, filterAreas.length > 0, filterCentres.length > 0, filterDuplicates].filter(Boolean).length;

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
                            {importing ? (importStatusMessage || "Importing...") : "Bulk Import"}
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
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <FaFilter className="text-blue-500 text-xs" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Filters</span>
                        {activeCount > 0 && (
                            <>
                                <span className="text-[9px] bg-blue-600/20 text-blue-500 border border-blue-500/30 rounded-full px-2 py-0.5 font-black">{activeCount} active</span>
                                <button onClick={resetFilters} className="text-[10px] text-red-400 hover:text-red-600 font-bold transition-colors ml-1">Reset All</button>
                            </>
                        )}
                        <label className="ml-auto flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:border-red-500/50 transition-colors">
                            <input
                                type="checkbox"
                                checked={filterDuplicates}
                                onChange={(e) => setFilterDuplicates(e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            />
                            <span>Duplicates Only (Phone)</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
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

                        {/* Centre multi-select */}
                        <div>
                            <MultiSelect
                                options={activeCentres.map(c => c.centreName).filter(Boolean)}
                                selected={filterCentres.map(id => activeCentres.find(c => c._id === id)?.centreName || id)}
                                onChange={(names) => {
                                    const ids = names.map(n => {
                                        const found = activeCentres.find(c => c.centreName === n);
                                        return found ? found._id : n;
                                    });
                                    setFilterCentres(ids);
                                }}
                                placeholder="All Centres"
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
                            {filterCentres.map(id => {
                                const cName = activeCentres.find(c => c._id === id)?.centreName || id;
                                return (
                                    <span key={id} className="flex items-center gap-1.5 bg-sky-50 dark:bg-sky-600/10 text-sky-600 dark:text-sky-400 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-sky-200 dark:border-sky-500/20">
                                        <FaBuilding className="text-[8px]" />{cName}
                                        <button onClick={() => setFilterCentres(p => p.filter(v => v !== id))} className="hover:text-red-400 transition-colors">×</button>
                                    </span>
                                );
                            })}
                            {filterDuplicates && (
                                <span className="flex items-center gap-1.5 bg-red-50 dark:bg-red-600/10 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-red-200 dark:border-red-500/20">
                                    Duplicates Only
                                    <button onClick={() => setFilterDuplicates(false)} className="hover:text-red-400 transition-colors">×</button>
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Bulk Action Toolbar ── */}
                {selectedIds.size > 0 && (
                    <div className="space-y-2">
                        {totalItems > records.length && allPageSelected && (
                            <div className="bg-blue-500/10 dark:bg-blue-500/5 text-sm py-2.5 px-5 rounded-xl border border-blue-500/20 text-center flex items-center justify-center gap-2">
                                {selectAllMatching ? (
                                    <>
                                        <span className="text-gray-600 dark:text-gray-300 font-medium">All {totalItems.toLocaleString()} records matching this filter are selected.</span>
                                        <button onClick={() => setSelectAllMatching(false)} className="text-blue-500 hover:underline font-bold">Clear selection</button>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-gray-600 dark:text-gray-300 font-medium">All {records.length} records on this page are selected.</span>
                                        <button onClick={() => setSelectAllMatching(true)} className="text-blue-500 hover:underline font-bold">Select all {totalItems.toLocaleString()} records matching this filter</button>
                                    </>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-3 px-5 py-3 bg-blue-600/10 dark:bg-blue-900/20 border border-blue-500/30 rounded-xl">
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                {selectAllMatching ? `All ${totalItems.toLocaleString()}` : selectedIds.size} record{selectAllMatching || selectedIds.size !== 1 ? "s" : ""} selected
                            </span>
                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                onClick={() => { setBulkFields(BULK_EMPTY); setShowBulkUpdateModal(true); }}
                                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold shadow-md shadow-amber-500/20 transition-all"
                            >
                                <FaEdit className="text-xs" /> Bulk Update
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-md shadow-red-500/20 transition-all"
                            >
                                <FaTrash className="text-xs" /> Delete Selected
                            </button>
                            <button
                                onClick={clearSelection}
                                className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                    </div>
                )}

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
                                        {/* Checkbox — select all */}
                                        <th className="pl-4 pr-2 py-3.5 w-10">
                                            <input
                                                type="checkbox"
                                                checked={allPageSelected || selectAllMatching}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 cursor-pointer accent-blue-600"
                                            />
                                        </th>
                                        {["#", "School Name", "Student Name", "Class", "Board", "Phone", "Sec. Phone", "Year", "Area", "Centre", "Actions"].map((h, i) => (
                                            <th key={i} className="px-5 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {records.map((rec, idx) => {
                                        const isSelected = selectedIds.has(rec._id) || selectAllMatching;
                                        return (
                                        <tr key={rec._id} className={`transition-colors ${isSelected ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}>
                                            {/* Row checkbox */}
                                            <td className="pl-4 pr-2 py-3.5">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectRow(rec._id)}
                                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 cursor-pointer accent-blue-600"
                                                />
                                            </td>
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
                                            {/* Phone Number */}
                                            <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap text-xs">
                                                {rec.phoneNumber ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <FaPhone className="text-[8px] text-blue-400" />{rec.phoneNumber}
                                                    </span>
                                                ) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                                            </td>
                                            {/* Secondary Phone */}
                                            <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap text-xs">
                                                {rec.secondaryPhoneNumber ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <FaPhone className="text-[8px] text-indigo-400" />{rec.secondaryPhoneNumber}
                                                    </span>
                                                ) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                                            </td>
                                            {/* Year */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                {rec.year ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-700/40">
                                                        <FaCalendarAlt className="text-[8px]" />{rec.year}
                                                    </span>
                                                ) : <span className="text-gray-300 dark:text-gray-700">—</span>}
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
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                {rec.centre?.centreName ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-700/40">
                                                        <FaBuilding className="text-[8px]" />{rec.centre.centreName}
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
                                        );
                                    })}
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

                            {/* Phone Numbers */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">
                                        <FaPhone className="inline mr-1.5 text-blue-500" /> Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phoneNumber}
                                        onChange={e => setFormData(p => ({ ...p, phoneNumber: e.target.value }))}
                                        placeholder="e.g. 9876543210"
                                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-[#131619] text-gray-800 dark:text-white outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">
                                        <FaPhone className="inline mr-1.5 text-indigo-500" /> Secondary Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.secondaryPhoneNumber}
                                        onChange={e => setFormData(p => ({ ...p, secondaryPhoneNumber: e.target.value }))}
                                        placeholder="e.g. 9876543211"
                                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-[#131619] text-gray-800 dark:text-white outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Year */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">
                                    <FaCalendarAlt className="inline mr-1.5 text-teal-500" /> Year
                                </label>
                                <input
                                    type="text"
                                    value={formData.year}
                                    onChange={e => setFormData(p => ({ ...p, year: e.target.value }))}
                                    placeholder="e.g. 2025"
                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-[#131619] text-gray-800 dark:text-white outline-none transition-all"
                                />
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

                            {/* Centre — from active centres */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">
                                    <FaBuilding className="inline mr-1.5 text-sky-500" /> Centre
                                </label>
                                <select
                                    value={formData.centre}
                                    onChange={e => setFormData(p => ({ ...p, centre: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-[#131619] text-gray-800 dark:text-white outline-none transition-all appearance-none"
                                >
                                    <option value="">Select Centre (optional)</option>
                                    {activeCentres.map(c => (
                                        <option key={c._id} value={c._id}>{c.centreName}</option>
                                    ))}
                                </select>
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

            {/* ── Bulk Update Modal ── */}
            {showBulkUpdateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1a1f24] rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-amber-500 to-orange-500">
                            <div className="flex items-center gap-3">
                                <FaEdit className="text-white text-xl" />
                                <div>
                                    <h2 className="text-lg font-bold text-white">Bulk Update</h2>
                                    <p className="text-white/80 text-xs mt-0.5">{selectedIds.size} record{selectedIds.size !== 1 ? "s" : ""} selected — only enabled fields will be updated</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowBulkUpdateModal(false); setBulkFields(BULK_EMPTY); }} className="text-white/70 hover:text-white transition-colors">
                                <FaTimes />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-3 max-h-[65vh] overflow-y-auto">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Toggle the checkbox next to each field you want to update. Untoggled fields will not be changed.</p>

                            {/* Helper to render each bulk field row */}
                            {[
                                { key: "className", label: "Class", icon: <FaChalkboard className="text-amber-500 text-xs" />, type: "select",
                                    options: masterClasses.map(c => ({ value: c.name, label: c.name })) },
                                { key: "board", label: "Board", icon: <FaBook className="text-purple-500 text-xs" />, type: "select",
                                    options: masterBoards.map(b => ({ value: b.boardCourse, label: b.boardCourse })) },
                                { key: "phoneNumber", label: "Phone Number", icon: <FaPhone className="text-blue-500 text-xs" />, type: "tel" },
                                { key: "secondaryPhoneNumber", label: "Secondary Phone", icon: <FaPhone className="text-indigo-500 text-xs" />, type: "tel" },
                                { key: "year", label: "Year", icon: <FaCalendarAlt className="text-teal-500 text-xs" />, type: "text" },
                                { key: "area", label: "Area", icon: <FaMapMarkerAlt className="text-emerald-500 text-xs" />, type: "text" },
                                { key: "centre", label: "Centre", icon: <FaBuilding className="text-sky-500 text-xs" />, type: "select",
                                    options: [{value: "", label: "-- Clear Centre --"}, ...activeCentres.map(c => ({ value: c._id, label: c.centreName }))] },
                            ].map(({ key, label, icon, type, options }) => (
                                <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${bulkFields[key].enabled ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400/50" : "bg-gray-50 dark:bg-[#131619] border-gray-200 dark:border-gray-700"}`}>
                                    {/* Enable toggle */}
                                    <input
                                        type="checkbox"
                                        checked={bulkFields[key].enabled}
                                        onChange={e => setBulkFields(p => ({ ...p, [key]: { ...p[key], enabled: e.target.checked } }))}
                                        className="w-4 h-4 shrink-0 accent-blue-600 cursor-pointer"
                                    />
                                    <div className="flex items-center gap-1.5 w-36 shrink-0">
                                        {icon}
                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{label}</span>
                                    </div>
                                    {/* Field input — only active when enabled */}
                                    {type === "select" ? (
                                        <select
                                            disabled={!bulkFields[key].enabled}
                                            value={bulkFields[key].value}
                                            onChange={e => setBulkFields(p => ({ ...p, [key]: { ...p[key], value: e.target.value } }))}
                                            className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#131619] text-gray-800 dark:text-white outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all appearance-none"
                                        >
                                            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            type={type}
                                            disabled={!bulkFields[key].enabled}
                                            value={bulkFields[key].value}
                                            onChange={e => setBulkFields(p => ({ ...p, [key]: { ...p[key], value: e.target.value } }))}
                                            placeholder={`Set ${label} for all selected`}
                                            className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#131619] text-gray-800 dark:text-white outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 px-6 py-4 bg-gray-50 dark:bg-[#131619] border-t border-gray-100 dark:border-gray-800">
                            <button
                                onClick={() => { setShowBulkUpdateModal(false); setBulkFields(BULK_EMPTY); }}
                                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkUpdate}
                                disabled={bulkUpdateLoading || !Object.values(bulkFields).some(f => f.enabled)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {bulkUpdateLoading ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-4 h-4 inline-block"></span> : <FaCheck />}
                                {bulkUpdateLoading ? "Updating..." : `Update ${selectedIds.size} Record${selectedIds.size !== 1 ? "s" : ""}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default MasterDataSchoolData;
