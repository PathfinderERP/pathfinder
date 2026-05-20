import React, { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Pagination = ({ 
    currentPage, 
    totalItems, 
    itemsPerPage, 
    onPageChange, 
    theme = 'dark', 
    itemsPerPageOptions = [10, 20, 50, 100], 
    onItemsPerPageChange 
}) => {
    const safeTotal = Number(totalItems) || 0;
    const safePerPage = Number(itemsPerPage) || 10;
    const totalPages = safeTotal > 0 ? Math.ceil(safeTotal / safePerPage) : 0;
    const [pageInput, setPageInput] = useState('');

    if (safeTotal <= 0) return null;

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
        <div className={`flex items-center justify-between border-t px-4 py-3 sm:px-6 mt-4 ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
            {totalPages > 1 && (
                <div className="flex flex-1 justify-between sm:hidden">
                    <button
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                            currentPage === 1 
                                ? 'text-gray-500 cursor-not-allowed ' + (theme === 'dark' ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50')
                                : (theme === 'dark' ? 'border-gray-700 bg-[#1a1f24] text-gray-300 hover:bg-gray-800' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50')
                        }`}
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className={`relative ml-3 inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                            currentPage === totalPages 
                                ? 'text-gray-500 cursor-not-allowed ' + (theme === 'dark' ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50')
                                : (theme === 'dark' ? 'border-gray-700 bg-[#1a1f24] text-gray-300 hover:bg-gray-800' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50')
                        }`}
                    >
                        Next
                    </button>
                </div>
            )}
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Showing <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{Math.min((currentPage - 1) * safePerPage + 1, safeTotal)}</span> to <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{Math.min(currentPage * safePerPage, safeTotal)}</span> of <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{safeTotal}</span> results
                    </p>
                    {onItemsPerPageChange && (
                        <div className="flex items-center gap-1.5 text-sm ml-4">
                            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Show:</span>
                            <select
                                value={safePerPage}
                                onChange={(e) => {
                                    onItemsPerPageChange(Number(e.target.value));
                                    onPageChange(1);
                                }}
                                className={`px-2 py-0.5 text-xs rounded border focus:outline-none focus:border-cyan-500 font-bold cursor-pointer transition-colors ${
                                    theme === 'dark'
                                        ? 'bg-[#131619] text-white border-gray-700'
                                        : 'bg-white text-gray-900 border-gray-300 shadow-sm'
                                }`}
                            >
                                {itemsPerPageOptions.map(opt => (
                                    <option key={opt} value={opt} className={theme === 'dark' ? 'bg-[#131619] text-white' : 'bg-white text-gray-900'}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center gap-4">
                        {/* Go to Page Input */}
                        <form onSubmit={handleGoToPage} className="flex items-center gap-2">
                            <label htmlFor="pageInput" className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Go to page:</label>
                            <input
                                id="pageInput"
                                type="number"
                                min="1"
                                max={totalPages}
                                value={pageInput}
                                onChange={(e) => setPageInput(e.target.value)}
                                placeholder={`1-${totalPages}`}
                                className={`w-20 px-2 py-1 text-sm rounded focus:outline-none focus:border-cyan-500 transition-colors ${
                                    theme === 'dark'
                                        ? 'bg-[#131619] text-white border-gray-700'
                                        : 'bg-white text-gray-900 border-gray-300 shadow-sm'
                                }`}
                            />
                            <button
                                type="submit"
                                className="px-3 py-1 text-sm bg-cyan-500 text-black font-semibold rounded hover:bg-cyan-400 transition-colors"
                            >
                                Go
                            </button>
                        </form>

                        {/* Page Number Buttons */}
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            <button
                                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset hover:bg-gray-800 focus:z-20 focus:outline-offset-0 ${
                                    theme === 'dark' ? 'ring-gray-700' : 'ring-gray-300 hover:bg-gray-100'
                                } ${currentPage === 1 ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                                <span className="sr-only">Previous</span>
                                <FaChevronLeft className="h-5 w-5" aria-hidden="true" />
                            </button>

                            {getPageNumbers().map((page, index) => (
                                <button
                                    key={index}
                                    onClick={() => typeof page === 'number' ? onPageChange(page) : null}
                                    disabled={page === '...'}
                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset focus:z-20 focus:outline-offset-0 ${
                                        theme === 'dark' ? 'ring-gray-700' : 'ring-gray-300'
                                    } ${page === currentPage
                                        ? 'z-10 bg-cyan-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600'
                                        : page === '...'
                                            ? 'text-gray-400 cursor-default'
                                            : (theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100 bg-white')
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset hover:bg-gray-800 focus:z-20 focus:outline-offset-0 ${
                                    theme === 'dark' ? 'ring-gray-700' : 'ring-gray-300 hover:bg-gray-100'
                                } ${currentPage === totalPages ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                                <span className="sr-only">Next</span>
                                <FaChevronRight className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </nav>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Pagination;
