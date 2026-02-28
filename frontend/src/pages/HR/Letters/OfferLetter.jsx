import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../../components/Layout";
import { FaArrowLeft, FaPrint, FaDownload, FaEnvelope, FaFileAlt, FaSpinner, FaHistory, FaExternalLinkAlt, FaTrash, FaSignature, FaMagic, FaPlus, FaTimes, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";

const OfferLetter = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);
    const [generatedFile, setGeneratedFile] = useState(null); // { fileName, filePath (full URL) }
    const [showEmailConfig, setShowEmailConfig] = useState(false);

    const [signature, setSignature] = useState(null); // base64
    const [emailConfig, setEmailConfig] = useState({
        subject: "",
        body: "",
        cc: "",
        bcc: "",
        additionalAttachments: [] // { filename, content (base64) }
    });

    const [templates, setTemplates] = useState([]);
    const [savingTemplate, setSavingTemplate] = useState(false);

    const [letterData, setLetterData] = useState({
        companyName: "PathFinder ERP",
        joiningDate: "",
        manualContent: ""
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
                setLetterData(prev => ({
                    ...prev,
                    joiningDate: data.joiningDate ? new Date(data.joiningDate).toISOString().split('T')[0] : ""
                }));
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
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/letters/templates/Offer Letter`, {
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
                    letterContent: letterData.manualContent,
                    type: "Offer Letter"
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
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/letters/offer/${id}`, {
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
                // Ensure filePath is absolute
                setGeneratedFile({
                    fileName: data.fileName,
                    filePath: data.filePath
                });
                toast.success("Offer letter generated successfully!");
                // Refresh employee details to show in history
                fetchEmployeeDetails();
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || "Failed to generate letter");
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
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/letters/offer/${id}/send`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    fileName: generatedFile.fileName,
                    customSubject: emailConfig.subject,
                    customBody: emailConfig.body,
                    additionalAttachments: emailConfig.additionalAttachments,
                    cc: emailConfig.cc,
                    bcc: emailConfig.bcc
                })
            });

            if (response.ok) {
                toast.success(`Offer letter sent to ${employee.email}`);
            } else {
                const error = await response.json();
                toast.error(error.error || error.message || "Failed to send email");
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
        window.open(downloadUrl, "_blank");
    };

    const handlePrint = () => {
        const iframe = document.getElementById("pdf-preview");
        if (iframe) {
            iframe.contentWindow.print();
        }
    };

    const handleDeleteLetter = async (e, letterId, fileName) => {
        e.stopPropagation(); // Prevent selecting the letter
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
                const error = await response.json();
                toast.error(error.message || "Failed to delete letter");
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

    // Filter letters of type Offer Letter
    const offerLetterHistory = employee?.letters?.filter(l => l.letterType === "Offer Letter") || [];

    return (
        <Layout activePage="HR & Manpower">
            <div className="space-y-6 animate-fade-in pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(`/hr/employee/letters/${id}`)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400"
                        >
                            <FaArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Offer Letter</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Management for <span className="font-bold text-gray-700 dark:text-gray-200">{employee?.name}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {generatedFile && (
                            <>
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-bold text-sm border border-gray-200 dark:border-gray-700"
                                >
                                    <FaPrint /> Print
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-bold text-sm border border-gray-200 dark:border-gray-700"
                                >
                                    <FaDownload /> Download
                                </button>
                                <button
                                    disabled={sending}
                                    onClick={() => setShowEmailConfig(!showEmailConfig)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-lg font-bold text-sm disabled:opacity-50 ${showEmailConfig ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700'}`}
                                >
                                    {sending ? <FaSpinner className="animate-spin" /> : <FaEnvelope />}
                                    {showEmailConfig ? "Close Customization" : "Send to Email"}
                                </button>
                            </>
                        )}
                        <button
                            disabled={generating}
                            onClick={handleGenerate}
                            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-bold text-sm disabled:opacity-50"
                        >
                            {generating ? <FaSpinner className="animate-spin" /> : <FaFileAlt />}
                            {generating ? "Generating..." : generatedFile ? "Regenerate" : "Generate Letter"}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Settings Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><FaFileAlt size={16} /></div>
                                Letter Details
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Company Name</label>
                                    <input
                                        type="text"
                                        value={letterData.companyName}
                                        onChange={(e) => setLetterData({ ...letterData, companyName: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all text-sm font-medium"
                                        placeholder="Enter company name..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Expected Joining Date</label>
                                    <input
                                        type="date"
                                        value={letterData.joiningDate}
                                        onChange={(e) => setLetterData({ ...letterData, joiningDate: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all text-sm font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Manual Content (In PDF)</label>
                                    <textarea
                                        rows={4}
                                        value={letterData.manualContent}
                                        onChange={(e) => setLetterData({ ...letterData, manualContent: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all text-sm font-medium resize-none"
                                        placeholder="Add any additional terms or notes for the PDF..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><FaSignature size={16} /></div>
                                Signature
                            </h3>
                            <div
                                className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${signature ? 'border-green-500/50 bg-green-50/10' : 'border-gray-200 dark:border-gray-700 hover:border-blue-500/50'}`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); handleSignatureUpload(e.dataTransfer.files[0]); }}
                                onClick={() => document.getElementById('signature-upload').click()}
                            >
                                <input
                                    id="signature-upload"
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleSignatureUpload(e.target.files[0])}
                                />
                                {signature ? (
                                    <div className="space-y-2">
                                        <img src={signature} alt="Signature" className="max-h-20 mx-auto rounded" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSignature(null); }}
                                            className="text-[10px] text-red-500 font-bold uppercase hover:underline"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <FaSignature className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={24} />
                                        <p className="text-xs font-medium text-gray-500">Drag & drop or click to upload signature</p>
                                        <p className="text-[10px] text-gray-400">Used for generating the letter</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Email Customization Panel */}
                        <div className={`transition-all duration-300 ${showEmailConfig ? 'block' : 'hidden'}`}>
                            <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-sm border border-blue-200 dark:border-blue-500/30 ring-1 ring-blue-500/20">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><FaEnvelope size={16} /></div>
                                        Email Content
                                    </h3>
                                    <button
                                        onClick={() => setShowEmailConfig(false)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <FaTimes size={16} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Templates Dropdown */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Choose Template</label>
                                        <div className="flex gap-2">
                                            <select
                                                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white text-sm"
                                                onChange={(e) => {
                                                    const template = templates.find(t => t._id === e.target.value);
                                                    if (template) {
                                                        setEmailConfig(prev => ({ ...prev, subject: template.subject, body: template.body }));
                                                        setLetterData(prev => ({ ...prev, manualContent: template.letterContent || "" }));
                                                    }
                                                }}
                                            >
                                                <option value="">Select a template...</option>
                                                {templates.map(t => (
                                                    <option key={t._id} value={t._id}>{t.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={saveAsTemplate}
                                                disabled={savingTemplate}
                                                className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
                                                title="Save as new template"
                                            >
                                                {savingTemplate ? <FaSpinner className="animate-spin" size={14} /> : <FaSave size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Email Subject</label>
                                        <input
                                            type="text"
                                            value={emailConfig.subject}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, subject: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all text-sm font-medium"
                                            placeholder="Enter subject line..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">CC Recipients</label>
                                            <input
                                                type="text"
                                                value={emailConfig.cc}
                                                onChange={(e) => setEmailConfig({ ...emailConfig, cc: e.target.value })}
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all text-xs"
                                                placeholder="email1@ex.com, email2..."
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">BCC Recipients</label>
                                            <input
                                                type="text"
                                                value={emailConfig.bcc}
                                                onChange={(e) => setEmailConfig({ ...emailConfig, bcc: e.target.value })}
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all text-xs"
                                                placeholder="BCC emails..."
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Email Message</label>
                                        <textarea
                                            rows={6}
                                            value={emailConfig.body}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, body: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all text-sm font-medium resize-none"
                                            placeholder="Write your email body here... (Note: The letter PDF will be attached at the bottom)"
                                        />
                                    </div>

                                    {/* Additional Attachments */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Additional Files</label>
                                            <button
                                                onClick={() => document.getElementById('extra-attach').click()}
                                                className="text-[10px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1"
                                            >
                                                <FaPlus size={8} /> Add File
                                            </button>
                                            <input
                                                id="extra-attach"
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => handleAdditionalAttachment(e.target.files[0])}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            {emailConfig.additionalAttachments.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-700">
                                                    <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate max-w-[150px]">{file.filename}</span>
                                                    <button
                                                        onClick={() => setEmailConfig(prev => ({
                                                            ...prev,
                                                            additionalAttachments: prev.additionalAttachments.filter((_, i) => i !== idx)
                                                        }))}
                                                        className="text-red-400 hover:text-red-600 transition-colors"
                                                    >
                                                        <FaTimes size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                            {emailConfig.additionalAttachments.length === 0 && (
                                                <p className="text-center text-[10px] text-gray-400 py-1">No additional files</p>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        disabled={sending}
                                        onClick={handleSendEmail}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold text-sm shadow-lg shadow-indigo-600/20 disabled:opacity-50 mt-2"
                                    >
                                        {sending ? <FaSpinner className="animate-spin" /> : <FaEnvelope />}
                                        {sending ? "Sending..." : "Send Personalized Email"}
                                    </button>
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
                                {offerLetterHistory.length > 0 ? (
                                    offerLetterHistory.map((letter, index) => (
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
                                    )).reverse() // Show latest first
                                ) : (
                                    <div className="text-center py-6 text-gray-400">
                                        <FaHistory size={24} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-xs">No history found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Preview Panel */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-[#1a1f24] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col h-[750px]">
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    Preview
                                    {generatedFile && <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>}
                                </h3>
                            </div>

                            <div className="flex-1 bg-gray-100 dark:bg-[#11161d] p-4 flex items-center justify-center relative">
                                {generatedFile ? (
                                    <iframe
                                        id="pdf-preview"
                                        src={generatedFile.filePath}
                                        className="w-full h-full rounded-lg shadow-xl"
                                        title="Letter Preview"
                                        key={generatedFile.filePath} // Force re-render on change
                                    />
                                ) : (
                                    <div className="text-center space-y-4 max-w-sm px-6">
                                        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-400 dark:text-gray-600">
                                            <FaFileAlt size={40} />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="font-bold text-gray-500 dark:text-gray-400">No Preview Available</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
                                                Select a letter from history or click "Generate Now" to create a new one.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleGenerate}
                                            disabled={generating}
                                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-sm shadow-lg shadow-blue-600/20 disabled:opacity-50"
                                        >
                                            {generating ? "Generating..." : "Generate Now"}
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

export default OfferLetter;
