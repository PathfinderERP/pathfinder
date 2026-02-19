import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaCheck, FaTimes } from 'react-icons/fa';

const MultiSelectFilter = ({ options, selectedValues, onChange, placeholder, label, theme = 'dark' }) => {
    const isDark = theme === 'dark';
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // Filter options based on search term
    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const toggleOption = (value) => {
        let newValues;
        if (selectedValues.includes(value)) {
            newValues = selectedValues.filter(v => v !== value);
        } else {
            newValues = [...selectedValues, value];
        }
        onChange(newValues);
    };

    const clearFilters = (e) => {
        e.stopPropagation();
        onChange([]);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                className={`${isDark ? 'bg-[#131619] text-gray-300 border-gray-700' : 'bg-gray-50 text-gray-700 border-gray-200'} px-4 py-2 rounded-lg border cursor-pointer flex items-center justify-between gap-2 min-w-[200px] transition-colors`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`whitespace-nowrap font-medium text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}:</span>
                    <span className="truncate">
                        {selectedValues.length === 0
                            ? placeholder
                            : selectedValues.length <= 2
                                ? selectedValues.join(', ')
                                : `${selectedValues.length} selected`}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {selectedValues.length > 0 && (
                        <span
                            onClick={clearFilters}
                            className={`${isDark ? 'text-gray-500 hover:text-white hover:bg-gray-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'} p-1 rounded-full transition-colors`}
                        >
                            <FaTimes size={12} />
                        </span>
                    )}
                    <FaChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className={`absolute top-full left-0 mt-2 w-full min-w-[240px] border rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[400px] ${isDark ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`p-2 border-b ${isDark ? 'bg-[#131619] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className={`w-full px-3 py-1.5 rounded border text-sm focus:outline-none focus:border-cyan-500 ${isDark ? 'bg-[#1a1f24] text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'}`}
                        />
                        <div className="flex items-center justify-between mt-2 px-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const allVisibleValues = filteredOptions.map(o => o.value);
                                    const newValues = Array.from(new Set([...selectedValues, ...allVisibleValues]));
                                    onChange(newValues);
                                }}
                                className="text-[10px] font-bold uppercase tracking-wider text-cyan-500 hover:text-cyan-400"
                            >
                                Select All
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (searchTerm) {
                                        const visibleValues = filteredOptions.map(o => o.value);
                                        onChange(selectedValues.filter(v => !visibleValues.includes(v)));
                                    } else {
                                        onChange([]);
                                    }
                                }}
                                className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-400"
                            >
                                {searchTerm ? 'Clear Results' : 'Clear All'}
                            </button>
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => {
                                const isSelected = selectedValues.includes(option.value);
                                return (
                                    <div
                                        key={option.value}
                                        onClick={() => toggleOption(option.value)}
                                        className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-cyan-500/10 text-cyan-400' : `${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}`}
                                    >
                                        <span className="text-sm">{option.label}</span>
                                        {isSelected && <FaCheck size={12} className="text-cyan-400" />}
                                    </div>
                                );
                            })
                        ) : (
                            <div className={`px-4 py-4 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No options found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectFilter;
