import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
    FaTimes,
    FaFileExcel,
    FaDownload,
    FaUpload,
    FaCheckCircle,
    FaExclamationTriangle,
    FaInfoCircle
} from "react-icons/fa";
import { toast } from "react-toastify";

const ExamImportModal = ({
    isOpen,
    onClose,
    onSuccess,
    isDarkMode = true
}) => {
    const [file, setFile] = useState(null);
    const [previewRows, setPreviewRows] = useState([]);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleDownloadTemplate = () => {
        try {
            const templateData = [
                {
                    "Exam Name": "Class 10 Mid-Term Assessment",
                    "Class": "Class 10, Class 9",
                    "Session": "2025-2026",
                    "Centers": "Gariahat, Howrah, Salt Lake",
                    "From Date": "2026-10-10",
                    "To Date": "2026-10-20",
                    "From Time": "10:00 AM",
                    "To Time": "01:00 PM",
                    "Days": "Monday, Wednesday, Friday",
                    "Status": "Scheduled",
                    "Remarks": "Admit card mandatory for all students"
                },
                {
                    "Exam Name": "JEE Main Mock Test Series 1",
                    "Class": "Class 11, Class 12",
                    "Session": "2025-2026",
                    "Centers": "All Centres, Durgapur Hub",
                    "From Date": "2026-11-01",
                    "To Date": "2026-11-07",
                    "From Time": "09:00 AM",
                    "To Time": "12:00 PM",
                    "Days": "Saturday, Sunday",
                    "Status": "Scheduled",
                    "Remarks": "Online CBT and OMR mode"
                }
            ];

            const ws = XLSX.utils.json_to_sheet(templateData);
            // Set friendly column widths
            ws["!cols"] = [
                { wch: 30 },
                { wch: 20 },
                { wch: 15 },
                { wch: 32 },
                { wch: 14 },
                { wch: 14 },
                { wch: 12 },
                { wch: 12 },
                { wch: 28 },
                { wch: 14 },
                { wch: 35 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Exam_Schedule_Template");
            XLSX.writeFile(wb, "exam_schedule_sample_template.xlsx");
            toast.success("Sample template downloaded successfully");
        } catch (error) {
            console.error("Error downloading template:", error);
            toast.error("Failed to download template");
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: "array", cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                if (jsonData.length === 0) {
                    toast.error("The selected file contains no rows");
                    setPreviewRows([]);
                    return;
                }

                // Format parsed rows
                const formatted = jsonData.map((row, idx) => {
                    const rawFrom = row["From Date"] || row["from_date"] || row["fromDate"];
                    const rawTo = row["To Date"] || row["to_date"] || row["toDate"];

                    const formatDate = (val) => {
                        if (!val) return "";
                        if (val instanceof Date) return val.toISOString().split("T")[0];
                        const parsed = new Date(val);
                        return !isNaN(parsed.getTime()) ? parsed.toISOString().split("T")[0] : String(val);
                    };

                    return {
                        _rowId: idx + 1,
                        examName: String(row["Exam Name"] || row["exam_name"] || row["examName"] || "").trim(),
                        className: String(row["Class"] || row["class_name"] || row["className"] || "").trim(),
                        session: String(row["Session"] || row["session_name"] || row["session"] || "").trim(),
                        centers: String(row["Centers"] || row["Center"] || row["center"] || row["centers"] || "").trim(),
                        fromDate: formatDate(rawFrom),
                        toDate: formatDate(rawTo),
                        fromTime: String(row["From Time"] || row["from_time"] || row["fromTime"] || "10:00 AM").trim(),
                        toTime: String(row["To Time"] || row["to_time"] || row["toTime"] || "01:00 PM").trim(),
                        days: String(row["Days"] || row["Week Days"] || row["days"] || "").trim(),
                        status: String(row["Status"] || row["status"] || "Scheduled").trim(),
                        description: String(row["Remarks"] || row["Description"] || row["description"] || "").trim(),
                        isValid: Boolean(
                            (row["Exam Name"] || row["examName"]) &&
                            (row["Class"] || row["className"]) &&
                            (row["Session"] || row["session"]) &&
                            (row["Centers"] || row["Center"] || row["centers"]) &&
                            rawFrom &&
                            rawTo
                        )
                    };
                });

                setPreviewRows(formatted);
                toast.info(`Loaded ${formatted.length} row(s) from file for preview`);
            } catch (err) {
                console.error("Error reading file:", err);
                toast.error("Failed to parse file. Please verify format.");
            }
        };

        reader.readAsArrayBuffer(selectedFile);
    };

    const handleImportSubmit = async () => {
        if (previewRows.length === 0) {
            toast.warn("No rows to import");
            return;
        }

        const validRows = previewRows.filter(r => r.isValid);
        if (validRows.length === 0) {
            toast.error("None of the rows are valid. Please verify required columns.");
            return;
        }

        try {
            setImporting(true);
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/operations/exam-schedule/import`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(validRows)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Import failed");
            }

            toast.success(data.message || `Successfully imported ${data.importedCount} exams`);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error during import:", error);
            toast.error(error.message || "Failed to import exam schedules");
        } finally {
            setImporting(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPreviewRows([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
            <div
                className={`relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl transition-all my-6 ${
                    isDarkMode
                        ? "bg-[#181d22] border-gray-800 text-gray-100"
                        : "bg-white border-gray-200 text-gray-900"
                }`}
            >
                {/* Header */}
                <div
                    className={`flex items-center justify-between px-6 py-5 border-b rounded-t-3xl ${
                        isDarkMode
                            ? "border-gray-800 bg-[#14181c]"
                            : "border-gray-100 bg-gray-50"
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <FaFileExcel className="text-xl" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">
                                Import Exam Schedules
                            </h2>
                            <p className="text-xs text-gray-400">
                                Bulk upload exam timetable from Excel (.xlsx, .xls) or CSV spreadsheets
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2.5 rounded-full transition-colors ${
                            isDarkMode
                                ? "hover:bg-gray-800 text-gray-400 hover:text-white"
                                : "hover:bg-gray-200 text-gray-500 hover:text-gray-900"
                        }`}
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Top Guide & Sample Download */}
                    <div
                        className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                            isDarkMode
                                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-200"
                                : "bg-emerald-50 border-emerald-200 text-emerald-800"
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <FaInfoCircle className="text-xl shrink-0 text-emerald-400" />
                            <div className="text-xs">
                                <p className="font-bold mb-0.5">Need the correct column format?</p>
                                <p className="text-gray-400">
                                    Multiple centres and weekdays should be comma-separated (e.g. "Gariahat, Howrah" and "Mon, Wed, Fri").
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2 shadow-sm transition-all shrink-0"
                        >
                            <FaDownload /> Download Sample Template
                        </button>
                    </div>

                    {/* Dropzone */}
                    {!file ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                                isDarkMode
                                    ? "border-gray-700 bg-gray-800/20 hover:border-emerald-500 hover:bg-emerald-500/5"
                                    : "border-gray-300 bg-gray-50 hover:border-emerald-500 hover:bg-emerald-50"
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 mb-3">
                                <FaUpload className="text-2xl" />
                            </div>
                            <p className="text-sm font-bold mb-1">Click or drag & drop file to upload</p>
                            <p className="text-xs text-gray-500">Supports Excel (.xlsx, .xls) and CSV</p>
                        </div>
                    ) : (
                        <div
                            className={`p-4 rounded-2xl border flex items-center justify-between ${
                                isDarkMode ? "bg-gray-800/40 border-gray-700" : "bg-gray-50 border-gray-200"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <FaFileExcel className="text-2xl text-emerald-500" />
                                <div>
                                    <p className="text-xs font-bold">{file.name}</p>
                                    <p className="text-[11px] text-gray-400">
                                        {(file.size / 1024).toFixed(1)} KB • {previewRows.length} total rows detected
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 font-semibold"
                            >
                                Change File
                            </button>
                        </div>
                    )}

                    {/* Preview Table */}
                    {previewRows.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                    Spreadsheet Preview ({previewRows.filter(r => r.isValid).length}/{previewRows.length} valid)
                                </h3>
                            </div>
                            <div className="border border-gray-700/60 rounded-2xl overflow-x-auto max-h-60 custom-scrollbar">
                                <table className="w-full text-left text-xs">
                                    <thead className={`sticky top-0 ${isDarkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700"}`}>
                                        <tr>
                                            <th className="p-2.5">Row</th>
                                            <th className="p-2.5">Status</th>
                                            <th className="p-2.5">Exam Name</th>
                                            <th className="p-2.5">Class</th>
                                            <th className="p-2.5">Session</th>
                                            <th className="p-2.5">Centers</th>
                                            <th className="p-2.5">Dates</th>
                                            <th className="p-2.5">Timing</th>
                                            <th className="p-2.5">Days</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {previewRows.map((row) => (
                                            <tr
                                                key={row._rowId}
                                                className={`${
                                                    !row.isValid
                                                        ? isDarkMode ? "bg-red-500/10" : "bg-red-50"
                                                        : isDarkMode ? "hover:bg-gray-800/40" : "hover:bg-gray-50"
                                                }`}
                                            >
                                                <td className="p-2.5 font-mono text-gray-500">{row._rowId}</td>
                                                <td className="p-2.5">
                                                    {row.isValid ? (
                                                        <span className="flex items-center gap-1 text-emerald-400">
                                                            <FaCheckCircle /> OK
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-red-400" title="Missing required fields">
                                                            <FaExclamationTriangle /> Invalid
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-2.5 font-semibold text-white whitespace-nowrap">{row.examName || "—"}</td>
                                                <td className="p-2.5 whitespace-nowrap">{row.className || "—"}</td>
                                                <td className="p-2.5 whitespace-nowrap">{row.session || "—"}</td>
                                                <td className="p-2.5 max-w-[200px] truncate" title={row.centers}>{row.centers || "—"}</td>
                                                <td className="p-2.5 whitespace-nowrap text-gray-400">
                                                    {row.fromDate} to {row.toDate}
                                                </td>
                                                <td className="p-2.5 whitespace-nowrap text-gray-400">
                                                    {row.fromTime} - {row.toTime}
                                                </td>
                                                <td className="p-2.5 max-w-[150px] truncate" title={row.days}>{row.days || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    className={`flex items-center justify-between px-6 py-4 border-t rounded-b-3xl ${
                        isDarkMode ? "border-gray-800 bg-[#14181c]" : "border-gray-100 bg-gray-50"
                    }`}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            isDarkMode ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                        }`}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleImportSubmit}
                        disabled={importing || previewRows.length === 0 || previewRows.filter(r => r.isValid).length === 0}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-40"
                    >
                        {importing ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Importing...
                            </>
                        ) : (
                            <>
                                <FaUpload /> Import {previewRows.filter(r => r.isValid).length} Exam(s)
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExamImportModal;
