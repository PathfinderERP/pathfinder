import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes, FaSearch, FaCheckCircle, FaBan, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import '../MasterDataWave.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasPermission } from '../../../config/permissions';
import ExcelImportExport from "../../common/ExcelImportExport";

const AccountContent = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAccount, setCurrentAccount] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All"); // "All" | "Active" | "Deactive"
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [updatingStatusId, setUpdatingStatusId] = useState(null);

    const [formData, setFormData] = useState({
        accno: "",
        accname: "",
        status: "Active"
    });

    // Permission checks
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'masterData', 'account', 'create');
    const canEdit = hasPermission(user, 'masterData', 'account', 'edit');
    const canDelete = hasPermission(user, 'masterData', 'account', 'delete');

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            // Request all accounts so admin can view, filter, and manage both Active & Deactive
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/account?status=All`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setAccounts(Array.isArray(data) ? data : []);
            } else {
                toast.error(data.message || "Failed to fetch accounts");
            }
        } catch (err) {
            toast.error("Server error loading accounts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const openModal = (acc = null) => {
        if (acc) {
            setCurrentAccount(acc);
            const isDeactive = acc.status === "Deactive" || acc.status === "Inactive" || acc.isActive === false;
            setFormData({
                accno: acc.accno || "",
                accname: acc.accname || "",
                status: isDeactive ? "Deactive" : "Active"
            });
        } else {
            setCurrentAccount(null);
            setFormData({
                accno: "",
                accname: "",
                status: "Active"
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentAccount(null);
        setFormData({
            accno: "",
            accname: "",
            status: "Active"
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const url = currentAccount
            ? `${import.meta.env.VITE_API_URL}/master-data/account/${currentAccount._id}`
            : `${import.meta.env.VITE_API_URL}/master-data/account`;
        const method = currentAccount ? "PUT" : "POST";

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (response.ok) {
                toast.success(currentAccount ? "Account updated successfully" : "Account created successfully");
                fetchAccounts();
                closeModal();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (err) {
            toast.error("Server error saving account");
        }
    };

    const handleToggleStatus = async (account) => {
        if (!canEdit) {
            toast.error("You don't have permission to update account status");
            return;
        }

        const isCurrentlyDeactive = account.status === "Deactive" || account.status === "Inactive" || account.isActive === false;
        const newStatus = isCurrentlyDeactive ? "Active" : "Deactive";
        setUpdatingStatusId(account._id);

        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/account/${account._id}/status`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (response.ok) {
                setAccounts(prev => prev.map(a => a._id === account._id ? {
                    ...a,
                    status: newStatus,
                    isActive: newStatus === "Active"
                } : a));
                toast.success(`Account marked as ${newStatus}`);
            } else {
                toast.error(data.message || "Failed to update status");
            }
        } catch (err) {
            toast.error("Server error updating status");
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleBulkStatusUpdate = async (newStatus) => {
        if (!canEdit) {
            toast.error("You don't have permission to update status");
            return;
        }

        if (selectedIds.length === 0) {
            toast.warning("Please select at least one account");
            return;
        }

        setBulkLoading(true);
        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/account/bulk-status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ids: selectedIds,
                    status: newStatus
                })
            });

            const data = await response.json();
            if (response.ok) {
                setAccounts(prev => prev.map(a => selectedIds.includes(a._id) ? {
                    ...a,
                    status: newStatus,
                    isActive: newStatus === "Active"
                } : a));
                toast.success(`Successfully marked ${selectedIds.length} account(s) as ${newStatus}`);
                setSelectedIds([]);
            } else {
                toast.error(data.message || "Failed to bulk update status");
            }
        } catch (err) {
            toast.error("Server error updating accounts status");
        } finally {
            setBulkLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this account?")) return;

        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/account/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success("Account deleted successfully");
                fetchAccounts();
                setSelectedIds(prev => prev.filter(item => item !== id));
            } else {
                const data = await response.json();
                toast.error(data.message || "Failed to delete");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    const handleBulkImport = async (importData) => {
        const token = localStorage.getItem("token");
        const formattedData = importData.map(item => ({
            ...item,
            status: item.status || "Active",
            isActive: item.status ? (item.status === "Active") : true
        }));

        const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/account/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(formattedData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Bulk import failed");
        }

        fetchAccounts();
    };

    // Filter accounts
    const filteredAccounts = accounts.filter(acc => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q ||
            (acc.accno || "").toLowerCase().includes(q) ||
            (acc.accname || "").toLowerCase().includes(q);

        const isDeactive = acc.status === "Deactive" || acc.status === "Inactive" || acc.isActive === false;
        const matchesStatus = statusFilter === "All" ? true :
            statusFilter === "Active" ? !isDeactive :
            isDeactive;

        return matchesSearch && matchesStatus;
    });

    const activeCount = accounts.filter(a => a.status !== "Deactive" && a.status !== "Inactive" && a.isActive !== false).length;
    const deactiveCount = accounts.filter(a => a.status === "Deactive" || a.status === "Inactive" || a.isActive === false).length;

    const isAllSelected = filteredAccounts.length > 0 && filteredAccounts.every(acc => selectedIds.includes(acc._id));
    const isIndeterminate = filteredAccounts.some(acc => selectedIds.includes(acc._id)) && !isAllSelected;

    const handleSelectAll = () => {
        if (isAllSelected) {
            const visibleIds = new Set(filteredAccounts.map(a => a._id));
            setSelectedIds(prev => prev.filter(id => !visibleIds.has(id)));
        } else {
            const newSelected = new Set([...selectedIds, ...filteredAccounts.map(a => a._id)]);
            setSelectedIds(Array.from(newSelected));
        }
    };

    const handleSelectRow = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const accountColumns = [
        { header: "Acc No", key: "accno" },
        { header: "Acc Name", key: "accname" },
        { header: "Status", key: "status" }
    ];
    const accountMapping = {
        "Acc No": "accno",
        "Acc Name": "accname",
        "Status": "status"
    };

    return (
        <div className="flex-1 bg-[#131619] p-6 overflow-y-auto text-white">
            <ToastContainer position="top-right" theme="dark" />
            
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-cyan-400">Account Master Data</h2>
                    <p className="text-gray-400 text-sm mt-1">Manage bank accounts and activation status</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {canCreate && (
                        <ExcelImportExport
                            data={accounts.map(a => ({
                                ...a,
                                status: (a.status === "Deactive" || a.status === "Inactive" || a.isActive === false) ? "Deactive" : "Active"
                            }))}
                            columns={accountColumns}
                            mapping={accountMapping}
                            onImport={handleBulkImport}
                            fileName="account_masters"
                        />
                    )}
                    {canCreate && (
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg transition-colors font-semibold shadow-md shadow-cyan-900/20"
                        >
                            <FaPlus /> Add Account
                        </button>
                    )}
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by account no or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1a1f24] border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center gap-2 bg-[#1a1f24] p-1 rounded-xl border border-gray-800">
                    <button
                        onClick={() => setStatusFilter("All")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            statusFilter === "All"
                                ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/40"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        All ({accounts.length})
                    </button>
                    <button
                        onClick={() => setStatusFilter("Active")}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            statusFilter === "Active"
                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                                : "text-gray-400 hover:text-emerald-400"
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                        Active ({activeCount})
                    </button>
                    <button
                        onClick={() => setStatusFilter("Deactive")}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            statusFilter === "Deactive"
                                ? "bg-rose-600 text-white shadow-md shadow-rose-950/40"
                                : "text-gray-400 hover:text-rose-400"
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>
                        Deactive ({deactiveCount})
                    </button>
                </div>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedIds.length > 0 && (
                <div className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] border border-cyan-500/30 p-3.5 rounded-xl mb-4 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-cyan-950/20">
                    <div className="flex items-center gap-3">
                        <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-lg text-xs font-bold tracking-wide">
                            {selectedIds.length} Account{selectedIds.length !== 1 ? 's' : ''} Selected
                        </span>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="text-xs text-gray-400 hover:text-gray-200 underline transition-colors cursor-pointer"
                        >
                            Deselect All
                        </button>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => handleBulkStatusUpdate('Active')}
                            disabled={bulkLoading || !canEdit}
                            className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-950/30 transition-all cursor-pointer disabled:opacity-50"
                            title="Mark all selected accounts as Active"
                        >
                            <FaCheckCircle className="text-xs" />
                            {bulkLoading ? 'Updating...' : `Set Active (${selectedIds.length})`}
                        </button>
                        <button
                            onClick={() => handleBulkStatusUpdate('Deactive')}
                            disabled={bulkLoading || !canEdit}
                            className="flex items-center gap-2 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-rose-950/30 transition-all cursor-pointer disabled:opacity-50"
                            title="Mark all selected accounts as Deactive"
                        >
                            <FaBan className="text-xs" />
                            {bulkLoading ? 'Updating...' : `Set Deactive (${selectedIds.length})`}
                        </button>
                    </div>
                </div>
            )}

            {/* Accounts Table */}
            <div className="bg-[#1a1f24] rounded-lg border border-gray-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-800/80 text-gray-300 text-sm font-semibold">
                                <th className="p-4 border-b border-gray-700 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={el => el && (el.indeterminate = isIndeterminate)}
                                        onChange={handleSelectAll}
                                        disabled={filteredAccounts.length === 0}
                                        className="w-4 h-4 rounded text-cyan-600 bg-gray-900 border-gray-600 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                                        title="Select / Deselect all visible"
                                    />
                                </th>
                                <th className="p-4 border-b border-gray-700 w-16">#</th>
                                <th className="p-4 border-b border-gray-700">Acc No</th>
                                <th className="p-4 border-b border-gray-700">Acc Name</th>
                                <th className="p-4 border-b border-gray-700 w-36 text-center">Status</th>
                                <th className="p-4 border-b border-gray-700 text-right w-28">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-400">
                                        <div className="inline-flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                            Loading accounts...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredAccounts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-500">
                                        {searchQuery || statusFilter !== "All"
                                            ? "No accounts match the applied filters"
                                            : "No accounts found"}
                                    </td>
                                </tr>
                            ) : (
                                filteredAccounts.map((acc, index) => {
                                    const isDeactive = acc.status === "Deactive" || acc.status === "Inactive" || acc.isActive === false;
                                    const isSelected = selectedIds.includes(acc._id);
                                    const isUpdatingThis = updatingStatusId === acc._id;

                                    return (
                                        <tr
                                            key={acc._id}
                                            className={`master-data-row-wave border-b border-gray-800 transition-colors ${
                                                isSelected ? 'bg-cyan-950/20' : 'hover:bg-white/5'
                                            }`}
                                        >
                                            <td className="p-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectRow(acc._id)}
                                                    className="w-4 h-4 rounded text-cyan-600 bg-gray-900 border-gray-600 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                                                />
                                            </td>
                                            <td className="p-4 text-gray-400 text-sm">{index + 1}</td>
                                            <td className="p-4 font-semibold text-cyan-300 font-mono tracking-wide">{acc.accno}</td>
                                            <td className="p-4 font-medium text-gray-100">{acc.accname}</td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleToggleStatus(acc)}
                                                    disabled={!canEdit || isUpdatingThis}
                                                    title={canEdit ? `Click to mark as ${isDeactive ? "Active" : "Deactive"}` : "Status"}
                                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border transition-all ${
                                                        isDeactive
                                                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                                                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                                    } ${canEdit ? "cursor-pointer hover:scale-105 active:scale-95 shadow-sm" : "cursor-default opacity-80"}`}
                                                >
                                                    <span className={`w-2 h-2 rounded-full ${
                                                        isDeactive ? "bg-rose-400" : "bg-emerald-400 animate-pulse"
                                                    }`} />
                                                    {isUpdatingThis ? "Updating..." : (isDeactive ? "Deactive" : "Active")}
                                                </button>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-3 text-lg">
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => openModal(acc)}
                                                            className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                                                            title="Edit"
                                                        >
                                                            <FaEdit />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDelete(acc._id)}
                                                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                                                            title="Delete"
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    )}
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-[#1a1f24] p-6 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {currentAccount ? "Edit Account" : "Add New Account"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 mb-1.5 text-sm font-semibold">Account Number (accno) *</label>
                                <input
                                    type="text"
                                    name="accno"
                                    value={formData.accno}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                    placeholder="Enter account number"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 mb-1.5 text-sm font-semibold">Account Name (accname) *</label>
                                <input
                                    type="text"
                                    name="accname"
                                    value={formData.accname}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                    placeholder="Enter account name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 mb-1.5 text-sm font-semibold">Status</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, status: "Active" }))}
                                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${
                                            formData.status === "Active"
                                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-sm"
                                                : "bg-gray-800/80 text-gray-400 border-gray-700 hover:text-white"
                                        }`}
                                    >
                                        <FaCheck className="text-xs" /> Active
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, status: "Deactive" }))}
                                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${
                                            formData.status === "Deactive"
                                                ? "bg-rose-500/20 text-rose-400 border-rose-500 shadow-sm"
                                                : "bg-gray-800/80 text-gray-400 border-gray-700 hover:text-white"
                                        }`}
                                    >
                                        <FaBan className="text-xs" /> Deactive
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors font-semibold shadow-lg shadow-cyan-900/20 cursor-pointer"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountContent;
