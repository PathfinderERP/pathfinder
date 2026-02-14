import React from 'react';
import { FaTimes, FaCheck, FaLock, FaShieldAlt } from 'react-icons/fa';
import PERMISSION_MODULES from '../../config/permissions';
import { useTheme } from '../../context/ThemeContext';

const PermissionsDetailModal = ({ user, onClose }) => {
    const granularPermissions = user?.granularPermissions || {};
    const hasPermissions = Object.keys(granularPermissions).length > 0;
    const isSuperAdmin = user?.role === 'superAdmin';
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all" onClick={onClose}>
            <div
                className={`${isDarkMode ? 'bg-[#1a1f24] border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]' : 'bg-white border-gray-100 shadow-2xl'} w-full max-w-2xl max-h-[90vh] rounded-2xl border flex flex-col transform transition-all hover:shadow-[0_0_50px_rgba(6,182,212,0.3)]`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`p-6 border-b flex justify-between items-center rounded-t-2xl ${isDarkMode ? 'border-gray-800 bg-[#131619]' : 'border-gray-50 bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-100 text-cyan-600'}`}>
                            <FaShieldAlt size={20} />
                        </div>
                        <div>
                            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Permissions Overview</h3>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>User: <span className="text-cyan-500 font-bold">{user?.name}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`transition-colors p-2 rounded-full ${isDarkMode ? 'text-gray-400 hover:text-white bg-gray-800' : 'text-gray-500 hover:text-gray-900 bg-gray-200'}`}>
                        <FaTimes />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {isSuperAdmin ? (
                        <div className="text-center py-8">
                            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 ${isDarkMode ? 'bg-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'bg-cyan-50 shadow-inner'}`}>
                                <FaShieldAlt size={40} className="text-cyan-500" />
                            </div>
                            <h4 className={`text-xl font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Super Admin Privileges</h4>
                            <p className={`max-w-sm mx-auto font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>This vector has unrestricted access to all system nodes and operational modules.</p>
                        </div>
                    ) : (hasPermissions ? (
                        Object.entries(granularPermissions).map(([moduleKey, sections]) => {
                            const moduleConfig = PERMISSION_MODULES[moduleKey];
                            if (!moduleConfig) return null; // Skip unknown modules

                            // Check if module has any active sections
                            const hasActiveSections = Object.keys(sections).length > 0;
                            if (!hasActiveSections) return null;

                            return (
                                <div key={moduleKey} className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? 'bg-gray-800/50 border-gray-800' : 'bg-gray-50 border-gray-50'}`}>
                                        <h4 className="font-black text-[11px] uppercase tracking-[0.2em] text-cyan-500 flex items-center gap-2">
                                            <div className="w-1.5 h-3.5 bg-cyan-500 rounded-full"></div>
                                            {moduleConfig.label}
                                        </h4>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(sections).map(([sectionKey, operations]) => {
                                            const sectionConfig = moduleConfig.sections[sectionKey];
                                            if (!sectionConfig) return null;

                                            return (
                                                <div key={sectionKey} className={`border rounded-lg p-3 transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-700/50 hover:border-cyan-500/30' : 'bg-gray-50/50 border-gray-200 hover:border-cyan-500/30'}`}>
                                                    <h5 className={`text-[10px] font-black uppercase tracking-widest mb-3 pb-2 border-b ${isDarkMode ? 'text-gray-400 border-gray-700/50' : 'text-gray-600 border-gray-200'}`}>
                                                        {sectionConfig.label}
                                                    </h5>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['create', 'edit', 'delete'].map(op => (
                                                            <span key={op} className={`text-[9px] px-2 py-1 rounded border font-black uppercase tracking-tighter flex items-center gap-1.5 transition-all ${operations[op]
                                                                ? 'bg-green-500/10 text-green-500 border-green-500/30'
                                                                : isDarkMode ? 'bg-gray-800/50 text-gray-600 border-gray-700/50' : 'bg-gray-100 text-gray-400 border-gray-200'
                                                                }`}>
                                                                {operations[op] ? <FaCheck size={7} /> : <FaTimes size={7} />}
                                                                {op}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <FaLock size={32} className="mx-auto mb-3 opacity-50" />
                            <p>No permissions assigned to this user.</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PermissionsDetailModal;
