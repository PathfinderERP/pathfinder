import React, { useState, useEffect, useRef } from "react";
import {
    FaPlus, FaEdit, FaTrash, FaSearch, FaFileImport, FaFileExport,
    FaSchool, FaTimes, FaCheck, FaFilter, FaChevronDown, FaBuilding, FaBook
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { hasPermission } from "../../../config/permissions";

const EMPTY_FORM = {
    centerName: "",
    schoolName: "",
    board: "",
    tier: "A",
    schoolAccess: "YES",
    status: "ONLY INFORMATION GIVEN TO STUDENTS",
    remarks: ""
};

// ─── Custom Multi-Select Dropdown Component ───────────────────────────────────
const MultiSelect = ({ options, selected, onChange, placeholder = "All" }) => {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const ref = useRef(null);
    const searchInputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (open && searchInputRef.current) {
            searchInputRef.current.focus();
        } else {
            setSearchQuery("");
        }
    }, [open]);

    const toggleOption = (val) => {
        onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
    };

    const label = selected.length === 0
        ? placeholder
        : selected.length === 1
            ? (options.find(o => o.value === selected[0] || o === selected[0])?.label || selected[0])
            : `${selected.length} selected`;

    const filteredOptions = options.filter((opt) => {
        const text = typeof opt === "object" ? opt.label : opt;
        return text && text.toString().toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`w-full flex items-center justify-between bg-gray-50 dark:bg-[#131619] border rounded-lg px-3 py-2.5 text-xs font-bold transition-all focus:outline-none ${open ? "border-cyan-500 ring-1 ring-cyan-500/20" : "border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700"
                    }`}
            >
                <span className={`truncate ${selected.length > 0 ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                    {label}
                </span>
                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {selected.length > 0 && (
                        <span
                            onClick={(e) => { e.stopPropagation(); onChange([]); }}
                            className="text-[9px] bg-cyan-600/20 text-cyan-500 border border-cyan-500/30 rounded px-1 py-0.5 font-black hover:bg-red-600/20 hover:text-red-400 cursor-pointer transition-colors"
                        >
                            ×{selected.length}
                        </span>
                    )}
                    <FaChevronDown className={`text-gray-400 text-[10px] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                </div>
            </button>

            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1f24] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-50 flex flex-col max-h-64 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 shrink-0">
                        <FaSearch className="text-gray-400 text-xs shrink-0" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-xs bg-transparent border-0 outline-none text-gray-800 dark:text-white placeholder-gray-500 p-0"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSearchQuery(""); }}
                                className="text-gray-400 hover:text-white"
                            >
                                <FaTimes className="text-[10px]" />
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto max-h-48 p-1">
                        {filteredOptions.length === 0 ? (
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest p-3 text-center">No options</p>
                        ) : (
                            filteredOptions.map((opt) => {
                                const val = typeof opt === "object" ? opt.value : opt;
                                const lbl = typeof opt === "object" ? opt.label : opt;
                                const isChecked = selected.includes(val);
                                return (
                                    <div
                                        key={val}
                                        onClick={() => toggleOption(val)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer select-none transition-colors ${isChecked ? "bg-cyan-500/10 text-cyan-400 font-bold" : "text-gray-300 hover:bg-white/5"
                                            }`}
                                    >
                                        <span className="truncate">{lbl}</span>
                                        {isChecked && <FaCheck className="text-cyan-400 text-xs shrink-0 ml-2" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function MasterDataSchoolForTaskContent() {
    const [schools, setSchools] = useState([]);
    const [centres, setCentres] = useState([]);
    const [boards, setBoards] = useState([]);
    const [distinctFields, setDistinctFields] = useState({ schools: [], tiers: [], accessLevels: [] });
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Filters
    const [search, setSearch] = useState("");
    const [selectedSchoolNames, setSelectedSchoolNames] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedBoards, setSelectedBoards] = useState([]);
    const [selectedTiers, setSelectedTiers] = useState([]);
    const [selectedAccessLevels, setSelectedAccessLevels] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState([]);

    // Sorting
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");
    const [selectedIds, setSelectedIds] = useState([]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Import modal
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [isAllSelected, setIsAllSelected] = useState(false); // true = all pages selected

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userRoleLower = (user.role || "").toLowerCase();
    const isSuperAdmin = userRoleLower === "superadmin" || userRoleLower === "super admin" || user.role === "superAdmin";
    const canCreate = isSuperAdmin || hasPermission(user.granularPermissions, "masterData", "schoolForTask", "create");
    const canEdit = isSuperAdmin || hasPermission(user.granularPermissions, "masterData", "schoolForTask", "edit");
    const canDelete = isSuperAdmin || hasPermission(user.granularPermissions, "masterData", "schoolForTask", "delete");

    useEffect(() => {
        const fetchCentresAndBoards = async () => {
            try {
                const [cRes, bRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${import.meta.env.VITE_API_URL}/board`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                if (cRes.ok) {
                    const cData = await cRes.json();
                    const cList = Array.isArray(cData) ? cData : (cData.centres || []);
                    setCentres(cList.filter((c) => c.status !== "deactive"));
                }
                if (bRes.ok) {
                    const bData = await bRes.json();
                    setBoards(Array.isArray(bData) ? bData : bData.data || []);
                }
            } catch (err) {
                console.error("Failed to load options", err);
            }
        };
        fetchCentresAndBoards();
    }, [token]);

    const fetchDistinctFields = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/school-for-task/distinct-fields`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDistinctFields(data);
            }
        } catch (err) {
            console.error("Failed to fetch distinct fields", err);
        }
    };

    useEffect(() => {
        fetchDistinctFields();
    }, [token]);

    const fetchSchools = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                limit: 50,
                search,
                schoolName: selectedSchoolNames.join(","),
                centerName: selectedCentres.join(","),
                board: selectedBoards.join(","),
                tier: selectedTiers.join(","),
                schoolAccess: selectedAccessLevels.join(","),
                status: selectedStatuses.join(","),
                sortBy,
                sortOrder
            });

            const res = await fetch(`${import.meta.env.VITE_API_URL}/school-for-task?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSchools(data.data || []);
                setTotalPages(data.totalPages || 1);
                setTotalItems(data.totalItems || 0);
            }
        } catch (err) {
            toast.error("Failed to load schools data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchools();
    }, [page, search, selectedSchoolNames, selectedCentres, selectedBoards, selectedTiers, selectedAccessLevels, selectedStatuses, sortBy, sortOrder, token]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleOpenModal = (record = null) => {
        if (record) {
            setCurrentRecord(record);
            setFormData({
                centerName: record.centerName?._id || record.centerName || "",
                schoolName: record.schoolName || "",
                board: record.board?._id || record.board || "",
                tier: record.tier || "A",
                schoolAccess: record.schoolAccess || "YES",
                status: record.status || "ONLY INFORMATION GIVEN TO STUDENTS",
                remarks: record.remarks || ""
            });
        } else {
            setCurrentRecord(null);
            setFormData({
                centerName: "",
                schoolName: "",
                board: "",
                tier: "A",
                schoolAccess: "YES",
                status: "ONLY INFORMATION GIVEN TO STUDENTS",
                remarks: ""
            });
        }
        setIsModalOpen(true);
    };

    const openModal = (record = null) => {
        handleOpenModal(record);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentRecord(null);
    };

    const handleSave = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!formData.schoolName.trim() || !formData.centerName) {
            toast.error("Please fill required fields (School Name & Center Name)");
            return;
        }

        setIsSubmitting(true);
        const payload = {
            ...formData,
            board: formData.board || null,
            remarks: formData.remarks || ""
        };

        try {
            const url = currentRecord
                ? `${import.meta.env.VITE_API_URL}/school-for-task/${currentRecord._id}`
                : `${import.meta.env.VITE_API_URL}/school-for-task`;
            const method = currentRecord ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const resData = await res.json();
            if (res.ok) {
                toast.success(resData.message || "Record saved successfully");
                closeModal();
                fetchSchools();
                fetchDistinctFields();
            } else {
                toast.error(resData.message || "Failed to save record");
            }
        } catch (err) {
            toast.error("Error connecting to server");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this school record?")) return;

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/school-for-task/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success("School record deleted");
                fetchSchools();
                fetchDistinctFields();
            } else {
                toast.error("Failed to delete record");
            }
        } catch (err) {
            toast.error("Error deleting record");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected schools?`)) return;

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/school-for-task/bulk-delete`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ids: selectedIds })
            });
            if (res.ok) {
                toast.success("Selected records deleted successfully");
                setSelectedIds([]);
                fetchSchools();
                fetchDistinctFields();
            } else {
                toast.error("Failed to delete selected records");
            }
        } catch (err) {
            toast.error("Server error during bulk delete");
        }
    };

    // Download Template Excel File
    const handleDownloadTemplate = () => {
        const sampleCentre = centres.length > 0 ? centres[0].centreName : "Kolkata Main";
        const sampleBoard = boards.length > 0 ? (boards[0].boardCourse || boards[0].name) : "CBSE";

        const templateData = [
            {
                "CenterName*": sampleCentre,
                "SchoolName*": "St. Xavier's High School",
                "Board": sampleBoard,
                "Tier": "A",
                "SCHOOLACCESS": "YES",
                "Status": "MOCK TEST TIE-UP",
                "Remarks": "Annual tie-up finalized"
            },
            {
                "CenterName*": sampleCentre,
                "SchoolName*": "Delhi Public School",
                "Board": sampleBoard,
                "Tier": "B",
                "SCHOOLACCESS": "NO",
                "Status": "ONLY INFORMATION GIVEN TO STUDENTS",
                "Remarks": "Pamphlets distributed"
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);

        // Auto column widths
        ws['!cols'] = [
            { wch: 25 },
            { wch: 35 },
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 40 },
            { wch: 30 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "SchoolForTask_Template");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(data, "SchoolForTask_Import_Template.xlsx");
    };

    // Export ALL data (respects current filters, fetches all pages from server)
    const handleExport = async () => {
        try {
            toast.info("Preparing export...", { autoClose: 1500 });
            const params = new URLSearchParams({
                search,
                schoolName: selectedSchoolNames.join(","),
                centerName: selectedCentres.join(","),
                board: selectedBoards.join(","),
                tier: selectedTiers.join(","),
                schoolAccess: selectedAccessLevels.join(","),
                status: selectedStatuses.join(",")
            });
            const res = await fetch(`${import.meta.env.VITE_API_URL}/school-for-task/export-all?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) { toast.error("Export failed"); return; }
            const { data: allData } = await res.json();

            const exportData = allData.map((s, idx) => ({
                "SL No": idx + 1,
                "Center Name": s.centerName?.centreName || "N/A",
                "School Name": s.schoolName || "",
                "Board": s.board?.boardCourse || s.board?.name || "N/A",
                "Tier": s.tier || "",
                "School Access": s.schoolAccess || "",
                "Status": s.status || "",
                "Remarks": s.remarks || ""
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "SchoolsForTask");
            const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
            saveAs(blob, `SchoolForTask_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
            toast.success(`Exported ${allData.length} records`);
        } catch (err) {
            toast.error("Export failed");
        }
    };

    // Import from Excel
    const handleBulkImportSubmit = async (e) => {
        e.preventDefault();
        if (!importFile) {
            toast.error("Please select an Excel file");
            return;
        }

        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // Map excel columns to CenterName / Board IDs where applicable
                const formattedRows = data.map(row => {
                    const cName = row["CenterName*"] || row["CenterName"] || row["Center Name*"] || row["Center Name"] || row["centerName"];
                    const sName = row["SchoolName*"] || row["SchoolName"] || row["School Name*"] || row["School Name"] || row["schoolName"];
                    const bName = row["Board"] || row["Board Name"] || row["board"];

                    const foundCentre = centres.find(c => c.centreName?.trim().toLowerCase() === String(cName).trim().toLowerCase());
                    const foundBoard = boards.find(b => (b.boardCourse || b.name)?.trim().toLowerCase() === String(bName).trim().toLowerCase());

                    return {
                        centerName: foundCentre ? foundCentre._id : cName,
                        schoolName: sName,
                        board: foundBoard ? foundBoard._id : bName,
                        tier: row["Tier"] || row["tier"] || "A",
                        schoolAccess: row["SCHOOLACCESS"] || row["SchoolAccess"] || row["School Access"] || row["schoolAccess"] || "YES",
                        status: row["Status"] || row["status"] || row["STATUS"] || "ONLY INFORMATION GIVEN TO STUDENTS",
                        remarks: row["Remarks"] || row["remarks"] || row["REMARKS"] || ""
                    };
                });

                const res = await fetch(`${import.meta.env.VITE_API_URL}/school-for-task/bulk-import`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(formattedRows)
                });
                const resData = await res.json();

                if (res.ok) {
                    toast.success(resData.message || "Bulk import complete");
                    setIsImportModalOpen(false);
                    setImportFile(null);
                    fetchSchools();
                    fetchDistinctFields();
                } else {
                    toast.error(resData.message || "Import failed");
                }
            } catch (err) {
                toast.error("Error processing Excel file");
            } finally {
                setImporting(false);
            }
        };
        reader.readAsBinaryString(importFile);
    };

    // Toggle select-all — fetches ALL matching IDs from server when selecting
    const toggleSelectAll = async () => {
        // If all pages are currently selected, clear everything
        if (isAllSelected) {
            setSelectedIds([]);
            setIsAllSelected(false);
            return;
        }
        // If current page is already all selected, escalate to selecting ALL pages
        const currentPageIds = schools.map(s => s._id);
        const currentPageAllSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id));
        if (currentPageAllSelected && selectedIds.length < totalItems) {
            // Fetch all IDs from server
            try {
                const params = new URLSearchParams({
                    search,
                    schoolName: selectedSchoolNames.join(","),
                    centerName: selectedCentres.join(","),
                    board: selectedBoards.join(","),
                    tier: selectedTiers.join(","),
                    schoolAccess: selectedAccessLevels.join(","),
                    status: selectedStatuses.join(",")
                });
                const res = await fetch(`${import.meta.env.VITE_API_URL}/school-for-task/all-ids?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const { ids } = await res.json();
                setSelectedIds(ids);
                setIsAllSelected(true);
                toast.success(`All ${ids.length} records selected`);
            } catch {
                toast.error("Failed to select all records");
            }
            return;
        }
        // Otherwise just toggle current page
        if (currentPageAllSelected) {
            setSelectedIds([]);
            setIsAllSelected(false);
        } else {
            setSelectedIds(prev => [...new Set([...prev, ...currentPageIds])]);
        }
    };

    const toggleSelectId = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    return (
        <div className="p-6 bg-[#131619] min-h-screen text-white">
            <ToastContainer position="top-right" theme="dark" />

            {/* Header Section */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
                        <FaSchool className="text-cyan-400" /> School For Task
                    </h2>
                    <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest font-semibold">
                        Manage Task Schools, Tiers & Access Levels ({totalItems} Records)
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {canDelete && selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 border border-red-500/30 text-red-400 font-bold rounded-xl hover:bg-red-600/40 transition-colors uppercase text-xs tracking-widest"
                        >
                            <FaTrash /> Delete ({selectedIds.length})
                        </button>
                    )}
                    <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl hover:bg-emerald-600/30 transition-colors uppercase text-xs tracking-widest"
                    >
                        <FaFileExport /> Download Template
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-300 font-bold rounded-xl hover:bg-gray-700 transition-colors uppercase text-xs tracking-widest"
                    >
                        <FaFileExport /> Export Data
                    </button>
                    {canCreate && (
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 text-cyan-400 font-bold rounded-xl hover:bg-gray-700 transition-colors uppercase text-xs tracking-widest"
                        >
                            <FaFileImport /> Import
                        </button>
                    )}
                    {canCreate && (
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-black font-black rounded-xl hover:bg-cyan-400 transition-all uppercase text-xs tracking-widest shadow-lg shadow-cyan-500/20"
                        >
                            <FaPlus /> Add School
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-[#1a1f24] p-4 rounded-2xl border border-gray-800 mb-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest">
                    <FaFilter /> Filters & Search
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* General Search */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Search</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search School..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-[#131619] border border-gray-800 rounded-lg pl-8 pr-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                            />
                            <FaSearch className="absolute left-2.5 top-3 text-gray-500 text-xs" />
                        </div>
                    </div>

                    {/* School Name MultiSelect */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">School Name</label>
                        <MultiSelect
                            options={distinctFields.schools}
                            selected={selectedSchoolNames}
                            onChange={setSelectedSchoolNames}
                            placeholder="All Schools"
                        />
                    </div>

                    {/* Center MultiSelect */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Center</label>
                        <MultiSelect
                            options={centres.map(c => ({ value: c._id, label: c.centreName }))}
                            selected={selectedCentres}
                            onChange={setSelectedCentres}
                            placeholder="All Centers"
                        />
                    </div>

                    {/* Board MultiSelect */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Board</label>
                        <MultiSelect
                            options={boards.map(b => ({ value: b._id, label: b.boardCourse || b.name }))}
                            selected={selectedBoards}
                            onChange={setSelectedBoards}
                            placeholder="All Boards"
                        />
                    </div>

                    {/* Tier MultiSelect */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Tier</label>
                        <MultiSelect
                            options={["A", "B", "C", "D", "E"]}
                            selected={selectedTiers}
                            onChange={setSelectedTiers}
                            placeholder="All Tiers"
                        />
                    </div>

                    {/* School Access MultiSelect */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Access Level</label>
                        <MultiSelect
                            options={["YES", "NO"]}
                            selected={selectedAccessLevels}
                            onChange={setSelectedAccessLevels}
                            placeholder="All Access"
                        />
                    </div>

                    {/* Status MultiSelect */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Status</label>
                        <MultiSelect
                            options={[
                                "MOCK TEST TIE-UP",
                                "CRP TIE-UP",
                                "(INDERICT TIE-UP) WORKSHOP /PNTSE/PMO/PSAT",
                                "ONLY INFORMATION GIVEN TO STUDENTS"
                            ]}
                            selected={selectedStatuses}
                            onChange={setSelectedStatuses}
                            placeholder="All Statuses"
                        />
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#131619] text-gray-400 text-[10px] font-black uppercase tracking-[0.15em] border-b border-gray-800">
                                <th className="p-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={schools.length > 0 && schools.every(s => selectedIds.includes(s._id))}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-0 cursor-pointer"
                                    />
                                </th>
                                <th className="p-4">#</th>
                                <th className="p-4">Center Name</th>
                                <th className="p-4">School Name</th>
                                <th className="p-4">Board</th>
                                <th className="p-4">Tier</th>
                                <th className="p-4">School Access</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Remarks</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        {/* Select-all-pages banner */}
                        {schools.every(s => selectedIds.includes(s._id)) && schools.length > 0 && !isAllSelected && selectedIds.length < totalItems && (
                            <tbody>
                                <tr>
                                    <td colSpan="10" className="bg-cyan-500/10 border-b border-cyan-500/20 px-4 py-2 text-center text-xs font-bold text-cyan-300">
                                        All {schools.length} records on this page are selected.{" "}
                                        <button
                                            onClick={toggleSelectAll}
                                            className="underline text-cyan-400 hover:text-white transition-colors"
                                        >
                                            Select all {totalItems} records
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        )}
                        {isAllSelected && (
                            <tbody>
                                <tr>
                                    <td colSpan="10" className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 text-center text-xs font-bold text-emerald-300">
                                        All {selectedIds.length} records are selected.{" "}
                                        <button
                                            onClick={() => { setSelectedIds([]); setIsAllSelected(false); }}
                                            className="underline text-emerald-400 hover:text-white transition-colors"
                                        >
                                            Clear selection
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        )}
                        <tbody className="divide-y divide-gray-800 text-xs font-semibold">
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="p-8 text-center text-gray-500 font-mono uppercase tracking-widest text-xs">
                                        Loading Schools...
                                    </td>
                                </tr>
                            ) : schools.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="p-8 text-center text-gray-500 italic">
                                        No school records found matching filters
                                    </td>
                                </tr>
                            ) : (
                                schools.map((row, index) => (
                                    <tr key={row._id} className="hover:bg-white/5 transition-all">
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(row._id)}
                                                onChange={() => toggleSelectId(row._id)}
                                                className="rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-0 cursor-pointer"
                                            />
                                        </td>
                                        <td className="p-4 text-gray-500 font-mono">{(page - 1) * 50 + index + 1}</td>
                                        <td className="p-4 font-bold text-gray-200">
                                            <span className="flex items-center gap-2">
                                                <FaBuilding className="text-cyan-400 text-xs" />
                                                {row.centerName?.centreName || "—"}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-white uppercase">{row.schoolName}</td>
                                        <td className="p-4 text-gray-300">
                                            <span className="flex items-center gap-2">
                                                <FaBook className="text-purple-400 text-xs" />
                                                {row.board?.boardCourse || row.board?.name || "—"}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${row.tier === "A" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                    row.tier === "B" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                                        row.tier === "C" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                                            "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                                                }`}>
                                                {row.tier}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${row.schoolAccess === "YES" || row.schoolAccess === "open" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                    "bg-red-500/10 text-red-400 border border-red-500/20"
                                                }`}>
                                                {row.schoolAccess}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${row.status === "MOCK TEST TIE-UP" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                                                    row.status === "CRP TIE-UP" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                                                        row.status?.includes("WORKSHOP") ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                                            "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                                                }`}>
                                                {row.status || "—"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-400 text-xs max-w-[200px] truncate" title={row.remarks || ""}>
                                            {row.remarks || "—"}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {canEdit && (
                                                    <button
                                                        onClick={() => openModal(row)}
                                                        className="p-2 text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                                        title="Edit Record"
                                                    >
                                                        <FaEdit size={14} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(row._id)}
                                                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                        title="Delete Record"
                                                    >
                                                        <FaTrash size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Bar */}
                <div className="p-4 border-t border-gray-800 bg-[#131619] flex items-center justify-between text-xs font-bold text-gray-400">
                    <div>
                        Showing Page <span className="text-white">{page}</span> of <span className="text-white">{totalPages}</span> ({totalItems} Total Records)
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-700 text-white uppercase text-[10px]"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-700 text-white uppercase text-[10px]"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1f24] p-6 rounded-2xl w-full max-w-lg border border-gray-800 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white uppercase tracking-tight">
                                {currentRecord ? "Edit School Record" : "Add New School"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-500 hover:text-white">
                                <FaTimes size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
                            {/* Center Select */}
                            <div>
                                <label className="block text-gray-400 uppercase text-[10px] font-black mb-1">Center Name *</label>
                                <select
                                    required
                                    value={formData.centerName}
                                    onChange={(e) => setFormData({ ...formData, centerName: e.target.value })}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 font-bold"
                                >
                                    <option value="">Select Center...</option>
                                    {centres.map(c => (
                                        <option key={c._id} value={c._id}>{c.centreName}</option>
                                    ))}
                                </select>
                            </div>

                            {/* School Name */}
                            <div>
                                <label className="block text-gray-400 uppercase text-[10px] font-black mb-1">School Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter school name"
                                    value={formData.schoolName}
                                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 font-bold uppercase"
                                />
                            </div>

                            {/* Board Select */}
                            <div>
                                <label className="block text-gray-400 uppercase text-[10px] font-black mb-1">Board</label>
                                <select
                                    value={formData.board}
                                    onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 font-bold"
                                >
                                    <option value="">Select Board...</option>
                                    {boards.map(b => (
                                        <option key={b._id} value={b._id}>{b.boardCourse || b.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Tier */}
                            <div>
                                <label className="block text-gray-400 uppercase text-[10px] font-black mb-1">Tier</label>
                                <select
                                    value={formData.tier}
                                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 font-bold"
                                >
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                    <option value="E">E</option>
                                </select>
                            </div>

                            {/* Access Level */}
                            <div>
                                <label className="block text-gray-400 uppercase text-[10px] font-black mb-1">School Access Level</label>
                                <select
                                    value={formData.schoolAccess}
                                    onChange={(e) => setFormData({ ...formData, schoolAccess: e.target.value })}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 font-bold"
                                >
                                    <option value="YES">YES</option>
                                    <option value="NO">NO</option>
                                </select>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-gray-400 uppercase text-[10px] font-black mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 font-bold"
                                >
                                    <option value="MOCK TEST TIE-UP">MOCK TEST TIE-UP</option>
                                    <option value="CRP TIE-UP">CRP TIE-UP</option>
                                    <option value="(INDERICT TIE-UP) WORKSHOP /PNTSE/PMO/PSAT">(INDERICT TIE-UP) WORKSHOP /PNTSE/PMO/PSAT</option>
                                    <option value="ONLY INFORMATION GIVEN TO STUDENTS">ONLY INFORMATION GIVEN TO STUDENTS</option>
                                    <option value="OTHERS">OTHERS</option>
                                </select>
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block text-gray-400 uppercase text-[10px] font-black mb-1">Remarks</label>
                                <textarea
                                    rows="2"
                                    placeholder="Enter remarks..."
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 font-bold resize-none"
                                />
                            </div>

                            {/* Modal Buttons */}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl font-bold uppercase text-xs hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-cyan-500 text-black rounded-xl font-black uppercase text-xs hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
                                >
                                    {isSubmitting ? "Saving..." : currentRecord ? "Update Record" : "Save Record"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Excel Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1f24] p-6 rounded-2xl w-full max-w-md border border-gray-800 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Bulk Import Excel</h3>
                            <button onClick={() => setIsImportModalOpen(false)} className="text-gray-500 hover:text-white">
                                <FaTimes size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleBulkImportSubmit} className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-gray-400 text-xs font-bold">
                                        Select Excel File
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleDownloadTemplate}
                                        className="text-[10px] text-cyan-400 hover:underline font-bold uppercase"
                                    >
                                        Download Template
                                    </button>
                                </div>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={(e) => setImportFile(e.target.files[0])}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-xl p-3 text-xs text-gray-300 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-500/20 file:text-cyan-400 hover:file:bg-cyan-500/30 cursor-pointer"
                                />
                            </div>

                            <div className="bg-[#131619] p-3 rounded-xl border border-gray-800 text-[11px] text-gray-400 space-y-1 font-semibold">
                                <p className="text-white font-bold uppercase text-[10px] tracking-wider mb-1.5">Column Requirements:</p>
                                <p><span className="text-emerald-400 font-bold">CenterName*</span> — Must match Master Centre name</p>
                                <p><span className="text-emerald-400 font-bold">SchoolName*</span> — School Name</p>
                                <p><span className="text-cyan-400 font-bold">Board</span> — Must match Master Board name (e.g. CBSE)</p>
                                <p><span className="text-gray-300 font-bold">Tier</span> — A / B / C / D / E</p>
                                <p><span className="text-gray-300 font-bold">SCHOOLACCESS</span> — YES / NO</p>
                                <p><span className="text-purple-400 font-bold">Status</span> — MOCK TEST TIE-UP / CRP TIE-UP / (INDERICT TIE-UP) WORKSHOP /PNTSE/PMO/PSAT / ONLY INFORMATION GIVEN TO STUDENTS</p>
                                <p><span className="text-gray-300 font-bold">Remarks</span> — Optional remarks</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsImportModalOpen(false)}
                                    className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-xl font-bold uppercase text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={importing}
                                    className="flex-1 py-3 bg-cyan-500 text-black rounded-xl font-black uppercase text-xs hover:bg-cyan-400"
                                >
                                    {importing ? "Importing..." : "Start Import"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
