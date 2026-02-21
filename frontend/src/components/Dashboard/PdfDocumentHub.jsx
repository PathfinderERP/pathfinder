import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    FaFilePdf, FaUpload, FaDownload, FaPrint, FaTimes,
    FaTrash, FaExpand, FaSpinner, FaEye, FaCloudUploadAlt,
    FaCheckCircle, FaExclamationTriangle, FaFolder
} from "react-icons/fa";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL;

export default function PdfDocumentHub({ theme }) {
    const isDark = theme === "dark";

    // State
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);   // { url, fileName }
    const [previewPageLoading, setPreviewPageLoading] = useState(true);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [pendingFiles, setPendingFiles] = useState([]);
    const [showUploadPanel, setShowUploadPanel] = useState(false);
    const fileInputRef = useRef(null);
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    // ─── Fetch documents ────────────────────────────────────────────────────────
    const fetchDocuments = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/hr/documents/list`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (err) {
            console.error("Error fetching documents:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    // ─── File selection ──────────────────────────────────────────────────────────
    const handleFileSelect = (files) => {
        const pdfs = Array.from(files).filter(f => f.type === "application/pdf");
        if (pdfs.length === 0) {
            toast.error("Only PDF files are allowed.");
            return;
        }
        const nonPdf = Array.from(files).length - pdfs.length;
        if (nonPdf > 0) toast.warning(`${nonPdf} non-PDF file(s) skipped.`);
        setPendingFiles(prev => [...prev, ...pdfs]);
        setShowUploadPanel(true);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFileSelect(e.dataTransfer.files);
    };

    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);

    const removePendingFile = (index) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    // ─── Upload ──────────────────────────────────────────────────────────────────
    const handleUpload = async () => {
        if (pendingFiles.length === 0) { toast.error("No files selected."); return; }

        setUploading(true);
        setUploadProgress(pendingFiles.map(f => ({ name: f.name, status: "uploading" })));

        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("title", title || "Untitled Document");
            formData.append("description", description || "");
            formData.append("targetAudience", "All");
            pendingFiles.forEach(f => formData.append("files", f));

            const res = await fetch(`${API_URL}/hr/documents/upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) {
                setUploadProgress(prev => prev.map(p => ({ ...p, status: "done" })));
                toast.success(`${pendingFiles.length} PDF(s) uploaded successfully!`);
                setTimeout(() => {
                    setPendingFiles([]);
                    setTitle("");
                    setDescription("");
                    setShowUploadPanel(false);
                    setUploadProgress([]);
                    fetchDocuments();
                }, 800);
            } else {
                const errData = await res.json();
                setUploadProgress(prev => prev.map(p => ({ ...p, status: "error" })));
                toast.error(errData.message || "Upload failed.");
            }
        } catch (err) {
            console.error("Upload error:", err);
            setUploadProgress(prev => prev.map(p => ({ ...p, status: "error" })));
            toast.error("Upload error occurred.");
        } finally {
            setUploading(false);
        }
    };

    // ─── Delete ──────────────────────────────────────────────────────────────────
    const handleDelete = async (docId) => {
        if (!window.confirm("Delete this document?")) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/hr/documents/${docId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                toast.success("Document deleted.");
                setDocuments(prev => prev.filter(d => d._id !== docId));
            } else {
                const err = await res.json();
                toast.error(err.message || "Failed to delete.");
            }
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Delete error occurred.");
        }
    };

    // ─── Preview ─────────────────────────────────────────────────────────────────
    const openPreview = (file) => {
        setPreviewDoc(file);
        setPreviewPageLoading(true);
    };

    const handleDownload = async (file) => {
        try {
            const res = await fetch(file.url);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.fileName || "document.pdf";
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            window.open(file.url, "_blank");
        }
    };

    const handlePrint = (file) => {
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = file.url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
            iframe.contentWindow.print();
            setTimeout(() => document.body.removeChild(iframe), 3000);
        };
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────────
    const formatSize = (bytes) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    };

    // ─── Card color accent by index ───────────────────────────────────────────────
    const accents = ["from-red-500 to-rose-600", "from-orange-500 to-amber-600", "from-cyan-500 to-blue-600",
        "from-purple-500 to-violet-600", "from-emerald-500 to-teal-600", "from-pink-500 to-fuchsia-600"];

    return (
        <div className={`w-full flex flex-col gap-4`}>

            {/* ─── Header ──────────────────────────────────────────────────────── */}
            <div className={`rounded-xl border p-5 flex items-center justify-between shadow-lg ${isDark ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200"}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                        <FaFilePdf className="text-white" size={18} />
                    </div>
                    <div>
                        <h3 className={`font-black text-base ${isDark ? "text-white" : "text-gray-900"}`}>PDF Documents</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            {documents.length} document{documents.length !== 1 ? "s" : ""} shared
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowUploadPanel(p => !p)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 shadow-lg ${showUploadPanel
                        ? "bg-gray-500/10 border border-gray-500/20 text-gray-400"
                        : "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/25"
                        }`}
                >
                    {showUploadPanel ? <><FaTimes size={12} /> Cancel</> : <><FaUpload size={12} /> Upload PDF</>}
                </button>
            </div>

            {/* ─── Upload Panel ─────────────────────────────────────────────────── */}
            {showUploadPanel && (
                <div className={`rounded-xl border shadow-xl overflow-hidden transition-all ${isDark ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200"}`}>
                    {/* Drag & Drop Zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`m-4 rounded-xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center py-8 px-4 ${dragOver
                            ? "border-red-500 bg-red-500/10 scale-[1.01]"
                            : isDark
                                ? "border-gray-700 hover:border-red-500/50 hover:bg-red-500/5"
                                : "border-gray-300 hover:border-red-400 hover:bg-red-50"
                            }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="application/pdf"
                            className="hidden"
                            onChange={e => handleFileSelect(e.target.files)}
                        />
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all ${dragOver ? "bg-red-500 scale-110" : "bg-red-500/10"}`}>
                            <FaCloudUploadAlt className={dragOver ? "text-white" : "text-red-500"} size={28} />
                        </div>
                        <p className={`font-black text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            {dragOver ? "Drop your PDFs here!" : "Click or drag & drop PDFs"}
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            Multiple files supported · PDF only
                        </p>
                    </div>

                    {/* Pending files list */}
                    {pendingFiles.length > 0 && (
                        <div className="px-4 pb-2 space-y-2">
                            {pendingFiles.map((file, i) => {
                                const status = uploadProgress[i]?.status;
                                return (
                                    <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${isDark ? "bg-[#131619] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                                            <FaFilePdf className="text-red-500" size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-bold truncate ${isDark ? "text-gray-200" : "text-gray-800"}`}>{file.name}</p>
                                            <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>{formatSize(file.size)}</p>
                                        </div>
                                        {status === "uploading" && <FaSpinner className="animate-spin text-cyan-500" size={14} />}
                                        {status === "done" && <FaCheckCircle className="text-emerald-500" size={14} />}
                                        {status === "error" && <FaExclamationTriangle className="text-red-500" size={14} />}
                                        {!status && (
                                            <button onClick={() => removePendingFile(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                <FaTimes size={12} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Meta fields */}
                    <div className="px-4 pb-4 space-y-3">
                        <input
                            type="text"
                            placeholder="Document title (optional)"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:border-red-500/50 transition-colors ${isDark ? "bg-[#131619] border-gray-700 text-white placeholder-gray-600" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"}`}
                        />
                        <textarea
                            placeholder="Description (optional)"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={2}
                            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:border-red-500/50 transition-colors resize-none ${isDark ? "bg-[#131619] border-gray-700 text-white placeholder-gray-600" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"}`}
                        />
                        <button
                            onClick={handleUpload}
                            disabled={uploading || pendingFiles.length === 0}
                            className="w-full py-3 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-sm shadow-lg shadow-red-500/25 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {uploading
                                ? <><FaSpinner className="animate-spin" /> Uploading...</>
                                : <><FaUpload size={14} /> Upload {pendingFiles.length > 0 ? `${pendingFiles.length} PDF${pendingFiles.length > 1 ? "s" : ""}` : "PDFs"}</>
                            }
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Documents Grid ────────────────────────────────────────────────── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <FaSpinner className="animate-spin text-red-500" size={28} />
                    <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-gray-500" : "text-gray-400"}`}>Loading documents...</p>
                </div>
            ) : documents.length === 0 ? (
                <div className={`rounded-xl border p-10 flex flex-col items-center justify-center gap-3 ${isDark ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200"}`}>
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                        <FaFolder className="text-red-500" size={24} />
                    </div>
                    <p className={`font-black text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No documents yet</p>
                    <p className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>Upload your first PDF above</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {documents.map((doc, docIndex) => (
                        <div
                            key={doc._id}
                            className={`rounded-xl border shadow-md overflow-hidden transition-all hover:shadow-lg ${isDark ? "bg-[#1a1f24] border-gray-800 hover:border-gray-700" : "bg-white border-gray-200 hover:border-gray-300"}`}
                        >
                            {/* Doc header */}
                            <div className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${accents[docIndex % accents.length]} flex items-center justify-center shadow-lg`}>
                                        <FaFilePdf className="text-white" size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-black text-sm truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                                            {doc.title || "Untitled Document"}
                                        </h4>
                                        {doc.description && (
                                            <p className={`text-xs mt-0.5 line-clamp-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{doc.description}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${isDark ? "text-cyan-400 border-cyan-500/20 bg-cyan-500/5" : "text-cyan-600 border-cyan-300 bg-cyan-50"}`}>
                                                {doc.uploadedByName}
                                            </span>
                                            <span className={`text-[9px] font-bold ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                                                {formatDate(doc.createdAt)}
                                            </span>
                                            <span className={`text-[9px] font-bold ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                                                · {doc.files?.length} file{doc.files?.length !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Delete (own or admin) */}
                                    {(doc.uploadedBy === currentUser._id || currentUser.role === "superAdmin" || currentUser.role === "admin") && (
                                        <button
                                            onClick={() => handleDelete(doc._id)}
                                            className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                        >
                                            <FaTrash size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Files in this document */}
                            {doc.files?.map((file, fi) => (
                                <div
                                    key={fi}
                                    className={`mx-4 mb-3 rounded-lg border flex items-center gap-3 px-4 py-3 group transition-all hover:border-red-500/30 ${isDark ? "bg-[#131619] border-gray-800 hover:bg-red-500/5" : "bg-gray-50 border-gray-200 hover:bg-red-50"}`}
                                >
                                    <FaFilePdf className="text-red-500 shrink-0" size={16} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold truncate ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                            {file.fileName || `File ${fi + 1}`}
                                        </p>
                                        <p className={`text-[9px] font-bold uppercase tracking-wide ${isDark ? "text-gray-600" : "text-gray-400"}`}>PDF</p>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openPreview(file)}
                                            title="Preview"
                                            className={`p-2 rounded-lg transition-all hover:scale-110 ${isDark ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-200 text-gray-500 hover:text-gray-900"}`}
                                        >
                                            <FaEye size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDownload(file)}
                                            title="Download"
                                            className="p-2 rounded-lg text-cyan-500 hover:bg-cyan-500/10 transition-all hover:scale-110"
                                        >
                                            <FaDownload size={14} />
                                        </button>
                                        <button
                                            onClick={() => handlePrint(file)}
                                            title="Print"
                                            className="p-2 rounded-lg text-purple-500 hover:bg-purple-500/10 transition-all hover:scale-110"
                                        >
                                            <FaPrint size={14} />
                                        </button>
                                    </div>

                                    {/* Always-visible preview button */}
                                    <button
                                        onClick={() => openPreview(file)}
                                        className="shrink-0 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5 group-hover:opacity-0 opacity-100"
                                    >
                                        <FaExpand size={10} /> View
                                    </button>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* ─── Full-Screen Preview Modal ─────────────────────────────────────── */}
            {previewDoc && (
                <div
                    className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-2xl flex flex-col"
                    onClick={() => setPreviewDoc(null)}
                >
                    {/* Modal top bar */}
                    <div
                        className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-xl shrink-0"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                                <FaFilePdf className="text-white" size={14} />
                            </div>
                            <div>
                                <p className="text-white font-black text-sm truncate max-w-[300px]">
                                    {previewDoc.fileName || "Document Preview"}
                                </p>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">PDF Document</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => handleDownload(previewDoc)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-xs hover:bg-cyan-500 hover:text-white transition-all"
                            >
                                <FaDownload size={12} /> Download
                            </button>
                            <button
                                onClick={() => handlePrint(previewDoc)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold text-xs hover:bg-purple-500 hover:text-white transition-all"
                            >
                                <FaPrint size={12} /> Print
                            </button>
                            <button
                                onClick={() => setPreviewDoc(null)}
                                className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all hover:rotate-90 duration-300"
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>
                    </div>

                    {/* PDF Viewer */}
                    <div className="flex-1 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        {previewPageLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                                <FaSpinner className="animate-spin text-red-500" size={32} />
                                <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Loading PDF...</p>
                            </div>
                        )}
                        <iframe
                            src={`${previewDoc.url}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                            title="PDF Preview"
                            className="w-full h-full border-0"
                            onLoad={() => setPreviewPageLoading(false)}
                            style={{ background: "transparent" }}
                        />
                    </div>

                    {/* Bottom hint */}
                    <div className="shrink-0 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <p className="text-gray-700 text-[10px] font-bold uppercase tracking-widest">
                            Click outside or press ESC to close
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
