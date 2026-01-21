import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';
import '../MasterDataWave.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasPermission } from '../../../config/permissions';
import ExcelImportExport from "../../common/ExcelImportExport";

const ExpenseSubCategoryContent = () => {
    const [subCategories, setSubCategories] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSubCategory, setCurrentSubCategory] = useState(null);
    const [formData, setFormData] = useState({ name: "", category: "", description: "" });

    // Permission checks
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'masterData', 'subcategory', 'create');
    const canEdit = hasPermission(user, 'masterData', 'subcategory', 'edit');
    const canDelete = hasPermission(user, 'masterData', 'subcategory', 'delete');

    const fetchSubCategories = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/subcategory`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setSubCategories(data);
            } else {
                toast.error(data.message || "Failed to fetch sub-categories");
            }
        } catch (err) {
            toast.error("Server error");
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/category`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setCategories(data);
            }
        } catch (err) {
            console.error("Failed to fetch categories");
        }
    };

    useEffect(() => {
        fetchSubCategories();
        fetchCategories();
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openModal = (sub = null) => {
        if (sub) {
            setCurrentSubCategory(sub);
            setFormData({
                name: sub.name,
                category: sub.category?._id || sub.category || "",
                description: sub.description || ""
            });
        } else {
            setCurrentSubCategory(null);
            setFormData({ name: "", category: "", description: "" });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentSubCategory(null);
        setFormData({ name: "", category: "", description: "" });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const url = currentSubCategory
            ? `${import.meta.env.VITE_API_URL}/master-data/subcategory/${currentSubCategory._id}`
            : `${import.meta.env.VITE_API_URL}/master-data/subcategory`;
        const method = currentSubCategory ? "PUT" : "POST";

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
                toast.success(currentSubCategory ? "Sub Category updated successfully" : "Sub Category created successfully");
                fetchSubCategories();
                closeModal();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this sub-category?")) return;

        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/subcategory/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success("Sub Category deleted successfully");
                fetchSubCategories();
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

        // Resolve category names back to IDs
        const resolvedData = importData.map(item => {
            const resolvedItem = { ...item };
            if (typeof item.category === 'string') {
                const matchedCategory = categories.find(c =>
                    c.name.toLowerCase() === item.category.trim().toLowerCase()
                );
                if (matchedCategory) {
                    resolvedItem.category = matchedCategory._id;
                } else {
                    throw new Error(`Category "${item.category}" not found. Please ensure categories are created first.`);
                }
            }
            return resolvedItem;
        });

        const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/subcategory/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(resolvedData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Bulk import failed");
        }

        fetchSubCategories();
    };

    const subCategoryColumns = [
        { header: "Sub-Category Name", key: "name" },
        { header: "Parent Category", key: "category" },
        { header: "Description", key: "description" }
    ];
    const subCategoryMapping = {
        "Sub-Category Name": "name",
        "Parent Category": "category",
        "Description": "description"
    };

    return (
        <div className="flex-1 bg-[#131619] p-6 overflow-y-auto text-white">
            <ToastContainer position="top-right" theme="dark" />
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-cyan-400">Expense Sub-Category Master Data</h2>
                    <p className="text-gray-400 text-sm mt-1">Manage detailed expense sub-categories</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {canCreate && (
                        <ExcelImportExport
                            data={subCategories.map(s => ({ ...s, category: s.category?.name }))}
                            columns={subCategoryColumns}
                            mapping={subCategoryMapping}
                            onImport={handleBulkImport}
                            fileName="expense_sub_categories"
                        />
                    )}
                    {canCreate && (
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            <FaPlus /> Add Sub-Category
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-[#1a1f24] rounded-lg border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-800 text-gray-300">
                                <th className="p-4 border-b border-gray-700">#</th>
                                <th className="p-4 border-b border-gray-700">Sub-Category Name</th>
                                <th className="p-4 border-b border-gray-700">Parent Category</th>
                                <th className="p-4 border-b border-gray-700">Description</th>
                                <th className="p-4 border-b border-gray-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-4 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : subCategories.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-4 text-center text-gray-500">No sub-categories found</td>
                                </tr>
                            ) : (
                                subCategories.map((sub, index) => (
                                    <tr key={sub._id} className="master-data-row-wave border-b border-gray-800 transition-colors hover:bg-white/5">
                                        <td className="p-4 text-gray-400">{index + 1}</td>
                                        <td className="p-4 font-medium">{sub.name}</td>
                                        <td className="p-4">
                                            <span className="bg-cyan-900/40 text-cyan-400 px-3 py-1 rounded-full text-xs font-bold border border-cyan-800/50">
                                                {sub.category?.name || "N/A"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-400">{sub.description || "-"}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-3 text-lg">
                                                {canEdit && (
                                                    <button
                                                        onClick={() => openModal(sub)}
                                                        className="text-blue-400 hover:text-blue-300"
                                                        title="Edit"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(sub._id)}
                                                        className="text-red-400 hover:text-red-300"
                                                        title="Delete"
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1f24] p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">
                                {currentSubCategory ? "Edit Sub Category" : "Add New Sub Category"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="mb-4">
                                <label className="block text-gray-400 mb-2 text-sm font-bold">Sub-Category Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
                                    placeholder="Enter sub-category name"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-400 mb-2 text-sm font-bold">Parent Category</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(cat => (
                                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-400 mb-2 text-sm font-bold">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
                                    placeholder="Enter description"
                                    rows="3"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors font-bold"
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

export default ExpenseSubCategoryContent;
