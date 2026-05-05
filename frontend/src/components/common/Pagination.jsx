import React, { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';

const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const safeTotal = Number(totalItems) || 0;
    const safePerPage = Number(itemsPerPage) || 10;
    const totalPages = safeTotal > 0 ? Math.ceil(safeTotal / safePerPage) : 0;
    const [pageInput, setPageInput] = useState('');

    if (totalPages <= 1) return null;

    const handleGoToPage = (e) => {
        e.preventDefault();
        const pageNum = parseInt(pageInput);
        if (pageNum >= 1 && pageNum <= totalPages) {
            onPageChange(pageNum);
            setPageInput('');
        } else {
            alert(`Please enter a page number between 1 and ${totalPages}`);
        }
    };

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }

            // Show pages around current page
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            // Adjust if at the start
            if (currentPage <= 3) {
                end = 4;
            }

            // Adjust if at the end
            if (currentPage >= totalPages - 2) {
                start = totalPages - 3;
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            // Always show last page
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className={`flex items-center justify-between border-t px-4 py-3 sm:px-6 mt-4 transition-colors duration-300 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex flex-1 justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-all ${currentPage === 1 
                        ? 'text-gray-500 cursor-not-allowed' 
                        : (isDarkMode ? 'border-gray-700 bg-white/5 text-gray-300 hover:bg-white/10' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50')}`}
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`relative ml-3 inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-all ${currentPage === totalPages 
                        ? 'text-gray-500 cursor-not-allowed' 
                        : (isDarkMode ? 'border-gray-700 bg-white/5 text-gray-300 hover:bg-white/10' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50')}`}
                >
                    Next
                </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Showing <span className={`font-black ${isDarkMode ? 'text-white' : 'text-cyan-600'}`}>{Math.min((currentPage - 1) * safePerPage + 1, safeTotal)}</span> to <span className={`font-black ${isDarkMode ? 'text-white' : 'text-cyan-600'}`}>{Math.min(currentPage * safePerPage, safeTotal)}</span> of <span className={`font-black ${isDarkMode ? 'text-white' : 'text-cyan-600'}`}>{safeTotal}</span> results
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Go to Page Input */}
                    <form onSubmit={handleGoToPage} className="flex items-center gap-2">
                        <label htmlFor="pageInput" className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Go to page:</label>
                        <input
                            id="pageInput"
                            type="number"
                            min="1"
                            max={totalPages}
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            placeholder={`${currentPage}`}
                            className={`w-16 px-3 py-1 text-xs font-black rounded-lg border outline-none focus:border-cyan-500 transition-all ${isDarkMode ? 'bg-white/5 text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-200'}`}
                        />
                        <button
                            type="submit"
                            className="px-4 py-1 text-[10px] bg-cyan-500 text-black font-black uppercase tracking-widest rounded-lg hover:bg-cyan-400 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-500/20"
                        >
                            Go
                        </button>
                    </form>

                    {/* Page Number Buttons */}
                    <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xl overflow-hidden" aria-label="Pagination">
                        <button
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className={`relative inline-flex items-center px-3 py-2 border transition-all ${isDarkMode ? 'border-gray-700 text-gray-500 hover:bg-white/10' : 'border-gray-200 text-gray-400 hover:bg-gray-50'} ${currentPage === 1 ? 'cursor-not-allowed opacity-50' : 'hover:text-cyan-500'}`}
                        >
                            <span className="sr-only">Previous</span>
                            <FaChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </button>

                        {getPageNumbers().map((page, index) => (
                            <button
                                key={index}
                                onClick={() => typeof page === 'number' ? onPageChange(page) : null}
                                disabled={page === '...'}
                                className={`relative inline-flex items-center px-4 py-2 text-xs font-black uppercase transition-all border ${page === currentPage
                                    ? 'z-10 bg-cyan-500 text-black border-cyan-500 shadow-lg shadow-cyan-500/20'
                                    : page === '...'
                                        ? (isDarkMode ? 'text-gray-600 border-gray-700' : 'text-gray-300 border-gray-200') + ' cursor-default'
                                        : (isDarkMode ? 'text-gray-400 border-gray-700 hover:bg-white/5' : 'text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-cyan-600')
                                    }`}
                            >
                                {page}
                            </button>
                        ))}

                        <button
                            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className={`relative inline-flex items-center px-3 py-2 border transition-all ${isDarkMode ? 'border-gray-700 text-gray-500 hover:bg-white/10' : 'border-gray-200 text-gray-400 hover:bg-gray-50'} ${currentPage === totalPages ? 'cursor-not-allowed opacity-50' : 'hover:text-cyan-500'}`}
                        >
                            <span className="sr-only">Next</span>
                            <FaChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
