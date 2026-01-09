import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaCheck, FaTimes } from 'react-icons/fa';

const MultiSelectFilter = ({ options, selectedValues, onChange, placeholder, label }) => {
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
                className="bg-[#131619] text-gray-300 px-4 py-2 rounded-lg border border-gray-700 cursor-pointer flex items-center justify-between gap-2 min-w-[200px]"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="whitespace-nowrap font-medium text-gray-400 text-xs uppercase tracking-wider">{label}:</span>
                    <span className="truncate">
                        {selectedValues.length === 0
                            ? placeholder
                            : `${selectedValues.length} selected`}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {selectedValues.length > 0 && (
                        <span
                            onClick={clearFilters}
                            className="text-gray-500 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                        >
                            <FaTimes size={12} />
                        </span>
                    )}
                    <FaChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[240px] bg-[#1a1f24] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[400px]">
                    <div className="p-2 border-b border-gray-700 bg-[#131619]">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-[#1a1f24] text-white px-3 py-1.5 rounded border border-gray-700 text-sm focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => {
                                const isSelected = selectedValues.includes(option.value);
                                return (
                                    <div
                                        key={option.value}
                                        onClick={() => toggleOption(option.value)}
                                        className={`px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-800 transition-colors ${isSelected ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-300'}`}
                                    >
                                        <span className="text-sm">{option.label}</span>
                                        {isSelected && <FaCheck size={12} className="text-cyan-400" />}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-4 py-4 text-gray-500 text-center text-sm">No options found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectFilter;
