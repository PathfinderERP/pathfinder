import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";
import {
    FaUpload, FaFileExcel, FaArrowLeft, FaCheckCircle, FaTimesCircle,
    FaDownload, FaSpinner, FaUsers, FaEye, FaTrash, FaCloudUploadAlt,
    FaInfoCircle, FaShieldAlt
} from "react-icons/fa";

/* ─── Column map: Excel header → DB field ─── */
/* Matches the Fresh Leads Template exactly */
const COL_MAP = {
    "Name":               "name",
    "PhoneNumber":         "phoneNumber",
    "Phone Number":        "phoneNumber",
    "SecondPhoneNumber":   "secondPhoneNumber",
    "Second Phone Number": "secondPhoneNumber",
    "Class":              "className",
    "Board":              "board",
    "Centre":             "centre",
    "Course":             "course",
    "Source":             "source",
    "LeadType":           "leadType",
    "Lead Type":          "leadType",
    // LeadResponse is intentionally NOT mapped — auto-set to uploader's name
};

const REQUIRED_COLS = ["name"];

/* Exact headers matching Fresh Leads Template (no LeadResponse — auto-set) */
const SAMPLE_HEADERS = [
    "Name", "PhoneNumber", "SecondPhoneNumber", "Class",
    "Board", "Centre", "Course", "Source", "LeadType"
];

const downloadSampleExcel = () => {
    const sampleData = [
        SAMPLE_HEADERS,
        ["John Doe",    "9876543210", "9876543211", "10th", "CBSE",  "Delhi Centre", "JEE Main",  "Facebook", "WARM LEAD"],
        ["Priya Roy",   "9876543212", "",           "11th", "ICSE",  "Salt Lake",    "NEET",      "School Visit", "HOT LEAD"],
        ["Aman Sharma", "9876543213", "",           "12th", "State", "Park Street",  "Foundation","Walk In",  "COLD LEAD"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    /* Style header row */
    ws['!cols'] = SAMPLE_HEADERS.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fresh Leads Template");
    XLSX.writeFile(wb, "Fresh_Lead_Import_Template.xlsx");
};

/* ─── Parse one sheet row → lead object ─── */
const parseRow = (rawRow) => {
    const lead = {};
    Object.entries(rawRow).forEach(([key, val]) => {
        const trimmedKey = key.trim();
        const field = COL_MAP[trimmedKey];
        if (field) lead[field] = val !== undefined && val !== null ? String(val).trim() : "";
    });
    return lead;
};

const LEAD_TYPE_OPTIONS = ["HOT LEAD", "WARM LEAD", "COLD LEAD"];

/* ═══════════════════════════════════════════════════════ */
const UploadLeads = () => {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const navigate = useNavigate();

    const [step, setStep] = useState("idle"); // idle | preview | uploading | done
    const [parsedRows, setParsedRows] = useState([]);
    const [fileName, setFileName] = useState("");
    const [uploadResult, setUploadResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    /* ── Parse file ── */
    const processFile = useCallback((file) => {
        if (!file) return;
        const allowed = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "text/csv",
        ];
        if (!allowed.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
            toast.error("Please upload an Excel (.xlsx/.xls) or CSV file.");
            return;
        }

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: "binary" });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
                if (!raw.length) {
                    toast.warning("The file appears to be empty.");
                    return;
                }
                const rows = raw.map(parseRow).filter(r => r.name); // skip empty-name rows
                if (!rows.length) {
                    toast.error("No valid rows found. Make sure the 'Name' column exists and has data.");
                    return;
                }
                setParsedRows(rows);
                setStep("preview");
                toast.success(`${rows.length} lead(s) parsed successfully!`);
            } catch (err) {
                console.error(err);
                toast.error("Failed to read file. Please check the format.");
            }
        };
        reader.readAsBinaryString(file);
    }, []);

    const handleFileChange = (e) => processFile(e.target.files[0]);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        processFile(e.dataTransfer.files[0]);
    };

    /* ── Upload to backend ── */
    const handleUpload = async () => {
        if (!parsedRows.length) return;
        setStep("uploading");
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/bulk-upload`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ leads: parsedRows }),
            });
            const data = await res.json();
            if (res.ok) {
                setUploadResult(data);
                setStep("done");
                toast.success(data.message);
            } else {
                toast.error(data.message || "Upload failed.");
                setStep("preview");
            }
        } catch (err) {
            console.error(err);
            toast.error("Network error. Please try again.");
            setStep("preview");
        }
    };

    const handleReset = () => {
        setParsedRows([]);
        setFileName("");
        setUploadResult(null);
        setStep("idle");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    /* ── Inline row edit ── */
    const updateRow = (idx, field, value) => {
        setParsedRows(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    };
    const removeRow = (idx) => {
        setParsedRows(prev => prev.filter((_, i) => i !== idx));
    };

    /* ─── Theme shortcuts ─── */
    const card   = `rounded-2xl border ${isDark ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`;
    const txt    = isDark ? "text-white"   : "text-gray-900";
    const sub    = isDark ? "text-gray-400" : "text-gray-500";
    const inp    = `w-full px-3 py-1.5 rounded-lg border text-xs font-semibold outline-none transition-all
                    ${isDark ? "bg-[#131619] border-gray-700 text-gray-200 focus:border-emerald-500/60"
                             : "bg-gray-50 border-gray-200 text-gray-800 focus:border-emerald-500"}`;

    /* ═══════════════ RENDER ═══════════════ */
    return (
        <Layout activePage="Marketing & CRM">
            <ToastContainer theme={isDark ? "dark" : "light"} position="top-right" />

            <div className={`min-h-screen p-6 space-y-6 ${isDark ? "bg-[#0f1215]" : "bg-gray-50"}`}>

                {/* ── Header ── */}
                <div className={`${card} p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                        <button
                            onClick={() => navigate("/marketing-crm")}
                            className={`p-3 rounded-xl border transition-all hover:scale-105 active:scale-95
                                ${isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:text-white"
                                         : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200"}`}
                        >
                            <FaArrowLeft size={16} />
                        </button>
                        <div className={`p-3 rounded-xl border ${isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100"}`}>
                            <FaCloudUploadAlt className="text-emerald-500" size={22} />
                        </div>
                        <div>
                            <h1 className={`text-2xl font-black uppercase tracking-tighter italic ${txt}`}>
                                Upload Leads
                            </h1>
                            <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-0.5 ${sub}`}>
                                Bulk import from Excel / CSV · Marketing &amp; CRM
                            </p>
                        </div>
                    </div>

                    {/* Identity badge */}
                    <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border relative z-10
                        ${isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"}`}>
                        <FaShieldAlt className="text-emerald-500" size={16} />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Lead Responsibility</p>
                            <p className={`text-sm font-black uppercase tracking-tight ${txt}`}>
                                {currentUser.name || currentUser.email || "You (logged-in user)"}
                            </p>
                            <p className={`text-[9px] font-bold ${sub}`}>Auto-assigned · cannot be changed</p>
                        </div>
                    </div>
                </div>

                {/* ── Info strip ── */}
                <div className={`flex items-start gap-3 p-4 rounded-xl border ${isDark ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200"}`}>
                    <FaInfoCircle className="text-blue-400 mt-0.5 shrink-0" size={14} />
                    <p className={`text-xs font-semibold leading-relaxed ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                        Uploaded leads will appear in <b>Lead Management</b> with your name as the responsible person.
                        Required column: <b>Name</b>. Optional: Email, Phone, School Name, Source, Target Exam, Lead Type (HOT LEAD / WARM LEAD / COLD LEAD).
                        <button onClick={downloadSampleExcel} className="ml-2 underline font-black hover:text-blue-500 transition-colors">
                            Download sample template →
                        </button>
                    </p>
                </div>

                {/* ═══ STEP: IDLE — drop zone ═══ */}
                {step === "idle" && (
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`${card} p-16 flex flex-col items-center justify-center gap-6 cursor-pointer
                            transition-all duration-300 hover:scale-[1.01]
                            ${dragOver
                                ? (isDark ? "border-emerald-500 bg-emerald-500/5" : "border-emerald-400 bg-emerald-50")
                                : "border-dashed"
                            }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <div className={`w-24 h-24 rounded-2xl flex items-center justify-center border-2 border-dashed transition-all
                            ${dragOver
                                ? "border-emerald-500 bg-emerald-500/10"
                                : (isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50")}`}>
                            <FaFileExcel className={`${dragOver ? "text-emerald-400" : "text-emerald-500"}`} size={40} />
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className={`text-xl font-black uppercase tracking-tighter ${txt}`}>
                                Drop your Excel / CSV file here
                            </h2>
                            <p className={`text-xs font-semibold ${sub}`}>or click to browse · .xlsx · .xls · .csv</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3">
                            <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border
                                ${isDark ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-gray-100 border-gray-200 text-gray-500"}`}>
                                .xlsx supported
                            </span>
                            <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border
                                ${isDark ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-gray-100 border-gray-200 text-gray-500"}`}>
                                .csv supported
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); downloadSampleExcel(); }}
                                className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border
                                    bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2"
                            >
                                <FaDownload size={10} /> Sample Template
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══ STEP: PREVIEW ═══ */}
                {step === "preview" && (
                    <div className="space-y-4">
                        {/* Toolbar */}
                        <div className={`${card} p-4 flex flex-wrap items-center justify-between gap-3`}>
                            <div className="flex items-center gap-3">
                                <FaEye className="text-emerald-500" size={16} />
                                <div>
                                    <p className={`text-sm font-black uppercase tracking-tight ${txt}`}>
                                        Preview · {parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""} parsed
                                    </p>
                                    <p className={`text-[10px] font-bold ${sub}`}>{fileName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleReset}
                                    className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95
                                        ${isDark ? "bg-gray-800 border-gray-700 text-gray-400 hover:text-white" : "bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200"}`}
                                >
                                    <FaTrash size={11} className="inline mr-2" /> Change File
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={!parsedRows.length}
                                    className="px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest
                                        bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20
                                        transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <FaUpload size={11} /> Upload {parsedRows.length} Lead{parsedRows.length !== 1 ? "s" : ""}
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className={`${card} overflow-hidden`}>
                            <div className="overflow-x-auto max-h-[520px] custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[1100px]">
                                    <thead className={`sticky top-0 z-10 ${isDark ? "bg-[#1a1f24]" : "bg-white"}`}>
                                        <tr className={`border-b ${isDark ? "border-gray-800" : "border-gray-100"}`}>
                                            {["#", "Name *", "PhoneNumber", "SecondPhone", "Class", "Board", "Centre", "Course", "Source", "LeadType", "LeadResponse", "Actions"].map(h => (
                                                <th key={h} className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 whitespace-nowrap">
                                                    {h === "LeadResponse" ? <span className="text-emerald-500">{h} 🔒</span> : h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-gray-800/50" : "divide-gray-100"}`}>
                                        {parsedRows.map((row, idx) => (
                                            <tr key={idx} className={`hover:bg-emerald-500/[0.03] transition-colors ${!row.name ? "bg-red-500/5" : ""}`}>
                                                <td className={`px-3 py-2 text-[10px] font-black ${sub}`}>{idx + 1}</td>
                                                {/* Name */}
                                                <td className="px-2 py-2 min-w-[130px]">
                                                    <input className={inp} value={row.name || ""} onChange={e => updateRow(idx, "name", e.target.value)} placeholder="Required *" />
                                                </td>
                                                {/* PhoneNumber */}
                                                <td className="px-2 py-2 min-w-[120px]">
                                                    <input className={inp} value={row.phoneNumber || ""} onChange={e => updateRow(idx, "phoneNumber", e.target.value)} placeholder="—" />
                                                </td>
                                                {/* SecondPhoneNumber */}
                                                <td className="px-2 py-2 min-w-[120px]">
                                                    <input className={inp} value={row.secondPhoneNumber || ""} onChange={e => updateRow(idx, "secondPhoneNumber", e.target.value)} placeholder="—" />
                                                </td>
                                                {/* Class */}
                                                <td className="px-2 py-2 min-w-[90px]">
                                                    <input className={inp} value={row.className || ""} onChange={e => updateRow(idx, "className", e.target.value)} placeholder="—" />
                                                </td>
                                                {/* Board */}
                                                <td className="px-2 py-2 min-w-[90px]">
                                                    <input className={inp} value={row.board || ""} onChange={e => updateRow(idx, "board", e.target.value)} placeholder="—" />
                                                </td>
                                                {/* Centre */}
                                                <td className="px-2 py-2 min-w-[110px]">
                                                    <input className={inp} value={row.centre || ""} onChange={e => updateRow(idx, "centre", e.target.value)} placeholder="—" />
                                                </td>
                                                {/* Course */}
                                                <td className="px-2 py-2 min-w-[100px]">
                                                    <input className={inp} value={row.course || ""} onChange={e => updateRow(idx, "course", e.target.value)} placeholder="—" />
                                                </td>
                                                {/* Source */}
                                                <td className="px-2 py-2 min-w-[110px]">
                                                    <input className={inp} value={row.source || ""} onChange={e => updateRow(idx, "source", e.target.value)} placeholder="—" />
                                                </td>
                                                {/* LeadType */}
                                                <td className="px-2 py-2 min-w-[120px]">
                                                    <select className={inp} value={row.leadType || ""} onChange={e => updateRow(idx, "leadType", e.target.value)}>
                                                        <option value="">—</option>
                                                        {LEAD_TYPE_OPTIONS.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                {/* LeadResponse — locked, auto-set */}
                                                <td className="px-2 py-2 min-w-[130px]">
                                                    <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide border
                                                        ${isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                                                        🔒 {currentUser.name || "You"}
                                                    </div>
                                                </td>
                                                {/* Delete */}
                                                <td className="px-2 py-2">
                                                    <button onClick={() => removeRow(idx)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors" title="Remove row">
                                                        <FaTimesCircle size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Responsibility reminder */}
                        <div className={`flex items-center gap-3 p-4 rounded-xl border ${isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"}`}>
                            <FaShieldAlt className="text-emerald-500 shrink-0" size={14} />
                            <p className={`text-xs font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                                All {parsedRows.length} lead(s) will be assigned to <b>{currentUser.name || "you"}</b> as the responsible person.
                                They will appear in the Lead Management table immediately after upload.
                            </p>
                        </div>
                    </div>
                )}

                {/* ═══ STEP: UPLOADING ═══ */}
                {step === "uploading" && (
                    <div className={`${card} p-24 flex flex-col items-center justify-center gap-6`}>
                        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <FaSpinner className="text-emerald-500 animate-spin" size={32} />
                        </div>
                        <div className="text-center">
                            <p className={`text-lg font-black uppercase tracking-tighter ${txt}`}>Uploading {parsedRows.length} lead{parsedRows.length !== 1 ? "s" : ""}…</p>
                            <p className={`text-[10px] font-black uppercase tracking-widest animate-pulse mt-1 ${sub}`}>Saving to Lead Management database</p>
                        </div>
                    </div>
                )}

                {/* ═══ STEP: DONE ═══ */}
                {step === "done" && uploadResult && (
                    <div className="space-y-6">
                        <div className={`${card} p-12 flex flex-col items-center text-center gap-6`}>
                            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                                <FaCheckCircle className="text-emerald-400" size={40} />
                            </div>
                            <div className="space-y-2">
                                <h2 className={`text-2xl font-black uppercase tracking-tighter ${txt}`}>Upload Complete!</h2>
                                <p className={`text-sm font-semibold ${sub}`}>{uploadResult.message}</p>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-lg">
                                {[
                                    { label: "Leads Saved",    value: uploadResult.total,   color: "text-emerald-500" },
                                    { label: "Skipped Rows",   value: uploadResult.skipped || 0, color: "text-orange-400" },
                                    { label: "Uploaded By",    value: uploadResult.uploadedBy, color: "text-blue-400", small: true },
                                ].map((s, i) => (
                                    <div key={i} className={`p-5 rounded-xl border ${isDark ? "bg-[#131619] border-gray-800" : "bg-gray-50 border-gray-100"}`}>
                                        <p className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-1`}>{s.label}</p>
                                        <p className={`${s.small ? "text-base" : "text-3xl"} font-black tracking-tighter ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-3 justify-center">
                                <button
                                    onClick={handleReset}
                                    className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95
                                        ${isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:text-white" : "bg-gray-100 border-gray-200 text-gray-600"}`}
                                >
                                    <FaUpload size={11} className="inline mr-2" /> Upload Another File
                                </button>
                                <button
                                    onClick={() => navigate("/lead-management")}
                                    className="px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest
                                        bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20
                                        transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                                >
                                    <FaUsers size={11} /> View Lead Management
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDark ? "#333" : "#cbd5e1"}; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDark ? "#444" : "#94a3b8"}; }
            `}</style>
        </Layout>
    );
};

export default UploadLeads;
