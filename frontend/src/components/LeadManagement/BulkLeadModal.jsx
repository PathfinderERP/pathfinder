import React, { useState, useRef } from "react";
import {
    FaTimes, FaUpload, FaDownload, FaFileExcel, FaSync,
    FaExclamationTriangle, FaCheckCircle, FaInfoCircle,
    FaEye, FaTrash, FaShieldAlt
} from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ─── Column map: Excel header → internal field ───────────────────────── */
const COL_MAP = {
    "Name":               "name",
    "PhoneNum":           "phoneNumber",
    "Phone Number":       "phoneNumber",
    "PhoneNumber":        "phoneNumber",
    "SecondPhoneNum":     "secondPhoneNumber",
    "Second Phone Number":"secondPhoneNumber",
    "SecondPhoneNumber":  "secondPhoneNumber",
    "SchoolName":         "schoolName",
    "School Name":        "schoolName",
    "Class":              "className",
    "Board":              "board",
    "Centre":             "centre",
    "Course":             "course",
    "Source":             "source",
    "LeadType":           "leadType",
    "Lead Type":          "leadType",
    "LeadResponse":       "leadResponse",
    "Lead Response":      "leadResponse",
    "Marks":              "marks",
};

const LEAD_TYPE_OPTIONS = ["HOT LEAD", "WARM LEAD", "COLD LEAD", "NEUTRAL LEAD", "INVALID LEAD"];

const parseRow = (rawRow) => {
    const lead = {};
    Object.entries(rawRow).forEach(([key, val]) => {
        const trimmedKey = key.trim();
        const field = COL_MAP[trimmedKey];
        if (field) lead[field] = val !== undefined && val !== null ? String(val).trim() : "";
    });
    return lead;
};

const BulkLeadModal = ({ onClose, onSuccess, isDarkMode }) => {
    /* ─── Step: "idle" | "preview" | "uploading" | "done" ─── */
    const [step, setStep] = useState("idle");

    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState("");
    const [parsedRows, setParsedRows] = useState([]);

    const [uploadResult, setUploadResult] = useState(null);
    const [skippedDetails, setSkippedDetails] = useState([]);
    const [validationErrors, setValidationErrors] = useState([]);

    const [aiFeedback, setAiFeedback] = useState("");
    const [analyzingAi, setAnalyzingAi] = useState(false);

    const fileInputRef = useRef(null);
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    /* ─── AI helper ─────────────────────────────────────────── */
    const analyzeErrorsWithAI = async (errorsList) => {
        setAnalyzingAi(true);
        setAiFeedback("");
        try {
            const token = localStorage.getItem("token");
            const prompt = `I am trying to upload a bulk lead Excel file but encountered these validation errors:\n${errorsList.join('\n')}\n\nCould you please explain what is wrong and how to fix it? Make it human-readable, clear and concise.`;
            const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ message: prompt }),
            });
            const data = await response.json();
            setAiFeedback(response.ok && data.response ? data.response : "AI could not analyze the errors at this moment.");
        } catch (error) {
            console.error("AI Error:", error);
            setAiFeedback("Failed to fetch AI analysis.");
        } finally {
            setAnalyzingAi(false);
        }
    };

    /* ─── Template download ──────────────────────────────────── */
    const downloadFreshTemplate = () => {
        const templateData = [{
            Name: "John Doe",
            PhoneNum: "9876543210",
            SecondPhoneNum: "9876543211",
            SchoolName: "DPS Delhi",
            Class: "10",
            Board: "CBSE",
            Centre: "Delhi Centre",
            Course: "JEE Main",
            Source: "Facebook",
            LeadType: "WARM LEAD",
            LeadResponse: "Telecaller Name",
            Marks: "95",
        }];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Fresh Leads Template");
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(
            new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
            "Fresh_Lead_Import_Template.xlsx"
        );
        toast.success("Fresh leads template downloaded");
    };

    /* ─── Parse file → show preview ─────────────────────────── */
    const processFile = (selectedFile) => {
        if (!selectedFile) return;
        if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
            toast.error("Please upload an Excel (.xlsx / .xls) file.");
            return;
        }
        setFileName(selectedFile.name);
        setFile(selectedFile);
        setValidationErrors([]);
        setSkippedDetails([]);
        setUploadResult(null);
        setAiFeedback("");

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: "binary" });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
                if (!raw.length) { toast.warning("The file appears to be empty."); return; }

                const rows = raw.map(parseRow).filter(r => r.name);
                if (!rows.length) {
                    const msg = "No valid rows found. Make sure the 'Name' column exists and has data.";
                    toast.error(msg);
                    analyzeErrorsWithAI([msg]);
                    return;
                }
                setParsedRows(rows);
                setStep("preview");
                toast.success(`${rows.length} lead(s) parsed — please review before uploading.`);
            } catch (err) {
                console.error(err);
                const msg = "Failed to read file. Please check the format.";
                toast.error(msg);
                analyzeErrorsWithAI([msg]);
            }
        };
        reader.readAsBinaryString(selectedFile);
    };

    const handleFileChange = (e) => processFile(e.target.files[0]);

    const handleReset = () => {
        setFile(null);
        setFileName("");
        setParsedRows([]);
        setStep("idle");
        setUploadResult(null);
        setSkippedDetails([]);
        setValidationErrors([]);
        setAiFeedback("");
        setAnalyzingAi(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const updateRow = (idx, field, value) => {
        setParsedRows(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    };

    const removeRow = (idx) => setParsedRows(prev => prev.filter((_, i) => i !== idx));

    /* ─── Upload to backend ──────────────────────────────────── */
    const handleUpload = async () => {
        if (!parsedRows.length) return;
        setStep("uploading");
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/bulk-upload`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ leads: parsedRows }),
            });
            const data = await res.json();
            if (res.ok) {
                setUploadResult(data);
                setSkippedDetails(data.skippedDetails || []);
                setValidationErrors([]);
                setStep("done");
                toast.success(data.message);
                onSuccess();
            } else {
                const msg = data.message || "Upload failed.";
                toast.error(msg);
                if (data.invalidSources) setValidationErrors(data.invalidSources);
                else setValidationErrors([]);
                setSkippedDetails(data.skippedDetails || []);
                analyzeErrorsWithAI([msg]);
                setStep("preview");
            }
        } catch (err) {
            console.error(err);
            const msg = "Network error. Please try again.";
            toast.error(msg);
            analyzeErrorsWithAI([msg]);
            setStep("preview");
        }
    };

    /* ─── Theme helpers ──────────────────────────────────────── */
    const d = isDarkMode;
    const card = `rounded-[4px] border ${d ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200"}`;
    const txt = d ? "text-white" : "text-gray-900";
    const sub = d ? "text-gray-400" : "text-gray-500";
    const inp = `w-full px-2 py-1 rounded border text-[11px] font-semibold outline-none transition-all ${d ? "bg-[#131619] border-gray-700 text-gray-200 focus:border-emerald-500/60" : "bg-gray-50 border-gray-200 text-gray-800 focus:border-emerald-500"}`;

    /* ─── Render ─────────────────────────────────────────────── */
    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[70] p-4 backdrop-blur-md transition-all ${d ? 'bg-black/70' : 'bg-white/60'}`}>
            <div
                className={`w-full rounded-[4px] border shadow-2xl transition-all overflow-hidden flex flex-col ${step === "idle" ? "max-w-lg" : "max-w-[92vw]"} ${d ? 'bg-[#1a1f24] border-gray-800 shadow-cyan-500/10' : 'bg-white border-gray-200'}`}
                style={{ maxHeight: "90vh" }}
            >
                {/* ── Header ── */}
                <div className={`px-8 py-5 border-b flex justify-between items-center flex-shrink-0 ${d ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h3 className={`text-xl font-black uppercase tracking-tighter italic flex items-center gap-3 ${txt}`}>
                            {step === "idle" && <><FaUpload className="text-cyan-500" /> Bulk Lead Import</>}
                            {step === "preview" && <><FaEye className="text-emerald-500" /> Preview · {parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""} parsed</>}
                            {step === "uploading" && <><FaSync className="text-cyan-500 animate-spin" /> Uploading…</>}
                            {step === "done" && <><FaCheckCircle className="text-emerald-500" /> Upload Complete!</>}
                        </h3>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-0.5">
                            {step === "idle" && "Import fresh leads from an Excel file"}
                            {step === "preview" && fileName}
                            {step === "uploading" && `Saving ${parsedRows.length} leads to Lead Management…`}
                            {step === "done" && uploadResult?.message}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`transition-all p-2 rounded-[4px] active:scale-95 ${d ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto">

                    {/* ══ STEP: IDLE ══ */}
                    {step === "idle" && (
                        <div className={`p-8 space-y-6 ${d ? 'bg-[#1a1f24]' : 'bg-white'}`}>
                            <div className={`px-4 py-3 rounded-[4px] border text-[10px] font-bold uppercase tracking-widest ${d ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700'}`}>
                                ➕ Upload new fresh leads — review before saving to Lead Management
                            </div>

                            <div className="flex justify-center">
                                <button
                                    onClick={downloadFreshTemplate}
                                    className={`flex items-center gap-3 px-6 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border group ${d ? 'bg-cyan-500/5 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/10' : 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'}`}
                                >
                                    <FaDownload className="group-hover:translate-y-0.5 transition-transform" />
                                    Download Template
                                </button>
                            </div>

                            <div className={`border-2 border-dashed rounded-[4px] p-10 text-center transition-all group ${d ? 'bg-[#131619] border-gray-700 hover:border-cyan-500/50' : 'bg-gray-50 border-gray-200 hover:border-cyan-500'}`}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="bulk-file-upload"
                                />
                                <label htmlFor="bulk-file-upload" className="cursor-pointer flex flex-col items-center gap-4">
                                    <FaFileExcel className={`text-5xl transition-transform group-hover:scale-110 ${file ? 'text-emerald-500' : 'text-gray-500'}`} />
                                    <div className="space-y-1">
                                        <span className={`block text-[11px] font-black uppercase tracking-widest ${d ? (file ? 'text-white' : 'text-gray-400') : (file ? 'text-gray-900' : 'text-gray-500')}`}>
                                            {file ? file.name.toUpperCase() : "Select Excel File"}
                                        </span>
                                        <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-widest opacity-50 italic">.XLSX, .XLS files only</span>
                                    </div>
                                </label>
                            </div>

                            {(analyzingAi || aiFeedback) && (
                                <div className={`p-3 rounded-[4px] border ${d ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-700'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <FaInfoCircle className="text-cyan-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">AI Assistant</span>
                                    </div>
                                    {analyzingAi
                                        ? <div className="flex items-center gap-2 text-[11px] italic"><FaSync className="animate-spin text-cyan-500" /> Analyzing error…</div>
                                        : <div className="text-[11px] font-medium whitespace-pre-wrap leading-relaxed">{aiFeedback}</div>
                                    }
                                </div>
                            )}

                            <div className={`flex justify-end gap-4 pt-4 border-t ${d ? 'border-gray-800' : 'border-gray-100'}`}>
                                <button
                                    onClick={onClose}
                                    className={`px-8 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${d ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ══ STEP: PREVIEW ══ */}
                    {step === "preview" && (
                        <div className={`flex flex-col gap-4 p-4 ${d ? "bg-[#0f1215]" : "bg-gray-50"}`}>
                            {/* Toolbar */}
                            <div className={`${card} p-4 flex flex-wrap items-center justify-between gap-3`}>
                                <div className={`flex items-center gap-3 px-4 py-2 rounded-[4px] border ${d ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100"}`}>
                                    <FaShieldAlt className="text-emerald-500" size={13} />
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Lead Responsibility</p>
                                        <p className={`text-[11px] font-black uppercase tracking-tight ${txt}`}>{currentUser.name || currentUser.email || "You"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleReset}
                                        className={`px-4 py-2.5 rounded-[4px] text-[11px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95 ${d ? "bg-gray-800 border-gray-700 text-gray-400 hover:text-white" : "bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200"}`}
                                    >
                                        <FaTrash size={11} className="inline mr-2" /> Change File
                                    </button>
                                    <button
                                        onClick={handleUpload}
                                        disabled={!parsedRows.length || parsedRows.some(r => !r.name?.trim() || !r.schoolName?.trim())}
                                        className="px-6 py-2.5 rounded-[4px] text-[11px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <FaUpload size={11} /> Upload {parsedRows.length} Lead{parsedRows.length !== 1 ? "s" : ""}
                                    </button>
                                </div>
                            </div>

                            {/* Source Validation Errors */}
                            {validationErrors.length > 0 && (
                                <div className={`p-4 rounded-[4px] border flex flex-col gap-3 ${d ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                    <div className="flex items-center gap-2">
                                        <FaExclamationTriangle className="text-red-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Source Validation Errors</span>
                                    </div>
                                    <p className="text-xs font-semibold">The following leads have invalid Source values. Edit them in the table below and click Upload again:</p>
                                    <div className="max-h-[120px] overflow-y-auto space-y-1 pr-2">
                                        {validationErrors.map((err, i) => (
                                            <div key={i} className={`flex items-center justify-between text-xs py-1.5 px-3 rounded ${d ? 'bg-red-950/20' : 'bg-red-100/50'} font-medium`}>
                                                <span>Row <b>{err.row}</b>: <b>{err.name}</b></span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${d ? 'bg-red-950 text-red-400' : 'bg-red-100 text-red-600'}`}>
                                                    Invalid Source: "{err.source || 'Blank'}"
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AI Feedback */}
                            {(analyzingAi || aiFeedback) && (
                                <div className={`p-3 rounded-[4px] border ${d ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-700'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <FaInfoCircle className="text-cyan-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">AI Assistant</span>
                                    </div>
                                    {analyzingAi
                                        ? <div className="flex items-center gap-2 text-[11px] italic"><FaSync className="animate-spin text-cyan-500" /> Analyzing error…</div>
                                        : <div className="text-[11px] font-medium whitespace-pre-wrap leading-relaxed">{aiFeedback}</div>
                                    }
                                </div>
                            )}

                            {/* Preview Table */}
                            <div className={`${card} overflow-hidden`}>
                                <div className="overflow-x-auto max-h-[45vh] custom-scrollbar-bulk">
                                    <table className="w-full text-left border-collapse min-w-[1100px]">
                                        <thead className={`sticky top-0 z-10 ${d ? "bg-[#1a1f24]" : "bg-white"}`}>
                                            <tr className={`border-b ${d ? "border-gray-800" : "border-gray-100"}`}>
                                                {["#", "Name *", "PhoneNumber", "SecondPhone", "School Name *", "Class", "Board", "Centre", "Course", "Source", "LeadType", "LeadResponse 🔒", "Actions"].map(h => (
                                                    <th key={h} className={`px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap ${h.includes("🔒") ? "text-emerald-500" : "text-gray-500"}`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${d ? "divide-gray-800/50" : "divide-gray-100"}`}>
                                            {parsedRows.map((row, idx) => (
                                                <tr
                                                    key={idx}
                                                    className={`transition-colors ${(!row.name || !row.schoolName) ? "bg-red-500/5" : (d ? "hover:bg-emerald-500/[0.03]" : "hover:bg-gray-50/80")}`}
                                                >
                                                    <td className={`px-3 py-2 text-[10px] font-black ${sub}`}>{idx + 1}</td>
                                                    <td className="px-2 py-2 min-w-[130px]"><input className={inp} value={row.name || ""} onChange={e => updateRow(idx, "name", e.target.value)} placeholder="Required *" /></td>
                                                    <td className="px-2 py-2 min-w-[120px]"><input className={inp} value={row.phoneNumber || ""} onChange={e => updateRow(idx, "phoneNumber", e.target.value)} placeholder="—" /></td>
                                                    <td className="px-2 py-2 min-w-[120px]"><input className={inp} value={row.secondPhoneNumber || ""} onChange={e => updateRow(idx, "secondPhoneNumber", e.target.value)} placeholder="—" /></td>
                                                    <td className="px-2 py-2 min-w-[150px]"><input className={inp} value={row.schoolName || ""} onChange={e => updateRow(idx, "schoolName", e.target.value)} placeholder="Required *" /></td>
                                                    <td className="px-2 py-2 min-w-[80px]"><input className={inp} value={row.className || ""} onChange={e => updateRow(idx, "className", e.target.value)} placeholder="—" /></td>
                                                    <td className="px-2 py-2 min-w-[80px]"><input className={inp} value={row.board || ""} onChange={e => updateRow(idx, "board", e.target.value)} placeholder="—" /></td>
                                                    <td className="px-2 py-2 min-w-[110px]"><input className={inp} value={row.centre || ""} onChange={e => updateRow(idx, "centre", e.target.value)} placeholder="—" /></td>
                                                    <td className="px-2 py-2 min-w-[100px]"><input className={inp} value={row.course || ""} onChange={e => updateRow(idx, "course", e.target.value)} placeholder="—" /></td>
                                                    <td className="px-2 py-2 min-w-[110px]"><input className={inp} value={row.source || ""} onChange={e => updateRow(idx, "source", e.target.value)} placeholder="—" /></td>
                                                    <td className="px-2 py-2 min-w-[130px]">
                                                        <select className={inp} value={row.leadType || ""} onChange={e => updateRow(idx, "leadType", e.target.value)}>
                                                            <option value="">—</option>
                                                            {LEAD_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-2 min-w-[130px]">
                                                        <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide border ${d ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                                                            🔒 {currentUser.name || "You"}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <button onClick={() => removeRow(idx)} className="p-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors" title="Remove row">
                                                            <FaTimes size={12} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Responsibility reminder */}
                            <div className={`flex items-center gap-3 p-3 rounded-[4px] border ${d ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"}`}>
                                <FaShieldAlt className="text-emerald-500 shrink-0" size={13} />
                                <p className={`text-xs font-semibold ${d ? "text-emerald-300" : "text-emerald-700"}`}>
                                    All {parsedRows.length} lead(s) will be assigned to <b>{currentUser.name || "you"}</b> as the responsible person.
                                    They will appear in the Lead Management table immediately after upload.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ══ STEP: UPLOADING ══ */}
                    {step === "uploading" && (
                        <div className={`p-24 flex flex-col items-center justify-center gap-6 ${d ? "bg-[#1a1f24]" : "bg-white"}`}>
                            <div className="w-20 h-20 rounded-[4px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <FaSync className="text-emerald-500 animate-spin" size={32} />
                            </div>
                            <div className="text-center">
                                <p className={`text-lg font-black uppercase tracking-tighter ${txt}`}>Uploading {parsedRows.length} lead{parsedRows.length !== 1 ? "s" : ""}…</p>
                                <p className={`text-[10px] font-black uppercase tracking-widest animate-pulse mt-1 ${sub}`}>Saving to Lead Management database</p>
                            </div>
                        </div>
                    )}

                    {/* ══ STEP: DONE ══ */}
                    {step === "done" && uploadResult && (
                        <div className={`p-6 flex flex-col gap-4 ${d ? "bg-[#0f1215]" : "bg-gray-50"}`}>
                            {/* Success summary */}
                            <div className={`${card} p-8 flex flex-col items-center text-center gap-5`}>
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                                    <FaCheckCircle className="text-emerald-400" size={32} />
                                </div>
                                <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                                    {[
                                        { label: "Leads Saved",  value: uploadResult.total,         color: "text-emerald-500" },
                                        { label: "Skipped",      value: uploadResult.skipped || 0,   color: "text-orange-400" },
                                        { label: "Uploaded By",  value: uploadResult.uploadedBy,     color: "text-blue-400", small: true },
                                    ].map((s, i) => (
                                        <div key={i} className={`p-4 rounded-[4px] border ${d ? "bg-[#131619] border-gray-800" : "bg-gray-50 border-gray-100"}`}>
                                            <p className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-1`}>{s.label}</p>
                                            <p className={`${s.small ? "text-sm" : "text-2xl"} font-black tracking-tighter ${s.color}`}>{s.value}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-3 flex-wrap justify-center">
                                    <button
                                        onClick={handleReset}
                                        className={`px-5 py-2.5 rounded-[4px] text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95 ${d ? "bg-gray-800 border-gray-700 text-gray-300 hover:text-white" : "bg-gray-100 border-gray-200 text-gray-600"}`}
                                    >
                                        <FaUpload size={10} className="inline mr-2" /> Upload Another File
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="px-5 py-2.5 rounded-[4px] text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                                    >
                                        <FaTimes size={10} /> Close
                                    </button>
                                </div>
                            </div>

                            {/* Duplicate / Skipped rows report */}
                            {skippedDetails.length > 0 && (
                                <div className={`p-4 rounded-[4px] border flex flex-col gap-3 ${d ? 'bg-orange-500/10 border-orange-500/20 text-orange-300' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                                    <div className="flex items-center gap-2">
                                        <FaExclamationTriangle className="text-orange-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                                            Skipped Rows — Not Uploaded ({skippedDetails.length})
                                        </span>
                                    </div>
                                    <p className="text-xs font-semibold">
                                        The following rows were <b>not uploaded</b> due to duplicate phone numbers or missing required fields:
                                    </p>
                                    <div className="max-h-[240px] overflow-y-auto space-y-1.5 pr-2 custom-scrollbar-bulk">
                                        {skippedDetails.map((err, i) => (
                                            <div
                                                key={i}
                                                className={`flex items-center justify-between text-xs py-2 px-3 rounded ${d ? 'bg-orange-950/20' : 'bg-orange-100/50'} font-medium gap-2`}
                                            >
                                                <span className="flex items-center gap-2 shrink-0">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${d ? "bg-orange-900/50 text-orange-400" : "bg-orange-200 text-orange-700"}`}>
                                                        Row {err.row}
                                                    </span>
                                                    <b>{err.name}</b>
                                                </span>
                                                <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold text-right ${d ? 'bg-orange-950/40 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                                                    {err.reason}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            <style>{`
                .custom-scrollbar-bulk::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar-bulk::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar-bulk::-webkit-scrollbar-thumb { background: ${isDarkMode ? "#333" : "#cbd5e1"}; border-radius: 4px; }
                .custom-scrollbar-bulk::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? "#444" : "#94a3b8"}; }
            `}</style>
        </div>
    );
};

export default BulkLeadModal;
