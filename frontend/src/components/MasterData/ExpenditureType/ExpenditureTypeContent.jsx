import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';
import '../MasterDataWave.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasPermission } from '../../../config/permissions';
import ExcelImportExport from "../../Common/ExcelImportExport";

const ExpenditureTypeContent = () => {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentType, setCurrentType] = useState(null);
    const [formData, setFormData] = useState({ name: "", description: "" });

    // Permission checks
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'masterData', 'expenditureType', 'create');
    const canEdit = hasPermission(user, 'masterData', 'expenditureType', 'edit');
    const canDelete = hasPermission(user, 'masterData', 'expenditureType', 'delete');

    const fetchTypes = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/expenditure-type`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setTypes(data);
            } else {
                toast.error(data.message || "Failed to fetch types");
            }
        } catch (err) {
            toast.error("Server error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTypes();
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openModal = (type = null) => {
        if (type) {
            setCurrentType(type);
            setFormData({ name: type.name, description: type.description || "" });
        } else {
            setCurrentType(null);
            setFormData({ name: "", description: "" });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentType(null);
        setFormData({ name: "", description: "" });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const url = currentType
            ? `${import.meta.env.VITE_API_URL}/master-data/expenditure-type/${currentType._id}`
            : `${import.meta.env.VITE_API_URL}/master-data/expenditure-type`;
        const method = currentType ? "PUT" : "POST";

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
                toast.success(currentType ? "Expenditure Type updated successfully" : "Expenditure Type created successfully");
                fetchTypes();
                closeModal();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this expenditure type?")) return;

        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/expenditure-type/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success("Expenditure Type deleted successfully");
                fetchTypes();
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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/expenditure-type/import`, {
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

        fetchTypes();
    };

    const typeColumns = [
        { header: "Type Name", key: "name" },
        { header: "Description", key: "description" }
    ];
    const typeMapping = {
        "Type Name": "name",
        "Description": "description"
    };

    return (
        <div className="flex-1 bg-[#131619] p-6 overflow-y-auto text-white">
            <ToastContainer position="top-right" theme="dark" />
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-cyan-400">Expenditure Type Master Data</h2>
                    <p className="text-gray-400 text-sm mt-1">Manage types of expenditures</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {canCreate && (
                        <ExcelImportExport
                            data={types}
                            columns={typeColumns}
                            mapping={typeMapping}
                            onImport={handleBulkImport}
                            fileName="expenditure_types"
                        />
                    )}
                    {canCreate && (
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            <FaPlus /> Add Expenditure Type
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
                                <th className="p-4 border-b border-gray-700">Expenditure Type</th>
                                <th className="p-4 border-b border-gray-700">Description</th>
                                <th className="p-4 border-b border-gray-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="p-4 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : types.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-4 text-center text-gray-500">No types found</td>
                                </tr>
                            ) : (
                                types.map((type, index) => (
                                    <tr key={type._id} className="master-data-row-wave border-b border-gray-800 transition-colors hover:bg-white/5">
                                        <td className="p-4 text-gray-400">{index + 1}</td>
                                        <td className="p-4 font-medium">{type.name}</td>
                                        <td className="p-4 text-gray-400">{type.description || "-"}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-3 text-lg">
                                                {canEdit && (
                                                    <button
                                                        onClick={() => openModal(type)}
                                                        className="text-blue-400 hover:text-blue-300"
                                                        title="Edit"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(type._id)}
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
                                {currentType ? "Edit Expenditure Type" : "Add New Expenditure Type"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="mb-4">
                                <label className="block text-gray-400 mb-2 text-sm font-bold">Expenditure Type</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
                                    placeholder="Enter expenditure type name"
                                    required
                                />
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

export default ExpenditureTypeContent;
