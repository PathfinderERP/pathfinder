import React, { useState, useRef, useCallback } from "react";
import {
    FaTimes, FaUpload, FaDownload, FaFileExcel, FaSync,
    FaExclamationTriangle, FaCheckCircle, FaEye, FaTrash,
    FaTimesCircle, FaEdit, FaSave, FaDatabase, FaSpinner,
    FaArrowRight, FaIdCard, FaInfoCircle
} from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

/* ─── Column Map: Excel header to internal field ─────────────────────── */
const COL_MAP = {
    "Name":                           "name",
    "Name*":                          "name",
    "Mobile":                         "mobile",
    "Mobile*":                        "mobile",
    "Email":                          "email",
    "DOB (YYYY-MM-DD)":               "dob",
    "DOB":                            "dob",
    "Gender":                         "gender",
    "Class Name* (e.g. 6)":           "className",
    "Class Name*":                    "className",
    "Class Name":                     "className",
    "Centre Name* (exact)":           "centreName",
    "Centre Name*":                   "centreName",
    "Centre Name":                    "centreName",
    "Session Name* (e.g. 2025-2026)": "sessionName",
    "Session Name*":                  "sessionName",
    "Session Name":                   "sessionName",
    "ExamTag Name* (e.g. PNTSE 6)":   "examTagName",
    "ExamTag Name*":                   "examTagName",
    "ExamTag Name":                    "examTagName",
    "Course* (e.g. PNTSE CLASS 6)":   "course",
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
    "Exam Venue":                     "examVenue",
    "Reporting Time (e.g. 09:30 AM)": "reportingTime",
    "Reporting Time":                 "reportingTime",
    "Exam Time (e.g. 10:00 AM)":      "timeSlot",
    "Exam Time":                      "timeSlot",
};

const parseRow = (rawRow) => {
    const row = {};
    Object.entries(rawRow).forEach(([key, val]) => {
        const field = COL_MAP[key.trim()];
        if (field) row[field] = (val !== undefined && val !== null) ? String(val).trim() : "";
    });
    return row;
};

const validateRow = (row) => {
    const errors = [];
    if (!row.name?.trim())        errors.push("Name required");
    if (!row.mobile?.trim())      errors.push("Mobile required");
    if (!row.className?.trim())   errors.push("Class required");
    if (!row.centreName?.trim())  errors.push("Centre required");
    if (!row.sessionName?.trim()) errors.push("Session required");
    if (!row.examTagName?.trim()) errors.push("ExamTag required");
    if (!row.course?.trim())      errors.push("Course required");
    return errors;
};

const PNTSEBulkImportModal = ({ onClose, onSuccess, apiUrl, token }) => {
    const [step, setStep]             = useState("idle");
    const [fileName, setFileName]     = useState("");
    const [parsedRows, setParsedRows] = useState([]);
    const [uploadResult, setUploadResult] = useState(null);
    const [editingIdx, setEditingIdx] = useState(null);
    const [editBuf, setEditBuf]       = useState({});
    const fileInputRef = useRef(null);

    // DB duplicate check state
    const [dbChecking, setDbChecking]           = useState(false);
    const [dbDupMobiles, setDbDupMobiles]       = useState(new Set()); // PNTSE dups (REJECTED)
    const [dbDupEmails, setDbDupEmails]         = useState(new Set()); // PNTSE dups (REJECTED)
    const [erpMobilesSet, setErpMobilesSet]     = useState(new Set()); // ERP carry-forward by mobile
    const [erpEmailsSet, setErpEmailsSet]       = useState(new Set()); // ERP carry-forward by email
    const [erpCarryForward, setErpCarryForward] = useState([]);        // full ERP student details
    const [showErpPopup, setShowErpPopup]       = useState(false);

    /* detect duplicates WITHIN the current rows array */
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

    /* ─── DB bulk duplicate check ─────────────────────────────────────── */
    const runDbDuplicateCheck = useCallback(async (rows) => {
        const mobiles = [...new Set(rows.map(r => r.mobile?.trim()).filter(Boolean))];
        const emails  = [...new Set(rows.map(r => r.email?.trim().toLowerCase()).filter(Boolean))];
        if (!mobiles.length && !emails.length) return;

        setDbChecking(true);
        try {
            const res = await fetch(`${apiUrl}/pntse/check-duplicates-bulk`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ mobiles, emails })
            });
            if (!res.ok) throw new Error("DB check failed");
            const data = await res.json();
            // PNTSE duplicates (will be rejected)
            setDbDupMobiles(new Set(data.foundMobiles || []));
            setDbDupEmails(new Set((data.foundEmails || []).map(e => e.toLowerCase())));
            // ERP carry-forward (will be accepted with old enrollment no)
            setErpMobilesSet(new Set(data.erpMobiles || []));
            setErpEmailsSet(new Set((data.erpEmails || []).map(e => e.toLowerCase())));
            setErpCarryForward(data.erpCarryForward || []);
            if ((data.erpCarryForward || []).length > 0) setShowErpPopup(true);
        } catch {
            // Silent — not critical
        } finally {
            setDbChecking(false);
        }
    }, [apiUrl, token]);

    const downloadTemplate = async () => {
        try {
            const res = await fetch(`${apiUrl}/pntse/template`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const blob = await res.blob();
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement("a");
                a.href = url; a.download = "PNTSE_Import_Template.xlsx"; a.click();
                URL.revokeObjectURL(url);
                toast.success("Template downloaded");
            }
        } catch { toast.error("Template download failed"); }
    };

    const processFile = (file) => {
        if (!file) return;
        if (!file.name.match(/\.(xlsx|xls)$/i)) { toast.error("Please upload an .xlsx or .xls file."); return; }
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const wb  = XLSX.read(ev.target.result, { type: "binary" });
                const ws  = wb.Sheets[wb.SheetNames[0]];
                const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
                if (!raw.length) { toast.warning("File is empty."); return; }
                const rows = raw.map(parseRow).filter(r => r.name?.trim());
                if (!rows.length) { toast.error("No valid rows found. Ensure 'Name' column exists."); return; }
                setParsedRows(rows);
                setDbDupMobiles(new Set());
                setDbDupEmails(new Set());
                setStep("preview");
                toast.success(`${rows.length} row(s) parsed — checking database for duplicates…`);
                // Immediately run DB check
                runDbDuplicateCheck(rows);
            } catch (err) { console.error(err); toast.error("Failed to read file."); }
        };
        reader.readAsBinaryString(file);
    };

    const handleFileChange = (e) => processFile(e.target.files[0]);
    const handleReset = () => {
        setParsedRows([]); setStep("idle"); setFileName(""); setUploadResult(null);
        setEditingIdx(null); setEditBuf({});
        setDbDupMobiles(new Set()); setDbDupEmails(new Set()); setDbChecking(false);
        setErpMobilesSet(new Set()); setErpEmailsSet(new Set()); setErpCarryForward([]); setShowErpPopup(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeRow  = (idx) => {
        const updated = parsedRows.filter((_, i) => i !== idx);
        setParsedRows(updated);
        runDbDuplicateCheck(updated);
    };
    const startEdit  = (idx) => { setEditingIdx(idx); setEditBuf({ ...parsedRows[idx] }); };
    const cancelEdit = ()    => { setEditingIdx(null); setEditBuf({}); };
    const saveEdit   = ()    => {
        const updated = [...parsedRows];
        updated[editingIdx] = { ...editBuf };
        setParsedRows(updated);
        setEditingIdx(null); setEditBuf({});
        // Re-check DB after edit (mobile/email may have changed)
        runDbDuplicateCheck(updated);
    };

    const handleUpload = async () => {
        const validRows = parsedRows.filter(r => validateRow(r).length === 0);
        if (!validRows.length) { toast.error("No valid rows to upload."); return; }
        setStep("uploading");
        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(validRows.map(r => ({
                "Name": r.name,
                "Mobile": r.mobile,
                "Email": r.email || "",
                "DOB (YYYY-MM-DD)": r.dob || "",
                "Gender": r.gender || "",
                "Class Name* (e.g. 6)": r.className,
                "Centre Name* (exact)": r.centreName,
                "Session Name* (e.g. 2025-2026)": r.sessionName,
                "ExamTag Name* (e.g. PNTSE 6)": r.examTagName,
                "Course* (e.g. PNTSE CLASS 6)": r.course,
                "School": r.school || "",
                "Guardian Name": r.guardianName || "",
                "Guardian Mobile": r.guardianMobile || "",
                "Address": r.address || "",
                "City": r.city || "",
                "State": r.state || "",
                "Pincode": r.pincode || "",
                "Remarks": r.remarks || "",
            })));
            XLSX.utils.book_append_sheet(wb, ws, "Students");
            const buf  = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const form = new FormData();
            form.append("file", blob, "import.xlsx");

            const res  = await fetch(`${apiUrl}/pntse/import-excel`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: form,
            });
            const data = await res.json();
            setUploadResult(data);
            setStep("done");
            if (data.success > 0) { toast.success(`${data.success} student(s) imported!`); onSuccess(); }
        } catch (err) {
            console.error(err);
            toast.error("Upload failed.");
            setUploadResult({ message: "Upload failed: " + err.message, success: 0, failed: parsedRows.length, errors: [] });
            setStep("done");
        }
    };

    /* derived */
    const { dupMob, dupEmail } = getDuplicateIndices(parsedRows);
    const rowErrs    = (i) => validateRow(parsedRows[i]);
    const validCount = parsedRows.filter((_, i) => rowErrs(i).length === 0).length;
    const errCount   = parsedRows.filter((_, i) => rowErrs(i).length > 0).length;

    // Count PNTSE DB duplicates visible in current rows
    const dbMobCount   = parsedRows.filter(r => r.mobile && dbDupMobiles.has(r.mobile.trim())).length;
    const dbEmailCount = parsedRows.filter(r => r.email  && dbDupEmails.has(r.email.trim().toLowerCase())).length;

    // Count ERP carry-forward visible in current rows
    const erpCfCount = parsedRows.filter(r =>
        (r.mobile && erpMobilesSet.has(r.mobile.trim())) ||
        (r.email  && erpEmailsSet.has(r.email.trim().toLowerCase()))
    ).length;

    // Helper: get ERP details for a given row
    const getErpDetail = (row) => erpCarryForward.find(e =>
        (row.mobile && e.mobile === row.mobile.trim()) ||
        (row.email  && e.email.toLowerCase() === row.email.trim().toLowerCase())
    );

    const inp = "w-full px-2 py-1 rounded border text-[11px] font-semibold outline-none transition-all bg-[#0f1215] border-gray-700 text-gray-200 focus:border-cyan-500/80";

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 backdrop-blur-md bg-black/75">

            {/* ── ERP Carry-Forward Detail Popup ─────────────────────────────── */}
            {showErpPopup && erpCarryForward.length > 0 && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-2xl border border-teal-500/40 bg-[#0d1a1a] shadow-2xl shadow-teal-900/30 flex flex-col overflow-hidden" style={{ maxHeight: "85vh" }}>
                        {/* Popup Header */}
                        <div className="px-5 py-4 border-b border-teal-800/40 bg-gradient-to-r from-teal-950/80 to-emerald-950/60 flex items-center gap-3 flex-shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                                <FaArrowRight className="text-teal-400 text-base" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-white">
                                    ERP Students — Carry Forward to PNTSE
                                </h3>
                                <p className="text-[10px] text-teal-400/70 font-bold uppercase tracking-widest mt-0.5">
                                    {erpCarryForward.length} student{erpCarryForward.length !== 1 ? "s" : ""} already in Normal/Board Course
                                </p>
                            </div>
                            <button onClick={() => setShowErpPopup(false)} className="ml-auto p-2 rounded-lg text-teal-400/60 hover:text-white hover:bg-white/5 transition-all">
                                <FaTimes size={16} />
                            </button>
                        </div>

                        {/* Info note */}
                        <div className="px-5 py-3 bg-teal-500/5 border-b border-teal-800/30 flex-shrink-0">
                            <p className="text-[11px] text-teal-300/80 leading-relaxed">
                                <span className="text-teal-300 font-bold">✓ These students will be ACCEPTED</span> in the PNTSE import.
                                Their existing enrollment number from Normal/Board Course will be used as their PNTSE Roll Number —
                                so they keep the <span className="text-teal-200 font-bold">same enrollment number</span> across both systems.
                            </p>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-y-auto pntse-bulk-scroll">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-[#0d1a1a] border-b border-teal-800/30">
                                    <tr>
                                        {["#", "Name", "Email", "Mobile", "Enrollment No.", "Type"].map(h => (
                                            <th key={h} className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-teal-500/70 whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-teal-800/20">
                                    {erpCarryForward.map((s, i) => (
                                        <tr key={i} className="hover:bg-teal-500/5 transition-colors">
                                            <td className="px-4 py-3 text-[10px] font-black text-teal-500">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-[11px] font-bold text-gray-100">{s.name || "—"}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[11px] text-gray-300">{s.email || "—"}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[11px] text-gray-300">{s.mobile || "—"}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/30 text-[11px] font-black text-teal-200">
                                                    <FaIdCard size={9} className="text-teal-400" />
                                                    {s.enrollmentNo || <span className="text-teal-500/50 italic">N/A</span>}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                    s.admissionType === "NORMAL"
                                                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                                        : s.admissionType === "BOARD"
                                                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                                        : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                                }`}>
                                                    {s.admissionType}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3.5 border-t border-teal-800/30 bg-[#0d1a1a] flex justify-end flex-shrink-0">
                            <button
                                onClick={() => setShowErpPopup(false)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-0.5 active:scale-95"
                            >
                                <FaCheckCircle size={10} /> Understood — Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div
                className={`w-full rounded-2xl border border-gray-700 shadow-2xl bg-[#0f1215] flex flex-col overflow-hidden ${step === "idle" ? "max-w-lg" : "max-w-[96vw]"}`}
                style={{ maxHeight: "92vh" }}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center flex-shrink-0 bg-[#131619]">
                    <div>
                        <h3 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                            {step === "idle"      && <><FaFileExcel className="text-emerald-400" /> PNTSE Bulk Import</>}
                            {step === "preview"   && <><FaEye className="text-cyan-400" /> Preview &middot; {parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""}</>}
                            {step === "uploading" && <><FaSync className="text-cyan-400 animate-spin" /> Uploading&hellip;</>}
                            {step === "done"      && <><FaCheckCircle className="text-emerald-400" /> Import Complete</>}
                        </h3>
                        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest mt-0.5">
                            {step === "idle"      && "Import PNTSE students from Excel"}
                            {step === "preview"   && fileName}
                            {step === "uploading" && `Saving ${parsedRows.length} student(s)…`}
                            {step === "done"      && (uploadResult?.message || "")}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all active:scale-95">
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto pntse-bulk-scroll">

                    {/* IDLE */}
                    {step === "idle" && (
                        <div className="p-6 space-y-5">
                            <div className="px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                                All imported students will be set as <span className="text-white">FREE</span> &mdash; roll numbers auto-generate per centre &amp; class
                            </div>

                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Required Columns</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {["Name*","Mobile*","Class Name*","Centre Name*","Session Name*","ExamTag Name*","Course*"].map(c => (
                                        <span key={c} className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded font-mono">{c}</span>
                                    ))}
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-1">Optional Columns</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {["Email","DOB","Gender","School","Guardian Name","Guardian Mobile","Address","City","State","Pincode","Remarks","Exam Venue","Reporting Time","Exam Time"].map(c => (
                                        <span key={c} className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded font-mono">{c}</span>
                                    ))}
                                </div>
                            </div>

                            <button onClick={downloadTemplate} className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border bg-emerald-500/5 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 transition-all active:scale-95">
                                <FaDownload /> Download Template
                            </button>

                            <div className="border-2 border-dashed border-gray-700 hover:border-cyan-500/50 rounded-xl p-10 text-center transition-all group bg-[#131619]">
                                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" id="pntse-bulk-upload" />
                                <label htmlFor="pntse-bulk-upload" className="cursor-pointer flex flex-col items-center gap-4">
                                    <FaFileExcel className="text-5xl text-gray-600 group-hover:text-emerald-400 group-hover:scale-110 transform transition-all" />
                                    <div>
                                        <span className="block text-[11px] font-black uppercase tracking-widest text-gray-400">Select Excel File</span>
                                        <span className="block text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1">.XLSX, .XLS files only</span>
                                    </div>
                                </label>
                            </div>

                            <div className="flex justify-end pt-2 border-t border-gray-800">
                                <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-gray-800 text-gray-400 border-gray-700 hover:text-white transition-all active:scale-95">Cancel</button>
                            </div>
                        </div>
                    )}

                    {/* PREVIEW */}
                    {step === "preview" && (
                        <div className="flex flex-col gap-4 p-4 bg-[#0a0d0f]">

                            {/* Stats bar */}
                            <div className="flex flex-wrap items-center gap-2">
                                {[
                                    { label: "Total",      val: parsedRows.length,   color: "text-white bg-gray-800 border-gray-700" },
                                    { label: "Valid",      val: validCount,           color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                                    { label: "Dup Mobile (file)", val: dupMob.size,   color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
                                    { label: "Dup Email (file)",  val: dupEmail.size, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
                                    { label: "Errors",     val: errCount,             color: "text-red-400 bg-red-500/10 border-red-500/20" },
                                    { label: "ERP Carry Fwd", val: erpCfCount,        color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
                                ].map(s => (
                                    <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${s.color}`}>
                                        <span className="text-[13px] font-black">{s.val}</span>
                                        <span className="opacity-70">{s.label}</span>
                                    </div>
                                ))}

                                {/* DB check indicator */}
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all ${
                                    dbChecking
                                        ? "text-sky-400 bg-sky-500/10 border-sky-500/20 animate-pulse"
                                        : (dbMobCount + dbEmailCount) > 0
                                            ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                                            : "text-gray-500 bg-gray-800/50 border-gray-700"
                                }`}>
                                    {dbChecking
                                        ? <><FaSpinner className="animate-spin" size={10} /> Checking DB…</>
                                        : <><FaDatabase size={9} /> PNTSE Dups: {dbMobCount + dbEmailCount}</>
                                    }
                                </div>

                                <div className="ml-auto flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-gray-500">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500/40 inline-block" /> File Dup Mobile</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-500/40 inline-block" /> File Dup Email</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-600/60 inline-block" /> PNTSE Dup (skip)</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-teal-500/40 inline-block" /> ERP Carry Fwd</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/40 inline-block" /> Error</span>
                                </div>
                            </div>

                            {/* ERP Carry-Forward info banner */}
                            {!dbChecking && erpCfCount > 0 && (
                                <div className="rounded-xl border border-teal-500/40 bg-teal-500/5 p-3">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <FaArrowRight className="text-teal-400 text-xs" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">
                                            ERP Students — Will Be Carried Forward
                                        </span>
                                        <button
                                            onClick={() => setShowErpPopup(true)}
                                            className="ml-auto flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-teal-300 hover:text-teal-200 transition-colors"
                                        >
                                            <FaInfoCircle size={9} /> View Details
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-teal-300/70">
                                        These students exist in <span className="text-teal-300 font-bold">Normal/Board Course</span> admission.
                                        They will be <span className="text-teal-300 font-bold">accepted</span> and their previous
                                        <span className="text-teal-300 font-bold"> enrollment number will be reused</span> as their PNTSE Roll No.
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {parsedRows.map((r, i) => {
                                            const erpD = getErpDetail(r);
                                            if (!erpD) return null;
                                            return (
                                                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/15 border border-teal-500/30 text-[10px] font-black text-teal-200">
                                                    <span className="text-teal-400">#{i+1}</span>
                                                    {r.name}
                                                    <span className="px-1.5 py-0.5 rounded bg-teal-500/25 text-teal-200 text-[9px] font-black">
                                                        <FaIdCard className="inline mr-1" size={7} />{erpD.enrollmentNo || "—"}
                                                    </span>
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* PNTSE DB duplicate warning */}
                            {!dbChecking && (dbMobCount > 0 || dbEmailCount > 0) && (
                                <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-3">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <FaDatabase className="text-rose-400 text-xs" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                                            Already in PNTSE Database
                                        </span>
                                        <span className="ml-auto text-[9px] text-rose-400/70 font-bold uppercase">These will be skipped on upload</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {parsedRows.map((r, i) => {
                                            const isMobDup   = r.mobile && dbDupMobiles.has(r.mobile.trim());
                                            const isEmailDup = r.email  && dbDupEmails.has(r.email.trim().toLowerCase());
                                            if (!isMobDup && !isEmailDup) return null;
                                            return (
                                                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[10px] font-black text-rose-300">
                                                    <span className="text-rose-500">#{i+1}</span>
                                                    {r.name}
                                                    {isMobDup && <span className="px-1 rounded bg-rose-500/25 text-rose-300 text-[9px]">📱 {r.mobile}</span>}
                                                    {isEmailDup && <span className="px-1 rounded bg-rose-500/25 text-rose-300 text-[9px]">✉ {r.email}</span>}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* File-level duplicate warning */}
                            {(dupMob.size > 0 || dupEmail.size > 0) && (
                                <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <FaExclamationTriangle className="text-orange-400 text-xs" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Duplicates Within File</span>
                                    </div>
                                    <p className="text-xs text-orange-300/70">
                                        <b className="text-orange-400">Orange</b> rows share a Mobile with another row in this file.&nbsp;
                                        <b className="text-purple-400">Purple</b> rows share an Email.&nbsp;
                                        Edit or delete duplicates before uploading.
                                    </p>
                                </div>
                            )}

                            {/* Toolbar */}
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-[#131619] px-4 py-3">
                                <button onClick={handleReset} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-700 bg-gray-800 text-gray-400 hover:text-white transition-all active:scale-95">
                                    <FaTrash size={10} /> Change File
                                </button>
                                <button onClick={handleUpload} disabled={validCount === 0}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FaUpload size={11} /> Upload {validCount} Student{validCount !== 1 ? "s" : ""}
                                </button>
                            </div>

                            {/* Table */}
                            <div className="rounded-xl border border-gray-800 overflow-hidden bg-[#0f1215]">
                                {/* DB checking banner */}
                                {dbChecking && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 border-b border-sky-500/20">
                                        <FaSpinner className="text-sky-400 animate-spin" size={10} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 animate-pulse">
                                            Checking database for existing records…
                                        </span>
                                    </div>
                                )}
                                <div className="overflow-x-auto max-h-[50vh] pntse-bulk-scroll">
                                    <table className="w-full text-left border-collapse" style={{ minWidth: "1400px" }}>
                                        <thead className="sticky top-0 z-10 bg-[#131619] border-b border-gray-800">
                                            <tr>
                                                {["#","Status","Name","Mobile","Email","Class","Centre","Session","ExamTag","Course","School","DOB","Gender","Actions"].map(h => (
                                                    <th key={h} className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.15em] whitespace-nowrap text-gray-500">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/40">
                                            {parsedRows.map((row, idx) => {
                                                const errs      = rowErrs(idx);
                                                const isMob     = dupMob.has(idx);
                                                const isEmail   = dupEmail.has(idx);
                                                const isDbMob   = !!(row.mobile && dbDupMobiles.has(row.mobile.trim()));
                                                const isDbEmail = !!(row.email  && dbDupEmails.has(row.email.trim().toLowerCase()));
                                                const isErpCf   = !!(getErpDetail(row));
                                                const erpDetail = getErpDetail(row);
                                                const isEdit    = editingIdx === idx;

                                                // Priority: edit > error > PNTSE DB dup > ERP carry-fwd > file dup
                                                const rowBg = isEdit      ? "bg-cyan-500/5"
                                                            : errs.length > 0 ? "bg-red-500/5"
                                                            : (isDbMob || isDbEmail) ? "bg-rose-500/5 border-l-2 border-l-rose-500/70"
                                                            : isErpCf  ? "bg-teal-500/5 border-l-2 border-l-teal-500/60"
                                                            : isMob    ? "bg-orange-500/5 border-l-2 border-l-orange-500/60"
                                                            : isEmail  ? "bg-purple-500/5 border-l-2 border-l-purple-500/60"
                                                            : "hover:bg-white/[0.01]";

                                                const cell = (field, ph = "—", minW = "90px") => isEdit ? (
                                                    <input className={inp} style={{ minWidth: minW }} value={editBuf[field] || ""} placeholder={ph}
                                                        onChange={e => setEditBuf(b => ({ ...b, [field]: e.target.value }))} />
                                                ) : (
                                                    <span className={`text-[11px] font-semibold ${!row[field] ? "text-gray-600 italic" : "text-gray-200"}`}>{row[field] || "—"}</span>
                                                );

                                                return (
                                                    <tr key={idx} className={`transition-colors ${rowBg}`}>
                                                        <td className="px-3 py-2.5 text-[10px] font-black text-gray-600 whitespace-nowrap">{idx + 1}</td>
                                                        <td className="px-2 py-2.5 whitespace-nowrap min-w-[130px]">
                                                            <div className="flex flex-col gap-0.5">
                                                                {errs.length > 0 && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-500/20 text-red-400 uppercase" title={errs.join(", ")}>
                                                                        Missing: {errs.map(e => e.replace(" required", "")).join(", ")}
                                                                    </span>
                                                                )}
                                                                {/* PNTSE duplicates — REJECTED */}
                                                                {isDbMob   && <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500/25 text-rose-300 uppercase flex items-center gap-1"><FaDatabase size={7} />PNTSE Dup Mobile</span>}
                                                                {isDbEmail && <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500/20 text-rose-400 uppercase flex items-center gap-1"><FaDatabase size={7} />PNTSE Dup Email</span>}
                                                                {/* ERP carry-forward — ACCEPTED with old enrollment no */}
                                                                {isErpCf && !isDbMob && !isDbEmail && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-teal-500/20 text-teal-300 uppercase flex items-center gap-1">
                                                                        <FaArrowRight size={7} />ERP→PNTSE
                                                                        {erpDetail?.enrollmentNo && <span className="ml-0.5 text-teal-200">{erpDetail.enrollmentNo}</span>}
                                                                    </span>
                                                                )}
                                                                {/* File-level duplicates */}
                                                                {isMob   && !isDbMob   && !isErpCf && <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-orange-500/20 text-orange-400 uppercase">Dup Mobile</span>}
                                                                {isEmail && !isDbEmail && !isErpCf && <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-500/20 text-purple-400 uppercase">Dup Email</span>}
                                                                {errs.length === 0 && !isMob && !isEmail && !isDbMob && !isDbEmail && !isErpCf && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-400 uppercase">Valid</span>
                                                                )}
                                                                {dbChecking && !isDbMob && !isDbEmail && !isErpCf && errs.length === 0 && !isMob && !isEmail && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-sky-500/10 text-sky-400 uppercase flex items-center gap-1">
                                                                        <FaSpinner size={7} className="animate-spin" />Checking
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-2.5 min-w-[130px]">{cell("name", "Required *", "120px")}</td>
                                                        <td className="px-2 py-2.5 min-w-[120px]">
                                                            {isEdit
                                                                ? <input className={`${inp} ${(isMob || isDbMob) ? "border-rose-500/60" : ""}`} value={editBuf.mobile || ""} placeholder="Required *" onChange={e => setEditBuf(b => ({ ...b, mobile: e.target.value }))} style={{ minWidth: "110px" }} />
                                                                : <span className={`text-[11px] font-semibold ${isDbMob ? "text-rose-300 font-black" : isMob ? "text-orange-300" : !row.mobile ? "text-gray-600 italic" : "text-gray-200"}`}>
                                                                    {row.mobile || "—"}
                                                                    {isDbMob && <span className="ml-1 text-[8px] text-rose-400 bg-rose-500/20 px-1 py-0.5 rounded">IN DB</span>}
                                                                  </span>}
                                                        </td>
                                                        <td className="px-2 py-2.5 min-w-[140px]">
                                                            {isEdit
                                                                ? <input className={`${inp} ${(isEmail || isDbEmail) ? "border-purple-500/60" : ""}`} value={editBuf.email || ""} placeholder="—" onChange={e => setEditBuf(b => ({ ...b, email: e.target.value }))} style={{ minWidth: "130px" }} />
                                                                : <span className={`text-[11px] font-semibold ${isDbEmail ? "text-rose-300 font-black" : isEmail ? "text-purple-300" : !row.email ? "text-gray-600 italic" : "text-gray-200"}`}>
                                                                    {row.email || "—"}
                                                                    {isDbEmail && <span className="ml-1 text-[8px] text-rose-400 bg-rose-500/20 px-1 py-0.5 rounded">IN DB</span>}
                                                                  </span>}
                                                        </td>
                                                        <td className="px-2 py-2.5 min-w-[80px]">{cell("className", "e.g. 6", "70px")}</td>
                                                        <td className="px-2 py-2.5 min-w-[110px]">{cell("centreName", "e.g. Hazra", "100px")}</td>
                                                        <td className="px-2 py-2.5 min-w-[110px]">{cell("sessionName", "e.g. 2025-26", "100px")}</td>
                                                        <td className="px-2 py-2.5 min-w-[110px]">{cell("examTagName", "e.g. PNTSE 6", "100px")}</td>
                                                        <td className="px-2 py-2.5 min-w-[150px]">{cell("course", "e.g. PNTSE CLASS 6", "140px")}</td>
                                                        <td className="px-2 py-2.5 min-w-[100px]">{cell("school", "—", "90px")}</td>
                                                        <td className="px-2 py-2.5 min-w-[110px]">{cell("dob", "YYYY-MM-DD", "100px")}</td>
                                                        <td className="px-2 py-2.5 min-w-[80px]">{cell("gender", "—", "70px")}</td>
                                                        <td className="px-2 py-2.5 whitespace-nowrap">
                                                            <div className="flex items-center gap-1">
                                                                {isEdit ? (
                                                                    <>
                                                                        <button onClick={saveEdit}   className="p-1.5 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Save"><FaSave size={11} /></button>
                                                                        <button onClick={cancelEdit} className="p-1.5 rounded text-gray-400 hover:bg-gray-500/10 transition-colors" title="Cancel"><FaTimes size={11} /></button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button onClick={() => startEdit(idx)}  className="p-1.5 rounded text-cyan-400 hover:bg-cyan-500/10 transition-colors" title="Edit"><FaEdit size={11} /></button>
                                                                        <button onClick={() => removeRow(idx)}  className="p-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors" title="Remove"><FaTimesCircle size={11} /></button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {errCount > 0 && (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex items-start gap-2">
                                    <FaExclamationTriangle className="text-red-400 text-xs mt-0.5 shrink-0" />
                                    <p className="text-xs text-red-300/80">
                                        <b className="text-red-400">{errCount}</b> row(s) have missing required fields and will be <b>skipped</b>. Click the edit icon to fix them.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* UPLOADING */}
                    {step === "uploading" && (
                        <div className="p-24 flex flex-col items-center justify-center gap-6 bg-[#0f1215]">
                            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <FaSync className="text-emerald-400 animate-spin" size={32} />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-black uppercase tracking-tight text-white">Uploading {parsedRows.length} student{parsedRows.length !== 1 ? "s" : ""}…</p>
                                <p className="text-[10px] font-black uppercase tracking-widest animate-pulse mt-1 text-gray-500">Saving to PNTSE database</p>
                            </div>
                        </div>
                    )}

                    {/* DONE */}
                    {step === "done" && uploadResult && (() => {
                        const dupPntseErrs  = (uploadResult.errors || []).filter(e => e.startsWith("[DUPLICATE_PNTSE]"));
                        const dupMobErrs    = (uploadResult.errors || []).filter(e => e.startsWith("[DUPLICATE_MOBILE]"));
                        const dupEmailErrs  = (uploadResult.errors || []).filter(e => e.startsWith("[DUPLICATE_EMAIL]"));
                        const otherErrs     = (uploadResult.errors || []).filter(e =>
                            !e.startsWith("[DUPLICATE_PNTSE]") &&
                            !e.startsWith("[DUPLICATE_MOBILE]") &&
                            !e.startsWith("[DUPLICATE_EMAIL]")
                        );
                        const clean = msg  => msg.replace(/^\[(DUPLICATE_PNTSE|DUPLICATE_MOBILE|DUPLICATE_EMAIL)\]\s*/, "");
                        return (
                            <div className="p-5 flex flex-col gap-4 bg-[#0a0d0f]">
                                <div className="rounded-xl border border-gray-800 bg-[#131619] p-6 flex flex-col items-center gap-5">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${uploadResult.success > 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                                        {uploadResult.success > 0
                                            ? <FaCheckCircle className="text-emerald-400" size={28} />
                                            : <FaTimesCircle className="text-red-400" size={28} />}
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                                        {[
                                            { label: "Imported",      val: uploadResult.success || 0,                         color: "text-emerald-400" },
                                            { label: "ERP Fwd",       val: uploadResult.carryForward || 0,                    color: "text-teal-400" },
                                            { label: "PNTSE Dups",    val: dupPntseErrs.length,                               color: "text-rose-400" },
                                            { label: "Failed",        val: (uploadResult.failed || 0) - dupPntseErrs.length,  color: "text-red-400" },
                                        ].map((s, i) => (
                                            <div key={i} className="p-4 rounded-xl border border-gray-800 bg-[#0f1215] text-center">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">{s.label}</p>
                                                <p className={`text-2xl font-black tracking-tight ${s.color}`}>{s.val}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-3 flex-wrap justify-center">
                                        <button onClick={handleReset} className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-700 bg-gray-800 text-gray-300 hover:text-white transition-all hover:scale-105 active:scale-95">
                                            <FaUpload size={10} className="inline mr-2" /> Upload Another
                                        </button>
                                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:scale-95">
                                            <FaTimes size={10} className="inline mr-2" /> Close
                                        </button>
                                    </div>
                                </div>

                                {dupPntseErrs.length > 0 && (
                                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 overflow-hidden">
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border-b border-rose-500/20">
                                            <FaDatabase className="text-rose-400 text-xs" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Already in PNTSE — Skipped ({dupPntseErrs.length})</p>
                                        </div>
                                        <div className="max-h-40 overflow-y-auto divide-y divide-rose-500/10 pntse-bulk-scroll">
                                            {dupPntseErrs.map((e, i) => (
                                                <div key={i} className="px-4 py-2.5 flex items-start gap-2">
                                                    <FaTimesCircle className="text-rose-400 mt-0.5 shrink-0 text-xs" />
                                                    <p className="text-xs text-rose-200 leading-relaxed">{clean(e)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {dupMobErrs.length > 0 && (
                                    <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 overflow-hidden">
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 border-b border-orange-500/20">
                                            <span className="text-xs">📱</span>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Duplicate Mobile Numbers ({dupMobErrs.length})</p>
                                        </div>
                                        <div className="max-h-40 overflow-y-auto divide-y divide-orange-500/10 pntse-bulk-scroll">
                                            {dupMobErrs.map((e, i) => (
                                                <div key={i} className="px-4 py-2.5 flex items-start gap-2">
                                                    <FaTimesCircle className="text-orange-400 mt-0.5 shrink-0 text-xs" />
                                                    <p className="text-xs text-orange-200 leading-relaxed">{clean(e)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {dupEmailErrs.length > 0 && (
                                    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 overflow-hidden">
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 border-b border-purple-500/20">
                                            <span className="text-xs">✉️</span>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Duplicate Email IDs ({dupEmailErrs.length})</p>
                                        </div>
                                        <div className="max-h-40 overflow-y-auto divide-y divide-purple-500/10 pntse-bulk-scroll">
                                            {dupEmailErrs.map((e, i) => (
                                                <div key={i} className="px-4 py-2.5 flex items-start gap-2">
                                                    <FaTimesCircle className="text-purple-400 mt-0.5 shrink-0 text-xs" />
                                                    <p className="text-xs text-purple-200 leading-relaxed">{clean(e)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {otherErrs.length > 0 && (
                                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border-b border-red-500/10">
                                            <FaExclamationTriangle className="text-red-400 text-xs" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Other Errors ({otherErrs.length})</p>
                                        </div>
                                        <div className="max-h-40 overflow-y-auto divide-y divide-red-500/10 pntse-bulk-scroll">
                                            {otherErrs.map((e, i) => (
                                                <div key={i} className="px-4 py-2.5 flex items-start gap-2">
                                                    <FaTimesCircle className="text-red-400 mt-0.5 shrink-0 text-xs" />
                                                    <p className="text-xs text-red-300 leading-relaxed">{e}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            <style>{`
                .pntse-bulk-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
                .pntse-bulk-scroll::-webkit-scrollbar-track { background: transparent; }
                .pntse-bulk-scroll::-webkit-scrollbar-thumb { background: #2d2d2d; border-radius: 4px; }
                .pntse-bulk-scroll::-webkit-scrollbar-thumb:hover { background: #555; }
            `}</style>
        </div>
    );
};

export default PNTSEBulkImportModal;
