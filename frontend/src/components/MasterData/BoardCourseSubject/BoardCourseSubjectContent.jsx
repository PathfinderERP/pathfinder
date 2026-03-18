import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasPermission } from '../../../config/permissions';

const BoardCourseSubjectContent = () => {
    const [entries, setEntries] = useState([]);
    const [boards, setBoards] = useState([]);
    const [classes, setClasses] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEntry, setCurrentEntry] = useState(null);
    const [formData, setFormData] = useState({ boardId: "", classId: "", subjects: [] });
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [subjectAmount, setSubjectAmount] = useState("");
    const [expandedBoards, setExpandedBoards] = useState({});
    const [expandedClasses, setExpandedClasses] = useState({});

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'masterData', 'boardCourse', 'create');
    const canEdit = hasPermission(user, 'masterData', 'boardCourse', 'edit');
    const canDelete = hasPermission(user, 'masterData', 'boardCourse', 'delete');

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };

            const [entriesRes, boardsRes, classesRes, subjectsRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/board-course-subject`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/board`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/class`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/subject`, { headers })
            ]);

            if (entriesRes.ok) setEntries(await entriesRes.json());
            if (boardsRes.ok) setBoards(await boardsRes.json());
            if (classesRes.ok) setClasses(await classesRes.json());
            if (subjectsRes.ok) setAllSubjects(await subjectsRes.json());
        } catch (err) {
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openModal = (entry = null) => {
        if (entry) {
            setCurrentEntry(entry);
            setFormData({
                boardId: entry.boardId?._id || entry.boardId,
                classId: entry.classId?._id || entry.classId,
                subjects: entry.subjects.map(s => ({
                    subjectId: s.subjectId?._id || s.subjectId,
                    amount: s.amount,
                    subName: s.subjectId?.subName
                }))
            });
        } else {
            setCurrentEntry(null);
            setFormData({ boardId: "", classId: "", subjects: [] });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentEntry(null);
        setFormData({ boardId: "", classId: "", subjects: [] });
        setSelectedSubjectId("");
        setSubjectAmount("");
    };

    const handleAddSubject = () => {
        if (!selectedSubjectId || !subjectAmount) {
            return toast.error("Please select a subject and enter amount");
        }

        const subjectObj = allSubjects.find(s => s._id === selectedSubjectId);
        if (formData.subjects.find(s => s.subjectId === selectedSubjectId)) {
            return toast.error("Subject already added");
        }

        setFormData({
            ...formData,
            subjects: [
                ...formData.subjects,
                { subjectId: selectedSubjectId, amount: Number(subjectAmount), subName: subjectObj.subName }
            ]
        });
        setSelectedSubjectId("");
        setSubjectAmount("");
    };

    const removeSubject = (index) => {
        const newSubjects = [...formData.subjects];
        newSubjects.splice(index, 1);
        setFormData({ ...formData, subjects: newSubjects });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const url = currentEntry
            ? `${import.meta.env.VITE_API_URL}/board-course-subject/${currentEntry._id}`
            : `${import.meta.env.VITE_API_URL}/board-course-subject`;
        const method = currentEntry ? "PUT" : "POST";

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success(currentEntry ? "Updated successfully" : "Created successfully");
                fetchData();
                closeModal();
            } else {
                const data = await response.json();
                toast.error(data.message || "Operation failed");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/board-course-subject/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success("Deleted successfully");
                fetchData();
            } else {
                toast.error("Failed to delete");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    const toggleBoard = (boardName) => {
        setExpandedBoards(prev => ({ ...prev, [boardName]: !prev[boardName] }));
    };

    const toggleClass = (classKey) => {
        setExpandedClasses(prev => ({ ...prev, [classKey]: !prev[classKey] }));
    };

    const groupedData = entries.reduce((acc, entry) => {
        const boardName = entry.boardId?.boardCourse || "Unknown Board";
        if (!acc[boardName]) acc[boardName] = [];
        acc[boardName].push(entry);
        return acc;
    }, {});

    return (
        <div className="flex-1 bg-[#131619] p-6 text-white min-h-screen">
            <ToastContainer position="top-right" theme="dark" />
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-cyan-400">Board Course Master</h2>
                    <p className="text-gray-400 text-sm">Hierarchy: Board → Class → Subjects & Amount</p>
                </div>
                {canCreate && (
                    <button onClick={() => openModal()} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <FaPlus /> Add Config
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {Object.keys(groupedData).length === 0 ? (
                    <div className="text-center p-12 bg-[#1a1f24] rounded-lg border border-gray-800 text-gray-500">
                        No configurations found.
                    </div>
                ) : (
                    Object.entries(groupedData).map(([boardName, boardEntries]) => (
                        <div key={boardName} className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden shadow-lg">
                            <div 
                                onClick={() => toggleBoard(boardName)}
                                className="p-4 bg-gray-800/50 flex items-center justify-between cursor-pointer hover:bg-gray-800 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-cyan-400">{expandedBoards[boardName] ? <FaChevronDown /> : <FaChevronRight />}</span>
                                    <h3 className="text-lg font-bold">{boardName}</h3>
                                    <span className="bg-cyan-900/30 text-cyan-400 text-[10px] px-2 py-0.5 rounded font-black tracking-widest uppercase">{boardEntries.length} CLASSES</span>
                                </div>
                            </div>

                            {expandedBoards[boardName] && (
                                <div className="p-4 space-y-3 bg-black/20">
                                    {boardEntries.map((entry) => (
                                        <div key={entry._id} className="ml-6 border-l-2 border-gray-800 pl-4 py-2">
                                            <div 
                                                onClick={() => toggleClass(entry._id)}
                                                className="flex items-center justify-between cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-gray-500 group-hover:text-cyan-400 transition-colors">
                                                        {expandedClasses[entry._id] ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
                                                    </span>
                                                    <h4 className="text-md font-semibold text-gray-300 group-hover:text-white transition-colors">{entry.classId?.name || "Unknown Class"}</h4>
                                                    <span className="text-xs text-gray-500">{entry.subjects.length} Subjects</span>
                                                </div>
                                                <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {canEdit && <button onClick={(e) => { e.stopPropagation(); openModal(entry); }} className="text-blue-400 hover:text-blue-300"><FaEdit /></button>}
                                                    {canDelete && <button onClick={(e) => { e.stopPropagation(); handleDelete(entry._id); }} className="text-red-400 hover:text-red-300"><FaTrash /></button>}
                                                </div>
                                            </div>

                                            {expandedClasses[entry._id] && (
                                                <div className="mt-3 ml-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                    {entry.subjects.map((sub, idx) => (
                                                        <div key={idx} className="bg-gray-800/40 border border-gray-700 p-3 rounded-lg flex justify-between items-center group/item hover:bg-gray-800/60 transition-all hover:border-cyan-500/50">
                                                            <div>
                                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{sub.subjectId?.subName || "Unknown"}</p>
                                                                <p className="text-lg font-black text-cyan-400">₹{sub.amount}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1f24] p-6 rounded-2xl w-full max-w-2xl border border-gray-700 shadow-2xl animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-white italic">
                                {currentEntry ? "EDIT MASTER CONFIG" : "NEW MASTER CONFIG"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-400 mb-2 text-xs font-black uppercase tracking-widest">Select Board</label>
                                    <select
                                        value={formData.boardId}
                                        onChange={(e) => setFormData({ ...formData, boardId: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition-all"
                                        required
                                    >
                                        <option value="">Choose Board...</option>
                                        {boards.map(b => <option key={b._id} value={b._id}>{b.boardCourse}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-400 mb-2 text-xs font-black uppercase tracking-widest">Select Class</label>
                                    <select
                                        value={formData.classId}
                                        onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition-all"
                                        required
                                    >
                                        <option value="">Choose Class...</option>
                                        {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="border-t border-gray-800 pt-6">
                                <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
                                    Subjects Configuration
                                </h4>
                                
                                <div className="bg-black/20 p-4 rounded-xl space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div className="md:col-span-2">
                                            <select
                                                value={selectedSubjectId}
                                                onChange={(e) => setSelectedSubjectId(e.target.value)}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                                            >
                                                <option value="">Select Subject...</option>
                                                {allSubjects.map(s => <option key={s._id} value={s._id}>{s.subName}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                placeholder="Amount (₹)"
                                                value={subjectAmount}
                                                onChange={(e) => setSubjectAmount(e.target.value)}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddSubject}
                                            className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all"
                                        >
                                            Add
                                        </button>
                                    </div>

                                    {formData.subjects.length > 0 && (
                                        <div className="grid grid-cols-1 gap-2 mt-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                            {formData.subjects.map((sub, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-gray-900/50 border border-gray-800 p-2 px-4 rounded-lg group">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-cyan-400 font-bold text-sm tracking-wide">{sub.subName}</span>
                                                        <span className="text-gray-500 text-xs">|</span>
                                                        <span className="text-white font-black text-sm">₹{sub.amount}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSubject(idx)}
                                                        className="text-gray-600 hover:text-red-400 transition-colors"
                                                    >
                                                        <FaTrash size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-all font-bold text-sm uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl transition-all font-black text-sm uppercase tracking-widest shadow-lg shadow-cyan-500/20"
                                >
                                    SAVE MASTER RECORD
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BoardCourseSubjectContent;
