import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import {
    FaArrowLeft, FaBullhorn, FaSync, FaTimes, FaEye, FaEdit, FaUpload,
    FaPlay, FaStop, FaRedo, FaClock, FaTrash, FaPencilAlt, FaExternalLinkAlt
} from "react-icons/fa";
import { hasPermission } from "../../config/permissions";

const API_URL = import.meta.env.VITE_API_URL;

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtDateTime = (ts) => {
    if (!ts) return null;
    const d = new Date(ts);
    return d.toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true
    });
};

export default function Campaigns() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canView = hasPermission(user, "leadManagement", "campaignAds", "view") ||
                    hasPermission(user, "leadManagement", "campaignAds", "create") ||
                    hasPermission(user, "leadManagement", "campaignAds", "edit") ||
                    hasPermission(user, "leadManagement", "campaignAds", "delete");

    useEffect(() => {
        if (!canView && user.role !== "superAdmin" && user.role !== "superadmin") {
            toast.error("Access Denied");
            navigate("/");
        }
    }, [canView, user.role, navigate]);

    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [campaigns, setCampaigns]         = useState([]);
    const [loading, setLoading]             = useState(false);
    const [submitting, setSubmitting]       = useState(false);
    const [actionLoading, setActionLoading] = useState({}); // {campaignId: true}
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [editForm, setEditForm] = useState({
        adName: "", platform: "Facebook", creativeName: "", duration: "",
        budget: "", cpc: "", startDate: "", endDate: "",
        totalLikes: "", totalViews: "", comments: "", shares: "", imageLink: "", videoLink: ""
    });
    const [editMediaFiles, setEditMediaFiles] = useState(null);
    const [form, setForm] = useState({
        adName: "", platform: "Facebook", creativeName: "", duration: "",
        budget: "", cpc: "", startDate: "", endDate: "",
        totalLikes: "", totalViews: "", comments: "", shares: "", imageLink: "", videoLink: ""
    });
    const [addMediaFiles, setAddMediaFiles] = useState(null);
    const [uploadingMedia, setUploadingMedia] = useState(false);

    // ── Pagination states ──────────────────────────────────────────────────
    const [currentPage, setCurrentPage]   = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const totalPages = Math.ceil(campaigns.length / itemsPerPage) || 1;
    const paginatedCampaigns = useMemo(() => {
        return campaigns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [campaigns, currentPage, itemsPerPage]);

    const fetchCampaigns = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/lead-management/campaigns`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setCampaigns(data.campaigns || []);
            } else {
                toast.error(data.message || "Failed to fetch campaigns");
            }
        } catch (error) {
            console.error("Error fetching campaigns:", error);
            toast.error("Error fetching campaigns");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

    // ── Run action (start / end / restart) ───────────────────────────────────
    const handleRunAction = async (campaignId, action) => {
        setActionLoading(prev => ({ ...prev, [campaignId]: action }));
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/lead-management/campaigns/${campaignId}/run-action`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || `Campaign ${action}ed`);
                // Update local state so UI reflects immediately (optimistic)
                setCampaigns(prev => prev.map(c =>
                    c._id === campaignId ? {
                        ...c,
                        runStatus: data.campaign.runStatus,
                        lastStartedAt:   data.campaign.lastStartedAt,
                        lastEndedAt:     data.campaign.lastEndedAt,
                        lastRestartedAt: data.campaign.lastRestartedAt,
                        runLog: data.campaign.runLog
                    } : c
                ));
            } else {
                toast.error(data.message || "Action failed");
            }
        } catch (err) {
            console.error("Run action error:", err);
            toast.error("Server error");
        } finally {
            setActionLoading(prev => ({ ...prev, [campaignId]: null }));
        }
    };

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.adName || !form.platform || !form.budget || !form.cpc || !form.startDate || !form.endDate) {
            toast.error("Please fill in all required fields.");
            return;
        }
        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            Object.keys(form).forEach(key => formData.append(key, form[key]));
            if (addMediaFiles && addMediaFiles.length > 0) {
                Array.from(addMediaFiles).forEach(file => formData.append("mediaFiles", file));
            }

            const res = await fetch(`${API_URL}/lead-management/campaigns`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Campaign added successfully!");
                setForm({ adName: "", platform: "Facebook", creativeName: "", duration: "", budget: "", cpc: "", startDate: "", endDate: "", totalLikes: "", totalViews: "", comments: "", shares: "", imageLink: "", videoLink: "" });
                setAddMediaFiles(null);
                fetchCampaigns();
            } else {
                toast.error(data.message || "Failed to add campaign");
            }
        } catch (error) {
            console.error("Error creating campaign:", error);
            toast.error("Server error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this campaign? This will unlink it from any associated leads.")) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/lead-management/campaigns/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Campaign deleted successfully");
                fetchCampaigns();
            } else {
                toast.error(data.message || "Failed to delete campaign");
            }
        } catch (error) {
            console.error("Error deleting campaign:", error);
            toast.error("Failed to delete campaign");
        }
    };

    const formatDateForInput = (dateStr) => dateStr ? dateStr.slice(0, 10) : "";

    const handleOpenViewEdit = (campaign) => {
        setSelectedCampaign(campaign);
        setEditForm({
            adName: campaign.adName || "",
            platform: campaign.platform || "Facebook",
            creativeName: campaign.creativeName || "",
            duration: campaign.duration || "",
            budget: campaign.budget || "",
            cpc: campaign.cpc || "",
            startDate: formatDateForInput(campaign.startDate),
            endDate: formatDateForInput(campaign.endDate),
            totalLikes: campaign.totalLikes || "",
            totalViews: campaign.totalViews || "",
            comments: campaign.comments || "",
            shares: campaign.shares || "",
            imageLink: campaign.imageLink || "",
            videoLink: campaign.videoLink || ""
        });
        setEditMediaFiles(null);
    };

    const handleMediaUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        setUploadingMedia(true);
        const formData = new FormData();
        Array.from(files).forEach(file => formData.append("mediaFiles", file));

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/lead-management/campaigns/${selectedCampaign._id}/upload-media`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Media uploaded successfully");
                setSelectedCampaign(data.campaign);
                fetchCampaigns();
            } else {
                toast.error(data.message || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Upload failed");
        } finally {
            setUploadingMedia(false);
            e.target.value = null;
        }
    };

    const handleDeleteMedia = async (mediaIndex) => {
        if (!selectedCampaign) return;
        if (!window.confirm("Are you sure you want to delete this media?")) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/lead-management/campaigns/${selectedCampaign._id}/media`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ mediaIndex })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Media deleted successfully");
                setSelectedCampaign(data.campaign);
                fetchCampaigns();
            } else {
                toast.error(data.message || "Failed to delete media");
            }
        } catch (error) {
            console.error("Delete media error:", error);
            toast.error("Failed to delete media");
        }
    };

    const handleReplaceMedia = async (mediaIndex, file) => {
        if (!selectedCampaign || !file) return;
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("mediaIndex", mediaIndex);
            formData.append("mediaFile", file);

            const res = await fetch(`${API_URL}/lead-management/campaigns/${selectedCampaign._id}/replace-media`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Media replaced successfully");
                setSelectedCampaign(data.campaign);
                fetchCampaigns();
            } else {
                toast.error(data.message || "Failed to replace media");
            }
        } catch (error) {
            console.error("Replace media error:", error);
            toast.error("Failed to replace media");
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editForm.adName || !editForm.platform || !editForm.budget || !editForm.cpc || !editForm.startDate || !editForm.endDate) {
            toast.error("Please fill in all required fields.");
            return;
        }
        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            Object.keys(editForm).forEach(key => formData.append(key, editForm[key]));
            if (editMediaFiles && editMediaFiles.length > 0) {
                Array.from(editMediaFiles).forEach(file => formData.append("mediaFiles", file));
            }

            const res = await fetch(`${API_URL}/lead-management/campaigns/${selectedCampaign._id}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Campaign updated successfully!");
                setSelectedCampaign(null);
                setEditMediaFiles(null);
                fetchCampaigns();
            } else {
                toast.error(data.message || "Failed to update campaign");
            }
        } catch (error) {
            console.error("Error updating campaign:", error);
            toast.error("Server error");
        } finally {
            setSubmitting(false);
        }
    };

    const card = `rounded-[12px] border p-6 mb-8 transition-all duration-200 ${isDark ? "bg-[#1a1f24] border-gray-800 shadow-cyan-500/5" : "bg-white border-gray-200 shadow-sm"}`;
    const inputCls = `w-full px-4 py-2.5 rounded-[6px] border text-xs font-semibold tracking-wide outline-none transition-all ${isDark ? "bg-[#131619] border-gray-850 text-white focus:border-cyan-500/50" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500"}`;

    const formatCurrency = (val) =>
        new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

    // ── Run-status pill + action buttons component ────────────────────────────
    const RunStatusCell = ({ campaign }) => {
        const status = campaign.runStatus || "idle";
        const busy   = actionLoading[campaign._id];

        // Status badge colours
        const pillCls =
            status === "running" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
            status === "ended"   ? "bg-red-500/15 text-red-400 border-red-500/30" :
                                   "bg-gray-500/15 text-gray-400 border-gray-500/30";

        const pillLabel =
            status === "running" ? "● RUNNING" :
            status === "ended"   ? "■ ENDED"   : "○ IDLE";

        // Tiny timestamp row helper
        const TsRow = ({ icon: Icon, label, ts, color }) => ts ? (
            <div className={`flex items-center gap-1 text-[9px] font-bold ${color} mt-0.5`}>
                <Icon size={8} />
                <span className="opacity-80">{label}:</span>
                <span>{fmtDateTime(ts)}</span>
            </div>
        ) : null;

        return (
            <div className="flex flex-col gap-1.5 min-w-[180px]">
                {/* Status badge */}
                <span className={`self-start text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${pillCls}`}>
                    {pillLabel}
                </span>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-1">
                    {/* START — only when idle */}
                    {status === "idle" && (
                        <button
                            disabled={!!busy}
                            onClick={() => handleRunAction(campaign._id, "start")}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-[4px] border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all text-[9px] font-black uppercase active:scale-95 disabled:opacity-40"
                        >
                            {busy === "start" ? <FaSync className="animate-spin" size={8} /> : <FaPlay size={8} />}
                            Start
                        </button>
                    )}

                    {/* END — only when running */}
                    {status === "running" && (
                        <button
                            disabled={!!busy}
                            onClick={() => handleRunAction(campaign._id, "end")}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-[4px] border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-all text-[9px] font-black uppercase active:scale-95 disabled:opacity-40"
                        >
                            {busy === "end" ? <FaSync className="animate-spin" size={8} /> : <FaStop size={8} />}
                            End
                        </button>
                    )}

                    {/* RESTART — when running or ended */}
                    {(status === "running" || status === "ended") && (
                        <button
                            disabled={!!busy}
                            onClick={() => handleRunAction(campaign._id, "restart")}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-[4px] border border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-white transition-all text-[9px] font-black uppercase active:scale-95 disabled:opacity-40"
                        >
                            {busy === "restart" ? <FaSync className="animate-spin" size={8} /> : <FaRedo size={8} />}
                            Restart
                        </button>
                    )}
                </div>

                {/* Timestamps beneath buttons */}
                <div className="pl-0.5">
                    <TsRow icon={FaClock} label="Started"    ts={campaign.lastStartedAt}   color="text-emerald-500" />
                    <TsRow icon={FaClock} label="Ended"      ts={campaign.lastEndedAt}     color="text-red-400" />
                    <TsRow icon={FaClock} label="Restarted"  ts={campaign.lastRestartedAt} color="text-amber-400" />
                </div>
            </div>
        );
    };

    return (
        <Layout activePage="Lead Management">
            <div className={`p-4 md:p-8 min-h-screen ${isDark ? "bg-[#0f1215] text-white" : "bg-[#f4f7fe] text-gray-900"}`}>

                {/* Header Row */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate("/lead-management")}
                            className={`p-2.5 rounded border transition-all ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300" : "bg-white border-gray-200 hover:bg-gray-100 text-gray-600"}`}>
                            <FaArrowLeft />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-1.5 h-8 bg-cyan-500 rounded shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                                <h1 className="text-3xl font-extrabold tracking-tight uppercase">
                                    Campaigns / <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Ads Tracker</span>
                                </h1>
                            </div>
                            <p className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                <FaBullhorn className="text-cyan-500" /> Manage and track digital ads marketing campaigns
                            </p>
                        </div>
                    </div>
                    <button onClick={fetchCampaigns}
                        className={`p-2.5 rounded border transition-all ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300" : "bg-white border-gray-200 hover:bg-gray-100 text-gray-600"}`}
                        title="Refresh">
                        <FaSync className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                {/* Form Card */}
                <form onSubmit={handleSubmit} className={card}>
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800/10">
                        <h2 className={`text-lg font-black uppercase tracking-tight ${isDark ? "text-white" : "text-gray-800"}`}>
                            Add New Digital Ad / Campaign
                        </h2>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2.5 rounded-[6px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            {submitting ? "Saving..." : "Add Campaign"}
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input type="text" name="adName" required value={form.adName} onChange={handleChange}
                                placeholder="Ad Name e.g. NEET Repeater Lead Ad" className={inputCls} />
                            <select name="platform" required value={form.platform} onChange={handleChange} className={inputCls}>
                                <option value="Facebook">Facebook</option>
                                <option value="Instagram">Instagram</option>
                                <option value="YouTube">YouTube</option>
                                <option value="Google Search">Google Search</option>
                                <option value="Other">Other</option>
                            </select>
                            <input type="text" name="creativeName" value={form.creativeName} onChange={handleChange}
                                placeholder="Creative / Video Name" className={inputCls} />
                            <input type="text" name="duration" value={form.duration} onChange={handleChange}
                                placeholder="Duration e.g. 7 Days" className={inputCls} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input type="number" name="budget" required value={form.budget} onChange={handleChange}
                                placeholder="Budget ₹" className={inputCls} />
                            <input type="number" name="cpc" step="0.01" required value={form.cpc} onChange={handleChange}
                                placeholder="CPC ₹" className={inputCls} />
                            <input type="date" name="startDate" required value={form.startDate} onChange={handleChange} className={inputCls} />
                            <input type="date" name="endDate" required value={form.endDate} onChange={handleChange} className={inputCls} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input type="number" name="totalLikes" value={form.totalLikes} onChange={handleChange}
                                placeholder="Total Likes" className={inputCls} />
                            <input type="number" name="totalViews" value={form.totalViews} onChange={handleChange}
                                placeholder="Total Views" className={inputCls} />
                            <input type="number" name="comments" value={form.comments} onChange={handleChange}
                                placeholder="Comments" className={inputCls} />
                            <input type="number" name="shares" value={form.shares} onChange={handleChange}
                                placeholder="Shares" className={inputCls} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">Upload Photo / Video</label>
                                <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*,video/*"
                                    onChange={(e) => setAddMediaFiles(e.target.files)}
                                    className={inputCls} 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">Image Link</label>
                                <input type="url" name="imageLink" value={form.imageLink} onChange={handleChange}
                                    placeholder="Image Link" className={inputCls} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">Video Link</label>
                                <input type="url" name="videoLink" value={form.videoLink} onChange={handleChange}
                                    placeholder="Video Link" className={inputCls} />
                            </div>
                        </div>
                    </div>
                </form>

                {/* Table Card */}
                <div className={card}>
                    <h2 className={`text-lg font-black uppercase tracking-tight mb-6 pb-4 border-b border-gray-800/10 ${isDark ? "text-white" : "text-gray-800"}`}>
                        Running / Completed Ads
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-wider text-left border-b ${isDark ? "border-gray-800 text-gray-500" : "border-gray-100 text-gray-400"}`}>
                                    <th className="pb-3 pr-2">AD</th>
                                    <th className="pb-3 px-2">PLATFORM</th>
                                    <th className="pb-3 px-2">CREATIVE / VIDEO</th>
                                    <th className="pb-3 px-2">DURATION</th>
                                    <th className="pb-3 px-2 text-right">BUDGET</th>
                                    <th className="pb-3 px-2 text-right">CPC</th>
                                    <th className="pb-3 px-2 text-right">VIEWS</th>
                                    <th className="pb-3 px-2 text-right">LIKES</th>
                                    <th className="pb-3 px-2 text-right">COMMENTS</th>
                                    <th className="pb-3 px-2 text-right">SHARES</th>
                                    <th className="pb-3 px-2 text-right">LEADS</th>
                                    <th className="pb-3 px-2 text-right">CPL</th>
                                    <th className="pb-3 px-2 text-right">ADMISSION</th>
                                    {/* NEW STATUS COLUMN */}
                                    <th className="pb-3 px-2">STATUS / RUN</th>
                                    <th className="pb-3 pl-2 text-center">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="15" className="text-center py-8">
                                            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : campaigns.length === 0 ? (
                                    <tr>
                                        <td colSpan="15" className="text-center py-8 font-semibold opacity-40 text-xs uppercase tracking-widest">
                                            No Campaigns Registered
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedCampaigns.map(c => {
                                        const cpl = c.leads > 0 ? c.budget / c.leads : 0;
                                        return (
                                            <tr key={c._id} className={`text-xs font-semibold tracking-wide border-b hover:bg-black/5 dark:hover:bg-white/5 transition-all ${isDark ? "border-gray-800 text-gray-300" : "border-gray-100 text-gray-700"}`}>
                                                <td
                                                    onClick={() => handleOpenViewEdit(c)}
                                                    className="py-4 pr-2 cursor-pointer transition-all"
                                                    title={c.adName}
                                                >
                                                    <div className="flex items-center gap-2 max-w-[160px]">
                                                        {(c.imageLink || (c.uploadedMedia && c.uploadedMedia.length > 0)) ? (
                                                            <img 
                                                                src={c.imageLink || c.uploadedMedia[0]} 
                                                                alt="Campaign Logo" 
                                                                className="w-10 h-10 rounded object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                                                                onError={(e) => {
                                                                    if (c.uploadedMedia && c.uploadedMedia[0] && e.target.src !== c.uploadedMedia[0]) {
                                                                        e.target.src = c.uploadedMedia[0];
                                                                    } else {
                                                                        e.target.style.display = 'none';
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-800 flex-shrink-0 flex items-center justify-center border border-gray-300 dark:border-gray-700">
                                                                <FaBullhorn size={16} className="text-gray-400" />
                                                            </div>
                                                        )}
                                                        <span className="font-bold truncate text-blue-500 hover:underline hover:text-blue-600">
                                                            {c.adName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-2">{c.platform}</td>
                                                <td className="py-4 px-2 max-w-[130px] truncate" title={c.creativeName || "—"}>{c.creativeName || "—"}</td>
                                                <td className="py-4 px-2">{c.duration || "—"}</td>
                                                <td className="py-4 px-2 text-right font-mono">{formatCurrency(c.budget)}</td>
                                                <td className="py-4 px-2 text-right font-mono">₹{c.cpc.toFixed(2)}</td>
                                                <td className="py-4 px-2 text-right font-bold text-cyan-400">{c.totalViews || 0}</td>
                                                <td className="py-4 px-2 text-right font-bold text-rose-400">{c.totalLikes || 0}</td>
                                                <td className="py-4 px-2 text-right font-bold text-amber-400">{c.comments || 0}</td>
                                                <td className="py-4 px-2 text-right font-bold text-purple-400">{c.shares || 0}</td>
                                                <td className="py-4 px-2 text-right font-bold text-cyan-500">{c.leads}</td>
                                                <td className="py-4 px-2 text-right font-mono">{formatCurrency(cpl)}</td>
                                                <td className="py-4 px-2 text-right font-bold text-green-500">{c.admission}</td>

                                                {/* ── STATUS / RUN COLUMN ── */}
                                                <td className="py-4 px-2">
                                                    <RunStatusCell campaign={c} />
                                                </td>

                                                {/* ACTION COLUMN */}
                                                <td className="py-4 pl-2 text-center">
                                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                        <button
                                                            onClick={() => handleOpenViewEdit(c)}
                                                            className="px-2.5 py-1.5 rounded-[4px] border border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-white transition-all text-[10px] font-black uppercase active:scale-95 cursor-pointer flex items-center gap-1"
                                                        >
                                                            <FaEye size={10} /> View
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenViewEdit(c)}
                                                            className="px-2.5 py-1.5 rounded-[4px] border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-all text-[10px] font-black uppercase active:scale-95 cursor-pointer flex items-center gap-1"
                                                        >
                                                            <FaEdit size={10} /> Edit
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/lead-management/campaigns/${c._id}/upload-leads`, { state: { campaignName: c.adName, campaignId: c._id } })}
                                                            className="px-2.5 py-1.5 rounded-[4px] border border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all text-[10px] font-black uppercase active:scale-95 cursor-pointer flex items-center gap-1"
                                                        >
                                                            <FaUpload size={10} /> Upload Leads
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(c._id)}
                                                            className="px-2.5 py-1.5 rounded-[4px] border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase active:scale-95 cursor-pointer"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    {campaigns.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-800/10 text-xs font-semibold">
                            <div className={`flex items-center gap-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                <span>Showing</span>
                                <span className="font-bold text-cyan-500">
                                    {Math.min((currentPage - 1) * itemsPerPage + 1, campaigns.length)} - {Math.min(currentPage * itemsPerPage, campaigns.length)}
                                </span>
                                <span>of</span>
                                <span className="font-bold">{campaigns.length}</span>
                                <span>campaigns</span>
                                
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className={`ml-3 px-2 py-1 rounded border text-xs font-semibold outline-none ${isDark ? "bg-[#131619] border-gray-800 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"}`}
                                >
                                    <option value={5}>5 per page</option>
                                    <option value={10}>10 per page</option>
                                    <option value={25}>25 per page</option>
                                    <option value={50}>50 per page</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    className={`px-3 py-1.5 rounded border transition-all cursor-pointer font-bold uppercase text-[10px] disabled:opacity-40 disabled:cursor-not-allowed ${
                                        isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                                    }`}
                                >
                                    Previous
                                </button>
                                
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .map((p, idx, arr) => (
                                        <Fragment key={p}>
                                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                                                <span className="px-1 opacity-50">...</span>
                                            )}
                                            <button
                                                onClick={() => setCurrentPage(p)}
                                                className={`w-7 h-7 rounded text-xs font-bold transition-all cursor-pointer ${
                                                    currentPage === p
                                                        ? "bg-blue-600 text-white shadow-md"
                                                        : isDark
                                                            ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        </Fragment>
                                    ))}

                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    className={`px-3 py-1.5 rounded border transition-all cursor-pointer font-bold uppercase text-[10px] disabled:opacity-40 disabled:cursor-not-allowed ${
                                        isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                                    }`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── View & Edit Modal ─────────────────────────────────────────── */}
            <Modal
                isOpen={!!selectedCampaign}
                onClose={() => setSelectedCampaign(null)}
                title="Campaign Details & Configuration"
                isDarkMode={isDark}
            >
                {selectedCampaign && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                        {/* Left: View Details */}
                        <div className={`p-5 rounded-xl border ${isDark ? "bg-[#131619] border-gray-800" : "bg-gray-50 border-gray-250 shadow-sm"}`}>
                            <h4 className="text-sm font-black uppercase tracking-wider text-cyan-500 mb-4 flex items-center gap-2">
                                <FaBullhorn /> Ad Metrics & Details
                            </h4>
                            <div className="space-y-4 text-xs">
                                {[
                                    ["Ad Name",      selectedCampaign.adName],
                                    ["Platform",     selectedCampaign.platform],
                                    ["Creative",     selectedCampaign.creativeName || "—"],
                                    ["Duration",     selectedCampaign.duration || "—"],
                                    ["Budget",       formatCurrency(selectedCampaign.budget)],
                                    ["CPC",          `₹${selectedCampaign.cpc.toFixed(2)}`],
                                    ["Leads",        selectedCampaign.leads],
                                    ["CPL",          formatCurrency(selectedCampaign.leads > 0 ? selectedCampaign.budget / selectedCampaign.leads : 0)],
                                    ["Admissions",   selectedCampaign.admission],
                                    ["Start Date",   new Date(selectedCampaign.startDate).toLocaleDateString("en-IN")],
                                    ["End Date",     new Date(selectedCampaign.endDate).toLocaleDateString("en-IN")],
                                    ["Run Status",   (selectedCampaign.runStatus || "idle").toUpperCase()],
                                    ["Likes",        selectedCampaign.totalLikes || 0],
                                    ["Views",        selectedCampaign.totalViews || 0],
                                    ["Comments",     selectedCampaign.comments || 0],
                                    ["Shares",       selectedCampaign.shares || 0],
                                ].map(([label, val]) => (
                                    <div key={label} className="flex justify-between border-b pb-2 border-gray-800/10">
                                        <span className="font-semibold opacity-65 uppercase tracking-wider">{label}</span>
                                        <span className="font-bold">{val}</span>
                                    </div>
                                ))}
                                {selectedCampaign.imageLink && (
                                    <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                        <span className="font-semibold opacity-65 uppercase tracking-wider">Image Link</span>
                                        <a href={selectedCampaign.imageLink} target="_blank" rel="noreferrer" className="font-bold text-blue-500 hover:underline">View Image</a>
                                    </div>
                                )}
                                {selectedCampaign.videoLink && (
                                    <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                        <span className="font-semibold opacity-65 uppercase tracking-wider">Video Link</span>
                                        <a href={selectedCampaign.videoLink} target="_blank" rel="noreferrer" className="font-bold text-blue-500 hover:underline">View Video</a>
                                    </div>
                                )}
                                {selectedCampaign.uploadedMedia && selectedCampaign.uploadedMedia.length > 0 && (
                                    <div className="border-b pb-3 border-gray-800/10">
                                        <span className="font-semibold opacity-65 uppercase tracking-wider block mb-2">Uploaded Media ({selectedCampaign.uploadedMedia.length})</span>
                                        <div className="flex flex-wrap gap-3">
                                            {selectedCampaign.uploadedMedia.map((url, i) => {
                                                const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
                                                return (
                                                    <div key={i} className="relative group w-20 h-20 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-black/20 shadow-sm">
                                                        {isVideo ? (
                                                            <video src={url} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <img src={url} alt={`Media ${i+1}`} className="w-full h-full object-cover" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="p-1.5 bg-blue-500/90 hover:bg-blue-600 text-white rounded transition-all active:scale-95 shadow"
                                                                title="View Fullscreen"
                                                            >
                                                                <FaExternalLinkAlt size={10} />
                                                            </a>
                                                            <label className="p-1.5 bg-amber-500/90 hover:bg-amber-600 text-white rounded cursor-pointer transition-all active:scale-95 shadow" title="Replace Media">
                                                                <FaPencilAlt size={10} />
                                                                <input
                                                                    type="file"
                                                                    accept="image/*,video/*"
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        if (e.target.files && e.target.files[0]) {
                                                                            handleReplaceMedia(i, e.target.files[0]);
                                                                            e.target.value = null;
                                                                        }
                                                                    }}
                                                                />
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteMedia(i)}
                                                                className="p-1.5 bg-red-500/90 hover:bg-red-600 text-white rounded transition-all active:scale-95 shadow"
                                                                title="Delete Media"
                                                            >
                                                                <FaTrash size={10} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {/* Run timestamps */}
                                {selectedCampaign.lastStartedAt && (
                                    <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                        <span className="font-semibold opacity-65 uppercase tracking-wider text-emerald-500">Last Started</span>
                                        <span className="font-bold text-emerald-400">{fmtDateTime(selectedCampaign.lastStartedAt)}</span>
                                    </div>
                                )}
                                {selectedCampaign.lastEndedAt && (
                                    <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                        <span className="font-semibold opacity-65 uppercase tracking-wider text-red-400">Last Ended</span>
                                        <span className="font-bold text-red-400">{fmtDateTime(selectedCampaign.lastEndedAt)}</span>
                                    </div>
                                )}
                                {selectedCampaign.lastRestartedAt && (
                                    <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                        <span className="font-semibold opacity-65 uppercase tracking-wider text-amber-400">Last Restarted</span>
                                        <span className="font-bold text-amber-400">{fmtDateTime(selectedCampaign.lastRestartedAt)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Full run log */}
                            {selectedCampaign.runLog && selectedCampaign.runLog.length > 0 && (
                                <div className="mt-4">
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Run History</p>
                                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                        {[...selectedCampaign.runLog].reverse().map((entry, i) => (
                                            <div key={i} className={`flex justify-between text-[10px] font-semibold px-2 py-1 rounded ${isDark ? "bg-black/20" : "bg-gray-100"}`}>
                                                <span className={
                                                    entry.action === "start"   ? "text-emerald-400" :
                                                    entry.action === "end"     ? "text-red-400"     : "text-amber-400"
                                                }>
                                                    {entry.action.toUpperCase()}
                                                </span>
                                                <span className="opacity-60">{fmtDateTime(entry.timestamp)}</span>
                                                <span className="opacity-50">{entry.by}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Edit Form */}
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <h4 className="text-sm font-black uppercase tracking-wider text-blue-500 mb-4">
                                Update Ad Configuration
                            </h4>
                            <div className="space-y-3">
                                {[
                                    { label: "Ad Name",       key: "adName",       type: "text",   required: true },
                                    { label: "Creative Name", key: "creativeName", type: "text" },
                                    { label: "Duration",      key: "duration",     type: "text" },
                                    { label: "Budget ₹",      key: "budget",       type: "number", required: true },
                                    { label: "CPC ₹",         key: "cpc",          type: "number", step: "0.01", required: true },
                                    { label: "Total Likes",   key: "totalLikes",   type: "number" },
                                    { label: "Total Views",   key: "totalViews",   type: "number" },
                                    { label: "Comments",      key: "comments",     type: "number" },
                                    { label: "Shares",        key: "shares",       type: "number" },
                                ].map(({ label, key, type, required, step }) => (
                                    <div key={key}>
                                        <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">{label}</label>
                                        <input
                                            type={type} required={required} step={step}
                                            value={editForm[key]}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                                            className={inputCls}
                                        />
                                    </div>
                                ))}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">Upload Photo / Video</label>
                                    <input 
                                        type="file" 
                                        multiple 
                                        accept="image/*,video/*"
                                        onChange={(e) => setEditMediaFiles(e.target.files)}
                                        className={inputCls} 
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">Image Link</label>
                                    <input
                                        type="url"
                                        value={editForm.imageLink}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, imageLink: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">Video Link</label>
                                    <input
                                        type="url"
                                        value={editForm.videoLink}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, videoLink: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">Platform</label>
                                    <select required value={editForm.platform}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, platform: e.target.value }))}
                                        className={inputCls}>
                                        {["Facebook","Instagram","YouTube","Google Search","Other"].map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">Start Date</label>
                                        <input type="date" required value={editForm.startDate}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                                            className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">End Date</label>
                                        <input type="date" required value={editForm.endDate}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                                            className={inputCls} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-800/10">
                                <button type="button" onClick={() => setSelectedCampaign(null)}
                                    className={`px-4 py-2 rounded-[6px] text-xs font-bold uppercase tracking-wider border transition-all active:scale-95 cursor-pointer ${isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200"}`}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="px-6 py-2 rounded-[6px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer">
                                    {submitting ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>
        </Layout>
    );
}

const Modal = ({ isOpen, onClose, title, children, isDarkMode }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`relative w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${isDarkMode ? "bg-[#1a1f24] border border-gray-700 text-white" : "bg-white border border-gray-200 text-gray-900"}`}>
                <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? "border-gray-700" : "border-gray-150"}`}>
                    <h3 className="text-lg font-black tracking-tight">{title}</h3>
                    <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDarkMode ? "hover:bg-gray-800 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"}`}>
                        <FaTimes size={16} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};
