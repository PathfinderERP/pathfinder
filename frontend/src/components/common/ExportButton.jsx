import React, { useState } from 'react';
import { FaDownload, FaFileCsv, FaFileExcel } from 'react-icons/fa';

const ExportButton = ({ onExportCSV, onExportExcel, theme = 'dark' }) => {
    const isDark = theme === 'dark';
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
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${isDark ? 'bg-[#131619] text-gray-300 border-gray-700 hover:bg-gray-800' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
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
                    <div className={`absolute right-0 mt-2 w-48 border rounded-lg shadow-lg z-20 overflow-hidden ${isDark ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                        <button
                            onClick={() => handleExport('csv')}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                            <FaFileCsv className="text-green-400" size={18} />
                            <div>
                                <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Export as CSV</div>
                                <div className="text-xs text-gray-500">Comma-separated values</div>
                            </div>
                        </button>

                        <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`} />

                        <button
                            onClick={() => handleExport('excel')}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                            <FaFileExcel className="text-emerald-400" size={18} />
                            <div>
                                <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Export as Excel</div>
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
