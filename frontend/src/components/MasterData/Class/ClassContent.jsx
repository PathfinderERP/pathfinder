import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';
import '../MasterDataWave.css';
import { hasPermission } from '../../../config/permissions';
import ExcelImportExport from "../../Common/ExcelImportExport";

const ClassContent = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentClass, setCurrentClass] = useState(null);
    const [formData, setFormData] = useState({ name: "" });

    // Permission checks
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'masterData', 'class', 'create');
    const canEdit = hasPermission(user, 'masterData', 'class', 'edit');
    const canDelete = hasPermission(user, 'masterData', 'class', 'delete');

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/class`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setClasses(data);
            } else {
                setError(data.message || "Failed to fetch classes");
            }
        } catch (err) {
            setError("Server error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openModal = (cls = null) => {
        if (cls) {
            setCurrentClass(cls);
            setFormData({ name: cls.name });
        } else {
            setCurrentClass(null);
            setFormData({ name: "" });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentClass(null);
        setFormData({ name: "" });
        setError("");
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const url = currentClass
            ? `${import.meta.env.VITE_API_URL}/class/${currentClass._id}`
            : `${import.meta.env.VITE_API_URL}/class/create`;
        const method = currentClass ? "PUT" : "POST";

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
                fetchClasses();
                closeModal();
            } else {
                setError(data.message || "Operation failed");
            }
        } catch (err) {
            setError("Server error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this class?")) return;

        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/class/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchClasses();
            } else {
                setError("Failed to delete class");
            }
        } catch (err) {
            setError("Server error");
        }
    };

    const handleBulkImport = async (importData) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${import.meta.env.VITE_API_URL}/class/import`, {
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

        fetchClasses();
    };

    const classColumns = [{ header: "Class Name", key: "name" }];
    const classMapping = { "Class Name": "name" };

    return (
        <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Class Management</h2>
                    <p className="text-gray-400 text-sm mt-1">Manage all available classes</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {canCreate && (
                        <ExcelImportExport
                            data={classes}
                            columns={classColumns}
                            mapping={classMapping}
                            onImport={handleBulkImport}
                            fileName="classes"
                        />
                    )}
                    {canCreate && (
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors"
                        >
                            <FaPlus /> Add Class
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}

            <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#252b32] text-gray-400 text-sm uppercase">
                            <th className="p-4 font-medium">#</th>
                            <th className="p-4 font-medium">Class Name</th>
                            <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {loading ? (
                            <tr>
                                <td colSpan="3" className="p-8 text-center text-gray-500">Loading...</td>
                            </tr>
                        ) : classes.length === 0 ? (
                            <tr>
                                <td colSpan="3" className="p-8 text-center text-gray-500">No classes found</td>
                            </tr>
                        ) : (
                            classes.map((cls, index) => (
                                <tr key={cls._id} className="master-data-row-wave border-b border-gray-800 transition-colors">
                                    <td className="p-4 text-gray-400">{index + 1}</td>
                                    <td className="p-4 font-medium text-white">{cls.name}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {canEdit && (
                                                <button
                                                    onClick={() => openModal(cls)}
                                                    className="p-2 text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <FaEdit />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(cls._id)}
                                                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-[#1a1f24] p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">
                                {currentClass ? "Edit Class" : "Add New Class"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="mb-4">
                                <label className="block text-gray-400 mb-2 text-sm">Class Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    placeholder="Enter class name"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
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

export default ClassContent;
