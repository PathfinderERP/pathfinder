import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';
import '../MasterDataWave.css';
import { useTheme } from '../../../context/ThemeContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasPermission } from '../../../config/permissions';
import ExcelImportExport from "../../common/ExcelImportExport";

const SubjectContent = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSubject, setCurrentSubject] = useState(null);
    const [formData, setFormData] = useState({ subName: "", subPrice: "" });

    // Permission checks
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'masterData', 'subject', 'create');
    const canEdit = hasPermission(user, 'masterData', 'subject', 'edit');
    const canDelete = hasPermission(user, 'masterData', 'subject', 'delete');

    const fetchSubjects = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/subject`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setSubjects(data);
            } else {
                toast.error(data.message || "Failed to fetch subjects");
            }
        } catch (err) {
            toast.error("Server error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubjects();
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openModal = (subject = null) => {
        if (subject) {
            setCurrentSubject(subject);
            setFormData({ subName: subject.subName, subPrice: subject.subPrice });
        } else {
            setCurrentSubject(null);
            setFormData({ subName: "", subPrice: "" });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentSubject(null);
        setFormData({ subName: "" });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const url = currentSubject
            ? `${import.meta.env.VITE_API_URL}/subject/${currentSubject._id}`
            : `${import.meta.env.VITE_API_URL}/subject`;
        const method = currentSubject ? "PUT" : "POST";

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
                toast.success(currentSubject ? "Subject updated successfully" : "Subject created successfully");
                fetchSubjects();
                closeModal();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this subject?")) return;

        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/subject/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success("Subject deleted successfully");
                fetchSubjects();
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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/subject/import`, {
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

        fetchSubjects();
    };

    const subjectColumns = [
        { header: "Subject Name", key: "subName" }
    ];
    const subjectMapping = {
        "Subject Name": "subName"
    };

    return (
        <div className={`flex-1 p-6 overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-[#131619] text-white' : 'bg-gray-50 text-gray-900'}`}>
            <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className={`text-2xl font-bold uppercase tracking-tighter italic ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Subject <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>Master Data</span></h2>
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mt-1 font-bold`}>Manage academic subjects</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {canCreate && (
                        <ExcelImportExport
                            data={subjects}
                            columns={subjectColumns}
                            mapping={subjectMapping}
                            onImport={handleBulkImport}
                            fileName="subjects"
                        />
                    )}
                    {canCreate && (
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            <FaPlus /> Add Subject
                        </button>
                    )}
                </div>
            </div>

            <div className={`rounded-lg border overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`transition-colors ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                <th className={`p-4 border-b font-black uppercase text-[10px] tracking-widest ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>#</th>
                                <th className={`p-4 border-b font-black uppercase text-[10px] tracking-widest ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>Subject Name</th>
                                <th className={`p-4 border-b font-black uppercase text-[10px] tracking-widest text-right ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="p-4 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : subjects.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-4 text-center text-gray-500">No subjects found</td>
                                </tr>
                            ) : (
                                subjects.map((subject, index) => (
                                    <tr key={subject._id} className={`master-data-row-wave border-b transition-colors ${isDarkMode ? 'border-gray-800 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'}`}>
                                        <td className={`p-4 font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{index + 1}</td>
                                        <td className={`p-4 font-black uppercase text-xs tracking-wide ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{subject.subName}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {canEdit && (
                                                    <button
                                                        onClick={() => openModal(subject)}
                                                        className="text-blue-400 hover:text-blue-300"
                                                        title="Edit"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(subject._id)}
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
                    <div className={`p-8 rounded-2xl w-full max-w-md border shadow-2xl transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`text-2xl font-black uppercase tracking-tighter italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {currentSubject ? "Edit" : "Add"} <span className="text-cyan-500">Subject</span>
                            </h3>
                            <button onClick={closeModal} className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'} transition-colors`}>
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="mb-6">
                                <label className={`block mb-2 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Subject Name</label>
                                <input
                                    type="text"
                                    name="subName"
                                    value={formData.subName}
                                    onChange={handleInputChange}
                                    className={`w-full border rounded-xl p-3 outline-none focus:border-cyan-500 transition-all font-bold ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                    placeholder="Enter subject name"
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

export default SubjectContent;
