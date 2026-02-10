import React, { useState } from 'react';
import { FaChevronDown, FaChevronRight, FaCheck } from 'react-icons/fa';
import PERMISSION_MODULES from '../../config/permissions';

const GranularPermissionsEditor = ({ granularPermissions = {}, onChange }) => {
    const [expandedModules, setExpandedModules] = useState({});
    const [expandedSections, setExpandedSections] = useState({});

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
            // Remove entire module
            delete newPermissions[moduleKey];
            // Collapse the module
            setExpandedModules(prev => ({ ...prev, [moduleKey]: false }));
        } else {
            // Add module with all sections enabled (view only) but operations disabled
            newPermissions[moduleKey] = {};

            // Auto-enable all sections for this module
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

            // Auto-expand the module so user can see sections
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
            // Remove section
            delete newPermissions[moduleKey][sectionKey];
            // Collapse the section
            setExpandedSections(prev => ({ ...prev, [sectionExpandKey]: false }));
        } else {
            // Add section with all operations disabled
            newPermissions[moduleKey][sectionKey] = {
                create: false,
                edit: false,
                delete: false
            };
            // Auto-expand the section so user can see operations
            setExpandedSections(prev => ({ ...prev, [sectionExpandKey]: true }));
        }

        onChange(newPermissions);
    };

    const handleOperationToggle = (moduleKey, sectionKey, operation) => {
        const newPermissions = { ...granularPermissions };

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
        const newPermissions = { ...granularPermissions };
        const moduleData = PERMISSION_MODULES[moduleKey];
        if (!moduleData) return;

        if (!newPermissions[moduleKey]) {
            newPermissions[moduleKey] = {};
        }

        const sections = Object.entries(moduleData.sections);

        let allEnabled = true;
        let supportedAtLeastOnce = false;

        sections.forEach(([sectionKey, sectionData]) => {
            const ops = sectionData.operations;
            if (operation === 'all') {
                supportedAtLeastOnce = true;
                ops.forEach(op => {
                    if (!newPermissions[moduleKey][sectionKey]?.[op]) allEnabled = false;
                });
            } else if (ops.includes(operation)) {
                supportedAtLeastOnce = true;
                if (!newPermissions[moduleKey][sectionKey]?.[operation]) allEnabled = false;
            }
        });

        if (!supportedAtLeastOnce) return;

        const targetValue = !allEnabled;

        sections.forEach(([sectionKey, sectionData]) => {
            if (!newPermissions[moduleKey][sectionKey]) {
                newPermissions[moduleKey][sectionKey] = {};
            }

            const ops = sectionData.operations;
            if (operation === 'all') {
                ops.forEach(op => {
                    newPermissions[moduleKey][sectionKey][op] = targetValue;
                });
            } else if (ops.includes(operation)) {
                newPermissions[moduleKey][sectionKey][operation] = targetValue;
            }
        });

        onChange(newPermissions);
    };

    const isModuleEnabled = (moduleKey) => {
        // Module is enabled if it exists in granularPermissions, even if empty
        return granularPermissions[moduleKey] !== undefined;
    };

    const isSectionEnabled = (moduleKey, sectionKey) => {
        return granularPermissions[moduleKey]?.[sectionKey] !== undefined;
    };

    const isOperationEnabled = (moduleKey, sectionKey, operation) => {
        return granularPermissions[moduleKey]?.[sectionKey]?.[operation] === true;
    };

    const getOperationColor = (operation) => {
        switch (operation) {
            case 'create':
                return 'text-green-400 border-green-500/50 bg-green-500/10 hover:bg-green-500/20';
            case 'edit':
                return 'text-orange-400 border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/20';
            case 'delete':
                return 'text-red-400 border-red-500/50 bg-red-500/10 hover:bg-red-500/20';
            default:
                return 'text-gray-400 border-gray-500/50 bg-gray-500/10 hover:bg-gray-500/20';
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-cyan-400">Granular Permissions</h4>
                <p className="text-xs text-gray-500">Configure module, section, and operation level access</p>
            </div>

            {Object.entries(PERMISSION_MODULES).map(([moduleKey, moduleData]) => {
                const moduleEnabled = isModuleEnabled(moduleKey);
                const moduleExpanded = expandedModules[moduleKey];

                return (
                    <div key={moduleKey} className="border border-gray-700 rounded-lg overflow-hidden">
                        {/* Module Level */}
                        <div className="bg-gray-800/50 p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <button
                                        type="button"
                                        onClick={() => toggleModule(moduleKey)}
                                        className="text-gray-400 hover:text-cyan-400 transition-colors"
                                    >
                                        {moduleExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                                    </button>

                                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                                        <input
                                            type="checkbox"
                                            checked={moduleEnabled}
                                            onChange={() => handleModuleToggle(moduleKey)}
                                            className="w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-800"
                                        />
                                        <span className="text-white font-medium">{moduleData.label}</span>
                                    </label>
                                </div>

                                {moduleEnabled && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 border-r border-gray-700 pr-3 mr-1">
                                            <span className="text-[10px] text-gray-500 font-bold mr-1">BULK:</span>
                                            <button
                                                type="button"
                                                onClick={() => handleBulkOperationToggle(moduleKey, 'all')}
                                                className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[9px] font-black hover:bg-cyan-500/20 transition-all uppercase"
                                            >
                                                ALL
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleBulkOperationToggle(moduleKey, 'create')}
                                                className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/30 text-[9px] font-black hover:bg-green-500/20 transition-all uppercase"
                                            >
                                                C
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleBulkOperationToggle(moduleKey, 'edit')}
                                                className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30 text-[9px] font-black hover:bg-orange-500/20 transition-all uppercase"
                                            >
                                                E
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleBulkOperationToggle(moduleKey, 'delete')}
                                                className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 text-[9px] font-black hover:bg-red-500/20 transition-all uppercase"
                                            >
                                                D
                                            </button>
                                        </div>
                                        <span className="text-xs text-cyan-400 font-semibold whitespace-nowrap">
                                            {Object.keys(granularPermissions[moduleKey] || {}).length} sections
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sections Level */}
                        {moduleExpanded && moduleEnabled && (
                            <div className="bg-gray-900/30 p-3 space-y-2">
                                {Object.entries(moduleData.sections).map(([sectionKey, sectionData]) => {
                                    const sectionEnabled = isSectionEnabled(moduleKey, sectionKey);
                                    const sectionExpanded = expandedSections[`${moduleKey}-${sectionKey}`];

                                    return (
                                        <div key={sectionKey} className="border border-gray-700/50 rounded-lg overflow-hidden">
                                            {/* Section Header */}
                                            <div className="bg-gray-800/30 p-2 px-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleSection(moduleKey, sectionKey)}
                                                            className="text-gray-400 hover:text-cyan-400 transition-colors"
                                                        >
                                                            {sectionExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                                                        </button>

                                                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={sectionEnabled}
                                                                onChange={() => handleSectionToggle(moduleKey, sectionKey)}
                                                                className="w-3.5 h-3.5 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-800"
                                                            />
                                                            <span className="text-gray-300 text-sm">{sectionData.label}</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Operations Level */}
                                            {sectionExpanded && sectionEnabled && (
                                                <div className="bg-gray-900/50 p-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {sectionData.operations.map((operation) => {
                                                            const operationEnabled = isOperationEnabled(moduleKey, sectionKey, operation);

                                                            return (
                                                                <button
                                                                    key={operation}
                                                                    type="button"
                                                                    onClick={() => handleOperationToggle(moduleKey, sectionKey, operation)}
                                                                    className={`
                                                                        flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
                                                                        ${operationEnabled
                                                                            ? getOperationColor(operation)
                                                                            : 'text-gray-500 border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                                                                        }
                                                                    `}
                                                                >
                                                                    {operationEnabled && <FaCheck size={10} />}
                                                                    <span className="capitalize">{operation}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
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
