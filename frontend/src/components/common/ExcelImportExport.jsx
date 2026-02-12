import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { FaDownload, FaUpload, FaFileExcel, FaTimes, FaCheck } from 'react-icons/fa';
import { toast } from 'react-toastify';

const ExcelImportExport = ({
    data,
    columns,
    onImport,
    onExport,
    fileName = "export_data",
    templateHeaders = [],
    mapping = null, // Format: { excelHeader: schemaField }
    prepareExportData = null, // Function to format data before export
    isDarkMode = true
}) => {
    const [previewData, setPreviewData] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);

    // Export to Excel
    const handleExport = async () => {
        try {
            let dataToExport = data;

            if (onExport) {
                toast.info("Preparing data for export...");
                dataToExport = await onExport();
            }

            if (!dataToExport || dataToExport.length === 0) {
                toast.warn("No data available to export");
                return;
            }

            const finalDataForExcel = prepareExportData ? prepareExportData(dataToExport) : dataToExport;

            // Transform data to match column display names
            const exportData = finalDataForExcel.map(item => {
                const row = {};
                columns.forEach(col => {
                    row[col.header] = item[col.key] || '';
                });
                return row;
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Data exported successfully");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export data");
        }
    };

    // Download Template
    const handleDownloadTemplate = () => {
        try {
            const headers = templateHeaders.length > 0 ? templateHeaders : columns.map(c => c.header);
            const ws = XLSX.utils.aoa_to_sheet([headers]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Template");
            XLSX.writeFile(wb, `${fileName}_template.xlsx`);
        } catch (error) {
            console.error("Template Download Error:", error);
            toast.error("Failed to download template");
        }
    };

    // Handle File Upload & Preview
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const jsonData = XLSX.utils.sheet_to_json(ws);

                if (jsonData.length === 0) {
                    toast.error("The Excel file is empty");
                    return;
                }

                setPreviewData(jsonData);
                setShowPreview(true);
            } catch (error) {
                console.error("Excel Read Error:", error);
                toast.error("Error reading Excel file");
            }
        };
        reader.readAsBinaryString(file);
    };

    // Confirm Import
    const handleConfirmImport = async () => {
        try {
            setIsImporting(true);

            // Transform preview data back to schema format if mapping is provided
            const finalData = mapping ? previewData.map(row => {
                const mappedRow = {};
                Object.keys(row).forEach(header => {
                    const schemaKey = mapping[header] || header;
                    mappedRow[schemaKey] = row[header];
                });
                return mappedRow;
            }) : previewData;

            await onImport(finalData);

            setShowPreview(false);
            setPreviewData(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            toast.success("Import successful");
        } catch (error) {
            console.error("Import error:", error);
            toast.error(error.message || "Failed to import data");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="flex flex-wrap gap-2 items-center">
            {/* Action Buttons */}
            <button
                onClick={handleExport}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${isDarkMode ? 'bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30' : 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 shadow-sm'}`}
                title="Export current data to Excel"
            >
                <FaDownload /> Export
            </button>

            <button
                onClick={() => fileInputRef.current.click()}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${isDarkMode ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30' : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 shadow-sm'}`}
                title="Import data from Excel"
            >
                <FaUpload /> Import
            </button>

            <button
                onClick={handleDownloadTemplate}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${isDarkMode ? 'bg-gray-600/20 text-gray-400 border border-gray-500/30 hover:bg-gray-600/30' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 shadow-sm'}`}
                title="Download Excel template"
            >
                <FaFileExcel /> Template
            </button>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".xlsx, .xls"
            />

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} rounded-xl border w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden`}>
                        {/* Modal Header */}
                        <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'bg-[#1f2529] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <div>
                                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    <FaFileExcel className="text-green-500" />
                                    Import Preview
                                </h3>
                                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Review the data before final submission ({previewData.length} records found)</p>
                            </div>
                            <button
                                onClick={() => setShowPreview(false)}
                                className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-red-500/10 hover:text-red-500 text-gray-400' : 'hover:bg-red-50 hover:text-red-600 text-gray-500'}`}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Modal Body - Scrollable Table */}
                        <div className="flex-1 overflow-auto p-0">
                            <table className="w-full text-left border-collapse min-w-max">
                                <thead className={`sticky top-0 z-10 shadow-sm ${isDarkMode ? 'bg-[#252b32]' : 'bg-gray-100'}`}>
                                    <tr>
                                        {Object.keys(previewData[0] || {}).map((header, idx) => (
                                            <th key={idx} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b ${isDarkMode ? 'text-gray-400 border-gray-800' : 'text-gray-600 border-gray-200'}`}>
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                    {previewData.slice(0, 100).map((row, idx) => (
                                        <tr key={idx} className={`${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                                            {Object.values(row).map((val, vIdx) => (
                                                <td key={vIdx} className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {val?.toString() || '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {previewData.length > 100 && (
                                <div className={`p-4 text-center text-xs italic ${isDarkMode ? 'bg-gray-900/50 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
                                    Showing first 100 records for preview...
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className={`p-6 border-t flex justify-end gap-3 ${isDarkMode ? 'bg-[#1f2529] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <button
                                onClick={() => setShowPreview(false)}
                                className={`px-6 py-2 rounded-lg transition-colors text-sm font-semibold ${isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmImport}
                                disabled={isImporting}
                                className="flex items-center gap-2 px-6 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50"
                            >
                                {isImporting ? "Importing..." : <><FaCheck /> Confirm Import</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExcelImportExport;
