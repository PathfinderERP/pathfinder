import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../../components/Layout";
import { FaArrowLeft, FaPrint, FaDownload, FaEnvelope, FaFileAlt, FaSpinner, FaHistory, FaIdBadge, FaExternalLinkAlt, FaUser } from "react-icons/fa";
import { toast } from "react-toastify";

const VirtualId = () => {
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

    useEffect(() => {
        fetchEmployeeDetails();
    }, [id]);

    const fetchEmployeeDetails = async () => {
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
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/letters/virtual-id/${id}`, {
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
                toast.success("Virtual ID generated successfully!");
                fetchEmployeeDetails();
            } else {
                toast.error("Failed to generate Virtual ID");
            }
        } catch (error) {
            toast.error("Error generating Virtual ID");
        } finally {
            setGenerating(false);
        }
    };

    const handleSendEmail = async () => {
        if (!generatedFile) return;
        setSending(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/letters/virtual-id/${id}/send`, {
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
            toast.error("Error sending email");
        } finally {
            setSending(false);
        }
    };

    const handleDownload = () => {
        if (!generatedFile) return;
        // Use the public download route to avoid Authorization header issues with window.open
        const downloadUrl = `${import.meta.env.VITE_API_URL}/hr/letters/download/${generatedFile.fileName}`;
        window.open(downloadUrl, '_blank');
    };

    const handlePrint = () => {
        const iframe = document.getElementById("pdf-preview");
        if (iframe) iframe.contentWindow.print();
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

    const history = employee?.letters?.filter(l => l.letterType === "Virtual ID") || [];

    const IdCardMockup = ({ employee, companyName }) => (
        <div className="id-card-perspective group w-[240px] h-[350px] mx-auto animate-float">
            <div className="id-card-inner relative w-full h-full transition-all duration-700 preserve-3d group-hover:rotate-y-12">
                <div className="absolute inset-0 bg-white dark:bg-gray-100 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 p-5 flex flex-col items-center select-none backface-hidden">
                    {/* Header with Logo */}
                    <div className="w-full h-10 flex justify-center mb-6 pt-1">
                        <img src="/assets/logo.png" alt="Company Logo" className="w-[85%] h-auto object-contain" />
                    </div>

                    {/* Profile Image Container */}
                    <div className="relative mb-6">
                        <div className="w-28 h-28 rounded-full border-2 border-blue-500 p-0.5 overflow-hidden shadow-lg bg-gray-50 flex items-center justify-center">
                            {employee?.profileImage ? (
                                <img src={employee.profileImage} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-gray-300 flex flex-col items-center">
                                    <FaUser size={35} />
                                    <span className="text-[8px] uppercase font-bold mt-1">No Image</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Employee Info */}
                    <div className="text-center w-full space-y-1">
                        <h2 className="text-[13px] font-black text-gray-900 leading-tight uppercase tracking-tight truncate w-full px-1">
                            {employee?.name || "Employee Name"}
                        </h2>
                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest truncate w-full px-1">
                            {employee?.designation?.name || "Designation"}
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gray-300 to-transparent my-4"></div>

                    {/* Contact Details */}
                    <div className="w-full space-y-2 px-1">
                        <div className="flex flex-col text-[8px] text-gray-600 font-bold space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                <span className="text-blue-500 w-4 font-black">ID:</span>
                                <span className="text-gray-900 truncate font-black">{employee?.employeeId || "EMP0000000"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-blue-500 w-4 font-black">EMAIL:</span>
                                <span className="text-gray-900 truncate">{employee?.email || "n/a"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-balance">
                                <span className="text-blue-500 w-4 font-black">TEL:</span>
                                <span className="text-gray-900 truncate">{employee?.phoneNumber || "n/a"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Overlays for Glossy Look */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none group-hover:translate-x-full transition-transform duration-1000"></div>
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"></div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-15px); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
                .id-card-perspective {
                    perspective: 1000px;
                }
                .preserve-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                }
                .group-hover\\:rotate-y-12:hover {
                    transform: rotateY(12deg) rotateX(5deg);
                }
            ` }} />
        </div>
    );

    return (
        <Layout activePage="HR & Manpower">
            <div className="space-y-6 animate-fade-in pb-10">
                <div className="flex justify-between items-center bg-white dark:bg-[#1a1f24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(`/hr/employee/letters/${id}`)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
                        >
                            <FaArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold dark:text-white">Virtual ID Card</h1>
                            <p className="text-xs text-gray-500 font-medium">Card management for {employee?.name}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {generatedFile && (
                            <div className="flex gap-2 p-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                <button onClick={handlePrint} className="p-2 hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-all" title="Print"><FaPrint size={16} /></button>
                                <button onClick={handleDownload} className="p-2 hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-all" title="Download"><FaDownload size={16} /></button>
                                <button disabled={sending} onClick={handleSendEmail} className="p-2 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 rounded-lg transition-all" title="Send Email">{sending ? <FaSpinner className="animate-spin" /> : <FaEnvelope size={16} />}</button>
                            </div>
                        )}
                        <button
                            disabled={generating}
                            onClick={handleGenerate}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-bold text-sm disabled:opacity-50"
                        >
                            {generating ? <FaSpinner className="animate-spin text-white" /> : <FaIdBadge />}
                            {generating ? "Syncing..." : generatedFile ? "Update Card" : "Initialize Card"}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                            <h3 className="text-[13px] font-black uppercase text-gray-400 dark:text-gray-500 mb-4 tracking-widest">Configuration</h3>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 ml-1">Entity Name</label>
                                    <input
                                        type="text"
                                        value={letterData.companyName}
                                        onChange={(e) => setLetterData({ ...letterData, companyName: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:blue-500/20 transition-all text-sm outline-none dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* History Panel */}
                        <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                            <h3 className="text-[13px] font-black uppercase text-gray-400 dark:text-gray-500 mb-4 tracking-widest">Issuance History</h3>
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
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
                                                    <p className="text-xs font-bold text-gray-800 dark:text-white truncate uppercase tracking-tighter">
                                                        {new Date(letter.generatedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </p>
                                                    <p className="text-[9px] text-gray-500 truncate font-mono">{letter.fileName}</p>
                                                </div>
                                            </div>
                                            <FaExternalLinkAlt className="text-gray-300 group-hover:text-blue-500 transition-colors" size={10} />
                                        </div>
                                    )).reverse()
                                ) : (
                                    <div className="text-center py-10 opacity-40">
                                        <FaHistory size={24} className="mx-auto mb-2" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest">Purged Record</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-3">
                        <div className="bg-white dark:bg-[#1a1f24] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col h-[750px]">
                            <div className="flex-1 bg-gray-50 dark:bg-[#0f1216] p-4 flex flex-col items-center justify-center relative overflow-hidden">
                                {/* Decorative Background Elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>

                                {generating ? (
                                    <div className="text-center space-y-4 relative z-10">
                                        <div className="relative">
                                            <FaIdBadge className="text-blue-600 text-6xl mx-auto opacity-20" />
                                            <FaSpinner className="text-blue-600 text-4xl animate-spin absolute inset-0 m-auto" />
                                        </div>
                                        <p className="font-black text-blue-600 uppercase tracking-widest text-xs">Encoding Credentials...</p>
                                    </div>
                                ) : generatedFile ? (
                                    <div className="w-full h-full flex items-center justify-center gap-10">
                                        {/* 3D Mockup Preview */}
                                        {/* <div className="hidden xl:block">
                                            <IdCardMockup employee={employee} companyName={letterData.companyName} />
                                            <p className="text-center mt-6 text-[10px] text-gray-400 font-black uppercase tracking-widest">3D Visual Preview</p>
                                        </div> */}

                                        {/* Physical Document Frame */}
                                        <div className="w-[450px] h-full rounded-2xl border-4 border-white dark:border-gray-800 shadow-2xl relative bg-white">
                                            <iframe
                                                id="pdf-preview"
                                                src={`${generatedFile.filePath}#toolbar=0&navpanes=0`}
                                                className="w-full h-full rounded-lg"
                                                title="ID Card PDF"
                                                key={generatedFile.filePath}
                                            />
                                            <div className="absolute bottom-4 right-4 group">
                                                <div className="absolute bottom-full right-0 mb-2 whitespace-nowrap bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Official Document Preview</div>
                                                <div className="p-2 bg-blue-600 text-white rounded-full shadow-lg cursor-help"><FaFileAlt size={12} /></div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-6 relative z-10 max-w-sm">
                                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto ring-8 ring-blue-500/5">
                                            <FaIdBadge size={40} className="text-gray-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold dark:text-white mb-2 tracking-tight">Identify Your Assets</h3>
                                            <p className="text-sm text-gray-500 px-4">Generate high-security virtual identification cards with biological verification data.</p>
                                        </div>
                                        <button
                                            onClick={handleGenerate}
                                            disabled={generating}
                                            className="px-10 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 active:scale-95 disabled:opacity-50"
                                        >
                                            Begin Generation
                                        </button>
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

export default VirtualId;
