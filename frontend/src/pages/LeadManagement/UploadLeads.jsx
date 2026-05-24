import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";
import {
    FaUpload, FaFileExcel, FaArrowLeft, FaCheckCircle, FaTimesCircle,
    FaDownload, FaSpinner, FaUsers, FaEye, FaTrash, FaCloudUploadAlt,
    FaInfoCircle, FaShieldAlt, FaHistory, FaChevronLeft, FaChevronRight,
    FaPhone, FaTag, FaCalendarAlt
} from "react-icons/fa";

/* â”€â”€â”€ Column map: Excel header â†’ DB field â”€â”€â”€ */
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
};

const REQUIRED_COLS = ["name"];

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
    ws['!cols'] = SAMPLE_HEADERS.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fresh Leads Template");
    XLSX.writeFile(wb, "Fresh_Lead_Import_Template.xlsx");
};

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

const LEAD_TYPE_COLORS = {
    "HOT LEAD":  { bg: "bg-red-500/10",    border: "border-red-500/30",    text: "text-red-400"    },
    "WARM LEAD": { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400" },
    "COLD LEAD": { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-400"   },
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

    /* â”€â”€ My Uploads history â”€â”€ */
    const [myLeads, setMyLeads] = useState([]);
    const [myLeadsTotal, setMyLeadsTotal] = useState(0);
    const [myLeadsPage, setMyLeadsPage] = useState(1);
    const [myLeadsPages, setMyLeadsPages] = useState(1);
    const [myLeadsLoading, setMyLeadsLoading] = useState(false);
    const LEADS_PER_PAGE = 20;

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    /* â”€â”€ Fetch uploaded leads â”€â”€ */
    const fetchMyUploads = useCallback(async (page = 1) => {
        setMyLeadsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/lead-management/my-uploads?page=${page}&limit=${LEADS_PER_PAGE}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            if (res.ok) {
                setMyLeads(data.leads || []);
                setMyLeadsTotal(data.total || 0);
                setMyLeadsPage(data.page || 1);
                setMyLeadsPages(data.pages || 1);
            }
        } catch (err) {
            console.error("fetchMyUploads error:", err);
        } finally {
            setMyLeadsLoading(false);
        }
    }, []);

    useEffect(() => { fetchMyUploads(1); }, [fetchMyUploads]);

    /* â”€â”€ Parse file â”€â”€ */
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
                if (!raw.length) { toast.warning("The file appears to be empty."); return; }
                const rows = raw.map(parseRow).filter(r => r.name);
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
    const handleDrop = (e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); };

    /* â”€â”€ Upload to backend â”€â”€ */
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
                setStep("done");
                toast.success(data.message);
                fetchMyUploads(1); // refresh history
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

    const updateRow = (idx, field, value) => {
        setParsedRows(prev => { const next = [...prev]; next[idx] = { ...next[idx], [field]: value }; return next; });
    };
    const removeRow = (idx) => setParsedRows(prev => prev.filter((_, i) => i !== idx));

    /* â”€â”€â”€ Theme shortcuts â”€â”€â”€ */
    const card = `rounded-2xl border ${isDark ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`;
    const txt  = isDark ? "text-white"    : "text-gray-900";
    const sub  = isDark ? "text-gray-400" : "text-gray-500";
    const inp  = `w-full px-3 py-1.5 rounded-lg border text-xs font-semibold outline-none transition-all
                  ${isDark ? "bg-[#131619] border-gray-700 text-gray-200 focus:border-emerald-500/60"
                           : "bg-gray-50 border-gray-200 text-gray-800 focus:border-emerald-500"}`;

    const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "â€”";

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• RENDER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    return (
        <Layout activePage="Marketing & CRM">
            <ToastContainer theme={isDark ? "dark" : "light"} position="top-right" />

            <div className={`min-h-screen p-6 space-y-6 ${isDark ? "bg-[#0f1215]" : "bg-gray-50"}`}>

                {/* â”€â”€ Header â”€â”€ */}
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
                            <h1 className={`text-2xl font-black uppercase tracking-tighter italic ${txt}`}>Upload Leads</h1>
                            <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-0.5 ${sub}`}>
                                Bulk import from Excel / CSV Â· Marketing & CRM
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
                            <p className={`text-[9px] font-bold ${sub}`}>Auto-assigned Â· cannot be changed</p>
                        </div>
                    </div>
                </div>

                {/* â”€â”€ Info strip â”€â”€ */}
                <div className={`flex items-start gap-3 p-4 rounded-xl border ${isDark ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200"}`}>
                    <FaInfoCircle className="text-blue-400 mt-0.5 shrink-0" size={14} />
                    <p className={`text-xs font-semibold leading-relaxed ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                        Uploaded leads will appear in <b>Lead Management</b> with your name as the responsible person.
                        Required column: <b>Name</b>. Optional: Email, Phone, School Name, Source, Target Exam, Lead Type (HOT LEAD / WARM LEAD / COLD LEAD).
                        <button onClick={downloadSampleExcel} className="ml-2 underline font-black hover:text-blue-500 transition-colors">
                            Download sample template â†’
                        </button>
                    </p>
                </div>

                {/* â•â•â• STEP: IDLE â€” drop zone â•â•â• */}
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
                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                        <div className={`w-24 h-24 rounded-2xl flex items-center justify-center border-2 border-dashed transition-all
                            ${dragOver ? "border-emerald-500 bg-emerald-500/10" : (isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50")}`}>
                            <FaFileExcel className={`${dragOver ? "text-emerald-400" : "text-emerald-500"}`} size={40} />
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className={`text-xl font-black uppercase tracking-tighter ${txt}`}>Drop your Excel / CSV file here</h2>
                            <p className={`text-xs font-semibold ${sub}`}>or click to browse Â· .xlsx Â· .xls Â· .csv</p>
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

                {/* â•â•â• STEP: PREVIEW â•â•â• */}
                {step === "preview" && (
                    <div className="space-y-4">
                        {/* Toolbar */}
                        <div className={`${card} p-4 flex flex-wrap items-center justify-between gap-3`}>
                            <div className="flex items-center gap-3">
                                <FaEye className="text-emerald-500" size={16} />
                                <div>
                                    <p className={`text-sm font-black uppercase tracking-tight ${txt}`}>
                                        Preview Â· {parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""} parsed
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
                                                    {h === "LeadResponse" ? <span className="text-emerald-500">{h} ðŸ”’</span> : h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-gray-800/50" : "divide-gray-100"}`}>
                                        {parsedRows.map((row, idx) => (
                                            <tr key={idx} className={`hover:bg-emerald-500/[0.03] transition-colors ${!row.name ? "bg-red-500/5" : ""}`}>
                                                <td className={`px-3 py-2 text-[10px] font-black ${sub}`}>{idx + 1}</td>
                                                <td className="px-2 py-2 min-w-[130px]"><input className={inp} value={row.name || ""} onChange={e => updateRow(idx, "name", e.target.value)} placeholder="Required *" /></td>
                                                <td className="px-2 py-2 min-w-[120px]"><input className={inp} value={row.phoneNumber || ""} onChange={e => updateRow(idx, "phoneNumber", e.target.value)} placeholder="â€”" /></td>
                                                <td className="px-2 py-2 min-w-[120px]"><input className={inp} value={row.secondPhoneNumber || ""} onChange={e => updateRow(idx, "secondPhoneNumber", e.target.value)} placeholder="â€”" /></td>
                                                <td className="px-2 py-2 min-w-[90px]"><input className={inp} value={row.className || ""} onChange={e => updateRow(idx, "className", e.target.value)} placeholder="â€”" /></td>
                                                <td className="px-2 py-2 min-w-[90px]"><input className={inp} value={row.board || ""} onChange={e => updateRow(idx, "board", e.target.value)} placeholder="â€”" /></td>
                                                <td className="px-2 py-2 min-w-[110px]"><input className={inp} value={row.centre || ""} onChange={e => updateRow(idx, "centre", e.target.value)} placeholder="â€”" /></td>
                                                <td className="px-2 py-2 min-w-[100px]"><input className={inp} value={row.course || ""} onChange={e => updateRow(idx, "course", e.target.value)} placeholder="â€”" /></td>
                                                <td className="px-2 py-2 min-w-[110px]"><input className={inp} value={row.source || ""} onChange={e => updateRow(idx, "source", e.target.value)} placeholder="â€”" /></td>
                                                <td className="px-2 py-2 min-w-[120px]">
                                                    <select className={inp} value={row.leadType || ""} onChange={e => updateRow(idx, "leadType", e.target.value)}>
                                                        <option value="">â€”</option>
                                                        {LEAD_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-2 py-2 min-w-[130px]">
                                                    <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide border
                                                        ${isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                                                        ðŸ”’ {currentUser.name || "You"}
                                                    </div>
                                                </td>
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

                {/* â•â•â• STEP: UPLOADING â•â•â• */}
                {step === "uploading" && (
                    <div className={`${card} p-24 flex flex-col items-center justify-center gap-6`}>
                        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <FaSpinner className="text-emerald-500 animate-spin" size={32} />
                        </div>
                        <div className="text-center">
                            <p className={`text-lg font-black uppercase tracking-tighter ${txt}`}>Uploading {parsedRows.length} lead{parsedRows.length !== 1 ? "s" : ""}â€¦</p>
                            <p className={`text-[10px] font-black uppercase tracking-widest animate-pulse mt-1 ${sub}`}>Saving to Lead Management database</p>
                        </div>
                    </div>
                )}

                {/* â•â•â• STEP: DONE â•â•â• */}
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
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-lg">
                                {[
                                    { label: "Leads Saved",  value: uploadResult.total,         color: "text-emerald-500" },
                                    { label: "Skipped Rows", value: uploadResult.skipped || 0,   color: "text-orange-400" },
                                    { label: "Uploaded By",  value: uploadResult.uploadedBy,     color: "text-blue-400", small: true },
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

                {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
                {/* â”€â”€ MY UPLOADED LEADS HISTORY â”€â”€ */}
                {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
                <div className={`${card} overflow-hidden`}>
                    {/* Section header */}
                    <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-gray-800" : "border-gray-100"}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg border ${isDark ? "bg-purple-500/10 border-purple-500/20" : "bg-purple-50 border-purple-100"}`}>
                                <FaHistory className="text-purple-500" size={14} />
                            </div>
                            <div>
                                <p className={`text-sm font-black uppercase tracking-tight ${txt}`}>My Uploaded Leads</p>
                                <p className={`text-[10px] font-bold ${sub}`}>
                                    {myLeadsLoading ? "Loadingâ€¦" : `${myLeadsTotal.toLocaleString()} lead${myLeadsTotal !== 1 ? "s" : ""} uploaded by you`}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => fetchMyUploads(myLeadsPage)}
                            disabled={myLeadsLoading}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95 disabled:opacity-50
                                ${isDark ? "bg-gray-800 border-gray-700 text-gray-400 hover:text-white" : "bg-gray-100 border-gray-200 text-gray-500"}`}
                        >
                            {myLeadsLoading ? <FaSpinner className="animate-spin inline" size={11} /> : "â†» Refresh"}
                        </button>
                    </div>

                    {/* Table */}
                    {myLeadsLoading && myLeads.length === 0 ? (
                        <div className="flex items-center justify-center py-20 gap-3">
                            <FaSpinner className="text-purple-500 animate-spin" size={22} />
                            <p className={`text-sm font-bold ${sub}`}>Loading your uploadsâ€¦</p>
                        </div>
                    ) : myLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-dashed ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                                <FaCloudUploadAlt className={sub} size={28} />
                            </div>
                            <p className={`text-sm font-black uppercase tracking-tight ${sub}`}>No uploads yet</p>
                            <p className={`text-xs font-semibold ${sub}`}>Your uploaded leads will appear here after your first upload.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[900px]">
                                    <thead className={`${isDark ? "bg-[#131619]" : "bg-gray-50"}`}>
                                        <tr className={`border-b ${isDark ? "border-gray-800" : "border-gray-100"}`}>
                                            {[
                                                { label: "#" },
                                                { label: "Name",     icon: <FaUsers size={9} /> },
                                                { label: "Phone",    icon: <FaPhone size={9} /> },
                                                { label: "Lead Type",icon: <FaTag size={9} /> },
                                                { label: "Source" },
                                                { label: "Centre" },
                                                { label: "Class" },
                                                { label: "Course" },
                                                { label: "Uploaded On", icon: <FaCalendarAlt size={9} /> },
                                            ].map(({ label, icon }) => (
                                                <th key={label} className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 whitespace-nowrap">
                                                    <span className="flex items-center gap-1.5">{icon}{label}</span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-gray-800/40" : "divide-gray-100"}`}>
                                        {myLeads.map((lead, idx) => {
                                            const ltc = LEAD_TYPE_COLORS[lead.leadType] || {};
                                            return (
                                                <tr key={lead._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/80"}`}>
                                                    <td className={`px-4 py-3 text-[10px] font-black ${sub}`}>
                                                        {(myLeadsPage - 1) * LEADS_PER_PAGE + idx + 1}
                                                    </td>
                                                    <td className={`px-4 py-3 text-xs font-bold ${txt} whitespace-nowrap`}>
                                                        {lead.name || "â€”"}
                                                    </td>
                                                    <td className={`px-4 py-3 text-xs font-semibold ${sub} whitespace-nowrap`}>
                                                        {lead.phoneNumber || "â€”"}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {lead.leadType ? (
                                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${ltc.bg} ${ltc.border} ${ltc.text}`}>
                                                                {lead.leadType}
                                                            </span>
                                                        ) : <span className={`text-xs ${sub}`}>â€”</span>}
                                                    </td>
                                                    <td className={`px-4 py-3 text-xs font-semibold ${sub}`}>{lead.source || "â€”"}</td>
                                                    <td className={`px-4 py-3 text-xs font-semibold ${sub} whitespace-nowrap`}>
                                                        {lead.centre?.centreName || lead.centre?.name || "â€”"}
                                                    </td>
                                                    <td className={`px-4 py-3 text-xs font-semibold ${sub}`}>
                                                        {lead.className?.name || "â€”"}
                                                    </td>
                                                    <td className={`px-4 py-3 text-xs font-semibold ${sub}`}>
                                                        {lead.course?.name || lead.course?.courseName || "â€”"}
                                                    </td>
                                                    <td className={`px-4 py-3 text-[10px] font-bold ${sub} whitespace-nowrap`}>
                                                        {formatDate(lead.createdAt)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {myLeadsPages > 1 && (
                                <div className={`flex items-center justify-between px-6 py-4 border-t ${isDark ? "border-gray-800" : "border-gray-100"}`}>
                                    <p className={`text-[10px] font-bold ${sub}`}>
                                        Showing {(myLeadsPage - 1) * LEADS_PER_PAGE + 1}â€“{Math.min(myLeadsPage * LEADS_PER_PAGE, myLeadsTotal)} of {myLeadsTotal.toLocaleString()}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            disabled={myLeadsPage <= 1 || myLeadsLoading}
                                            onClick={() => { const p = myLeadsPage - 1; setMyLeadsPage(p); fetchMyUploads(p); }}
                                            className={`p-2 rounded-lg border text-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
                                                ${isDark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-gray-100 border-gray-200 text-gray-600"}`}
                                        >
                                            <FaChevronLeft size={10} />
                                        </button>
                                        <span className={`text-[11px] font-black px-3 ${txt}`}>
                                            {myLeadsPage} / {myLeadsPages}
                                        </span>
                                        <button
                                            disabled={myLeadsPage >= myLeadsPages || myLeadsLoading}
                                            onClick={() => { const p = myLeadsPage + 1; setMyLeadsPage(p); fetchMyUploads(p); }}
                                            className={`p-2 rounded-lg border text-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
                                                ${isDark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-gray-100 border-gray-200 text-gray-600"}`}
                                        >
                                            <FaChevronRight size={10} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

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

