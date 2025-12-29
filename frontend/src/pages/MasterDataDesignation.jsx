import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";

const MasterDataDesignation = () => {
    const [designations, setDesignations] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        department: "",
        travelAmount: 0 // Added default
    });

    useEffect(() => {
        fetchDesignations();
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/department`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("Departments fetched:", data);
                setDepartments(data);
            } else {
                console.error("Failed to fetch departments:", response.status);
                toast.error("Failed to load departments");
            }
        } catch (error) {
            console.error("Error fetching departments:", error);
            toast.error("Error loading departments");
        }
    };

    const fetchDesignations = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/designation`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDesignations(data);
            } else {
                toast.error("Failed to fetch designations");
            }
        } catch (error) {
            console.error("Error fetching designations:", error);
            toast.error("Error fetching designations");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const url = editingId
                ? `${import.meta.env.VITE_API_URL}/designation/${editingId}`
                : `${import.meta.env.VITE_API_URL}/designation`;

            const response = await fetch(url, {
                method: editingId ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success(`Designation ${editingId ? "updated" : "created"} successfully`);
                setShowModal(false);
                setFormData({ name: "", description: "", department: "", travelAmount: 0 }); // Reset with default
                setEditingId(null);
                fetchDesignations();
            } else {
                const error = await response.json();
                toast.error(error.message || "Operation failed");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Error saving designation");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (designation) => {
        setFormData({
            name: designation.name,
            description: designation.description || "",
            department: designation.department?._id || "",
            travelAmount: designation.travelAmount || 0
        });
        setEditingId(designation._id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this designation?")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/designation/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success("Designation deleted successfully");
                fetchDesignations();
            } else {
                toast.error("Failed to delete designation");
            }
        } catch (error) {
            console.error("Error deleting designation:", error);
            toast.error("Error deleting designation");
        }
    };

    const handleAddNew = () => {
        console.log("Opening modal, departments:", departments);
        setFormData({ name: "", description: "", department: "", travelAmount: 0 });
        setEditingId(null);
        setShowModal(true);
        // Refetch departments to ensure we have the latest data
        fetchDepartments();
    };

    return (
        <Layout activePage="Master Data">
            <div className="space-y-6 animate-fade-in pb-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Designation</h1>
                        <p className="text-gray-600 dark:text-gray-400">Manage employee designations</p>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <FaPlus /> Add Designation
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-[#1a1f24] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : designations.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-gray-500">
                            No designations found
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Designation Name
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Department
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Travel Amount
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {designations.map((designation) => (
                                        <tr
                                            key={designation._id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {designation.name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                    {designation.department?.departmentName || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-medium text-gray-900 dark:text-emerald-400">
                                                    ₹{designation.travelAmount?.toLocaleString() || "0"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    {designation.description || "-"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleEdit(designation)}
                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                        title="Edit"
                                                    >
                                                        <FaEdit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(designation._id)}
                                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                        title="Delete"
                                                    >
                                                        <FaTrash size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-[#1a1f24] rounded-xl shadow-xl max-w-md w-full p-6">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                                {editingId ? "Edit Designation" : "Add Designation"}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Designation Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Enter designation name"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Department
                                    </label>
                                    <select
                                        name="department"
                                        value={formData.department}
                                        onChange={handleInputChange}
                                        style={{
                                            backgroundColor: 'var(--select-bg, #1f2937)',
                                            color: 'var(--select-text, #ffffff)'
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option
                                                key={dept._id}
                                                value={dept._id}
                                                style={{
                                                    backgroundColor: '#1a1f24',
                                                    color: 'white'
                                                }}
                                            >
                                                {dept.departmentName}
                                            </option>
                                        ))}
                                    </select>
                                    {departments.length === 0 && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            No departments found. Please create one in Master Data → Department
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Travel Amount Limit (₹)
                                    </label>
                                    <input
                                        type="number"
                                        name="travelAmount"
                                        value={formData.travelAmount}
                                        onChange={handleInputChange}
                                        placeholder="Enter amount"
                                        min="0"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Enter description"
                                        rows="3"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setEditingId(null);
                                            setFormData({ name: "", description: "", department: "", travelAmount: 0 });
                                        }}
                                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? "Saving..." : editingId ? "Update" : "Create"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default MasterDataDesignation;
