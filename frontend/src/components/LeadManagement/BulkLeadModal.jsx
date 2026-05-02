import React, { useState, useEffect } from "react";
import { FaTimes, FaUpload, FaDownload, FaFileExcel, FaSync, FaExclamationTriangle, FaCheckCircle, FaPhoneAlt, FaUserPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const BulkLeadModal = ({ onClose, onSuccess, isDarkMode }) => {
    // Mode: 'fresh' | 'contacted'
    const [mode, setMode] = useState("fresh");

    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [file, setFile] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [importResults, setImportResults] = useState(null); // for contacted mode result summary

    // Master data
    const [classes, setClasses] = useState([]);
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [boards, setBoards] = useState([]);
    const [sources, setSources] = useState([]);
    const [telecallers, setTelecallers] = useState([]);
    const [feedbackOptions, setFeedbackOptions] = useState([]);

    useEffect(() => {
        fetchValidationData();
    }, []);

    // Reset file & errors when switching mode
    useEffect(() => {
        setFile(null);
        setErrorMsg("");
        setImportResults(null);
    }, [mode]);

    const fetchValidationData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            const baseUrl = import.meta.env.VITE_API_URL;

            const [classRes, centreRes, courseRes, boardRes, sourceRes, userRes, feedbackRes] = await Promise.all([
                fetch(`${baseUrl}/class`, { headers }),
                fetch(`${baseUrl}/centre`, { headers }),
                fetch(`${baseUrl}/course`, { headers }),
                fetch(`${baseUrl}/board`, { headers }),
                fetch(`${baseUrl}/source`, { headers }),
                fetch(`${baseUrl}/superAdmin/getAllUsers`, { headers }),
                fetch(`${baseUrl}/master-data/follow-up-feedback`, { headers })
            ]);

            const classData = await classRes.json();
            const centreData = await centreRes.json();
            const courseData = await courseRes.json();
            const boardData = await boardRes.json();
            const sourceData = await sourceRes.json();
            const userData = await userRes.json();
            const feedbackData = feedbackRes.ok ? await feedbackRes.json() : [];

            setClasses(Array.isArray(classData) ? classData : []);
            setCentres(Array.isArray(centreData) ? centreData : []);
            setCourses(Array.isArray(courseData) ? courseData : []);
            setBoards(Array.isArray(boardData) ? boardData : []);
            setSources(sourceData.sources || []);
            setFeedbackOptions(Array.isArray(feedbackData) ? feedbackData.map(f => f.name) : []);

            if (userRes.ok && userData.users) {
                const leadUsers = (userData.users || []).filter(u =>
                    ['telecaller', 'centralizedTelecaller', 'counsellor', 'marketing', 'admin', 'RM', 'centerIncharge', 'zonalManager', 'zonalHead'].includes(u.role)
                );
                setTelecallers(leadUsers);
            }
        } catch (error) {
            console.error("Error fetching validation data:", error);
            toast.error("Failed to load data");
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setErrorMsg("");
        setImportResults(null);
        if (e.target.files[0]) {
            toast.info(`File [${e.target.files[0].name.toUpperCase()}] ready for import`);
        }
    };

    // ─── FRESH LEADS TEMPLATE ────────────────────────────────────────────────
    const downloadFreshTemplate = () => {
        const templateData = [{
            Name: "John Doe",
            Email: "john@example.com",
            PhoneNumber: "9876543210",
            SchoolName: "Public School",
            Class: "Class 10",
            Centre: "Delhi Centre",
            Course: "JEE Main",
            Board: "CBSE",
            Source: "Facebook",
            TargetExam: "JEE",
            LeadType: "HOT LEAD",
            LeadResponsibility: "Telecaller Name"
        }];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Fresh Leads Template");
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Fresh_Lead_Import_Template.xlsx");
        toast.success("Fresh leads template downloaded");
    };

    // ─── CONTACTED LEADS TEMPLATE ────────────────────────────────────────────
    const downloadContactedTemplate = () => {
        const feedbackList = feedbackOptions.length > 0 ? feedbackOptions.join(", ") : "Interested, Not Interested, Call back later, Busy";
        const templateData = [{
            Name: "John Doe",
            Email: "john@example.com",
            PhoneNumber: "9876543210",
            SchoolName: "Public School",
            Class: "Class 10",
            Centre: "Delhi Centre",
            Course: "JEE Main",
            Board: "CBSE",
            Source: "Facebook",
            TargetExam: "JEE",
            LeadType: "HOT LEAD",
            LeadResponsibility: "Telecaller Name",
            Feedback: feedbackOptions[0] || "Interested",
            Remarks: "Student is interested, will visit next week"
        }];

        const ws = XLSX.utils.json_to_sheet(templateData);

        // Add a note row showing valid feedback values
        XLSX.utils.sheet_add_aoa(ws, [
            ["--- VALID FEEDBACK OPTIONS (must match exactly) ---"],
            [feedbackList]
        ], { origin: -1 });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Contacted Leads Template");
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Contacted_Lead_Import_Template.xlsx");
        toast.success("Contacted leads template downloaded");
    };

    // ─── PROCESS FRESH LEADS ─────────────────────────────────────────────────
    const processFreshFile = async () => {
        if (!file) { toast.error("Please select a file"); return; }
        setValidating(true);
        setErrorMsg("");

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                if (jsonData.length === 0) { setErrorMsg("The file is empty"); setValidating(false); return; }

                const validLeads = [];
                const errors = [];

                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const rowNum = i + 2;

                    if (!row.Name || !row.Email || !row.SchoolName) {
                        errors.push(`Row ${rowNum}: Missing Required Data (Name, Email, SchoolName required)`);
                        continue;
                    }

                    if (row.LeadResponsibility) {
                        const telecallerExists = telecallers.some(
                            t => t.name.toLowerCase().trim() === row.LeadResponsibility.toString().toLowerCase().trim()
                        );
                        if (!telecallerExists) {
                            errors.push(`Row ${rowNum}: Agent '${row.LeadResponsibility}' not found`);
                            continue;
                        }
                    }

                    let classId = null;
                    if (row.Class) {
                        const cls = classes.find(c => c.name.toLowerCase() === row.Class.toString().toLowerCase());
                        if (cls) classId = cls._id;
                    }

                    let centreId = null;
                    if (row.Centre) {
                        const ctr = centres.find(c => c.centreName.toLowerCase() === row.Centre.toLowerCase());
                        if (ctr) centreId = ctr._id;
                        else { errors.push(`Row ${rowNum}: Centre '${row.Centre}' not found in system`); continue; }
                    }

                    let courseId = null;
                    if (row.Course) {
                        const crs = courses.find(c => c.courseName.toLowerCase() === row.Course.toLowerCase());
                        if (crs) courseId = crs._id;
                    }

                    let boardId = null;
                    if (row.Board) {
                        const brd = boards.find(b => b.boardCourse.toLowerCase() === row.Board.toLowerCase());
                        if (brd) boardId = brd._id;
                    }

                    validLeads.push({
                        name: row.Name,
                        email: row.Email,
                        phoneNumber: row.PhoneNumber,
                        schoolName: row.SchoolName,
                        className: classId,
                        centre: centreId,
                        course: courseId,
                        board: boardId,
                        source: row.Source,
                        targetExam: row.TargetExam,
                        leadType: row.LeadType ? row.LeadType.toUpperCase() : "COLD LEAD",
                        leadResponsibility: row.LeadResponsibility
                    });
                }

                if (errors.length > 0) {
                    setErrorMsg(`Validation Error:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more` : ''}`);
                    setValidating(false);
                    toast.error("Validation Failed");
                    return;
                }

                await uploadFreshLeads(validLeads);

            } catch (error) {
                console.error("Error processing file:", error);
                setErrorMsg("Failed to read file");
                setValidating(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const uploadFreshLeads = async (leads) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            let successCount = 0;
            const failures = [];

            for (const lead of leads) {
                try {
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/create`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify(lead),
                    });
                    if (response.ok) successCount++;
                    else failures.push(lead.name);
                } catch { failures.push(lead.name); }
            }

            if (successCount === leads.length) {
                toast.success(`Successfully imported ${successCount} leads!`);
                onSuccess();
            } else {
                toast.warning(`Partial Import: ${successCount} successful. Failed: ${failures.length}`);
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Import Failed");
        } finally {
            setLoading(false);
            setValidating(false);
        }
    };

    // ─── PROCESS CONTACTED LEADS ──────────────────────────────────────────────
    const processContactedFile = async () => {
        if (!file) { toast.error("Please select a file"); return; }
        setValidating(true);
        setErrorMsg("");
        setImportResults(null);

        const validFeedbacks = feedbackOptions.map(f => f.toLowerCase().trim());

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                if (jsonData.length === 0) { setErrorMsg("The file is empty"); setValidating(false); return; }

                const validRows = [];
                const errors = [];

                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const rowNum = i + 2;

                    // Skip template note rows
                    const firstVal = String(Object.values(row)[0] || '');
                    if (firstVal.startsWith('---')) continue;

                    if (!row.Name || !row.Email || !row.SchoolName) {
                        errors.push(`Row ${rowNum}: Missing Required Data (Name, Email, SchoolName required)`);
                        continue;
                    }

                    if (row.LeadResponsibility) {
                        const telecallerExists = telecallers.some(
                            t => t.name.toLowerCase().trim() === row.LeadResponsibility.toString().toLowerCase().trim()
                        );
                        if (!telecallerExists) {
                            errors.push(`Row ${rowNum}: Agent '${row.LeadResponsibility}' not found`);
                            continue;
                        }
                    }

                    let classId = null;
                    if (row.Class) {
                        const cls = classes.find(c => c.name.toLowerCase() === row.Class.toString().toLowerCase());
                        if (cls) classId = cls._id;
                    }

                    let centreId = null;
                    if (row.Centre) {
                        const ctr = centres.find(c => c.centreName.toLowerCase() === row.Centre.toLowerCase());
                        if (ctr) centreId = ctr._id;
                        else { errors.push(`Row ${rowNum}: Centre '${row.Centre}' not found in system`); continue; }
                    }

                    let courseId = null;
                    if (row.Course) {
                        const crs = courses.find(c => c.courseName.toLowerCase() === row.Course.toLowerCase());
                        if (crs) courseId = crs._id;
                    }

                    let boardId = null;
                    if (row.Board) {
                        const brd = boards.find(b => b.boardCourse.toLowerCase() === row.Board.toLowerCase());
                        if (brd) boardId = brd._id;
                    }

                    if (row.Feedback) {
                        if (!validFeedbacks.includes(row.Feedback.toString().toLowerCase().trim())) {
                            errors.push(`Row ${rowNum}: Feedback '${row.Feedback}' not in master data. Valid: ${feedbackOptions.join(', ')}`);
                            continue;
                        }
                    }

                    validRows.push({
                        name: row.Name,
                        email: row.Email,
                        phoneNumber: row.PhoneNumber ? row.PhoneNumber.toString().trim() : undefined,
                        schoolName: row.SchoolName,
                        className: classId,
                        centre: centreId,
                        course: courseId,
                        board: boardId,
                        source: row.Source,
                        targetExam: row.TargetExam,
                        leadType: row.LeadType ? row.LeadType.toString().toUpperCase() : "COLD LEAD",
                        leadResponsibility: row.LeadResponsibility,
                        feedback: row.Feedback ? row.Feedback.toString().trim() : '',
                        remarks: row.Remarks ? row.Remarks.toString().trim() : ''
                    });
                }

                if (errors.length > 0) {
                    setErrorMsg(`Validation Error:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more` : ''}`);
                    setValidating(false);
                    toast.error("Validation Failed");
                    return;
                }

                await uploadContactedLeads(validRows);

            } catch (error) {
                console.error("Error processing contacted file:", error);
                setErrorMsg("Failed to read file");
                setValidating(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const uploadContactedLeads = async (leads) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/bulk-contacted`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ leads }),
            });
            const data = await response.json();
            if (response.ok) {
                setImportResults(data.results);
                const contactedCount = data.results.success.filter(s => s.contacted).length;
                const pendingCount = data.results.success.filter(s => !s.contacted).length;
                toast.success(`Done: ${data.results.success.length} updated (${contactedCount} contacted, ${pendingCount} pending), ${data.results.failed.length} failed`);
                if (data.results.failed.length === 0) onSuccess();
            } else {
                toast.error(data.message || "Bulk update failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Import Failed");
        } finally {
            setLoading(false);
            setValidating(false);
        }
    };

    const handleProcess = () => mode === "fresh" ? processFreshFile() : processContactedFile();
    const handleDownloadTemplate = () => mode === "fresh" ? downloadFreshTemplate() : downloadContactedTemplate();

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[70] p-4 backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/70' : 'bg-white/60'}`}>
            <div className={`w-full max-w-lg rounded-[4px] border shadow-2xl transition-all overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-cyan-500/10' : 'bg-white border-gray-200'}`}>

                {/* Header */}
                <div className={`px-8 py-5 border-b flex justify-between items-center transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h3 className={`text-xl font-black uppercase tracking-tighter italic flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaUpload className="text-cyan-500" />
                            Bulk Lead Import
                        </h3>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-0.5">Import leads from an Excel file</p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`transition-all p-2 rounded-[4px] active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Mode Tabs */}
                <div className={`flex border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <button
                        onClick={() => setMode("fresh")}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${mode === "fresh"
                            ? (isDarkMode ? 'border-cyan-500 text-cyan-400' : 'border-cyan-600 text-cyan-700')
                            : (isDarkMode ? 'border-transparent text-gray-500 hover:text-gray-300' : 'border-transparent text-gray-400 hover:text-gray-700')
                        }`}
                    >
                        <FaUserPlus size={11} />
                        Fresh Leads
                    </button>
                    <button
                        onClick={() => setMode("contacted")}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${mode === "contacted"
                            ? (isDarkMode ? 'border-emerald-500 text-emerald-400' : 'border-emerald-600 text-emerald-700')
                            : (isDarkMode ? 'border-transparent text-gray-500 hover:text-gray-300' : 'border-transparent text-gray-400 hover:text-gray-700')
                        }`}
                    >
                        <FaPhoneAlt size={11} />
                        Contacted Leads
                    </button>
                </div>

                <div className={`p-8 space-y-6 max-h-[70vh] overflow-y-auto ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`}>

                    {/* Mode description */}
                    <div className={`px-4 py-3 rounded-[4px] border text-[10px] font-bold uppercase tracking-widest ${mode === "fresh"
                        ? (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')
                        : (isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                    }`}>
                        {mode === "fresh"
                            ? "➕ Upload new leads — these will be added as not-contacted (pending) leads"
                            : "📞 Upload contacted leads — match by Phone/Email, add feedback & remarks. Leads with Remarks = Contacted; without Remarks = Pending"
                        }
                    </div>

                    {/* Feedback master data hint (contacted mode only) */}
                    {mode === "contacted" && feedbackOptions.length > 0 && (
                        <div className={`px-4 py-3 rounded-[4px] border space-y-1 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Valid Feedback Options (must match exactly)</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {feedbackOptions.map((opt, i) => (
                                    <span key={i} className={`px-2 py-0.5 rounded-[2px] text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                                        {opt}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Download Template */}
                    <div className="flex justify-center">
                        <button
                            onClick={handleDownloadTemplate}
                            className={`flex items-center gap-3 px-6 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border group ${isDarkMode ? 'bg-cyan-500/5 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/10' : 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'}`}
                        >
                            <FaDownload className="group-hover:translate-y-0.5 transition-transform" />
                            Download {mode === "fresh" ? "Fresh" : "Contacted"} Template
                        </button>
                    </div>

                    {/* File Upload */}
                    <div className={`border-2 border-dashed rounded-[4px] p-10 text-center transition-all group ${isDarkMode ? 'bg-[#131619] border-gray-700 hover:border-cyan-500/50' : 'bg-gray-50 border-gray-200 hover:border-cyan-500'}`}>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
                            <FaFileExcel className={`text-5xl transition-transform group-hover:scale-110 ${file ? 'text-emerald-500' : 'text-gray-500'}`} />
                            <div className="space-y-1">
                                <span className={`block text-[11px] font-black uppercase tracking-widest ${isDarkMode ? (file ? 'text-white' : 'text-gray-400') : (file ? 'text-gray-900' : 'text-gray-500')}`}>
                                    {file ? file.name.toUpperCase() : "Select Excel File"}
                                </span>
                                <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-widest opacity-50 italic">.XLSX, .XLS files only</span>
                            </div>
                        </label>
                    </div>

                    {/* Error */}
                    {errorMsg && (
                        <div className={`p-4 rounded-[4px] border border-dashed flex items-start gap-4 transition-all ${isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                            <FaExclamationTriangle className="mt-1 flex-shrink-0" />
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest">Import Error</p>
                                <p className="text-[11px] font-medium whitespace-pre-wrap leading-relaxed">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    {/* Results (contacted mode) */}
                    {importResults && mode === "contacted" && (
                        <div className={`rounded-[4px] border overflow-hidden ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                            <div className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-[#131619] text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                Import Results
                            </div>
                            <div className="divide-y divide-gray-800/20">
                                {/* Success summary */}
                                <div className="px-4 py-2 flex items-center gap-3">
                                    <FaCheckCircle className="text-emerald-500 flex-shrink-0" size={12} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                        {importResults.success.filter(s => s.contacted).length} Contacted &nbsp;|&nbsp;
                                        {importResults.success.filter(s => !s.contacted).length} Pending (no remarks)
                                    </span>
                                </div>
                                {/* Failed rows */}
                                {importResults.failed.length > 0 && (
                                    <div className="px-4 py-2 space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-1">Failed ({importResults.failed.length})</p>
                                        {importResults.failed.map((f, i) => (
                                            <p key={i} className="text-[10px] text-red-400 font-medium">
                                                <span className="font-black">{f.identifier}</span> — {f.reason}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className={`flex justify-end gap-4 pt-4 border-t transition-all ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <button
                            onClick={onClose}
                            className={`px-8 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleProcess}
                            disabled={loading || validating || !file}
                            className={`px-10 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg flex items-center justify-center gap-3 disabled:opacity-30 ${mode === "fresh"
                                ? (isDarkMode ? 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-500/20' : 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-cyan-500/30')
                                : (isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/30')
                            }`}
                        >
                            {(loading || validating) ? <FaSync className="animate-spin" /> : <><FaUpload size={14} /> Start Import</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkLeadModal;
