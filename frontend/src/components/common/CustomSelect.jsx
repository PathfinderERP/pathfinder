import React from 'react';
import Select from 'react-select';
import { useTheme } from '../../context/ThemeContext';

/**
 * CustomSelect - A generic searchable select component based on react-select.
 * 
 * @param {Array} options - The options to display [{ value, label }, ...]
 * @param {Object|Array} value - The current value(s)
 * @param {Function} onChange - Callback function when value changes
 * @param {String} placeholder - Placeholder text
 * @param {Boolean} isMulti - Whether multiple options can be selected
 * @param {Boolean} isDisabled - Whether the select is disabled
 * @param {String} name - Name of the field (useful for form handling)
 * @param {Boolean} required - Whether the field is required
 */
const CustomSelect = ({ 
    options, 
    value, 
    onChange, 
    placeholder = "Choose...", 
    isMulti = false, 
    isDisabled = false,
    name,
    required = false,
    className = ""
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const styles = React.useMemo(() => ({
        control: (provided, state) => ({
            ...provided,
            backgroundColor: isDark ? '#131619' : '#f9fafb',
            borderColor: state.isFocused ? '#3b82f6' : (isDark ? '#374151' : '#d1d5db'),
            color: isDark ? 'white' : '#111827',
            boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
            '&:hover': {
                borderColor: '#3b82f6'
            },
            minHeight: '42px',
            fontSize: '1rem',
            borderRadius: '0.5rem',
            transition: 'all 0.2s'
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: isDark ? '#1a1f24' : '#ffffff',
            border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
            zIndex: 50,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected 
                ? '#3b82f6' 
                : state.isFocused 
                    ? (isDark ? '#374151' : '#f3f4f6') 
                    : 'transparent',
            color: state.isSelected 
                ? 'white' 
                : (isDark ? '#e5e7eb' : '#111827'),
            cursor: 'pointer',
            fontSize: '0.875rem',
            padding: '10px 12px',
            ':active': {
                backgroundColor: '#3b82f6',
                color: 'white'
            }
        }),
        singleValue: (provided) => ({
            ...provided,
            color: isDark ? 'white' : '#111827'
        }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
            borderRadius: '0.375rem',
            border: `1px solid ${isDark ? '#1e3a8a' : '#dbeafe'}`
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: isDark ? '#93c5fd' : '#1e40af',
            fontSize: '0.75rem',
            fontWeight: '600'
        }),
        multiValueRemove: (provided) => ({
            ...provided,
            color: isDark ? '#93c5fd' : '#1e40af',
            ':hover': {
                backgroundColor: '#ef4444',
                color: 'white',
            },
        }),
        input: (provided) => ({
            ...provided,
            color: isDark ? 'white' : '#111827'
        }),
        placeholder: (provided) => ({
            ...provided,
            color: isDark ? '#6b7280' : '#9ca3af'
        }),
        dropdownIndicator: (provided) => ({
            ...provided,
            color: isDark ? '#6b7280' : '#9ca3af',
            '&:hover': {
                color: isDark ? '#9ca3af' : '#6b7280'
            }
        }),
        indicatorSeparator: () => ({
            display: 'none'
        })
    }), [isDark]);

    const handleSelectChange = (selectedOption) => {
        // Mock the event object expected by handleInputChange
        const event = {
            target: {
                name: name,
                value: isMulti 
                    ? selectedOption ? selectedOption.map(opt => opt.value) : []
                    : selectedOption ? selectedOption.value : ""
            }
        };
        onChange(event);
    };

    // Find the current option(s) based on the value passed
    const getSelectedValue = () => {
        if (!options) return null;
        if (isMulti) {
            return options.filter(opt => (value || []).includes(opt.value));
        }
        return options.find(opt => opt.value === value) || null;
    };

    return (
        <div className={`custom-select-container ${className}`}>
            <Select
                isMulti={isMulti}
                options={options}
                value={getSelectedValue()}
                onChange={handleSelectChange}
                placeholder={placeholder}
                styles={styles}
                isDisabled={isDisabled}
                classNamePrefix="react-select"
                name={name}
            />
            {required && (!value || (isMulti && value.length === 0)) && (
                <input
                    tabIndex={-1}
                    autoComplete="off"
                    style={{ opacity: 0, height: 0, width: 0, position: 'absolute' }}
                    value={value || ""}
                    required={required}
                    onChange={() => {}}
                />
            )}
        </div>
    );
};

export default CustomSelect;
