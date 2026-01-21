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
    prepareExportData = null // Function to format data before export
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
                className="flex items-center gap-2 px-3 py-2 bg-green-600/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-600/30 transition-all text-sm font-medium"
                title="Export current data to Excel"
            >
                <FaDownload /> Export
            </button>

            <button
                onClick={() => fileInputRef.current.click()}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all text-sm font-medium"
                title="Import data from Excel"
            >
                <FaUpload /> Import
            </button>

            <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-3 py-2 bg-gray-600/20 text-gray-400 border border-gray-500/30 rounded-lg hover:bg-gray-600/30 transition-all text-sm font-medium"
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
                    <div className="bg-[#1a1f24] rounded-xl border border-gray-800 w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-[#1f2529]">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <FaFileExcel className="text-green-500" />
                                    Import Preview
                                </h3>
                                <p className="text-gray-400 text-sm mt-1">Review the data before final submission ({previewData.length} records found)</p>
                            </div>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-2 hover:bg-red-500/10 hover:text-red-500 text-gray-400 rounded-lg transition-all"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Modal Body - Scrollable Table */}
                        <div className="flex-1 overflow-auto p-0">
                            <table className="w-full text-left border-collapse min-w-max">
                                <thead className="sticky top-0 bg-[#252b32] z-10 shadow-sm">
                                    <tr>
                                        {Object.keys(previewData[0] || {}).map((header, idx) => (
                                            <th key={idx} className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-800">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50">
                                    {previewData.slice(0, 100).map((row, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                            {Object.values(row).map((val, vIdx) => (
                                                <td key={vIdx} className="px-4 py-3 text-sm text-gray-300">
                                                    {val?.toString() || '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {previewData.length > 100 && (
                                <div className="p-4 bg-gray-900/50 text-center text-xs text-gray-500 italic">
                                    Showing first 100 records for preview...
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-[#1f2529]">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-semibold"
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
