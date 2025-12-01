import React, { useState } from 'react';
import { FaDownload, FaFileCsv, FaFileExcel } from 'react-icons/fa';

const ExportButton = ({ onExportCSV, onExportExcel }) => {
    const [showMenu, setShowMenu] = useState(false);

    const handleExport = (type) => {
        if (type === 'csv') {
            onExportCSV();
        } else if (type === 'excel') {
            onExportExcel();
        }
        setShowMenu(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-[#131619] text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
            >
                <FaDownload /> Export
            </button>

            {showMenu && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-[#1a1f24] border border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                        <button
                            onClick={() => handleExport('csv')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:bg-gray-800 transition-colors"
                        >
                            <FaFileCsv className="text-green-400" size={18} />
                            <div>
                                <div className="font-medium text-white">Export as CSV</div>
                                <div className="text-xs text-gray-500">Comma-separated values</div>
                            </div>
                        </button>

                        <div className="border-t border-gray-700" />

                        <button
                            onClick={() => handleExport('excel')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:bg-gray-800 transition-colors"
                        >
                            <FaFileExcel className="text-emerald-400" size={18} />
                            <div>
                                <div className="font-medium text-white">Export as Excel</div>
                                <div className="text-xs text-gray-500">Microsoft Excel format</div>
                            </div>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ExportButton;
