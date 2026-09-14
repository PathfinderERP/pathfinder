import React, { useState, useEffect, useMemo } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes, FaSearch, FaBoxes, FaTag, FaMoneyBillWave } from 'react-icons/fa';
import '../MasterDataWave.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasPermission } from '../../../config/permissions';
import ExcelImportExport from "../../common/ExcelImportExport";

const InventoryContent = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        description: "",
        defaultType: "Free",
        defaultPrice: 0,
        status: "Active"
    });

    // Permission checks
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'masterData', 'inventory', 'create');
    const canEdit = hasPermission(user, 'masterData', 'inventory', 'edit');
    const canDelete = hasPermission(user, 'masterData', 'inventory', 'delete');

    const fetchInventoryItems = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/inventory`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                const sorted = (Array.isArray(data) ? data : []).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                setItems(sorted);
            } else {
                toast.error(data.message || "Failed to fetch inventory items");
            }
        } catch (err) {
            toast.error("Server error loading inventory items");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventoryItems();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const openModal = (item = null) => {
        if (item) {
            setCurrentItem(item);
            setFormData({
                name: item.name || "",
                code: item.code || "",
                description: item.description || "",
                defaultType: item.defaultType || "Free",
                defaultPrice: item.defaultPrice || 0,
                status: item.status || "Active"
            });
        } else {
            setCurrentItem(null);
            setFormData({
                name: "",
                code: "",
                description: "",
                defaultType: "Free",
                defaultPrice: 0,
                status: "Active"
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentItem(null);
        setFormData({
            name: "",
            code: "",
            description: "",
            defaultType: "Free",
            defaultPrice: 0,
            status: "Active"
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.warning("Item name is required");
            return;
        }

        const token = localStorage.getItem("token");
        const url = currentItem
            ? `${import.meta.env.VITE_API_URL}/master-data/inventory/${currentItem._id}`
            : `${import.meta.env.VITE_API_URL}/master-data/inventory`;
        const method = currentItem ? "PUT" : "POST";

        try {
            const payload = {
                ...formData,
                name: formData.name.trim(),
                defaultPrice: formData.defaultType === "Paid" ? Number(formData.defaultPrice) || 0 : 0
            };

            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (response.ok) {
                toast.success(currentItem ? "Inventory item updated successfully" : "Inventory item added successfully");
                fetchInventoryItems();
                closeModal();
            } else {
                toast.error(data.message || "Failed to save inventory item");
            }
        } catch (err) {
            toast.error("Server error while saving item");
        }
    };

    const handleDelete = async (id, itemName) => {
        if (!window.confirm(`Are you sure you want to delete '${itemName}'?`)) return;

        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/inventory/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success("Inventory item deleted successfully");
                fetchInventoryItems();
            } else {
                const data = await response.json();
                toast.error(data.message || "Failed to delete item");
            }
        } catch (err) {
            toast.error("Server error while deleting");
        }
    };

    const handleBulkImport = async (importData) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/inventory/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(importData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Bulk import failed");
        }

        fetchInventoryItems();
    };

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items;
        const q = searchQuery.toLowerCase().trim();
        return items.filter(it => 
            (it.name || "").toLowerCase().includes(q) ||
            (it.code || "").toLowerCase().includes(q) ||
            (it.description || "").toLowerCase().includes(q)
        );
    }, [items, searchQuery]);

    const inventoryColumns = [
        { header: "Item Name", key: "name" },
        { header: "Code", key: "code" },
        { header: "Description", key: "description" },
        { header: "Default Type", key: "defaultType" },
        { header: "Default Price", key: "defaultPrice" },
        { header: "Status", key: "status" }
    ];
    const inventoryMapping = {
        "Item Name": "name",
        "Code": "code",
        "Description": "description",
        "Default Type": "defaultType",
        "Default Price": "defaultPrice",
        "Status": "status"
    };

    return (
        <div className="flex-1 bg-[#131619] p-6 overflow-y-auto text-white">
            <ToastContainer position="top-right" theme="dark" />

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <FaBoxes className="text-2xl text-emerald-400" />
                        <h2 className="text-2xl font-bold text-emerald-400">Inventory Master Data</h2>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                        Manage inventory items, materials, uniforms, books and default prices for Store allocation
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {canCreate && (
                        <ExcelImportExport
                            data={items}
                            columns={inventoryColumns}
                            mapping={inventoryMapping}
                            onImport={handleBulkImport}
                            fileName="inventory_items"
                        />
                    )}
                    {canCreate && (
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 text-xs uppercase tracking-wider"
                        >
                            <FaPlus /> Add Inventory Item
                        </button>
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-4 max-w-md">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                    <input 
                        type="text"
                        placeholder="Search inventory items by name, code or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-800 bg-[#1a1f24] text-xs text-white placeholder-gray-500 focus:border-emerald-500 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-800/80 text-gray-400 uppercase tracking-wider font-extrabold border-b border-gray-700">
                                <th className="p-4 w-12 text-center">#</th>
                                <th className="p-4">Item Name</th>
                                <th className="p-4">Code / SKU</th>
                                <th className="p-4">Description</th>
                                <th className="p-4 text-center">Default Type</th>
                                <th className="p-4 text-right">Default Price</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-gray-500 font-medium">
                                        Loading inventory items...
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-gray-500 font-medium">
                                        No inventory items found. Click "Add Inventory Item" to create one.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item, index) => (
                                    <tr key={item._id} className="master-data-row-wave hover:bg-[#222930] transition-colors">
                                        <td className="p-4 text-gray-500 text-center font-mono">{index + 1}</td>
                                        <td className="p-4 font-bold text-white text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                                    <FaBoxes className="text-xs" />
                                                </div>
                                                <span>{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-300 font-mono">
                                            {item.code ? (
                                                <span className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-[11px]">
                                                    {item.code}
                                                </span>
                                            ) : (
                                                <span className="text-gray-600">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-400 max-w-xs truncate">
                                            {item.description || "-"}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                item.defaultType === 'Paid'
                                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                            }`}>
                                                {item.defaultType || 'Free'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold">
                                            {item.defaultType === 'Paid' ? (
                                                <span className="text-amber-400">₹{item.defaultPrice || 0}</span>
                                            ) : (
                                                <span className="text-gray-500">₹0</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                                item.status === 'Active' 
                                                ? 'bg-green-500/15 text-green-400 border border-green-500/30' 
                                                : 'bg-red-500/15 text-red-400 border border-red-500/30'
                                            }`}>
                                                {item.status || 'Active'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {canEdit && (
                                                    <button
                                                        onClick={() => openModal(item)}
                                                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-400 transition-colors"
                                                        title="Edit item"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(item._id, item.name)}
                                                        className="p-2 rounded-lg bg-gray-800 hover:bg-red-500/20 text-red-400 transition-colors"
                                                        title="Delete item"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Item Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
                        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-800/40">
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                <FaBoxes className="text-emerald-400" />
                                {currentItem ? "Edit Inventory Item" : "Add Inventory Item"}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
                            {/* Item Name */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                    Item Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="e.g. Study Module, Science Kit, Blazer"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-700 bg-[#131619] text-white outline-none focus:border-emerald-500 transition-all font-medium"
                                />
                            </div>

                            {/* Item Code / SKU */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                    Code / SKU (Optional)
                                </label>
                                <input
                                    type="text"
                                    name="code"
                                    placeholder="e.g. MOD-01, UN-BLZ"
                                    value={formData.code}
                                    onChange={handleInputChange}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-700 bg-[#131619] text-white outline-none focus:border-emerald-500 transition-all font-mono"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                    Description (Optional)
                                </label>
                                <textarea
                                    name="description"
                                    rows="2"
                                    placeholder="Brief details about the item..."
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-700 bg-[#131619] text-white outline-none focus:border-emerald-500 transition-all resize-none"
                                />
                            </div>

                            {/* Default Type & Price */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                        Default Type
                                    </label>
                                    <div className="grid grid-cols-2 gap-1.5 bg-[#131619] p-1 rounded-xl border border-gray-700">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, defaultType: "Free" }))}
                                            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                formData.defaultType === "Free"
                                                ? "bg-emerald-500 text-white shadow-sm"
                                                : "text-gray-400 hover:text-white"
                                            }`}
                                        >
                                            Free
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, defaultType: "Paid" }))}
                                            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                formData.defaultType === "Paid"
                                                ? "bg-amber-500 text-white shadow-sm"
                                                : "text-gray-400 hover:text-white"
                                            }`}
                                        >
                                            Paid
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                        Default Price (₹)
                                    </label>
                                    <input
                                        type="number"
                                        name="defaultPrice"
                                        min="0"
                                        disabled={formData.defaultType !== "Paid"}
                                        placeholder="0"
                                        value={formData.defaultPrice}
                                        onChange={handleInputChange}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-white outline-none transition-all font-mono font-bold ${
                                            formData.defaultType === "Paid"
                                            ? "border-amber-500/60 bg-[#131619] focus:border-amber-400"
                                            : "border-gray-800 bg-gray-900/50 text-gray-600 cursor-not-allowed"
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-700 bg-[#131619] text-white outline-none focus:border-emerald-500 transition-all font-medium"
                                >
                                    <option value="Active">Active (Available in Store)</option>
                                    <option value="Inactive">Inactive (Hidden from Store)</option>
                                </select>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
                                >
                                    {currentItem ? "Update Item" : "Save Item"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryContent;
