import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';

const ClassContent = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentClass, setCurrentClass] = useState(null);
    const [formData, setFormData] = useState({ name: "" });

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
                const data = await response.json();
                alert(data.message || "Failed to delete");
            }
        } catch (err) {
            alert("Server error");
        }
    };

    return (
        <div className="flex-1 bg-[#131619] p-6 overflow-y-auto text-white">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-cyan-400">Class Master Data</h2>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <FaPlus /> Add Class
                </button>
            </div>

            {error && <div className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-4">{error}</div>}

            <div className="bg-[#1a1f24] rounded-lg border border-gray-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-800 text-gray-300">
                            <th className="p-4 border-b border-gray-700">#</th>
                            <th className="p-4 border-b border-gray-700">Class Name</th>
                            <th className="p-4 border-b border-gray-700 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="3" className="p-4 text-center text-gray-500">Loading...</td>
                            </tr>
                        ) : classes.length === 0 ? (
                            <tr>
                                <td colSpan="3" className="p-4 text-center text-gray-500">No classes found</td>
                            </tr>
                        ) : (
                            classes.map((cls, index) => (
                                <tr key={cls._id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                                    <td className="p-4 text-gray-400">{index + 1}</td>
                                    <td className="p-4 font-medium">{cls.name}</td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => openModal(cls)}
                                            className="text-blue-400 hover:text-blue-300 mr-3"
                                            title="Edit"
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cls._id)}
                                            className="text-red-400 hover:text-red-300"
                                            title="Delete"
                                        >
                                            <FaTrash />
                                        </button>
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
