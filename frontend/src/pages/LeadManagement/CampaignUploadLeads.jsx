import { useState, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import {
    FaArrowLeft, FaBullhorn, FaFileExcel, FaUpload,
    FaTrash, FaCheckCircle, FaExclamationTriangle, FaDownload,
    FaTimes, FaSpinner, FaUserPlus
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

// Required columns for the Excel upload
const REQUIRED_COLS = ["name", "phoneNumber", "schoolName"];
const OPTIONAL_COLS = ["email", "secondPhoneNumber", "source", "targetExam", "leadType", "course"];
const LEAD_TYPES = ["HOT LEAD", "WARM LEAD", "COLD LEAD", "NEUTRAL LEAD", "INVALID LEAD"];

export default function CampaignUploadLeads() {
    const navigate = useNavigate();
    const { campaignId } = useParams();
    const location = useLocation();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const campaignName = location.state?.campaignName || "Campaign";

    const fileInputRef = useRef(null);
    const [rows, setRows] = useState([]);
    const [fileName, setFileName] = useState("");
    const [uploading, setUploading] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [validationErrors, setValidationErrors] = useState([]);

    const handlePushToLeadManagement = async () => {
        if (!campaignId) {
            toast.error("Campaign ID not found.");
            return;
        }
        setPushing(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/lead-management/campaign-leads/push`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ campaignId }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || "Leads successfully pushed to Lead Management!");
            } else {
                toast.error(data.message || "Failed to push leads.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Server error while pushing leads.");
        } finally {
            setPushing(false);
        }
    };

    const inputCls = `w-full px-3 py-2 rounded-[4px] border text-[11px] font-semibold outline-none transition-all ${
        isDark
            ? "bg-[#131619] border-gray-700 text-white focus:border-cyan-500/60"
            : "bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500"
    }`;

    // ── Download Template ─────────────────────────────────────────────
    const downloadTemplate = () => {
        const headers = ["name*", "phoneNumber*", "schoolName*", "email", "secondPhoneNumber", "source", "targetExam", "leadType", "course"];
        const example = ["Rahul Sharma", "9876543210", "Delhi Public School", "rahul@email.com", "9123456789", "Campaign", "NEET", "HOT LEAD", "NEET Foundation"];
        const ws = XLSX.utils.aoa_to_sheet([headers, example]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Leads");
        XLSX.writeFile(wb, "Campaign_Leads_Template.xlsx");
        toast.success("Template downloaded!");
    };

    // ── Parse Excel ───────────────────────────────────────────────────
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        setUploadResult(null);
        setValidationErrors([]);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: "binary" });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

                // Normalize keys: strip *, lowercase, trim
                const normalized = raw.map((row) => {
                    const clean = {};
                    Object.keys(row).forEach((k) => {
                        const cleanKey = k.replace(/\*/g, "").trim().toLowerCase()
                            .replace(/\s+(\w)/g, (_, c) => c.toUpperCase()); // camelCase
                        clean[cleanKey] = String(row[k]).trim();
                    });
                    return clean;
                });

                // Validate
                const errors = [];
                normalized.forEach((row, i) => {
                    if (!row.name) errors.push(`Row ${i + 2}: Missing "name"`);
                    if (!row.phonenumber && !row.phoneNumber) errors.push(`Row ${i + 2}: Missing "phoneNumber"`);
                    if (!row.schoolname && !row.schoolName) errors.push(`Row ${i + 2}: Missing "schoolName"`);
                    if (row.leadtype && row.leadType && !LEAD_TYPES.includes((row.leadType || row.leadtype || "").toUpperCase())) {
                        errors.push(`Row ${i + 2}: Invalid leadType — use: ${LEAD_TYPES.join(", ")}`);
                    }
                });

                setValidationErrors(errors);
                // Map to clean structure
                const mapped = normalized.map((r) => ({
                    name: r.name || "",
                    email: r.email || "",
                    phoneNumber: r.phonenumber || r.phoneNumber || "",
                    secondPhoneNumber: r.secondphonenumber || r.secondPhoneNumber || "",
                    schoolName: r.schoolname || r.schoolName || "",
                    source: r.source || "Campaign",
                    targetExam: r.targetexam || r.targetExam || "",
                    leadType: (r.leadtype || r.leadType || "").toUpperCase() || undefined,
                    course: r.course || "",
                }));
                setRows(mapped);
            } catch (err) {
                console.error(err);
                toast.error("Failed to parse file. Please use the provided template.");
            }
        };
        reader.readAsBinaryString(file);
        // Reset input so same file can be re-uploaded
        e.target.value = "";
    };

    // ── Inline edit ───────────────────────────────────────────────────
    const handleEdit = (rowIdx, field, value) => {
        setRows((prev) => prev.map((r, i) => i === rowIdx ? { ...r, [field]: value } : r));
    };

    const removeRow = (idx) => {
        setRows((prev) => prev.filter((_, i) => i !== idx));
    };

    // ── Upload to backend ─────────────────────────────────────────────
    const handleUpload = async () => {
        if (rows.length === 0) {
            toast.warning("No leads to upload. Please select an Excel file first.");
            return;
        }
        if (validationErrors.length > 0) {
            toast.error("Fix validation errors before uploading.");
            return;
        }

        setUploading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/lead-management/bulk-upload`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ leads: rows, campaignId }),
            });

            const data = await res.json();
            if (res.ok) {
                setUploadResult(data);
                toast.success(`${data.total} lead(s) uploaded successfully and linked to campaign!`);
                setRows([]);
                setFileName("");
            } else {
                toast.error(data.message || "Upload failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Server error during upload");
        } finally {
            setUploading(false);
        }
    };

    const validRows = rows.filter(r => r.name && r.phoneNumber && r.schoolName);
    const invalidRows = rows.filter(r => !r.name || !r.phoneNumber || !r.schoolName);

    return (
        <Layout activePage="Lead Management">
            <div className={`p-4 md:p-8 min-h-screen ${isDark ? "bg-[#0f1215] text-white" : "bg-[#f4f7fe] text-gray-900"}`}>

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className={`p-2.5 rounded border transition-all ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300" : "bg-white border-gray-200 hover:bg-gray-100 text-gray-600"}`}
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-1.5 h-8 bg-emerald-500 rounded shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight uppercase">
                                    Upload <span className="bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">Campaign Leads</span>
                                </h1>
                            </div>
                            <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                <FaBullhorn className="text-emerald-500" />
                                Campaign: <span className="text-emerald-400">{campaignName}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-[6px] border border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest active:scale-95"
                    >
                        <FaDownload size={12} /> Download Template
                    </button>
                </div>

                {/* ── Upload Box ── */}
                <div className={`rounded-xl border p-8 mb-6 transition-all ${isDark ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex-1 border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group
                                ${isDark
                                    ? "border-gray-700 hover:border-emerald-500/60 bg-emerald-500/5"
                                    : "border-gray-200 hover:border-emerald-500 bg-emerald-50/50"
                                }`}
                        >
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all group-hover:scale-110 ${isDark ? "bg-emerald-500/10" : "bg-emerald-100"}`}>
                                <FaFileExcel className="text-emerald-500" size={28} />
                            </div>
                            <div className="text-center">
                                <p className={`font-black text-sm uppercase tracking-wide ${isDark ? "text-white" : "text-gray-700"}`}>
                                    {fileName ? fileName : "Click to select Excel file"}
                                </p>
                                <p className={`text-[10px] mt-1 font-semibold ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                    Supports .xlsx and .xls formats
                                </p>
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <div className="flex flex-col gap-3 min-w-[160px]">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center justify-center gap-2 px-5 py-3 rounded-[6px] border border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest active:scale-95"
                            >
                                <FaFileExcel size={12} /> Browse File
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploading || rows.length === 0}
                                className={`flex items-center justify-center gap-2 px-5 py-3 rounded-[6px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
                                    ${isDark
                                        ? "bg-emerald-500 text-black hover:bg-emerald-400"
                                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                                    }`}
                            >
                                {uploading ? <FaSpinner className="animate-spin" size={12} /> : <FaUpload size={12} />}
                                {uploading ? "Uploading..." : `Upload ${rows.length > 0 ? `(${validRows.length})` : ""}`}
                            </button>
                        </div>
                    </div>

                    {/* Stats bar */}
                    {rows.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-800/10">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-[4px] ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                                <FaUserPlus className="text-cyan-500" size={12} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Total: {rows.length}</span>
                            </div>
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-[4px] ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700"}`}>
                                <FaCheckCircle size={12} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Valid: {validRows.length}</span>
                            </div>
                            {invalidRows.length > 0 && (
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-[4px] ${isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-700"}`}>
                                    <FaExclamationTriangle size={12} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Invalid: {invalidRows.length}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Validation Errors ── */}
                {validationErrors.length > 0 && (
                    <div className={`rounded-xl border p-5 mb-6 ${isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"}`}>
                        <h4 className="flex items-center gap-2 text-red-500 font-black text-sm uppercase tracking-wider mb-3">
                            <FaExclamationTriangle /> Validation Issues ({validationErrors.length})
                        </h4>
                        <ul className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                            {validationErrors.map((err, i) => (
                                <li key={i} className="text-[10px] font-semibold text-red-400">{err}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ── Upload Result ── */}
                {uploadResult && (
                    <div className={`rounded-xl border p-6 mb-6 ${isDark ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"}`}>
                        <h4 className="flex items-center gap-2 text-emerald-500 font-black text-sm uppercase tracking-wider mb-3">
                            <FaCheckCircle /> Upload Successful
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: "Uploaded", value: uploadResult.total, color: "text-emerald-500" },
                                { label: "Skipped", value: uploadResult.skipped || 0, color: "text-yellow-500" },
                                { label: "Uploaded By", value: uploadResult.uploadedBy, color: "text-cyan-500" },
                                { label: "Campaign", value: uploadResult.campaign ? "Linked ✓" : "N/A", color: "text-blue-500" },
                            ].map((s) => (
                                <div key={s.label} className={`p-3 rounded-[4px] ${isDark ? "bg-[#131619]" : "bg-white"}`}>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{s.label}</p>
                                    <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => navigate("/lead-management")}
                                className="px-5 py-2 rounded-[6px] bg-[#1a1f24] border border-gray-700 text-white hover:bg-gray-800 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                View in Lead Management
                            </button>
                            <button
                                onClick={handlePushToLeadManagement}
                                disabled={pushing}
                                className="px-5 py-2 rounded-[6px] bg-emerald-500 text-black hover:bg-emerald-400 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {pushing ? <FaSpinner className="animate-spin" size={12} /> : null}
                                Push to Lead Management
                            </button>
                            <button
                                onClick={() => setUploadResult(null)}
                                className={`px-5 py-2 rounded-[6px] border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isDark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
                            >
                                Upload More
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Preview Table ── */}
                {rows.length > 0 && (
                    <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
                        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-gray-800 bg-[#131619]" : "border-gray-100 bg-gray-50"}`}>
                            <h3 className={`font-black text-sm uppercase tracking-wider ${isDark ? "text-white" : "text-gray-800"}`}>
                                Preview & Edit — {rows.length} Leads
                            </h3>
                            <button
                                onClick={() => { setRows([]); setFileName(""); setValidationErrors([]); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-[4px] border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isDark ? "border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white" : "border-gray-200 text-gray-500 hover:bg-gray-100"}`}
                            >
                                <FaTimes size={10} /> Clear All
                            </button>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full">
                                <thead className={`text-[9px] font-black uppercase tracking-widest border-b ${isDark ? "bg-[#0f1215] border-gray-800 text-gray-500" : "bg-gray-50 border-gray-100 text-gray-400"}`}>
                                    <tr>
                                        <th className="px-4 py-3 text-left w-10">#</th>
                                        <th className="px-4 py-3 text-left">Name *</th>
                                        <th className="px-4 py-3 text-left">Phone *</th>
                                        <th className="px-4 py-3 text-left">School *</th>
                                        <th className="px-4 py-3 text-left">Email</th>
                                        <th className="px-4 py-3 text-left">2nd Phone</th>
                                        <th className="px-4 py-3 text-left">Source</th>
                                        <th className="px-4 py-3 text-left">Target Exam</th>
                                        <th className="px-4 py-3 text-left">Lead Type</th>
                                        <th className="px-4 py-3 text-left">Course</th>
                                        <th className="px-4 py-3 text-center">Valid</th>
                                        <th className="px-4 py-3 text-center">Del</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? "divide-gray-800" : "divide-gray-100"}`}>
                                    {rows.map((row, idx) => {
                                        const isValid = row.name && row.phoneNumber && row.schoolName;
                                        return (
                                            <tr
                                                key={idx}
                                                className={`transition-all group ${isValid ? "" : (isDark ? "bg-red-500/5" : "bg-red-50/50")}`}
                                            >
                                                <td className={`px-4 py-2.5 text-[10px] font-bold ${isDark ? "text-gray-600" : "text-gray-400"}`}>{idx + 1}</td>
                                                {["name", "phoneNumber", "schoolName", "email", "secondPhoneNumber", "source", "targetExam"].map((field) => (
                                                    <td key={field} className="px-2 py-1.5">
                                                        <input
                                                            type="text"
                                                            value={row[field] || ""}
                                                            onChange={(e) => handleEdit(idx, field, e.target.value)}
                                                            className={`w-full min-w-[100px] px-2 py-1.5 rounded-[4px] border text-[10px] font-semibold outline-none transition-all ${
                                                                (!isValid && ["name", "phoneNumber", "schoolName"].includes(field) && !row[field])
                                                                    ? (isDark ? "bg-red-500/10 border-red-500/40 text-red-300" : "bg-red-50 border-red-300 text-red-700")
                                                                    : (isDark ? "bg-[#131619] border-gray-700 text-white focus:border-cyan-500/50" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500")
                                                            }`}
                                                        />
                                                    </td>
                                                ))}
                                                <td className="px-2 py-1.5">
                                                    <select
                                                        value={row.leadType || ""}
                                                        onChange={(e) => handleEdit(idx, "leadType", e.target.value)}
                                                        className={`w-full min-w-[120px] px-2 py-1.5 rounded-[4px] border text-[10px] font-semibold outline-none transition-all ${isDark ? "bg-[#131619] border-gray-700 text-white focus:border-cyan-500/50" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500"}`}
                                                    >
                                                        <option value="">-- Select --</option>
                                                        {LEAD_TYPES.map((lt) => (
                                                            <option key={lt} value={lt}>{lt}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <input
                                                        type="text"
                                                        value={row.course || ""}
                                                        onChange={(e) => handleEdit(idx, "course", e.target.value)}
                                                        className={`w-full min-w-[100px] px-2 py-1.5 rounded-[4px] border text-[10px] font-semibold outline-none transition-all ${isDark ? "bg-[#131619] border-gray-700 text-white focus:border-cyan-500/50" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500"}`}
                                                        placeholder="Course name"
                                                    />
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {isValid
                                                        ? <FaCheckCircle className="text-emerald-500 mx-auto" size={14} />
                                                        : <FaExclamationTriangle className="text-red-500 mx-auto" size={14} />
                                                    }
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <button
                                                        onClick={() => removeRow(idx)}
                                                        className="text-red-500 hover:text-red-400 transition-colors active:scale-90"
                                                    >
                                                        <FaTrash size={11} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer action bar */}
                        <div className={`flex items-center justify-between px-6 py-4 border-t ${isDark ? "border-gray-800 bg-[#131619]" : "border-gray-100 bg-gray-50"}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                {validRows.length} of {rows.length} rows are valid and will be uploaded
                            </p>
                            <button
                                onClick={handleUpload}
                                disabled={uploading || validRows.length === 0}
                                className={`flex items-center gap-2 px-6 py-3 rounded-[6px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
                                    ${isDark ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                            >
                                {uploading ? <FaSpinner className="animate-spin" size={12} /> : <FaUpload size={12} />}
                                {uploading ? "Uploading..." : `Upload ${validRows.length} Lead(s) to Campaign`}
                            </button>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {rows.length === 0 && !uploadResult && (
                    <div className={`rounded-xl border p-16 flex flex-col items-center justify-center gap-4 opacity-50 ${isDark ? "border-gray-800" : "border-gray-200"}`}>
                        <FaFileExcel size={48} className={isDark ? "text-gray-600" : "text-gray-300"} />
                        <div className="text-center">
                            <p className={`font-black text-sm uppercase tracking-widest ${isDark ? "text-gray-500" : "text-gray-400"}`}>No file selected</p>
                            <p className={`text-[10px] mt-1 font-semibold ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                                Select an Excel file or download the template to get started
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
