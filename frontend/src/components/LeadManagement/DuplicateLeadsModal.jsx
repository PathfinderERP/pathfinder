import React, { useState, useMemo } from "react";
import {
    FaTimes, FaCopy, FaCheck, FaFileExcel, FaExclamationTriangle,
    FaSearch, FaPhoneAlt, FaBuilding, FaBookOpen, FaDownload,
    FaDatabase, FaClone, FaLayerGroup
} from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const DuplicateLeadsModal = ({ isOpen, onClose, duplicates = [], totalUploaded = 0, isDarkMode }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all"); // "all" | "db" | "file"
    const [copiedNumbers, setCopiedNumbers] = useState(false);
    const [copiedTable, setCopiedTable] = useState(false);
    const [copiedRowIdx, setCopiedRowIdx] = useState(null);

    const filteredDuplicates = useMemo(() => {
        if (!duplicates || !Array.isArray(duplicates)) return [];
        return duplicates.filter(item => {
            const matchesType =
                filterType === "all" ||
                (filterType === "db" && item.duplicateType?.toLowerCase().includes("database")) ||
                (filterType === "file" && item.duplicateType?.toLowerCase().includes("file"));

            if (!matchesType) return false;

            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            const name = (item.name || "").toLowerCase();
            const phone = String(item.phoneNumber || "").toLowerCase();
            const secPhone = String(item.secondPhoneNumber || "").toLowerCase();
            const centre = (item.centre || "").toLowerCase();
            const course = (item.course || "").toLowerCase();
            const school = (item.schoolName || "").toLowerCase();
            const reason = (item.reason || "").toLowerCase();

            return (
                name.includes(q) ||
                phone.includes(q) ||
                secPhone.includes(q) ||
                centre.includes(q) ||
                course.includes(q) ||
                school.includes(q) ||
                reason.includes(q)
            );
        });
    }, [duplicates, searchQuery, filterType]);

    const counts = useMemo(() => {
        const total = duplicates?.length || 0;
        const dbCount = duplicates.filter(d => d.duplicateType?.toLowerCase().includes("database")).length;
        const fileCount = duplicates.filter(d => d.duplicateType?.toLowerCase().includes("file")).length;
        return { total, dbCount, fileCount };
    }, [duplicates]);

    if (!isOpen || !duplicates || duplicates.length === 0) return null;

    // Copy helper that works reliably in all contexts
    const copyToClipboard = async (text) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand("copy");
            document.body.removeChild(textArea);
            return successful;
        } catch (err) {
            console.error("Clipboard copy error:", err);
            return false;
        }
    };

    // 1. Copy All Phone Numbers
    const handleCopyAllNumbers = async () => {
        const numbers = Array.from(
            new Set(
                filteredDuplicates
                    .map(d => d.phoneNumber ? String(d.phoneNumber).trim() : "")
                    .filter(Boolean)
            )
        );

        if (numbers.length === 0) {
            toast.info("No phone numbers available to copy.");
            return;
        }

        const text = numbers.join(", ");
        const ok = await copyToClipboard(text);
        if (ok) {
            setCopiedNumbers(true);
            toast.success(`Copied ${numbers.length} duplicate phone number(s) to clipboard!`);
            setTimeout(() => setCopiedNumbers(false), 2500);
        } else {
            toast.error("Failed to copy phone numbers.");
        }
    };

    // 2. Copy Entire Table as TSV (Spreadsheet friendly)
    const handleCopyTable = async () => {
        if (filteredDuplicates.length === 0) {
            toast.info("No data available to copy.");
            return;
        }

        const headers = ["Row", "Name", "Mobile Number", "Second Mobile", "Centre", "Course", "Class", "Board", "School", "Duplicate Type", "Reason"];
        const rows = filteredDuplicates.map(d => [
            d.row || "",
            d.name || "",
            d.phoneNumber || "",
            d.secondPhoneNumber || "",
            d.centre || "",
            d.course || "",
            d.className || "",
            d.board || "",
            d.schoolName || "",
            d.duplicateType || "Duplicate",
            d.reason || ""
        ]);

        const tsv = [
            headers.join("\t"),
            ...rows.map(r => r.join("\t"))
        ].join("\n");

        const ok = await copyToClipboard(tsv);
        if (ok) {
            setCopiedTable(true);
            toast.success(`Copied ${filteredDuplicates.length} duplicate row(s) to clipboard!`);
            setTimeout(() => setCopiedTable(false), 2500);
        } else {
            toast.error("Failed to copy table data.");
        }
    };

    // 3. Copy Individual Phone Number
    const handleCopySingleNumber = async (phone, idx) => {
        if (!phone) return;
        const ok = await copyToClipboard(String(phone).trim());
        if (ok) {
            setCopiedRowIdx(idx);
            toast.success(`Copied ${phone}`);
            setTimeout(() => setCopiedRowIdx(null), 2000);
        }
    };

    // 4. Export Duplicate Leads to Excel
    const handleExportExcel = () => {
        if (!filteredDuplicates || filteredDuplicates.length === 0) {
            toast.warning("No duplicate leads to export.");
            return;
        }

        const data = filteredDuplicates.map((item, index) => ({
            "Sl No.": index + 1,
            "Excel Row": item.row || "N/A",
            "Student Name": item.name || "N/A",
            "Mobile No": item.phoneNumber || "N/A",
            "Second Mobile No": item.secondPhoneNumber || "N/A",
            "Centre": item.centre || "N/A",
            "Course Name": item.course || "N/A",
            "Class": item.className || "N/A",
            "Board": item.board || "N/A",
            "School": item.schoolName || "N/A",
            "Target Source": item.source || "N/A",
            "Duplicate Type": item.duplicateType || "Duplicate",
            "Duplicate Reason": item.reason || "Duplicate lead entry"
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // Adjust column widths automatically
        const colWidths = [
            { wch: 8 },  // Sl No
            { wch: 10 }, // Excel Row
            { wch: 25 }, // Name
            { wch: 15 }, // Mobile No
            { wch: 16 }, // Second Mobile
            { wch: 18 }, // Centre
            { wch: 20 }, // Course Name
            { wch: 10 }, // Class
            { wch: 12 }, // Board
            { wch: 22 }, // School
            { wch: 15 }, // Target Source
            { wch: 20 }, // Duplicate Type
            { wch: 55 }, // Duplicate Reason
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, "Duplicate Leads");
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbout], { type: "application/octet-stream" });
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        saveAs(blob, `Duplicate_Leads_Report_${timestamp}.xlsx`);
        toast.success(`Exported ${filteredDuplicates.length} duplicate lead(s) to Excel!`);
    };

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center z-[110] p-4 backdrop-blur-md animate-fadeIn ${
                isDarkMode ? 'bg-black/80' : 'bg-black/60'
            }`}
            onClick={onClose}
        >
            <div
                className={`w-full max-w-6xl rounded-[4px] border shadow-2xl transition-all overflow-hidden flex flex-col max-h-[92vh] ${
                    isDarkMode ? 'bg-[#14181d] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Top Header ── */}
                <div className={`px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0 ${
                    isDarkMode ? 'bg-[#181f26] border-gray-800' : 'bg-gray-50 border-gray-200'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                            <FaExclamationTriangle size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="text-base font-black uppercase tracking-tight italic">
                                    Duplicate Leads Detected
                                </h3>
                                <span className="px-2 py-0.5 rounded-[2px] text-[9px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    {counts.total} Duplicate{counts.total !== 1 ? 's' : ''}
                                </span>
                                {totalUploaded > 0 && (
                                    <span className="px-2 py-0.5 rounded-[2px] text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                        {totalUploaded} Uploaded Successfully
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                Review duplicate phone numbers, copy data, or export to Excel
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={onClose}
                            className={`p-1.5 rounded transition-colors ${
                                isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-600'
                            }`}
                            title="Close modal"
                        >
                            <FaTimes size={16} />
                        </button>
                    </div>
                </div>

                {/* ── Action Toolbar ── */}
                <div className={`px-6 py-3 border-b flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-shrink-0 ${
                    isDarkMode ? 'bg-[#101418] border-gray-800/80' : 'bg-gray-100/70 border-gray-200'
                }`}>
                    {/* Search bar & filter pills */}
                    <div className="flex items-center gap-2 flex-1">
                        <div className={`relative flex-1 max-w-sm rounded border flex items-center ${
                            isDarkMode ? 'bg-[#181f26] border-gray-700' : 'bg-white border-gray-300'
                        }`}>
                            <FaSearch size={11} className="ml-3 text-gray-400 shrink-0" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, number, centre, reason..."
                                className="w-full py-1.5 px-2.5 text-xs font-semibold bg-transparent outline-none placeholder-gray-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="mr-2 text-gray-400 hover:text-white text-xs"
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        {/* Filter Tabs */}
                        <div className="hidden sm:flex items-center gap-1">
                            <button
                                onClick={() => setFilterType("all")}
                                className={`px-2.5 py-1 rounded-[2px] text-[9px] font-black uppercase tracking-wider transition-all ${
                                    filterType === "all"
                                        ? 'bg-amber-500 text-black shadow-sm font-black'
                                        : (isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-200 text-gray-600')
                                }`}
                            >
                                All ({counts.total})
                            </button>
                            <button
                                onClick={() => setFilterType("db")}
                                className={`px-2.5 py-1 rounded-[2px] text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                    filterType === "db"
                                        ? 'bg-red-500 text-white shadow-sm font-black'
                                        : (isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-200 text-gray-600')
                                }`}
                                title="Duplicates that already exist in database"
                            >
                                <FaDatabase size={8} /> DB ({counts.dbCount})
                            </button>
                            <button
                                onClick={() => setFilterType("file")}
                                className={`px-2.5 py-1 rounded-[2px] text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                    filterType === "file"
                                        ? 'bg-blue-500 text-white shadow-sm font-black'
                                        : (isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-200 text-gray-600')
                                }`}
                                title="Duplicates repeated inside this uploaded file"
                            >
                                <FaClone size={8} /> In-File ({counts.fileCount})
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons: Copy Numbers / Copy Table / Export Excel */}
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <button
                            onClick={handleCopyAllNumbers}
                            className={`px-3 py-1.5 rounded-[2px] text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                                copiedNumbers
                                    ? 'bg-emerald-500 text-black border-emerald-400'
                                    : (isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700' : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300')
                            }`}
                            title="Copy all duplicate phone numbers (comma-separated)"
                        >
                            {copiedNumbers ? <FaCheck size={10} /> : <FaCopy size={10} className="text-cyan-400" />}
                            {copiedNumbers ? "Numbers Copied!" : "Copy Numbers"}
                        </button>

                        <button
                            onClick={handleCopyTable}
                            className={`px-3 py-1.5 rounded-[2px] text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                                copiedTable
                                    ? 'bg-emerald-500 text-black border-emerald-400'
                                    : (isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700' : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300')
                            }`}
                            title="Copy entire duplicate table to clipboard for pasting into Excel/Sheets"
                        >
                            {copiedTable ? <FaCheck size={10} /> : <FaLayerGroup size={10} className="text-amber-400" />}
                            {copiedTable ? "Table Copied!" : "Copy Table"}
                        </button>

                        <button
                            onClick={handleExportExcel}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-[2px] text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Download duplicate records as an Excel file (.xlsx)"
                        >
                            <FaDownload size={10} />
                            Export Excel
                        </button>
                    </div>
                </div>

                {/* ── Table Content ── */}
                <div className="flex-1 overflow-auto custom-scrollbar-bulk p-4">
                    {filteredDuplicates.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 text-xs font-bold uppercase tracking-wider">
                            No duplicate records match the search filter
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className={`sticky top-0 z-10 border-b ${
                                isDarkMode ? 'bg-[#181f26] border-gray-800 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'
                            }`}>
                                <tr className="text-[9px] font-black uppercase tracking-wider">
                                    <th className="px-3 py-2.5 w-12 text-center">Row</th>
                                    <th className="px-4 py-2.5">Student Name</th>
                                    <th className="px-4 py-2.5">Mobile Number</th>
                                    <th className="px-4 py-2.5">Second Mobile</th>
                                    <th className="px-4 py-2.5">Centre / Course</th>
                                    <th className="px-4 py-2.5">Duplicate Type</th>
                                    <th className="px-4 py-2.5">Duplicate Reason</th>
                                    <th className="px-3 py-2.5 text-center w-16">Action</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${
                                isDarkMode ? 'divide-gray-800/80 bg-[#12161b]' : 'divide-gray-100 bg-white'
                            }`}>
                                {filteredDuplicates.map((item, idx) => {
                                    const isDb = item.duplicateType?.toLowerCase().includes("database");
                                    return (
                                        <tr
                                            key={idx}
                                            className={`transition-colors ${
                                                isDarkMode ? 'hover:bg-amber-500/5' : 'hover:bg-amber-50/50'
                                            }`}
                                        >
                                            {/* Row */}
                                            <td className="px-3 py-3 text-center">
                                                <span className={`px-1.5 py-0.5 rounded-[2px] text-[8px] font-black ${
                                                    isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {item.row ? `Row ${item.row}` : `#${idx + 1}`}
                                                </span>
                                            </td>

                                            {/* Name */}
                                            <td className="px-4 py-3">
                                                <div className="font-black text-xs uppercase tracking-tight">
                                                    {item.name || "N/A"}
                                                </div>
                                                {item.schoolName && (
                                                    <div className="text-[9px] text-gray-400 italic truncate max-w-[150px]">
                                                        {item.schoolName}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Primary Phone */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono font-black text-xs text-cyan-400 tracking-wider">
                                                        {item.phoneNumber || "No Phone"}
                                                    </span>
                                                    {item.phoneNumber && (
                                                        <button
                                                            onClick={() => handleCopySingleNumber(item.phoneNumber, idx)}
                                                            className={`p-1 rounded transition-colors ${
                                                                copiedRowIdx === idx
                                                                    ? 'text-emerald-400 bg-emerald-500/10'
                                                                    : 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10'
                                                            }`}
                                                            title="Copy phone number"
                                                        >
                                                            {copiedRowIdx === idx ? <FaCheck size={9} /> : <FaCopy size={9} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Second Phone */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`text-[10px] font-bold ${
                                                    item.secondPhoneNumber ? (isDarkMode ? 'text-gray-300' : 'text-gray-700') : 'text-gray-500'
                                                }`}>
                                                    {item.secondPhoneNumber || "—"}
                                                </span>
                                            </td>

                                            {/* Centre / Course */}
                                            <td className="px-4 py-3">
                                                <div className="text-[10px] font-black uppercase text-amber-400 truncate max-w-[140px]">
                                                    {item.centre || "No Centre"}
                                                </div>
                                                <div className="text-[9px] font-bold text-gray-400 truncate max-w-[140px]">
                                                    {item.course || "No Course"}
                                                    {item.className ? ` • Cl ${item.className}` : ''}
                                                </div>
                                            </td>

                                            {/* Duplicate Type */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest border ${
                                                    isDb
                                                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                }`}>
                                                    {item.duplicateType || "Duplicate"}
                                                </span>
                                            </td>

                                            {/* Reason */}
                                            <td className="px-4 py-3">
                                                <div className="text-[10px] font-medium leading-relaxed max-w-[320px]">
                                                    {item.reason}
                                                </div>
                                            </td>

                                            {/* Action: Copy Row Phone */}
                                            <td className="px-3 py-3 text-center">
                                                <button
                                                    onClick={() => handleCopySingleNumber(item.phoneNumber, idx)}
                                                    className="px-2 py-1 rounded-[2px] text-[8px] font-black uppercase tracking-wider bg-cyan-500/10 hover:bg-cyan-500 hover:text-black text-cyan-400 transition-all border border-cyan-500/20"
                                                    title="Copy phone"
                                                >
                                                    Copy
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className={`px-6 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 ${
                    isDarkMode ? 'bg-[#181f26] border-gray-800' : 'bg-gray-50 border-gray-200'
                }`}>
                    <div className="text-[10px] font-bold text-gray-400">
                        Showing {filteredDuplicates.length} of {duplicates.length} duplicate lead(s).
                        <span className="hidden md:inline ml-2 text-gray-500">
                            (These rows were not inserted to preserve database uniqueness)
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2 rounded-[2px] text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <FaDownload size={10} />
                            Download Excel ({filteredDuplicates.length})
                        </button>
                        <button
                            onClick={onClose}
                            className={`px-4 py-2 rounded-[2px] text-[10px] font-black uppercase tracking-widest transition-all ${
                                isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DuplicateLeadsModal;
