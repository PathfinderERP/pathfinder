import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes, FaSearch } from 'react-icons/fa';
import '../components/MasterData/MasterDataWave.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasPermission } from '../config/permissions';
import ExcelImportExport from '../components/common/ExcelImportExport';

const FinanceExpenseCategoryContent = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '', status: 'Active' });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [updatingStatusId, setUpdatingStatusId] = useState(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const canCreate = hasPermission(user, 'financeFees', 'financeExpenseCategory', 'create');
    const canEdit = hasPermission(user, 'financeFees', 'financeExpenseCategory', 'edit');
    const canDelete = hasPermission(user, 'financeFees', 'financeExpenseCategory', 'delete');

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/category`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setCategories(data.categories || []);
            } else {
                toast.error(data.message || 'Failed to fetch finance categories');
            }
        } catch (err) {
            toast.error('Server error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openModal = (cat = null) => {
        if (cat) {
            setCurrentCategory(cat);
            setFormData({ 
                name: cat.name, 
                description: cat.description || '', 
                status: cat.status || 'Active' 
            });
        } else {
            setCurrentCategory(null);
            setFormData({ name: '', description: '', status: 'Active' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentCategory(null);
        setFormData({ name: '', description: '', status: 'Active' });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const url = currentCategory
            ? `${import.meta.env.VITE_API_URL}/category/${currentCategory._id}`
            : `${import.meta.env.VITE_API_URL}/category`;
        const method = currentCategory ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });
            const data = await response.json();

            if (response.ok) {
                toast.success(currentCategory ? 'Finance category updated successfully' : 'Finance category created successfully');
                fetchCategories();
                closeModal();
            } else {
                toast.error(data.message || 'Operation failed');
            }
        } catch (err) {
            toast.error('Server error');
        }
    };

    const handleToggleStatus = async (cat) => {
        if (!canEdit) {
            toast.error("You don't have permission to update status");
            return;
        }

        const newStatus = (cat.status === 'Deactive' || cat.status === 'Inactive') ? 'Active' : 'Deactive';
        setUpdatingStatusId(cat._id);

        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/category/${cat._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            const data = await response.json();
            if (response.ok) {
                setCategories(prev => prev.map(c => c._id === cat._id ? { ...c, status: newStatus } : c));
                toast.success(`Finance category marked as ${newStatus}`);
            } else {
                toast.error(data.message || 'Failed to update status');
            }
        } catch (err) {
            toast.error('Server error updating status');
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this finance category?')) return;
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/category/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                toast.success('Finance category deleted successfully');
                fetchCategories();
            } else {
                const data = await response.json();
                toast.error(data.message || 'Failed to delete');
            }
        } catch (err) {
            toast.error('Server error');
        }
    };

    const handleBulkImport = async (importData) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/category/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(importData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Bulk import failed');
        }

        fetchCategories();
    };

    const categoryColumns = [
        { header: 'Category Name', key: 'name' },
        { header: 'Description', key: 'description' },
        { header: 'Status', key: 'status' },
    ];
    const categoryMapping = {
        'Category Name': 'name',
        Description: 'description',
        Status: 'status',
    };

    // Filtered categories
    const filteredCategories = categories.filter(cat => {
        const matchesSearch = (cat.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (cat.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        const catStatus = cat.status || 'Active';
        const matchesStatus = statusFilter === 'All' ? true :
            statusFilter === 'Active' ? catStatus === 'Active' :
            (catStatus === 'Deactive' || catStatus === 'Inactive');

        return matchesSearch && matchesStatus;
    });

    const activeCount = categories.filter(c => (c.status || 'Active') === 'Active').length;
    const deactiveCount = categories.filter(c => c.status === 'Deactive' || c.status === 'Inactive').length;

    return (
        <div className="flex-1 bg-[#131619] p-6 overflow-y-auto text-white">
            <ToastContainer position="top-right" theme="dark" />
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-cyan-400">Finance Expense Category Master Data</h2>
                    <p className="text-gray-400 text-sm mt-1">Manage finance-specific expense category definitions and status.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {canCreate && (
                        <ExcelImportExport
                            data={categories}
                            columns={categoryColumns}
                            mapping={categoryMapping}
                            onImport={handleBulkImport}
                            fileName="finance_expense_categories"
                        />
                    )}
                    {canCreate && (
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-md shadow-cyan-900/20"
                        >
                            <FaPlus /> Add Finance Expense Category
                        </button>
                    )}
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-[#1a1f24] p-4 rounded-xl border border-gray-800 mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm" />
                    <input
                        type="text"
                        placeholder="Search by category name or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-900/80 border border-gray-700/80 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                        >
                            <FaTimes />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 bg-gray-900/80 p-1 rounded-lg border border-gray-800">
                    <button
                        onClick={() => setStatusFilter("All")}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            statusFilter === "All"
                                ? "bg-cyan-600 text-white shadow-sm"
                                : "text-gray-400 hover:text-gray-200"
                        }`}
                    >
                        All ({categories.length})
                    </button>
                    <button
                        onClick={() => setStatusFilter("Active")}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            statusFilter === "Active"
                                ? "bg-emerald-600/90 text-white shadow-sm"
                                : "text-gray-400 hover:text-emerald-400"
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active ({activeCount})
                    </button>
                    <button
                        onClick={() => setStatusFilter("Deactive")}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            statusFilter === "Deactive"
                                ? "bg-rose-600/90 text-white shadow-sm"
                                : "text-gray-400 hover:text-rose-400"
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Deactive ({deactiveCount})
                    </button>
                </div>
            </div>

            <div className="bg-[#1a1f24] rounded-lg border border-gray-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-800/80 text-gray-300 text-sm font-semibold">
                                <th className="p-4 border-b border-gray-700 w-16">#</th>
                                <th className="p-4 border-b border-gray-700">Category Name</th>
                                <th className="p-4 border-b border-gray-700">Description</th>
                                <th className="p-4 border-b border-gray-700 w-36 text-center">Status</th>
                                <th className="p-4 border-b border-gray-700 text-right w-28">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-400">
                                        <div className="inline-flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                            Loading categories...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCategories.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500">
                                        {searchQuery || statusFilter !== "All"
                                            ? "No categories match the applied filters"
                                            : "No finance categories found"}
                                    </td>
                                </tr>
                            ) : (
                                filteredCategories.map((cat, index) => {
                                    const isDeactive = cat.status === "Deactive" || cat.status === "Inactive";
                                    return (
                                        <tr key={cat._id} className="master-data-row-wave border-b border-gray-800/80 transition-colors hover:bg-white/5">
                                            <td className="p-4 text-gray-400 text-sm">{index + 1}</td>
                                            <td className="p-4 font-medium text-gray-100">{cat.name}</td>
                                            <td className="p-4 text-gray-400 text-sm">{cat.description || '-'}</td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleToggleStatus(cat)}
                                                    disabled={!canEdit || updatingStatusId === cat._id}
                                                    title={canEdit ? `Click to set as ${isDeactive ? "Active" : "Deactive"}` : "Status"}
                                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border transition-all ${
                                                        isDeactive
                                                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                                                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                                    } ${canEdit ? "cursor-pointer hover:scale-105 active:scale-95 shadow-sm" : "cursor-default opacity-80"}`}
                                                >
                                                    <span className={`w-2 h-2 rounded-full ${
                                                        isDeactive ? "bg-rose-400" : "bg-emerald-400 animate-pulse"
                                                    }`} />
                                                    {isDeactive ? "Deactive" : "Active"}
                                                </button>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-3 text-lg">
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => openModal(cat)}
                                                            className="text-blue-400 hover:text-blue-300 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <FaEdit />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDelete(cat._id)}
                                                            className="text-red-400 hover:text-red-300 transition-colors"
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

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
                    <div className="bg-[#1a1f24] p-6 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-700/60">
                            <h3 className="text-xl font-bold text-white">
                                {currentCategory ? 'Edit Finance Category' : 'Add New Finance Category'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="mb-4">
                                <label className="block text-gray-300 mb-2 text-sm font-semibold">Category Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm"
                                    placeholder="Enter category name"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-300 mb-2 text-sm font-semibold">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm"
                                    placeholder="Enter description"
                                    rows="3"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-gray-300 mb-2 text-sm font-semibold">Status</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, status: "Active" })}
                                        className={`py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 border transition-all ${
                                            formData.status === "Active"
                                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm shadow-emerald-500/20 font-semibold"
                                                : "bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200"
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                        Active
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, status: "Deactive" })}
                                        className={`py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 border transition-all ${
                                            formData.status === "Deactive"
                                                ? "bg-rose-500/20 border-rose-500 text-rose-400 shadow-sm shadow-rose-500/20 font-semibold"
                                                : "bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200"
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                                        Deactive
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors font-semibold text-sm shadow-md shadow-cyan-900/30"
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

export default FinanceExpenseCategoryContent;
