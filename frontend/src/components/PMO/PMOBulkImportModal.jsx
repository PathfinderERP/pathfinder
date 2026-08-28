import React, { useState, useRef, useCallback } from "react";
import {
    FaTimes, FaUpload, FaDownload, FaFileExcel, FaSync,
    FaExclamationTriangle, FaCheckCircle, FaEye, FaTrash,
    FaTimesCircle, FaEdit, FaSave, FaDatabase, FaSpinner,
    FaArrowRight, FaIdCard, FaInfoCircle
} from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

const COL_MAP = {
    "Name":                           "name",
    "Name*":                          "name",
    "Mobile":                         "mobile",
    "Mobile*":                        "mobile",
    "Secondary Mobile":               "secondaryMobile",
    "Secondary Mobile*":              "secondaryMobile",
    "Email":                          "email",
    "DOB (YYYY-MM-DD)":               "dob",
    "DOB":                            "dob",
    "Gender":                         "gender",
    "Class Name* (e.g. 6)":           "className",
    "Class Name*":                    "className",
    "Class Name":                     "className",
    "Board Name* (exact)":           "boardName",
    "Board Name*":                    "boardName",
    "Board Name":                     "boardName",
    "Board*":                         "boardName",
    "Board":                          "boardName",
    "Centre Name* (exact)":           "centreName",
    "Centre Name*":                   "centreName",
    "Centre Name":                    "centreName",
    "Session Name* (e.g. 2025-2026)": "sessionName",
    "Session Name*":                  "sessionName",
    "Session Name":                   "sessionName",
    "ExamTag Name* (e.g. PMO 6)":     "examTagName",
    "ExamTag Name*":                   "examTagName",
    "ExamTag Name":                    "examTagName",
    "Course* (e.g. PMO 6)":           "course",
    "Course* (e.g. PMO CLASS 6)":     "course",
    "Course*":                        "course",
    "Course":                         "course",
    "School":                         "school",
    "Guardian Name":                  "guardianName",
    "Guardian Mobile":                "guardianMobile",
    "Address":                        "address",
    "City":                           "city",
    "State":                          "state",
    "Pincode":                        "pincode",
    "Remarks":                        "remarks",
    "Exam Date (YYYY-MM-DD)":         "examDate",
    "Exam Date":                      "examDate",
    "Exam Venue":                     "examVenue",
    "Reporting Time (e.g. 09:30 AM)": "reportingTime",
    "Reporting Time":                 "reportingTime",
    "Exam Time Slot (e.g. 10:00 AM - 11:30 AM)": "timeSlot",
    "Exam Time Slot":                 "timeSlot",
    "Exam Time (e.g. 10:00 AM - 11:30 AM)": "timeSlot",
    "Exam Time (e.g. 10:00 AM)":      "timeSlot",
    "Exam Time":                      "timeSlot",
    "Time Slot (e.g. 10:00 AM - 11:30 AM)": "timeSlot",
    "Time Slot":                      "timeSlot",
    "Exam Slot":                      "timeSlot",
};

const parseRow = (rawRow) => {
    const row = {};
    Object.entries(rawRow).forEach(([key, val]) => {
        const field = COL_MAP[key.trim()];
        if (field) {
            let strVal = (val !== undefined && val !== null) ? String(val).trim() : "";
            if (field === "course" && /^PMO\s+CLASS\s+(\d+)$/i.test(strVal)) {
                strVal = strVal.toUpperCase().replace(/PMO\s+CLASS\s+(\d+)/i, 'PMO $1');
            }
            row[field] = strVal;
        }
    });
    return row;
};

const validateRow = (row) => {
    const errors = [];
    if (!row.name?.trim())        errors.push("Name required");
    if (!row.mobile?.trim())      errors.push("Mobile required");
    if (!row.className?.trim())   errors.push("Class required");
    if (!row.boardName?.trim())   errors.push("Board required");
    if (!row.centreName?.trim())  errors.push("Centre required");
    if (!row.sessionName?.trim()) errors.push("Session required");
    if (!row.examTagName?.trim()) errors.push("ExamTag required");
    if (!row.course?.trim())      errors.push("Course required");
    return errors;
};

const PMOBulkImportModal = ({ onClose, onSuccess, apiUrl, token }) => {
    const [step, setStep]             = useState("idle");
    const [fileName, setFileName]     = useState("");
    const [parsedRows, setParsedRows] = useState([]);
    const [uploadResult, setUploadResult] = useState(null);
    const [editingIdx, setEditingIdx] = useState(null);
    const [editBuf, setEditBuf]       = useState({});
    const fileInputRef = useRef(null);

    const [dbChecking, setDbChecking]           = useState(false);
    const [dbDupMobiles, setDbDupMobiles]       = useState(new Set());
    const [dbDupEmails, setDbDupEmails]         = useState(new Set());
    const [erpMobilesSet, setErpMobilesSet]     = useState(new Set());
    const [erpEmailsSet, setErpEmailsSet]       = useState(new Set());
    const [erpCarryForward, setErpCarryForward] = useState([]);
    const [showErpPopup, setShowErpPopup]       = useState(false);

    const getDuplicateIndices = useCallback((rows) => {
        const seenMob = {}, seenEmail = {};
        const dupMob = new Set(), dupEmail = new Set();
        rows.forEach((r, i) => {
            const m = r.mobile?.trim();
            const e = r.email?.trim()?.toLowerCase();
            if (m) { if (seenMob[m] !== undefined) { dupMob.add(seenMob[m]); dupMob.add(i); } else seenMob[m] = i; }
            if (e) { if (seenEmail[e] !== undefined) { dupEmail.add(seenEmail[e]); dupEmail.add(i); } else seenEmail[e] = i; }
        });
        return { dupMob, dupEmail };
    }, []);

    const runDbDuplicateCheck = useCallback(async (rows) => {
        const mobiles = [...new Set(rows.map(r => r.mobile?.trim()).filter(Boolean))];
        const emails  = [...new Set(rows.map(r => r.email?.trim().toLowerCase()).filter(Boolean))];
        if (!mobiles.length && !emails.length) return;

        setDbChecking(true);
        try {
            const res = await fetch(`${apiUrl}/pmo/check-duplicates-bulk`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ mobiles, emails })
            });
            if (!res.ok) throw new Error("DB check failed");
            const data = await res.json();
            setDbDupMobiles(new Set(data.foundMobiles || []));
            setDbDupEmails(new Set((data.foundEmails || []).map(e => e.toLowerCase())));
            setErpMobilesSet(new Set(data.erpMobiles || []));
            setErpEmailsSet(new Set((data.erpEmails || []).map(e => e.toLowerCase())));
            setErpCarryForward(data.erpCarryForward || []);
            if ((data.erpCarryForward || []).length > 0) setShowErpPopup(true);
        } catch {
            // Silent
        } finally {
            setDbChecking(false);
        }
    }, [apiUrl, token]);

    const handleFile = (file) => {
        if (!file) return;
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            toast.error("Please upload an Excel file (.xlsx or .xls)");
            return;
        }
        setFileName(file.name);
        setStep("parsing");

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

                if (!json.length) {
                    toast.error("Excel sheet is empty");
                    setStep("idle");
                    return;
                }

                const rows = json.map(parseRow);
                setParsedRows(rows);
                setStep("preview");
                runDbDuplicateCheck(rows);
            } catch (err) {
                toast.error("Failed to parse Excel file: " + err.message);
                setStep("idle");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDownloadTemplate = async () => {
        try {
            const res = await fetch(`${apiUrl}/pmo/template`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to download template");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "PMO_Import_Template.xlsx";
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDeleteRow = (idx) => {
        setParsedRows(prev => {
            const next = prev.filter((_, i) => i !== idx);
            if (!next.length) setStep("idle");
            return next;
        });
    };

    const handleStartEdit = (idx) => {
        setEditingIdx(idx);
        setEditBuf({ ...parsedRows[idx] });
    };

    const handleSaveEdit = () => {
        setParsedRows(prev => prev.map((r, i) => i === editingIdx ? editBuf : r));
        setEditingIdx(null);
        setEditBuf({});
    };

    const handleCancelEdit = () => {
        setEditingIdx(null);
        setEditBuf({});
    };

    const handleUpload = async () => {
        const { dupMob, dupEmail } = getDuplicateIndices(parsedRows);

        const rowsWithErrors = parsedRows.filter((r, i) => {
            const mob = r.mobile?.trim();
            const em = r.email?.trim()?.toLowerCase();
            const inDbPmo = (mob && dbDupMobiles.has(mob)) || (em && dbDupEmails.has(em));
            return (
                validateRow(r).length > 0 ||
                dupMob.has(i) ||
                dupEmail.has(i) ||
                inDbPmo
            );
        });

        if (rowsWithErrors.length > 0) {
            toast.error(`Please fix all ${rowsWithErrors.length} errors before uploading.`);
            return;
        }

        setStep("uploading");

        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(parsedRows);
            XLSX.utils.book_append_sheet(wb, ws, "PMO Students");
            const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
            const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

            const formData = new FormData();
            formData.append("file", blob, fileName || "import.xlsx");

            const res = await fetch(`${apiUrl}/pmo/import-excel`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Upload failed");

            setUploadResult(data);
            setStep("result");
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err.message);
            setStep("preview");
        }
    };

    const { dupMob, dupEmail } = getDuplicateIndices(parsedRows);

    const isRowDbDup = (r) => {
        const mob = r.mobile?.trim();
        const em = r.email?.trim()?.toLowerCase();
        return (mob && dbDupMobiles.has(mob)) || (em && dbDupEmails.has(em));
    };

    const isRowErpCarryForward = (r) => {
        if (isRowDbDup(r)) return false;
        const mob = r.mobile?.trim();
        const em = r.email?.trim()?.toLowerCase();
        return (mob && erpMobilesSet.has(mob)) || (em && erpEmailsSet.has(em));
    };

    const isRowValid = (r, i) =>
        validateRow(r).length === 0 &&
        !dupMob.has(i) &&
        !dupEmail.has(i) &&
        !isRowDbDup(r);

    const validCount = parsedRows.filter((r, i) => isRowValid(r, i)).length;
    const invalidCount = parsedRows.length - validCount;
    const dbDupCount = parsedRows.filter(r => isRowDbDup(r)).length;
    const erpCarryCount = parsedRows.filter(r => isRowErpCarryForward(r)).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-violet-950/60 to-purple-950/60 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-600/30 flex items-center justify-center border border-violet-500/30">
                            <FaFileExcel className="text-violet-400 text-lg" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white leading-tight">Bulk Import PMO Students</h2>
                            <p className="text-xs text-gray-400">Upload Excel spreadsheet with student details (₹100 course fee with discount support)</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition">
                        <FaTimes />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Idle State / File Dropzone */}
                    {step === "idle" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-gray-950/50 p-4 rounded-xl border border-gray-800">
                                <div>
                                    <h4 className="text-sm font-semibold text-white">Need the template format?</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">Download the standardized Excel sample file containing all required headers.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-semibold transition"
                                >
                                    <FaDownload /> Download Template
                                </button>
                            </div>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-700 hover:border-violet-500 rounded-2xl p-12 text-center cursor-pointer transition bg-gray-950/30 hover:bg-gray-950/60 group"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={(e) => handleFile(e.target.files[0])}
                                    accept=".xlsx, .xls"
                                    className="hidden"
                                />
                                <div className="w-14 h-14 rounded-2xl bg-violet-600/20 text-violet-400 flex items-center justify-center mx-auto mb-4 border border-violet-500/30 group-hover:scale-110 transition">
                                    <FaUpload className="text-2xl" />
                                </div>
                                <h3 className="text-sm font-bold text-white">Click or drag & drop Excel file</h3>
                                <p className="text-xs text-gray-500 mt-1">Supports .xlsx, .xls spreadsheets</p>
                            </div>
                        </div>
                    )}

                    {/* Preview Table */}
                    {(step === "preview" || step === "uploading") && (
                        <div className="space-y-4">
                            {/* Summary Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-950/60 p-4 rounded-xl border border-gray-800">
                                <div className="flex items-center gap-4 text-xs">
                                    <span className="text-gray-400">Total Rows: <strong className="text-white">{parsedRows.length}</strong></span>
                                    <span className="text-emerald-400 flex items-center gap-1"><FaCheckCircle /> Valid: {validCount}</span>
                                    {invalidCount > 0 && (
                                        <span className="text-rose-400 flex items-center gap-1"><FaTimesCircle /> Errors: {invalidCount}</span>
                                    )}
                                    {erpCarryCount > 0 && (
                                        <span className="text-violet-400 flex items-center gap-1"><FaIdCard /> Auto-Enrollment: {erpCarryCount}</span>
                                    )}
                                    {dbDupCount > 0 && (
                                        <span className="text-amber-400 flex items-center gap-1"><FaExclamationTriangle /> PMO Duplicates: {dbDupCount}</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setParsedRows([]); setStep("idle"); }}
                                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition"
                                    >
                                        Upload Another
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleUpload}
                                        disabled={step === "uploading" || invalidCount > 0}
                                        className="flex items-center gap-2 px-5 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-violet-600/30"
                                    >
                                        {step === "uploading" ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                                        {step === "uploading" ? "Importing..." : `Import ${validCount} Students`}
                                    </button>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto border border-gray-800 rounded-xl bg-gray-950">
                                <table className="w-full text-left text-xs text-gray-300">
                                    <thead className="bg-gray-900/80 text-gray-400 uppercase text-[10px] font-bold border-b border-gray-800">
                                        <tr>
                                            <th className="p-3">#</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Mobile</th>
                                            <th className="p-3">Class</th>
                                            <th className="p-3">Board</th>
                                            <th className="p-3">Centre</th>
                                            <th className="p-3">Course</th>
                                            <th className="p-3">Exam Schedule & Slot</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/60">
                                        {parsedRows.map((r, i) => {
                                            const valid = isRowValid(r, i);
                                            const errs = validateRow(r);
                                            const isDup = dupMob.has(i) || dupEmail.has(i);
                                            const isDbDup = isRowDbDup(r);
                                            const isCarry = isRowErpCarryForward(r);

                                            return (
                                                <tr key={i} className={!valid ? "bg-rose-950/20" : isCarry ? "bg-violet-950/20" : ""}>
                                                    <td className="p-3 font-mono text-gray-500">{i + 1}</td>
                                                    <td className="p-3">
                                                        {valid ? (
                                                            isCarry ? (
                                                                <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px] font-bold">Auto ID</span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">Ready</span>
                                                            )
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold" title={[...errs, isDup ? "Duplicate in sheet" : "", isDbDup ? "Already in PMO" : ""].filter(Boolean).join(", ")}>
                                                                {isDbDup ? "PMO Dup" : isDup ? "Sheet Dup" : "Invalid"}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 font-semibold text-white">{r.name || "—"}</td>
                                                    <td className="p-3 font-mono">{r.mobile || "—"}</td>
                                                    <td className="p-3">{r.className || "—"}</td>
                                                    <td className="p-3">{r.boardName || "—"}</td>
                                                    <td className="p-3">{r.centreName || "—"}</td>
                                                    <td className="p-3 text-violet-400 font-medium">{r.course || "—"}</td>
                                                    <td className="p-3">
                                                        <div className="text-gray-300">{r.examVenue || '—'}</div>
                                                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                                                            {r.examDate || '—'} {r.reportingTime && `(${r.reportingTime})`} {r.timeSlot && `| Slot: ${r.timeSlot}`}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <button
                                                            onClick={() => handleDeleteRow(i)}
                                                            className="p-1.5 text-gray-500 hover:text-rose-400 transition"
                                                            title="Delete Row"
                                                        >
                                                            <FaTrash size={12} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {step === "result" && uploadResult && (
                        <div className="bg-gray-950 p-8 rounded-2xl border border-gray-800 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                                <FaCheckCircle className="text-3xl" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Import Process Finished!</h3>
                            <p className="text-sm text-gray-400">{uploadResult.message}</p>
                            <div className="flex justify-center gap-4 pt-4">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-lg transition"
                                >
                                    Close & Refresh Students
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PMOBulkImportModal;
