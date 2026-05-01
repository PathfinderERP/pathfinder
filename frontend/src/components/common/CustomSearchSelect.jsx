import React from 'react';
import Select from 'react-select';

const CustomSearchSelect = ({ options, value, onChange, placeholder, isDisabled, isDarkMode, className }) => {
    // Memoize styles to prevent unnecessary re-renders but update on theme change
    const styles = React.useMemo(() => {
        const isDark = isDarkMode;
        return {
            control: (provided, state) => ({
                ...provided,
                backgroundColor: isDark ? '#131619' : '#ffffff',
                borderColor: state.isFocused ? '#06b6d4' : (isDark ? '#374151' : '#d1d5db'),
                color: isDark ? 'white' : '#111827',
                boxShadow: state.isFocused ? '0 0 0 1px #06b6d4' : 'none',
                '&:hover': {
                    borderColor: '#06b6d4'
                },
                minHeight: '38px',
                fontSize: '10px',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
            }),
            menu: (provided) => ({
                ...provided,
                backgroundColor: isDark ? '#1a1f24' : '#ffffff',
                border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
                zIndex: 9999,
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }),
            menuPortal: base => ({ ...base, zIndex: 9999 }),
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
                fontSize: '10px',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                ':active': {
                    backgroundColor: '#06b6d4',
                    color: 'black'
                }
            }),
            singleValue: (provided) => ({
                ...provided,
                color: isDark ? 'white' : '#111827'
            }),
            input: (provided) => ({
                ...provided,
                color: isDark ? 'white' : '#111827'
            }),
            placeholder: (provided) => ({
                ...provided,
                color: isDark ? '#4b5563' : '#9ca3af'
            })
        };
    }, [isDarkMode]);

    return (
        <Select
            options={options}
            value={options.find(opt => opt.value === value) || null}
            onChange={(selected) => onChange(selected ? selected.value : "")}
            placeholder={placeholder}
            styles={styles}
            isDisabled={isDisabled}
            classNamePrefix="react-select"
            menuPortalTarget={document.body}
            className={className}
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

export default CustomSearchSelect;
