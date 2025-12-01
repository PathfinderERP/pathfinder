import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaCheck, FaTimes } from 'react-icons/fa';

const MultiSelectFilter = ({ options, selectedValues, onChange, placeholder, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
                <div className="absolute top-full left-0 mt-2 w-full min-w-[240px] bg-[#1a1f24] border border-gray-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                    {options.map((option) => {
                        const isSelected = selectedValues.includes(option.value);
                        return (
                            <div
                                key={option.value}
                                onClick={() => toggleOption(option.value)}
                                className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-800 transition-colors ${isSelected ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-300'}`}
                            >
                                <span>{option.label}</span>
                                {isSelected && <FaCheck size={12} className="text-cyan-400" />}
                            </div>
                        );
                    })}
                    {options.length === 0 && (
                        <div className="px-4 py-3 text-gray-500 text-center text-sm">No options available</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MultiSelectFilter;
