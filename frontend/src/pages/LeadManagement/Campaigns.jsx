import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import { FaArrowLeft, FaBullhorn, FaSync, FaTimes, FaEye, FaEdit, FaUpload } from "react-icons/fa";
import { hasPermission } from "../../config/permissions";

const API_URL = import.meta.env.VITE_API_URL;

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

    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [editForm, setEditForm] = useState({
        adName: "",
        platform: "Facebook",
        creativeName: "",
        duration: "",
        budget: "",
        cpc: "",
        startDate: "",
        endDate: ""
    });

    // Form state
    const [form, setForm] = useState({
        adName: "",
        platform: "Facebook",
        creativeName: "",
        duration: "",
        budget: "",
        cpc: "",
        startDate: "",
        endDate: ""
    });

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

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!form.adName || !form.platform || !form.budget || !form.cpc || !form.startDate || !form.endDate) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/lead-management/campaigns`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Campaign added successfully!");
                setForm({
                    adName: "",
                    platform: "Facebook",
                    creativeName: "",
                    duration: "",
                    budget: "",
                    cpc: "",
                    startDate: "",
                    endDate: ""
                });
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

    const formatDateForInput = (dateStr) => {
        if (!dateStr) return "";
        return dateStr.slice(0, 10);
    };

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
            endDate: formatDateForInput(campaign.endDate)
        });
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
            const res = await fetch(`${API_URL}/lead-management/campaigns/${selectedCampaign._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(editForm)
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Campaign updated successfully!");
                setSelectedCampaign(null);
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


    // Styling constants matching Pathfinder theme
    const card = `rounded-[12px] border p-6 mb-8 transition-all duration-200 ${isDark ? "bg-[#1a1f24] border-gray-800 shadow-cyan-500/5" : "bg-white border-gray-200 shadow-sm"}`;
    const inputCls = `w-full px-4 py-2.5 rounded-[6px] border text-xs font-semibold tracking-wide outline-none transition-all ${isDark ? "bg-[#131619] border-gray-850 text-white focus:border-cyan-500/50" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500"}`;
    
    // Formatting numbers
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
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
                            className={`px-6 py-2.5 rounded-[6px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer`}
                        >
                            {submitting ? "Saving..." : "Add Campaign"}
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Row 1 */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <input
                                    type="text"
                                    name="adName"
                                    required
                                    value={form.adName}
                                    onChange={handleChange}
                                    placeholder="Ad Name e.g. NEET Repeater Lead Ad"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <select
                                    name="platform"
                                    required
                                    value={form.platform}
                                    onChange={handleChange}
                                    className={inputCls}
                                >
                                    <option value="Facebook">Facebook</option>
                                    <option value="Instagram">Instagram</option>
                                    <option value="YouTube">YouTube</option>
                                    <option value="Google Search">Google Search</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <input
                                    type="text"
                                    name="creativeName"
                                    value={form.creativeName}
                                    onChange={handleChange}
                                    placeholder="Creative / Video Name"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    name="duration"
                                    value={form.duration}
                                    onChange={handleChange}
                                    placeholder="Duration e.g. 7 Days"
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Row 2 */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <input
                                    type="number"
                                    name="budget"
                                    required
                                    value={form.budget}
                                    onChange={handleChange}
                                    placeholder="Budget ₹"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <input
                                    type="number"
                                    name="cpc"
                                    step="0.01"
                                    required
                                    value={form.cpc}
                                    onChange={handleChange}
                                    placeholder="CPC ₹"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <input
                                    type="date"
                                    name="startDate"
                                    required
                                    value={form.startDate}
                                    onChange={handleChange}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <input
                                    type="date"
                                    name="endDate"
                                    required
                                    value={form.endDate}
                                    onChange={handleChange}
                                    className={inputCls}
                                />
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
                                    <th className="pb-3 px-2 text-right">LEADS</th>
                                    <th className="pb-3 px-2 text-right">CPL</th>
                                    <th className="pb-3 px-2 text-right">ADMISSION</th>
                                    <th className="pb-3 pl-2 text-center">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="10" className="text-center py-8">
                                            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : campaigns.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="text-center py-8 font-semibold opacity-40 text-xs uppercase tracking-widest">
                                            No Campaigns Registered
                                        </td>
                                    </tr>
                                ) : (
                                    campaigns.map(c => {
                                        const cpl = c.leads > 0 ? c.budget / c.leads : 0;
                                        return (
                                            <tr key={c._id} className={`text-xs font-semibold tracking-wide border-b hover:bg-black/5 dark:hover:bg-white/5 transition-all ${isDark ? "border-gray-800 text-gray-300" : "border-gray-100 text-gray-700"}`}>
                                                <td 
                                                    onClick={() => handleOpenViewEdit(c)}
                                                    className="py-4 pr-2 font-bold max-w-[200px] truncate cursor-pointer text-blue-500 hover:underline hover:text-blue-600 transition-all" 
                                                    title={c.adName}
                                                >
                                                    {c.adName}
                                                </td>
                                                <td className="py-4 px-2">{c.platform}</td>
                                                <td className="py-4 px-2 max-w-[150px] truncate" title={c.creativeName || "—"}>{c.creativeName || "—"}</td>
                                                <td className="py-4 px-2">{c.duration || "—"}</td>
                                                <td className="py-4 px-2 text-right font-mono">{formatCurrency(c.budget)}</td>
                                                <td className="py-4 px-2 text-right font-mono">₹{c.cpc.toFixed(2)}</td>
                                                <td className="py-4 px-2 text-right font-bold text-cyan-500">{c.leads}</td>
                                                <td className="py-4 px-2 text-right font-mono">{formatCurrency(cpl)}</td>
                                                <td className="py-4 px-2 text-right font-bold text-green-500">{c.admission}</td>
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
                </div>
            </div>
            {/* ── View & Edit Modal ─────────────────────────────────────────── */}
            <Modal
                isOpen={!!selectedCampaign}
                onClose={() => setSelectedCampaign(null)}
                title={`Campaign Details & Configuration`}
                isDarkMode={isDark}
            >
                {selectedCampaign && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                        {/* Left Column: View Details */}
                        <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-250 shadow-sm'}`}>
                            <h4 className="text-sm font-black uppercase tracking-wider text-cyan-500 mb-4 flex items-center gap-2">
                                <FaBullhorn /> Ad Metrics & Details
                            </h4>
                            <div className="space-y-4 text-xs">
                                <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                    <span className="font-semibold opacity-65 uppercase tracking-wider">Ad Name</span>
                                    <span className="font-bold">{selectedCampaign.adName}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                    <span className="font-semibold opacity-65 uppercase tracking-wider">Platform</span>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                        selectedCampaign.platform === 'Facebook' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                                        selectedCampaign.platform === 'Instagram' ? 'bg-pink-500/15 text-pink-400 border border-pink-500/30' :
                                        selectedCampaign.platform === 'YouTube' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                                        selectedCampaign.platform === 'Google Search' ? 'bg-green-500/15 text-green-400 border border-green-500/30' :
                                        'bg-gray-500/15 text-gray-400 border border-gray-500/30'
                                    }`}>{selectedCampaign.platform}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                    <span className="font-semibold opacity-65 uppercase tracking-wider">Creative Name</span>
                                    <span className="font-bold">{selectedCampaign.creativeName || "—"}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                    <span className="font-semibold opacity-65 uppercase tracking-wider">Duration</span>
                                    <span className="font-bold">{selectedCampaign.duration || "—"}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                    <span className="font-semibold opacity-65 uppercase tracking-wider">Budget</span>
                                    <span className="font-mono font-bold">{formatCurrency(selectedCampaign.budget)}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                    <span className="font-semibold opacity-65 uppercase tracking-wider">CPC</span>
                                    <span className="font-mono font-bold">₹{selectedCampaign.cpc.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                    <span className="font-semibold opacity-65 uppercase tracking-wider">Leads</span>
                                    <span className="font-bold text-cyan-500">{selectedCampaign.leads}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                    <span className="font-semibold opacity-65 uppercase tracking-wider">CPL</span>
                                    <span className="font-mono font-bold">{formatCurrency(selectedCampaign.leads > 0 ? selectedCampaign.budget / selectedCampaign.leads : 0)}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                    <span className="font-semibold opacity-65 uppercase tracking-wider">Admissions</span>
                                    <span className="font-bold text-green-500">{selectedCampaign.admission}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                    <span className="font-semibold opacity-65 uppercase tracking-wider">Start Date</span>
                                    <span className="font-bold">{new Date(selectedCampaign.startDate).toLocaleDateString("en-IN")}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2 border-gray-800/10">
                                    <span className="font-semibold opacity-65 uppercase tracking-wider">End Date</span>
                                    <span className="font-bold">{new Date(selectedCampaign.endDate).toLocaleDateString("en-IN")}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Edit Form */}
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <h4 className="text-sm font-black uppercase tracking-wider text-blue-500 mb-4">
                                Update Ad Configuration
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">Ad Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.adName}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, adName: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">Platform</label>
                                    <select
                                        required
                                        value={editForm.platform}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, platform: e.target.value }))}
                                        className={inputCls}
                                    >
                                        <option value="Facebook">Facebook</option>
                                        <option value="Instagram">Instagram</option>
                                        <option value="YouTube">YouTube</option>
                                        <option value="Google Search">Google Search</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">Creative Name</label>
                                    <input
                                        type="text"
                                        value={editForm.creativeName}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, creativeName: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">Duration</label>
                                    <input
                                        type="text"
                                        value={editForm.duration}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, duration: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">Budget ₹</label>
                                    <input
                                        type="number"
                                        required
                                        value={editForm.budget}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, budget: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">CPC ₹</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={editForm.cpc}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, cpc: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">Start Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={editForm.startDate}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider mb-1 block opacity-60">End Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={editForm.endDate}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-800/10">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCampaign(null)}
                                    className={`px-4 py-2 rounded-[6px] text-xs font-bold uppercase tracking-wider border transition-all active:scale-95 cursor-pointer ${isDark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 rounded-[6px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                                >
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
            <div
                className={`relative w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-[#1a1f24] border border-gray-700 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}
            >
                <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-150'}`}>
                    <h3 className={`text-lg font-black tracking-tight`}>{title}</h3>
                    <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}>
                        <FaTimes size={16} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};
