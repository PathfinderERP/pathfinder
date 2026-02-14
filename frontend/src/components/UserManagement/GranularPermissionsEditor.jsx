import React, { useState } from 'react';
import { FaChevronDown, FaChevronRight, FaCheck } from 'react-icons/fa';
import { PERMISSION_MODULES } from '../../config/permissions';
import { useTheme } from '../../context/ThemeContext';

const GranularPermissionsEditor = ({ granularPermissions = {}, onChange }) => {
    const [expandedModules, setExpandedModules] = useState({});
    const [expandedSections, setExpandedSections] = useState({});
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const toggleModule = (moduleKey) => {
        setExpandedModules(prev => ({
            ...prev,
            [moduleKey]: !prev[moduleKey]
        }));
    };

    const toggleSection = (moduleKey, sectionKey) => {
        const key = `${moduleKey}-${sectionKey}`;
        setExpandedSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleModuleToggle = (moduleKey) => {
        const newPermissions = { ...granularPermissions };

        if (newPermissions[moduleKey]) {
            delete newPermissions[moduleKey];
            setExpandedModules(prev => ({ ...prev, [moduleKey]: false }));
        } else {
            newPermissions[moduleKey] = {};
            const moduleData = PERMISSION_MODULES[moduleKey];
            if (moduleData && moduleData.sections) {
                Object.keys(moduleData.sections).forEach(sectionKey => {
                    newPermissions[moduleKey][sectionKey] = {
                        create: false,
                        edit: false,
                        delete: false
                    };
                });
            }
            setExpandedModules(prev => ({ ...prev, [moduleKey]: true }));
        }

        onChange(newPermissions);
    };

    const handleSectionToggle = (moduleKey, sectionKey) => {
        const newPermissions = { ...granularPermissions };
        const sectionExpandKey = `${moduleKey}-${sectionKey}`;

        if (!newPermissions[moduleKey]) {
            newPermissions[moduleKey] = {};
        }

        if (newPermissions[moduleKey][sectionKey]) {
            delete newPermissions[moduleKey][sectionKey];
            setExpandedSections(prev => ({ ...prev, [sectionExpandKey]: false }));
        } else {
            newPermissions[moduleKey][sectionKey] = {
                create: false,
                edit: false,
                delete: false
            };
            setExpandedSections(prev => ({ ...prev, [sectionExpandKey]: true }));
        }

        onChange(newPermissions);
    };

    const handleOperationToggle = (moduleKey, sectionKey, operation) => {
        const newPermissions = JSON.parse(JSON.stringify(granularPermissions));

        if (!newPermissions[moduleKey]) {
            newPermissions[moduleKey] = {};
        }

        if (!newPermissions[moduleKey][sectionKey]) {
            newPermissions[moduleKey][sectionKey] = {
                create: false,
                edit: false,
                delete: false
            };
        }

        newPermissions[moduleKey][sectionKey][operation] =
            !newPermissions[moduleKey][sectionKey][operation];

        onChange(newPermissions);
    };

    const handleBulkOperationToggle = (moduleKey, operation) => {
        const newPermissions = JSON.parse(JSON.stringify(granularPermissions));
        const moduleData = PERMISSION_MODULES[moduleKey];
        if (!moduleData) return;

        if (!newPermissions[moduleKey]) {
            newPermissions[moduleKey] = {};
        }

        const sections = Object.entries(moduleData.sections);
        let allEnabled = true;
        let supportedAtLeastOnce = false;

        sections.forEach(([sectionKey]) => {
            if (operation === 'all') {
                supportedAtLeastOnce = true;
                ['create', 'edit', 'delete'].forEach(op => {
                    if (!newPermissions[moduleKey][sectionKey]?.[op]) allEnabled = false;
                });
            } else {
                supportedAtLeastOnce = true;
                if (!newPermissions[moduleKey][sectionKey]?.[operation]) allEnabled = false;
            }
        });

        if (!supportedAtLeastOnce) return;

        const targetValue = !allEnabled;

        sections.forEach(([sectionKey]) => {
            if (!newPermissions[moduleKey][sectionKey]) {
                newPermissions[moduleKey][sectionKey] = { create: false, edit: false, delete: false };
            }

            if (operation === 'all') {
                ['create', 'edit', 'delete'].forEach(op => {
                    newPermissions[moduleKey][sectionKey][op] = targetValue;
                });
            } else {
                newPermissions[moduleKey][sectionKey][operation] = targetValue;
            }
        });

        onChange(newPermissions);
    };

    return (
        <div className="space-y-4">
            <h4 className={`text-sm font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4 flex items-center gap-3`}>
                <div className="w-1.5 h-4 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.5)]"></div>
                Modular Access Vector
            </h4>

            {Object.entries(PERMISSION_MODULES).map(([moduleKey, moduleData]) => {
                const isModuleEnabled = !!granularPermissions[moduleKey];
                const isExpanded = !!expandedModules[moduleKey];

                return (
                    <div key={moduleKey} className={`border rounded-xl transition-all duration-300 overflow-hidden ${isDarkMode ? 'border-gray-800' : 'border-gray-100 shadow-sm bg-white'}`}>
                        {/* Module Header */}
                        <div className={`flex items-center justify-between p-4 transition-colors ${isDarkMode ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'} ${isModuleEnabled ? isDarkMode ? 'bg-cyan-500/5' : 'bg-cyan-50' : ''}`}>
                            <div className="flex items-center gap-4 flex-1">
                                <button
                                    type="button"
                                    onClick={() => handleModuleToggle(moduleKey)}
                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isModuleEnabled ? 'bg-cyan-500 border-cyan-500 text-white' : isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}
                                >
                                    {isModuleEnabled && <FaCheck size={10} />}
                                </button>
                                <div className="flex flex-col cursor-pointer" onClick={() => isModuleEnabled && toggleModule(moduleKey)}>
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${isModuleEnabled ? isDarkMode ? 'text-white' : 'text-gray-900' : 'text-gray-500'}`}>
                                        {moduleData.label}
                                    </span>
                                    {isModuleEnabled && (
                                        <span className="text-[9px] text-cyan-500 font-bold uppercase tracking-tighter">
                                            {Object.keys(granularPermissions[moduleKey] || {}).length} Active Nodes
                                        </span>
                                    )}
                                </div>
                            </div>

                            {isModuleEnabled && (
                                <div className="flex items-center gap-4">
                                    <div className={`flex items-center gap-1.5 border-r pr-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <button
                                            type="button"
                                            onClick={() => handleBulkOperationToggle(moduleKey, 'all')}
                                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border border-cyan-100 hover:bg-cyan-100'}`}
                                        >
                                            ALL
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleBulkOperationToggle(moduleKey, 'create')}
                                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all ${isDarkMode ? 'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20' : 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100'}`}
                                        >
                                            C
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleBulkOperationToggle(moduleKey, 'edit')}
                                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all ${isDarkMode ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20' : 'bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-100'}`}
                                        >
                                            E
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleBulkOperationToggle(moduleKey, 'delete')}
                                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all ${isDarkMode ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20' : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'}`}
                                        >
                                            D
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toggleModule(moduleKey)}
                                        className={`p-1 rounded hover:bg-gray-500/10 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                                    >
                                        {isExpanded ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Sections (only if module is expanded and enabled) */}
                        {isModuleEnabled && isExpanded && (
                            <div className={`p-4 space-y-3 border-t ${isDarkMode ? 'border-gray-800 bg-[#131619]/50' : 'border-gray-100 bg-gray-50/50'}`}>
                                {Object.entries(moduleData.sections).map(([sectionKey, sectionData]) => {
                                    const isSectionEnabled = !!(granularPermissions[moduleKey] && granularPermissions[moduleKey][sectionKey]);
                                    const isSectionExpanded = !!expandedSections[`${moduleKey}-${sectionKey}`];

                                    return (
                                        <div key={sectionKey} className={`border rounded-xl transition-all ${isDarkMode ? 'border-gray-800/50 bg-[#1a1f24]/30' : 'border-gray-200 bg-white shadow-sm'}`}>
                                            <div className="flex items-center justify-between p-3">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSectionToggle(moduleKey, sectionKey)}
                                                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSectionEnabled ? 'bg-cyan-500/80 border-cyan-500 text-white' : isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}
                                                    >
                                                        {isSectionEnabled && <FaCheck size={8} />}
                                                    </button>
                                                    <span className={`text-[11px] font-bold ${isSectionEnabled ? isDarkMode ? 'text-gray-300' : 'text-gray-800' : 'text-gray-500'}`}>
                                                        {sectionData.label}
                                                    </span>
                                                </div>
                                                {isSectionEnabled && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSection(moduleKey, sectionKey)}
                                                        className={`p-1 rounded transition-colors ${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        {isSectionExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Operations (only if section is expanded and enabled) */}
                                            {isSectionEnabled && isSectionExpanded && (
                                                <div className={`p-3 grid grid-cols-3 gap-3 border-t ${isDarkMode ? 'border-gray-800/50 bg-[#131619]/50' : 'border-gray-100 bg-gray-50/50'}`}>
                                                    {['create', 'edit', 'delete'].map(op => {
                                                        const isOpEnabled = granularPermissions[moduleKey][sectionKey][op];
                                                        const opColors = {
                                                            create: isDarkMode ? 'text-green-400' : 'text-green-600',
                                                            edit: isDarkMode ? 'text-orange-400' : 'text-orange-600',
                                                            delete: isDarkMode ? 'text-red-400' : 'text-red-600'
                                                        };

                                                        return (
                                                            <label key={op} className="flex items-center gap-2.5 cursor-pointer group">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isOpEnabled}
                                                                    onChange={() => handleOperationToggle(moduleKey, sectionKey, op)}
                                                                    className={`w-4 h-4 rounded border transition-all ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'} text-cyan-500 focus:ring-cyan-500`}
                                                                />
                                                                <span className={`text-[10px] uppercase font-black tracking-widest transition-colors ${isOpEnabled ? opColors[op] : isDarkMode ? 'text-gray-600 group-hover:text-gray-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                                                    {op}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default GranularPermissionsEditor;
