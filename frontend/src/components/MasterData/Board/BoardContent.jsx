import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';
import '../MasterDataWave.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasPermission } from '../../../config/permissions';

const BoardContent = () => {
    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentBoard, setCurrentBoard] = useState(null);
    const [formData, setFormData] = useState({ boardCourse: "", duration: "", subjects: [] });
    const [allSubjects, setAllSubjects] = useState([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [subjectConfig, setSubjectConfig] = useState({ price: "" });

    // Permission checks
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'masterData', 'board', 'create');
    const canEdit = hasPermission(user, 'masterData', 'board', 'edit');
    const canDelete = hasPermission(user, 'masterData', 'board', 'delete');

    const fetchBoards = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/board`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setBoards(data);
            } else {
                toast.error(data.message || "Failed to fetch boards");
            }
        } catch (err) {
            toast.error("Server error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBoards();
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/subject`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setAllSubjects(data);
        } catch (err) { console.error(err); }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openModal = (board = null) => {
        if (board) {
            setCurrentBoard(board);
            setFormData({
                boardCourse: board.boardCourse,
                duration: board.duration,
                subjects: board.subjects.map(s => ({
                    subjectId: s.subjectId?._id || s.subjectId,
                    price: s.price,
                    subName: s.subjectId?.subName // allow display
                }))
            });
        } else {
            setCurrentBoard(null);
            setFormData({ boardCourse: "", subjects: [] });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentBoard(null);
        setIsModalOpen(false);
        setCurrentBoard(null);
        setFormData({ boardCourse: "", duration: "", subjects: [] });
        setSelectedSubjectId("");
        setSubjectConfig({ price: "" });
    };

    const handleAddSubject = () => {
        if (!selectedSubjectId || !subjectConfig.price) {
            return toast.error("Please select a subject and fill in price");
        }

        const subjectObj = allSubjects.find(s => s._id === selectedSubjectId);
        if (!subjectObj) return;

        // Check if already added
        if (formData.subjects.find(s => s.subjectId === selectedSubjectId)) {
            return toast.error("Subject already added to this board");
        }

        setFormData({
            ...formData,
            subjects: [
                ...formData.subjects,
                {
                    subjectId: selectedSubjectId,
                    price: Number(subjectConfig.price),
                    subName: subjectObj.subName
                }
            ]
        });

        // Reset Inputs
        setSelectedSubjectId("");
        setSubjectConfig({ price: "" });
    };

    const removeSubject = (index) => {
        const newSubjects = [...formData.subjects];
        newSubjects.splice(index, 1);
        setFormData({ ...formData, subjects: newSubjects });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const url = currentBoard
            ? `${import.meta.env.VITE_API_URL}/board/${currentBoard._id}`
            : `${import.meta.env.VITE_API_URL}/board`;
        const method = currentBoard ? "PUT" : "POST";

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
                toast.success(currentBoard ? "Board updated successfully" : "Board created successfully");
                fetchBoards();
                closeModal();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this board?")) return;

        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/board/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success("Board deleted successfully");
                fetchBoards();
            } else {
                const data = await response.json();
                toast.error(data.message || "Failed to delete");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    return (
        <div className="flex-1 bg-[#131619] p-6 overflow-y-auto text-white">
            <ToastContainer position="top-right" theme="dark" />
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-cyan-400">Board Master Data</h2>
                {canCreate && (
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <FaPlus /> Add Board
                    </button>
                )}
            </div>

            <div className="bg-[#1a1f24] rounded-lg border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-800 text-gray-300">
                                <th className="p-4 border-b border-gray-700">#</th>
                                <th className="p-4 border-b border-gray-700">Board / Course Name</th>
                                <th className="p-4 border-b border-gray-700">Total Duration</th>
                                <th className="p-4 border-b border-gray-700">Subjects Configured</th>
                                <th className="p-4 border-b border-gray-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="3" className="p-4 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : boards.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="p-4 text-center text-gray-500">No boards found</td>
                                </tr>
                            ) : (
                                boards.map((board, index) => (
                                    <tr key={board._id} className="master-data-row-wave border-b border-gray-800 transition-colors">
                                        <td className="p-4 text-gray-400">{index + 1}</td>
                                        <td className="p-4 font-medium">{board.boardCourse}</td>
                                        <td className="p-4 text-cyan-400 font-mono text-sm">{board.duration || 'N/A'}</td>
                                        <td className="p-4">
                                            <span className="bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded text-xs">
                                                {board.subjects?.length || 0} Subjects
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {canEdit && (
                                                    <button
                                                        onClick={() => openModal(board)}
                                                        className="text-blue-400 hover:text-blue-300"
                                                        title="Edit"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(board._id)}
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
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-[#1a1f24] p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">
                                {currentBoard ? "Edit Board / Course" : "Add New Board / Course"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="mb-6">
                                <label className="block text-gray-400 mb-2 text-sm">Board / Course Name</label>
                                <input
                                    type="text"
                                    name="boardCourse"
                                    value={formData.boardCourse}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    placeholder="Enter name (e.g. CBSE Class 10)"
                                    required
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-gray-400 mb-2 text-sm">Course Duration</label>
                                <input
                                    type="text"
                                    name="duration"
                                    value={formData.duration}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    placeholder="Enter duration (e.g. 6 Months, 1 Year)"
                                />
                            </div>

                            <div className="mb-4 space-y-4 border-t border-gray-700 pt-4">
                                <h4 className="text-sm font-bold text-gray-300">Subject Configuration</h4>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <div className="md:col-span-3">
                                        <select
                                            value={selectedSubjectId}
                                            onChange={e => setSelectedSubjectId(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm"
                                        >
                                            <option value="">Select Subject to Add...</option>
                                            {allSubjects.map(s => (
                                                <option key={s._id} value={s._id}>{s.subName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <input
                                            type="number"
                                            placeholder="Price (₹)"
                                            value={subjectConfig.price}
                                            onChange={e => setSubjectConfig({ ...subjectConfig, price: e.target.value })}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddSubject}
                                        className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-4 py-2 text-sm md:col-span-1"
                                    >
                                        Add
                                    </button>
                                </div>

                                {/* List Selected Subjects */}
                                {formData.subjects.length > 0 && (
                                    <div className="bg-gray-800/50 rounded-lg p-2 max-h-40 overflow-y-auto space-y-2">
                                        {formData.subjects.map((s, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-gray-900 border border-gray-700 p-2 rounded text-xs">
                                                <div>
                                                    <span className="font-bold text-cyan-400 block">{s.subName || allSubjects.find(sub => sub._id === s.subjectId)?.subName || 'Unknown'}</span>
                                                    <span className="text-gray-400">₹{s.price}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeSubject(idx)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <FaTrash size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
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

export default BoardContent;
