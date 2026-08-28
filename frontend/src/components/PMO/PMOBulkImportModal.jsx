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
    Object.entries(rawRow).forEach(([rawKey, val]) => {
        const key = rawKey.trim();
        let field = COL_MAP[key];
        if (!field) {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes("exam date") || lowerKey === "date") field = "examDate";
            else if (lowerKey.includes("exam venue") || lowerKey.includes("venue")) field = "examVenue";
            else if (lowerKey.includes("reporting time") || lowerKey.includes("report time")) field = "reportingTime";
            else if (lowerKey.includes("time slot") || lowerKey.includes("exam time") || lowerKey.includes("exam slot") || lowerKey.includes("slot")) field = "timeSlot";
            else if (lowerKey.includes("secondary mobile")) field = "secondaryMobile";
            else if (lowerKey.includes("guardian mobile")) field = "guardianMobile";
            else if (lowerKey.includes("guardian name") || lowerKey.includes("guardian")) field = "guardianName";
            else if (lowerKey.includes("class")) field = "className";
            else if (lowerKey.includes("board")) field = "boardName";
            else if (lowerKey.includes("centre") || lowerKey.includes("center")) field = "centreName";
            else if (lowerKey.includes("session")) field = "sessionName";
            else if (lowerKey.includes("examtag") || lowerKey.includes("exam tag")) field = "examTagName";
            else if (lowerKey.includes("course")) field = "course";
            else if (lowerKey.includes("school")) field = "school";
            else if (lowerKey.includes("mobile") || lowerKey.includes("phone")) field = "mobile";
            else if (lowerKey.includes("email")) field = "email";
            else if (lowerKey.includes("dob") || lowerKey.includes("birth")) field = "dob";
            else if (lowerKey.includes("gender") || lowerKey.includes("sex")) field = "gender";
            else if (lowerKey.includes("address")) field = "address";
            else if (lowerKey.includes("city")) field = "city";
            else if (lowerKey.includes("state")) field = "state";
            else if (lowerKey.includes("pincode") || lowerKey.includes("pin code") || lowerKey.includes("zip")) field = "pincode";
            else if (lowerKey.includes("remark")) field = "remarks";
            else if (lowerKey.includes("name")) field = "name";
        }
        if (field) {
            let strVal = (val !== undefined && val !== null) ? String(val).trim() : "";
            // Convert Excel decimal time fractions (e.g. 0.395833 for 9:30 AM) to HH:MM AM/PM string
            if ((field === "reportingTime" || field === "timeSlot") && strVal && /^0\.\d+$/.test(strVal)) {
                const totalMinutes = Math.round(parseFloat(strVal) * 24 * 60);
                const h = Math.floor(totalMinutes / 60);
                const m = totalMinutes % 60;
                const ampm = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                strVal = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
            }
            if (field === "course" && /^PMO\s+CLASS\s+(\d+)$/i.test(strVal)) {
                strVal = strVal.toUpperCase().replace(/PMO\s+CLASS\s+(\d+)/i, 'PMO $1');
            }
            row[field] = strVal;
        }
    });

    // Auto-fill missing course/examTag/session if className is provided
    if (row.className) {
        const classDigits = row.className.replace(/\D/g, '');
        if (classDigits) {
            if (!row.course) row.course = `PMO ${classDigits}`;
            if (!row.examTagName) row.examTagName = `PMO ${classDigits}`;
        }
    }
    if (!row.examTagName && row.course) {
        row.examTagName = row.course;
    }
    if (!row.sessionName) {
        row.sessionName = "2025-2026";
    }

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
                const workbook = XLSX.read(data, { type: "array", cellText: true, cellDates: false });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

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
            return (
                validateRow(r).length > 0 ||
                dupMob.has(i) ||
                dupEmail.has(i)
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
        !dupEmail.has(i);

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
                                    {dbDupCount > 0 && (
                                        <span className="text-blue-400 flex items-center gap-1"><FaExclamationTriangle /> Updates: {dbDupCount}</span>
                                    )}
                                    {erpCarryCount > 0 && (
                                        <span className="text-violet-400 flex items-center gap-1"><FaIdCard /> Auto-Enrollment: {erpCarryCount}</span>
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
                            <div className="overflow-x-auto border border-gray-800 rounded-xl bg-gray-950 pntse-bulk-scroll">
                                <table className="w-full text-left text-xs text-gray-300 min-w-[1100px]">
                                    <thead className="bg-gray-900/80 text-gray-400 uppercase text-[10px] font-bold border-b border-gray-800 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3 w-10">#</th>
                                            <th className="p-3 min-w-[140px]">Status & Errors</th>
                                            <th className="p-3 min-w-[130px]">Name</th>
                                            <th className="p-3 min-w-[110px]">Mobile</th>
                                            <th className="p-3 min-w-[70px]">Class</th>
                                            <th className="p-3 min-w-[80px]">Board</th>
                                            <th className="p-3 min-w-[100px]">Centre</th>
                                            <th className="p-3 min-w-[100px]">Course</th>
                                            <th className="p-3 min-w-[100px]">Exam Tag</th>
                                            <th className="p-3 min-w-[100px]">Session</th>
                                            <th className="p-3 min-w-[200px]">Exam Schedule & Slot</th>
                                            <th className="p-3 text-right min-w-[90px]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/60">
                                        {parsedRows.map((r, i) => {
                                            const isEdit  = editingIdx === i;
                                            const valid   = isRowValid(r, i);
                                            const errs    = validateRow(r);
                                            const isDup   = dupMob.has(i) || dupEmail.has(i);
                                            const isDbDup = isRowDbDup(r);
                                            const isCarry = isRowErpCarryForward(r);

                                            const inpStyle = "bg-gray-900 border border-violet-500/50 text-white rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-violet-400";

                                            return (
                                                <tr key={i} className={isEdit ? "bg-violet-950/40 border-l-2 border-l-cyan-400" : !valid ? "bg-rose-950/20" : isDbDup ? "bg-blue-950/20" : isCarry ? "bg-violet-950/20" : "hover:bg-gray-900/40"}>
                                                    <td className="p-3 font-mono text-gray-500">{i + 1}</td>
                                                    <td className="p-3">
                                                        {valid ? (
                                                            isDbDup ? (
                                                                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">Update Record</span>
                                                            ) : isCarry ? (
                                                                <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px] font-bold">Auto ID</span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">New Student</span>
                                                            )
                                                        ) : (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold inline-block w-max">
                                                                    {isDup ? "Sheet Duplicate" : "Invalid Row"}
                                                                </span>
                                                                {errs.length > 0 && (
                                                                    <span className="text-[10px] text-rose-400 font-semibold leading-tight">
                                                                        Missing: {errs.map(e => e.replace(" required", "")).join(", ")}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Name */}
                                                    <td className="p-3">
                                                        {isEdit ? (
                                                            <input
                                                                className={`${inpStyle} ${!editBuf.name ? "border-rose-500" : ""}`}
                                                                value={editBuf.name || ""}
                                                                placeholder="Name *"
                                                                onChange={e => setEditBuf(b => ({ ...b, name: e.target.value }))}
                                                            />
                                                        ) : (
                                                            <span className={`font-semibold ${!r.name ? "text-rose-400 italic" : "text-white"}`}>{r.name || "Missing Name *"}</span>
                                                        )}
                                                    </td>

                                                    {/* Mobile */}
                                                    <td className="p-3">
                                                        {isEdit ? (
                                                            <input
                                                                className={`${inpStyle} ${!editBuf.mobile ? "border-rose-500" : ""}`}
                                                                value={editBuf.mobile || ""}
                                                                placeholder="Mobile *"
                                                                onChange={e => setEditBuf(b => ({ ...b, mobile: e.target.value }))}
                                                            />
                                                        ) : (
                                                            <span className={`font-mono ${!r.mobile ? "text-rose-400 italic" : "text-gray-200"}`}>{r.mobile || "Missing *"}</span>
                                                        )}
                                                    </td>

                                                    {/* Class */}
                                                    <td className="p-3">
                                                        {isEdit ? (
                                                            <input
                                                                className={`${inpStyle} ${!editBuf.className ? "border-rose-500" : ""}`}
                                                                value={editBuf.className || ""}
                                                                placeholder="Class *"
                                                                onChange={e => setEditBuf(b => ({ ...b, className: e.target.value }))}
                                                            />
                                                        ) : (
                                                            <span className={!r.className ? "text-rose-400 italic font-semibold" : ""}>{r.className || "Missing *"}</span>
                                                        )}
                                                    </td>

                                                    {/* Board */}
                                                    <td className="p-3">
                                                        {isEdit ? (
                                                            <input
                                                                className={`${inpStyle} ${!editBuf.boardName ? "border-rose-500" : ""}`}
                                                                value={editBuf.boardName || ""}
                                                                placeholder="Board *"
                                                                onChange={e => setEditBuf(b => ({ ...b, boardName: e.target.value }))}
                                                            />
                                                        ) : (
                                                            <span className={!r.boardName ? "text-rose-400 italic font-semibold" : ""}>{r.boardName || "Missing *"}</span>
                                                        )}
                                                    </td>

                                                    {/* Centre */}
                                                    <td className="p-3">
                                                        {isEdit ? (
                                                            <input
                                                                className={`${inpStyle} ${!editBuf.centreName ? "border-rose-500" : ""}`}
                                                                value={editBuf.centreName || ""}
                                                                placeholder="Centre *"
                                                                onChange={e => setEditBuf(b => ({ ...b, centreName: e.target.value }))}
                                                            />
                                                        ) : (
                                                            <span className={!r.centreName ? "text-rose-400 italic font-semibold" : ""}>{r.centreName || "Missing *"}</span>
                                                        )}
                                                    </td>

                                                    {/* Course */}
                                                    <td className="p-3">
                                                        {isEdit ? (
                                                            <input
                                                                className={`${inpStyle} ${!editBuf.course ? "border-rose-500" : ""}`}
                                                                value={editBuf.course || ""}
                                                                placeholder="Course *"
                                                                onChange={e => setEditBuf(b => ({ ...b, course: e.target.value }))}
                                                            />
                                                        ) : (
                                                            <span className={`font-medium ${!r.course ? "text-rose-400 italic font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30" : "text-violet-400"}`}>{r.course || "Missing Course *"}</span>
                                                        )}
                                                    </td>

                                                    {/* Exam Tag */}
                                                    <td className="p-3">
                                                        {isEdit ? (
                                                            <input
                                                                className={`${inpStyle} ${!editBuf.examTagName ? "border-rose-500" : ""}`}
                                                                value={editBuf.examTagName || ""}
                                                                placeholder="Exam Tag *"
                                                                onChange={e => setEditBuf(b => ({ ...b, examTagName: e.target.value }))}
                                                            />
                                                        ) : (
                                                            <span className={`font-medium ${!r.examTagName ? "text-rose-400 italic font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30" : "text-sky-400"}`}>{r.examTagName || "Missing Tag *"}</span>
                                                        )}
                                                    </td>

                                                    {/* Session */}
                                                    <td className="p-3">
                                                        {isEdit ? (
                                                            <input
                                                                className={`${inpStyle} ${!editBuf.sessionName ? "border-rose-500" : ""}`}
                                                                value={editBuf.sessionName || ""}
                                                                placeholder="Session *"
                                                                onChange={e => setEditBuf(b => ({ ...b, sessionName: e.target.value }))}
                                                            />
                                                        ) : (
                                                            <span className={`font-medium ${!r.sessionName ? "text-rose-400 italic font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30" : "text-amber-400"}`}>{r.sessionName || "Missing Session *"}</span>
                                                        )}
                                                    </td>

                                                    {/* Exam Schedule & Slot */}
                                                    <td className="p-3">
                                                        {isEdit ? (
                                                            <div className="grid grid-cols-2 gap-1 min-w-[200px]">
                                                                <input className={inpStyle} value={editBuf.examVenue || ""} placeholder="Venue" onChange={e => setEditBuf(b => ({ ...b, examVenue: e.target.value }))} />
                                                                <input className={inpStyle} value={editBuf.examDate || ""} placeholder="YYYY-MM-DD" onChange={e => setEditBuf(b => ({ ...b, examDate: e.target.value }))} />
                                                                <input className={inpStyle} value={editBuf.reportingTime || ""} placeholder="Reporting" onChange={e => setEditBuf(b => ({ ...b, reportingTime: e.target.value }))} />
                                                                <input className={inpStyle} value={editBuf.timeSlot || ""} placeholder="Slot" onChange={e => setEditBuf(b => ({ ...b, timeSlot: e.target.value }))} />
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div className="text-gray-300 font-medium">{r.examVenue || '—'}</div>
                                                                <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                                                                    {r.examDate || '—'} {r.reportingTime && `(${r.reportingTime})`} {r.timeSlot && `| Slot: ${r.timeSlot}`}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="p-3 text-right">
                                                        {isEdit ? (
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={handleSaveEdit}
                                                                    className="p-1.5 bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 rounded transition"
                                                                    title="Save Changes"
                                                                >
                                                                    <FaSave size={13} />
                                                                </button>
                                                                <button
                                                                    onClick={handleCancelEdit}
                                                                    className="p-1.5 bg-gray-800 text-gray-400 hover:text-white rounded transition"
                                                                    title="Cancel"
                                                                >
                                                                    <FaTimes size={13} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => handleStartEdit(i)}
                                                                    className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition"
                                                                    title="Edit Row"
                                                                >
                                                                    <FaEdit size={13} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteRow(i)}
                                                                    className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                                                                    title="Delete Row"
                                                                >
                                                                    <FaTrash size={12} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Error Summary Alert Box */}
                            {invalidCount > 0 && (
                                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-3">
                                    <FaExclamationTriangle className="text-rose-400 text-base mt-0.5 shrink-0" />
                                    <div className="text-xs text-rose-200 leading-relaxed">
                                        <span className="font-bold text-rose-300">{invalidCount} row(s) have missing required fields or validation errors.</span>
                                        <br />
                                        Click the <span className="inline-flex items-center gap-1 font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/30"><FaEdit size={10} /> Edit</span> button on any invalid row above to fix missing information directly in this window before importing!
                                    </div>
                                </div>
                            )}
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
