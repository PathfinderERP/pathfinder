import React, { useState, useEffect } from "react";
import { FaTimes, FaUpload, FaDownload, FaFileExcel } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const BulkLeadModal = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [file, setFile] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");

    // Dropdown/Validation Data
    const [classes, setClasses] = useState([]);
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
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

            const [classRes, centreRes, courseRes, sourceRes, userRes] = await Promise.all([
                fetch(`${baseUrl}/class`, { headers }),
                fetch(`${baseUrl}/centre`, { headers }),
                fetch(`${baseUrl}/course`, { headers }),
                fetch(`${baseUrl}/source`, { headers }),
                fetch(`${baseUrl}/superAdmin/getAllUsers`, { headers })
            ]);

            const classData = await classRes.json();
            const centreData = await centreRes.json();
            const courseData = await courseRes.json();
            const sourceData = await sourceRes.json();
            const userData = await userRes.json();

            setClasses(Array.isArray(classData) ? classData : []);
            setCentres(Array.isArray(centreData) ? centreData : []);
            setCourses(Array.isArray(courseData) ? courseData : []);
            setSources(sourceData.sources || []);

            if (userRes.ok && userData.users) {
                setTelecallers(userData.users.filter(u => u.role === "telecaller"));
            }
        } catch (error) {
            console.error("Error fetching validation data:", error);
            toast.error("Failed to load validation data");
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setErrorMsg("");
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
    };

    const processFile = async () => {
        if (!file) {
            toast.error("Please select a file first");
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
                    setErrorMsg("Excel file is empty");
                    setValidating(false);
                    return;
                }

                const validLeads = [];
                const errors = [];

                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const rowNum = i + 2; // Excel row number (1-based, plus header)

                    // Required Fields Check
                    if (!row.Name || !row.Email || !row.SchoolName) {
                        errors.push(`Row ${rowNum}: Name, Email, and SchoolName are required`);
                        continue;
                    }

                    // Validate Telecaller (Case Insensitive)
                    if (row.LeadResponsibility) {
                        const telecallerExists = telecallers.some(
                            t => t.name.toLowerCase() === row.LeadResponsibility.toLowerCase()
                        );
                        if (!telecallerExists) {
                            errors.push(`Row ${rowNum}: Telecaller '${row.LeadResponsibility}' not found in system`);
                            continue;
                        }
                    }

                    // Map Names to IDs
                    // Class
                    let classId = null;
                    if (row.Class) {
                        const cls = classes.find(c => c.name.toLowerCase() === row.Class.toString().toLowerCase());
                        if (cls) classId = cls._id;
                        // Optional: Error if class not found? User didn't specify strictness for other fields, but good for data integrity.
                        // User emphasized Telecaller check. I'll stick to Telecaller strictness for now, but map others.
                    }

                    // Centre
                    let centreId = null;
                    if (row.Centre) {
                        const ctr = centres.find(c => c.centreName.toLowerCase() === row.Centre.toLowerCase());
                        if (ctr) centreId = ctr._id;
                    }

                    // Course
                    let courseId = null;
                    if (row.Course) {
                        const crs = courses.find(c => c.courseName.toLowerCase() === row.Course.toLowerCase());
                        if (crs) courseId = crs._id;
                    }

                    // Source (String matching)
                    // If source in DB, fine. If not, we can still save the string as per schema.

                    validLeads.push({
                        name: row.Name,
                        email: row.Email,
                        phoneNumber: row.PhoneNumber,
                        schoolName: row.SchoolName,
                        className: classId,
                        centre: centreId,
                        course: courseId,
                        source: row.Source, // Just string match or keep as is
                        targetExam: row.TargetExam,
                        leadType: row.LeadType ? row.LeadType.toUpperCase() : "COLD LEAD", // Default or normalize
                        leadResponsibility: row.LeadResponsibility // Backend stores string
                    });
                }

                if (errors.length > 0) {
                    setErrorMsg(`Validation Failed:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more` : ''}`);
                    setValidating(false);
                    toast.error("Validation failed. Please check errors.");
                    return;
                }

                // If all good, submit to backend
                await uploadLeads(validLeads);

            } catch (error) {
                console.error("Error processing file:", error);
                setErrorMsg("Failed to process Excel file");
                setValidating(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const uploadLeads = async (leads) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            // We'll send one by one or create a bulk endpoint. 
            // Since we don't have a bulk endpoint, we can use Promise.all.
            // For 100s of leads, Promise.all might be too much. Let's do batches.
            // But for now, let's assume reasonable size or use a simple loop.
            // Actually, adding a bulk-create endpoint is better. But I'll loop for now to avoid changing backend too much.

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
                toast.warning(`Imported ${successCount} leads. Failed: ${failures.length}`);
            }

        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Error uploading leads");
        } finally {
            setLoading(false);
            setValidating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f24] rounded-xl w-full max-w-lg border border-gray-700">
                <div className="flex justify-between items-center p-6 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">Import Leads</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex justify-center">
                        <button
                            onClick={downloadTemplate}
                            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 border border-cyan-400 rounded-lg px-4 py-2 hover:bg-cyan-400/10 transition-colors"
                        >
                            <FaDownload /> Download Template
                        </button>
                    </div>

                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                            <FaFileExcel className="text-4xl text-green-500" />
                            <span className="text-gray-300 font-medium">
                                {file ? file.name : "Click to select Excel file"}
                            </span>
                        </label>
                    </div>

                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-lg text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {errorMsg}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={processFile}
                            disabled={loading || validating || !file}
                            className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? "Uploading..." : validating ? "Validating..." : <><FaUpload /> Upload</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkLeadModal;
