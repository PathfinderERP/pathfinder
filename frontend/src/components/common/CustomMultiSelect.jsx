import React from 'react';
import Select, { components } from 'react-select';
import { useTheme } from '../../context/ThemeContext';

const ValueContainer = ({ children, getValue, hasValue, isMulti, selectProps, ...props }) => {
    if (!isMulti || !hasValue) {
        return <components.ValueContainer selectProps={selectProps} {...props}>{children}</components.ValueContainer>;
    }

    const selected = getValue() || [];
    const options = selectProps.options || [];

    const isDark = selectProps.activeTheme === 'dark';
    const childrenArray = React.Children.toArray(children);
    const input = childrenArray[childrenArray.length - 1];

    // Check if 'all' option is among selected items
    const hasAllOption = selected.some(s => s && s.value === 'all');
    if (hasAllOption) {
        let labelText = 'All Selected';
        if (selectProps.placeholder && selectProps.placeholder !== 'Select...') {
            const rawPl = selectProps.placeholder;
            labelText = rawPl.toLowerCase().startsWith('all') ? rawPl : `All ${rawPl}`;
        }

        return (
            <components.ValueContainer selectProps={selectProps} {...props}>
                <span className={`px-2 py-0.5 text-xs font-bold rounded flex items-center gap-1 my-0.5 ${
                    isDark 
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                        : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                }`}>
                    {labelText}
                </span>
                {input}
            </components.ValueContainer>
        );
    }

    const totalOptions = options.filter(o => o.value !== 'all').length;
    const maxShow = selectProps.maxShowTags !== undefined ? selectProps.maxShowTags : 2;

    // 1. If ALL options are selected
    if (totalOptions > 0 && selected.length >= totalOptions) {
        let labelText = 'All Selected';
        if (selectProps.placeholder && selectProps.placeholder !== 'Select...') {
            const rawPl = selectProps.placeholder;
            labelText = rawPl.toLowerCase().startsWith('all') ? rawPl : `All ${rawPl}`;
        }

        return (
            <components.ValueContainer selectProps={selectProps} {...props}>
                <span className={`px-2 py-0.5 text-xs font-bold rounded flex items-center gap-1 my-0.5 ${
                    isDark 
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                        : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                }`}>
                    {labelText} ({selected.length})
                </span>
                {input}
            </components.ValueContainer>
        );
    }

    // 2. If selected count exceeds maxShow, collapse into summary tag
    if (selected.length > maxShow) {
        let categoryLabel = 'Selected';
        if (selectProps.placeholder && selectProps.placeholder !== 'Select...') {
            const cleanPl = selectProps.placeholder.replace(/^All\s+/i, '');
            categoryLabel = cleanPl ? `${cleanPl} Selected` : 'Selected';
        }

        return (
            <components.ValueContainer selectProps={selectProps} {...props}>
                <span className={`px-2 py-0.5 text-xs font-bold rounded flex items-center gap-1 my-0.5 ${
                    isDark 
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                        : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                }`}>
                    {selected.length} {categoryLabel}
                </span>
                {input}
            </components.ValueContainer>
        );
    }

    return <components.ValueContainer selectProps={selectProps} {...props}>{children}</components.ValueContainer>;
};

const CustomMultiSelect = ({ options, value, onChange, placeholder, isDisabled, isMulti = true, theme: propTheme, isDarkMode, maxShowTags, components: customComponents, ...rest }) => {
    let contextTheme = 'light';
    try {
        const context = useTheme();
        if (context) contextTheme = context.theme;
    } catch (e) {
        // Context not found, default to light
    }

    const activeTheme = propTheme || (isDarkMode !== undefined ? (isDarkMode ? 'dark' : 'light') : contextTheme);

    const styles = React.useMemo(() => {
        const isDark = activeTheme === 'dark';
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
                fontSize: '0.875rem',
                borderRadius: '0.5rem'
            }),
            menu: (provided) => ({
                ...provided,
                backgroundColor: isDark ? '#1a1f24' : '#ffffff',
                border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
                zIndex: 9999,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
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
                backgroundColor: isDark ? 'rgba(6, 182, 212, 0.2)' : '#dcfafe',
                borderRadius: '0.25rem',
                border: isDark ? 'none' : '1px solid #06b6d4'
            }),
            multiValueLabel: (provided) => ({
                ...provided,
                color: isDark ? '#22d3ee' : '#0891b2',
                fontWeight: '600'
            }),
            multiValueRemove: (provided) => ({
                ...provided,
                color: isDark ? '#22d3ee' : '#0891b2',
                ':hover': {
                    backgroundColor: '#06b6d4',
                    color: isDark ? 'black' : 'white',
                },
            }),
            input: (provided) => ({
                ...provided,
                color: isDark ? 'white' : '#111827'
            }),
            placeholder: (provided) => ({
                ...provided,
                color: isDark ? '#9ca3af' : '#6b7280'
            })
        };
    }, [activeTheme]);

    return (
        <Select
            isMulti={isMulti}
            options={options}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            styles={styles}
            isDisabled={isDisabled}
            classNamePrefix="react-select"
            menuPortalTarget={document.body}
            activeTheme={activeTheme}
            maxShowTags={maxShowTags}
            components={{ ValueContainer, ...customComponents }}
            theme={(themeConfig) => ({
                ...themeConfig,
                colors: {
                    ...themeConfig.colors,
                    primary: '#06b6d4',
                },
            })}
            {...rest}
        />
    );
};

export default CustomMultiSelect;
