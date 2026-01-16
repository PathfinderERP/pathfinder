import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaSearch, FaTimes } from 'react-icons/fa';

const SectionAllotmentContent = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedDetail, setSelectedDetail] = useState(null); // For Modal
    const [showModal, setShowModal] = useState(false);
    const [centres, setCentres] = useState([]);
    const [selectedCentre, setSelectedCentre] = useState("");

    // Form Data for Modal
    const [formData, setFormData] = useState({
        examSection: "",
        studySection: "",
        omrCode: "",
        rm: ""
    });

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = user.role === "Super Admin";

    useEffect(() => {
        if (isSuperAdmin) fetchCentres();
        fetchData();
    }, [selectedCentre]); // Re-fetch on centre filter change. Search is handled by button or debounce ideally. 

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) setCentres(await response.json());
        } catch (err) {
            console.error(err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            let url = `${import.meta.env.VITE_API_URL}/admission/section-allotment?`;
            if (search) url += `search=${search}&`;
            if (selectedCentre) url += `centre=${selectedCentre}&`;

            const response = await fetch(url, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setStudents(data);
            }
        } catch (err) {
            toast.error("Failed to fetch students");
        } finally {
            setLoading(false);
        }
    };

    const handleAllotClick = (admission) => {
        setSelectedDetail(admission);
        setFormData({
            examSection: admission.sectionAllotment?.examSection || "",
            studySection: admission.sectionAllotment?.studySection || "",
            omrCode: admission.sectionAllotment?.omrCode || "",
            rm: admission.sectionAllotment?.rm || ""
        });
        setShowModal(true);
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admission/section-allotment/${selectedDetail._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success("Section allotted successfully");
                setShowModal(false);
                fetchData(); // Refresh list
            } else {
                toast.error("Failed to update");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    const renderEmpty = () => (
        <tr>
            <td colSpan="6" className="p-4 text-center text-gray-500">No students found</td>
        </tr>
    );

    return (
        <div className="flex-1 bg-[#131619] p-6 overflow-hidden flex flex-col h-full text-white">
            <ToastContainer position="top-right" theme="dark" />

            {/* Header Area */}
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <div className="relative w-full md:w-96">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#1a1f24] border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-cyan-500"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <button className="text-red-500 font-medium hover:text-red-400 flex items-center gap-2">
                        + Sync in Study
                    </button>
                    {isSuperAdmin && (
                        <select
                            value={selectedCentre}
                            onChange={(e) => setSelectedCentre(e.target.value)}
                            className="bg-[#1a1f24] border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-cyan-500"
                        >
                            <option value="">-Select Center-</option>
                            {centres.map(c => (
                                <option key={c._id} value={c.centreName}>{c.centreName}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#1a1f24] rounded-lg border border-gray-800 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-800 z-10">
                            <tr className="text-gray-300">
                                <th className="p-4 border-b border-gray-700">NAME</th>
                                <th className="p-4 border-b border-gray-700">EMAIL</th>
                                <th className="p-4 border-b border-gray-700">ENROLLMENT NUMBER</th>
                                <th className="p-4 border-b border-gray-700">PHONE NUMBER</th>
                                <th className="p-4 border-b border-gray-700">CENTRE</th>
                                <th className="p-4 border-b border-gray-700 text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-4 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : students.length === 0 ? renderEmpty() : (
                                students.map((admission) => {
                                    const student = admission.student?.studentsDetails?.[0] || {};
                                    return (
                                        <tr key={admission._id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                                            <td className="p-4 font-medium text-white">{student.studentName}</td>
                                            <td className="p-4 text-gray-400">{student.studentEmail}</td>
                                            <td className="p-4 text-gray-400">{admission.admissionNumber}</td>
                                            <td className="p-4 text-gray-400">{student.mobileNum}</td>
                                            <td className="p-4 text-gray-400">{admission.centre}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleAllotClick(admission)}
                                                        className="px-4 py-1.5 border border-cyan-600 text-cyan-500 rounded hover:bg-cyan-600 hover:text-white transition-all text-sm font-medium"
                                                    >
                                                        Allot
                                                    </button>
                                                    <button
                                                        onClick={() => toast.info(`Current Sections: Exam: ${admission.sectionAllotment?.examSection || 'N/A'}, Study: ${admission.sectionAllotment?.studySection || 'N/A'}`)}
                                                        className="px-4 py-1.5 border border-gray-600 text-gray-400 rounded hover:border-gray-500 hover:text-white transition-all text-sm font-medium"
                                                    >
                                                        Show Section
                                                    </button>
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

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-sm shadow-2xl relative overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-4 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-800">Choose Section</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-gray-500 text-sm mb-1 bg-white">Exam section</label>
                                <select
                                    name="examSection"
                                    value={formData.examSection}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select Target Exams</option>
                                    <option value="A">Section A</option>
                                    <option value="B">Section B</option>
                                    <option value="C">Section C</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-500 text-sm mb-1">Study Section</label>
                                <select
                                    name="studySection"
                                    value={formData.studySection}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select Study Section</option>
                                    <option value="A">Section A</option>
                                    <option value="B">Section B</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-500 text-sm mb-1">OMR Selection</label>
                                <select
                                    name="omrCode"
                                    value={formData.omrCode}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select OMR options</option>
                                    <option value="OMR1">OMR 1</option>
                                    <option value="OMR2">OMR 2</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-500 text-sm mb-1">Select RM</label>
                                <select
                                    name="rm"
                                    value={formData.rm}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select RM</option>
                                    <option value="RM1">RM 1</option>
                                    <option value="RM2">RM 2</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors mt-4"
                            >
                                Allot
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SectionAllotmentContent;
