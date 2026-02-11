import React, { useState, useEffect } from "react";
import { FaTimes, FaUpload, FaDownload, FaFileExcel, FaSync, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const BulkLeadModal = ({ onClose, onSuccess, isDarkMode }) => {
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [file, setFile] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");

    const [classes, setClasses] = useState([]);
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [boards, setBoards] = useState([]);
    const [sources, setSources] = useState([]);
    const [telecallers, setTelecallers] = useState([]);

    useEffect(() => {
        fetchValidationData();
    }, []);

    const fetchValidationData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            const baseUrl = import.meta.env.VITE_API_URL;

            const [classRes, centreRes, courseRes, boardRes, sourceRes, userRes] = await Promise.all([
                fetch(`${baseUrl}/class`, { headers }),
                fetch(`${baseUrl}/centre`, { headers }),
                fetch(`${baseUrl}/course`, { headers }),
                fetch(`${baseUrl}/board`, { headers }),
                fetch(`${baseUrl}/source`, { headers }),
                fetch(`${baseUrl}/superAdmin/getAllUsers`, { headers })
            ]);

            const classData = await classRes.json();
            const centreData = await centreRes.json();
            const courseData = await courseRes.json();
            const boardData = await boardRes.json();
            const sourceData = await sourceRes.json();
            const userData = await userRes.json();

            setClasses(Array.isArray(classData) ? classData : []);
            setCentres(Array.isArray(centreData) ? centreData : []);
            setCourses(Array.isArray(courseData) ? courseData : []);
            setBoards(Array.isArray(boardData) ? boardData : []);
            setSources(sourceData.sources || []);

            if (userRes.ok && userData.users) {
                setTelecallers(userData.users.filter(u =>
                    ["telecaller", "counsellor", "marketing"].includes(u.role)
                ));
            }
        } catch (error) {
            console.error("Error fetching validation data:", error);
            toast.error("Failed to load data");
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setErrorMsg("");
        if (e.target.files[0]) {
            toast.info(`File [${e.target.files[0].name.toUpperCase()}] ready for import`);
        }
    };

    const downloadTemplate = () => {
        const templateData = [
            {
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
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Leads Template");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(data, "Lead_Import_Template.xlsx");
        toast.success("Import template downloaded");
    };

    const processFile = async () => {
        if (!file) {
            toast.error("Please select a file");
            return;
        }

        setValidating(true);
        setErrorMsg("");

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    setErrorMsg("The file is empty");
                    setValidating(false);
                    return;
                }

                const validLeads = [];
                const errors = [];

                const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
                const userAllottedCentres = currentUser.centres?.map(c => (typeof c === 'object' ? c._id : c)) || [];
                const isSuperAdmin = currentUser.role === "superAdmin" || currentUser.role === "Super Admin";

                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const rowNum = i + 2;

                    if (!row.Name || !row.Email || !row.SchoolName) {
                        errors.push(`Row ${rowNum}: Missing Required Data (Name, Email, SchoolName required)`);
                        continue;
                    }

                    if (row.LeadResponsibility) {
                        const telecallerExists = telecallers.some(
                            t => t.name.toLowerCase() === row.LeadResponsibility.toLowerCase()
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
                        if (ctr) {
                            centreId = ctr._id;
                            // Check if centre is allotted to user
                            if (!isSuperAdmin && !userAllottedCentres.includes(centreId)) {
                                errors.push(`Row ${rowNum}: Centre '${row.Centre}' is not your allotted centre. You cannot upload other centres' data.`);
                                continue;
                            }
                        } else {
                            errors.push(`Row ${rowNum}: Centre '${row.Centre}' not found in system`);
                            continue;
                        }
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

                await uploadLeads(validLeads);

            } catch (error) {
                console.error("Error processing file:", error);
                setErrorMsg("Failed to read file");
                setValidating(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const uploadLeads = async (leads) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            let successCount = 0;
            const failures = [];

            for (const lead of leads) {
                try {
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/create`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(lead),
                    });
                    if (response.ok) successCount++;
                    else failures.push(lead.name);
                } catch (err) {
                    failures.push(lead.name);
                }
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

                <div className={`p-8 space-y-8 ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`}>
                    <div className="flex justify-center">
                        <button
                            onClick={downloadTemplate}
                            className={`flex items-center gap-3 px-6 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border group ${isDarkMode ? 'bg-cyan-500/5 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/10' : 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'}`}
                        >
                            <FaDownload className="group-hover:translate-y-0.5 transition-transform" />
                            Download Template
                        </button>
                    </div>

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

                    {errorMsg && (
                        <div className={`p-4 rounded-[4px] border border-dashed flex items-start gap-4 transition-all ${isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                            <FaExclamationTriangle className="mt-1 flex-shrink-0" />
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest">Import Error</p>
                                <p className="text-[11px] font-medium whitespace-pre-wrap leading-relaxed">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    <div className={`flex justify-end gap-4 pt-4 border-t transition-all ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <button
                            onClick={onClose}
                            className={`px-8 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={processFile}
                            disabled={loading || validating || !file}
                            className={`px-10 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg flex items-center justify-center gap-3 ${isDarkMode ? 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-500/20 disabled:opacity-30' : 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-cyan-500/30 disabled:opacity-30'}`}
                        >
                            {loading ? <FaSync className="animate-spin" /> : validating ? <FaSync className="animate-spin" /> : <><FaUpload size={14} /> Start Import</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkLeadModal;
