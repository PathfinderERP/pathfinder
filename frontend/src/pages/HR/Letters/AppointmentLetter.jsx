import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../../components/Layout";
import { FaArrowLeft, FaPrint, FaDownload, FaEnvelope, FaFileAlt, FaSpinner, FaHistory, FaBriefcase, FaExternalLinkAlt, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";

const AppointmentLetter = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);
    const [generatedFile, setGeneratedFile] = useState(null);

    const [letterData, setLetterData] = useState({
        companyName: "PathFinder ERP"
    });

    const fetchEmployeeDetails = React.useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setEmployee(data);
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Failed to load employee details");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchEmployeeDetails();
    }, [id, fetchEmployeeDetails]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/letters/appointment/${id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(letterData)
            });

            if (response.ok) {
                const data = await response.json();
                setGeneratedFile({
                    fileName: data.fileName,
                    filePath: data.filePath
                });
                toast.success("Appointment letter generated successfully!");
                fetchEmployeeDetails();
            } else {
                toast.error("Failed to generate letter");
            }
        } catch (error) {
            console.error("Error generating letter:", error);
            toast.error("Error generating letter");
        } finally {
            setGenerating(false);
        }
    };

    const handleSendEmail = async () => {
        if (!generatedFile) return;
        setSending(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/letters/appointment/${id}/send`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ fileName: generatedFile.fileName })
            });

            if (response.ok) {
                toast.success(`Sent to ${employee.email}`);
            } else {
                toast.error("Failed to send email");
            }
        } catch (error) {
            console.error("Error sending email:", error);
            toast.error("Error sending email");
        } finally {
            setSending(false);
        }
    };

    const handleDownload = () => {
        if (!generatedFile) return;
        const downloadUrl = `${import.meta.env.VITE_API_URL}/hr/letters/download/${generatedFile.fileName}`;
        window.open(downloadUrl, '_blank');
    };

    const handlePrint = () => {
        const iframe = document.getElementById("pdf-preview");
        if (iframe) iframe.contentWindow.print();
    };

    const handleDeleteLetter = async (e, letterId, fileName) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this letter?")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/letters/${id}/${letterId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success("Letter deleted successfully");
                if (generatedFile?.fileName === fileName) {
                    setGeneratedFile(null);
                }
                fetchEmployeeDetails();
            } else {
                toast.error("Failed to delete letter");
            }
        } catch (error) {
            console.error("Error deleting letter:", error);
            toast.error("Error deleting letter");
        }
    };

    const selectFromHistory = (letter) => {
        setGeneratedFile({
            fileName: letter.fileName,
            filePath: letter.fileUrl
        });
    };

    if (loading) {
        return (
            <Layout activePage="HR & Manpower">
                <div className="flex items-center justify-center min-h-[400px]">
                    <FaSpinner className="animate-spin text-blue-600" size={40} />
                </div>
            </Layout>
        );
    }

    const history = employee?.letters?.filter(l => l.letterType === "Appointment Letter") || [];

    return (
        <Layout activePage="HR & Manpower">
            <div className="space-y-6 animate-fade-in pb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(`/hr/employee/letters/${id}`)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400"
                        >
                            <FaArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Appointment Letter</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">For {employee?.name}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {generatedFile && (
                            <>
                                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition-all font-bold text-sm border dark:border-gray-700"><FaPrint /> Print</button>
                                <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition-all font-bold text-sm border dark:border-gray-700"><FaDownload /> Download</button>
                                <button disabled={sending} onClick={handleSendEmail} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 font-bold text-sm disabled:opacity-50">{sending ? <FaSpinner className="animate-spin" /> : <FaEnvelope />} {sending ? "Sending..." : "Send to Email"}</button>
                            </>
                        )}
                        <button disabled={generating} onClick={handleGenerate} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-bold text-sm disabled:opacity-50">{generating ? <FaSpinner className="animate-spin" /> : <FaBriefcase />} {generating ? "Generating..." : generatedFile ? "Regenerate" : "Generate Letter"}</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Letter Details</h3>
                            <div className="space-y-4">
                                <div className="space-y-1.5 text-gray-500">
                                    <label className="text-[10px] font-bold uppercase ml-1">Company Name</label>
                                    <input type="text" value={letterData.companyName} onChange={(e) => setLetterData({ ...letterData, companyName: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all text-sm font-medium" />
                                </div>
                            </div>
                        </div>

                        {/* History Panel */}
                        <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><FaHistory size={16} /></div>
                                Past Letters
                            </h3>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {history.length > 0 ? (
                                    history.map((letter, index) => (
                                        <div
                                            key={index}
                                            onClick={() => selectFromHistory(letter)}
                                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${generatedFile?.fileName === letter.fileName
                                                ? "bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30"
                                                : "bg-gray-50 border-gray-100 hover:border-gray-300 dark:bg-gray-800/50 dark:border-gray-700"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                                    <FaFileAlt className="text-blue-500" size={14} />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-xs font-bold text-gray-800 dark:text-white truncate">
                                                        {new Date(letter.generatedAt).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 truncate">{letter.fileName}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FaExternalLinkAlt className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" size={10} />
                                                <button
                                                    onClick={(e) => handleDeleteLetter(e, letter._id, letter.fileName)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                                                    title="Delete Letter"
                                                >
                                                    <FaTrash size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    )).reverse()
                                ) : (
                                    <div className="text-center py-6 text-gray-400">
                                        <FaHistory size={24} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-xs">No history found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-[#1a1f24] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col h-[750px]">
                            <div className="flex-1 bg-gray-100 dark:bg-[#11161d] p-4 flex items-center justify-center">
                                {generatedFile ? (
                                    <iframe id="pdf-preview" src={`${generatedFile.filePath}#toolbar=0&navpanes=0`} className="w-full h-full rounded-lg shadow-xl" title="Letter Preview" key={generatedFile.filePath} />
                                ) : (
                                    <div className="text-center space-y-4">
                                        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-400"><FaFileAlt size={40} /></div>
                                        <p className="font-bold text-gray-500">No Preview Available</p>
                                        <button onClick={handleGenerate} disabled={generating} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-sm shadow-lg shadow-blue-600/20 disabled:opacity-50">{generating ? "Generating..." : "Generate Now"}</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AppointmentLetter;
