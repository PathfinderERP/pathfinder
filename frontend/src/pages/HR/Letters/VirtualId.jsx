import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../../components/Layout";
import { FaArrowLeft, FaPrint, FaDownload, FaEnvelope, FaFileAlt, FaSpinner, FaHistory, FaIdBadge, FaExternalLinkAlt, FaUser, FaTrash, FaSignature, FaTimes, FaPlus, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";

const VirtualId = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);
    const [generatedFile, setGeneratedFile] = useState(null);
    const [showEmailConfig, setShowEmailConfig] = useState(false);

    const [signature, setSignature] = useState(null);
    const [emailConfig, setEmailConfig] = useState({
        subject: "",
        body: "",
        additionalAttachments: []
    });

    const [templates, setTemplates] = useState([]);
    const [savingTemplate, setSavingTemplate] = useState(false);

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
            console.error("Error fetching employee details:", error);
            toast.error("Failed to load employee details");
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchTemplates = React.useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/letters/templates/Virtual ID`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error("Error fetching templates:", error);
        }
    }, []);

    useEffect(() => {
        fetchEmployeeDetails();
        fetchTemplates();
    }, [id, fetchEmployeeDetails, fetchTemplates]);

    const handleSignatureUpload = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => setSignature(e.target.result);
        reader.readAsDataURL(file);
    };

    const handleAdditionalAttachment = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            setEmailConfig(prev => ({
                ...prev,
                additionalAttachments: [
                    ...prev.additionalAttachments,
                    { filename: file.name, content: e.target.result }
                ]
            }));
        };
        reader.readAsDataURL(file);
    };

    const saveAsTemplate = async () => {
        if (!emailConfig.subject || !emailConfig.body) {
            toast.error("Please provide subject and body for the template");
            return;
        }
        const name = window.prompt("Enter a name for this template:");
        if (!name) return;

        setSavingTemplate(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/letters/templates`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    subject: emailConfig.subject,
                    body: emailConfig.body,
                    type: "Virtual ID"
                })
            });

            if (response.ok) {
                toast.success("Template saved successfully");
                fetchTemplates();
            }
        } catch (error) {
            console.error("Error saving template:", error);
            toast.error("Error saving template");
        } finally {
            setSavingTemplate(false);
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
                body: JSON.stringify({
                    ...letterData,
                    signatureImage: signature
                })
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
            console.error("Error generating Virtual ID:", error);
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
                body: JSON.stringify({
                    fileName: generatedFile.fileName,
                    customSubject: emailConfig.subject,
                    customBody: emailConfig.body,
                    additionalAttachments: emailConfig.additionalAttachments
                })
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
        if (!window.confirm("Are you sure you want to delete this card?")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/letters/${id}/${letterId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success("Card deleted successfully");
                if (generatedFile?.fileName === fileName) {
                    setGeneratedFile(null);
                }
                fetchEmployeeDetails();
            } else {
                toast.error("Failed to delete card");
            }
        } catch (error) {
            console.error("Error deleting card:", error);
            toast.error("Error deleting card");
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

    const history = employee?.letters?.filter(l => l.letterType === "Virtual ID") || [];

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
                            <>
                                <div className="flex gap-2 p-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <button onClick={handlePrint} className="p-2 hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-all" title="Print"><FaPrint size={16} /></button>
                                    <button onClick={handleDownload} className="p-2 hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-all" title="Download"><FaDownload size={16} /></button>
                                    <button
                                        disabled={sending}
                                        onClick={() => setShowEmailConfig(!showEmailConfig)}
                                        className={`p-2 rounded-lg transition-all ${showEmailConfig ? 'bg-amber-500 text-white' : 'hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400'}`}
                                        title="Email Customization"
                                    >
                                        {sending ? <FaSpinner className="animate-spin" /> : <FaEnvelope size={16} />}
                                    </button>
                                </div>
                            </>
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

                        <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                            <h3 className="text-[13px] font-black uppercase text-gray-400 dark:text-gray-500 mb-4 tracking-widest flex items-center gap-2">
                                <FaSignature size={12} /> Signature
                            </h3>
                            <div
                                className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${signature ? 'border-green-500/50 bg-green-50/10' : 'border-gray-200 dark:border-gray-700 hover:border-blue-500/50'}`}
                                onClick={() => document.getElementById('signature-upload').click()}
                            >
                                <input id="signature-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleSignatureUpload(e.target.files[0])} />
                                {signature ? (
                                    <div className="space-y-2">
                                        <img src={signature} alt="Signature" className="max-h-16 mx-auto rounded" />
                                        <button onClick={(e) => { e.stopPropagation(); setSignature(null); }} className="text-[10px] text-red-500 font-bold uppercase hover:underline">Remove</button>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <FaSignature className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={20} />
                                        <p className="text-[10px] font-medium text-gray-500">Click to upload signature</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Email Customization Panel */}
                        <div className={`transition-all duration-300 ${showEmailConfig ? 'block' : 'hidden'}`}>
                            <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-sm border border-blue-200 dark:border-blue-500/30 ring-1 ring-blue-500/20">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <FaEnvelope className="text-blue-500" size={14} /> Email Content
                                    </h3>
                                    <button onClick={() => setShowEmailConfig(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><FaTimes size={14} /></button>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Template</label>
                                        <div className="flex gap-2">
                                            <select
                                                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white text-[11px]"
                                                onChange={(e) => {
                                                    const template = templates.find(t => t._id === e.target.value);
                                                    if (template) setEmailConfig(prev => ({ ...prev, subject: template.subject, body: template.body }));
                                                }}
                                            >
                                                <option value="">Select...</option>
                                                {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                            </select>
                                            <button onClick={saveAsTemplate} disabled={savingTemplate} className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl border dark:border-gray-700 transition-all">{savingTemplate ? <FaSpinner className="animate-spin" size={12} /> : <FaSave size={12} />}</button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Subject</label>
                                        <input type="text" value={emailConfig.subject} onChange={(e) => setEmailConfig({ ...emailConfig, subject: e.target.value })} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs dark:text-white outline-none" placeholder="Subject..." />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Message</label>
                                        <textarea rows={4} value={emailConfig.body} onChange={(e) => setEmailConfig({ ...emailConfig, body: e.target.value })} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs dark:text-white resize-none outline-none" placeholder="Body..." />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Files</label>
                                            <button onClick={() => document.getElementById('extra-attach').click()} className="text-[10px] font-bold text-blue-500 flex items-center gap-1"><FaPlus size={8} /> Add</button>
                                            <input id="extra-attach" type="file" className="hidden" onChange={(e) => handleAdditionalAttachment(e.target.files[0])} />
                                        </div>
                                        <div className="space-y-1">
                                            {emailConfig.additionalAttachments.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-gray-800/30 rounded-lg border dark:border-gray-700">
                                                    <span className="text-[9px] text-gray-600 truncate max-w-[120px]">{file.filename}</span>
                                                    <button onClick={() => setEmailConfig(prev => ({ ...prev, additionalAttachments: prev.additionalAttachments.filter((_, i) => i !== idx) }))} className="text-red-400"><FaTimes size={8} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button disabled={sending} onClick={handleSendEmail} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/20 disabled:opacity-50 mt-1">
                                        {sending ? <FaSpinner className="animate-spin" /> : <FaEnvelope />}
                                        {sending ? "Sending..." : "Send Securely"}
                                    </button>
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
                                            <div className="flex items-center gap-2">
                                                <FaExternalLinkAlt className="text-gray-300 group-hover:text-blue-500 transition-colors" size={10} />
                                                <button
                                                    onClick={(e) => handleDeleteLetter(e, letter._id, letter.fileName)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                                                    title="Delete Card"
                                                >
                                                    <FaTrash size={10} />
                                                </button>
                                            </div>
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
                                        {/* Physical Document Frame */}
                                        <div className="w-[450px] h-full rounded-2xl border-4 border-white dark:border-gray-800 shadow-2xl relative bg-white">
                                            <iframe
                                                id="pdf-preview"
                                                src={generatedFile.filePath}
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
        </Layout>
    );
};

export default VirtualId;
