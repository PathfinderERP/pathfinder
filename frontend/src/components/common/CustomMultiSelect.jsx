import React from 'react';
import Select from 'react-select';

import { useTheme } from '../../context/ThemeContext';

const CustomMultiSelect = ({ options, value, onChange, placeholder, isDisabled, theme: propTheme }) => {
    // Try to get theme from context, but don't crash if context is missing
    let contextTheme = 'light';
    try {
        const context = useTheme();
        if (context) contextTheme = context.theme;
    } catch (e) {
        // Context not found, default to light
    }

    // Use prop theme if provided, otherwise context theme
    const activeTheme = propTheme || contextTheme;
    
    // Memoize styles to prevent unnecessary re-renders but update on theme change
    const styles = React.useMemo(() => {
        const isDark = activeTheme === 'dark';
        return {
            control: (provided, state) => ({
                ...provided,
                backgroundColor: isDark ? '#131619' : '#ffffff',
                borderColor: state.isFocused ? '#06b6d4' : (isDark ? '#374151' : '#e5e7eb'),
                color: isDark ? 'white' : '#111827',
                boxShadow: state.isFocused ? '0 0 0 1px #06b6d4' : 'none',
                '&:hover': {
                    borderColor: '#06b6d4'
                },
                minHeight: '38px',
                fontSize: '0.875rem',
                borderRadius: '0.5rem'
            }),
            menu: (provided) => ({
                ...provided,
                backgroundColor: isDark ? '#1a1f24' : '#ffffff',
                border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
                zIndex: 50,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }),
            option: (provided, state) => ({
                ...provided,
                backgroundColor: state.isSelected 
                    ? '#06b6d4' 
                    : state.isFocused 
                        ? (isDark ? '#374151' : '#f3f4f6') 
                        : 'transparent',
                color: state.isSelected 
                    ? 'black' 
                    : (isDark ? 'white' : '#111827'),
                cursor: 'pointer',
                fontSize: '0.875rem',
                ':active': {
                    backgroundColor: '#06b6d4',
                    color: 'black'
                }
            }),
            singleValue: (provided) => ({
                ...provided,
                color: isDark ? 'white' : '#111827'
            }),
            multiValue: (provided) => ({
                ...provided,
                backgroundColor: isDark ? 'rgba(6, 182, 212, 0.2)' : '#e0f2fe',
                borderRadius: '0.25rem',
            }),
            multiValueLabel: (provided) => ({
                ...provided,
                color: isDark ? '#22d3ee' : '#0891b2',
            }),
            multiValueRemove: (provided) => ({
                ...provided,
                color: isDark ? '#22d3ee' : '#0891b2',
                ':hover': {
                    backgroundColor: '#06b6d4',
                    color: 'black',
                },
            }),
            input: (provided) => ({
                ...provided,
                color: isDark ? 'white' : '#111827'
            }),
            placeholder: (provided) => ({
                ...provided,
                color: '#9ca3af'
            })
        };
    }, [activeTheme]);

    return (
        <Select
            isMulti
            options={options}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            styles={styles}
            isDisabled={isDisabled}
            classNamePrefix="react-select"
            theme={(themeConfig) => ({
                ...themeConfig,
                colors: {
                    ...themeConfig.colors,
                    primary: '#06b6d4',
                },
            })}
        />
    );
};

export default CustomMultiSelect;
