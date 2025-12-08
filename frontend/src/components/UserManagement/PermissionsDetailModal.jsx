import React from 'react';
import { FaTimes, FaCheck, FaLock, FaShieldAlt } from 'react-icons/fa';
import PERMISSION_MODULES from '../../config/permissions';

const PermissionsDetailModal = ({ user, onClose }) => {
    const granularPermissions = user?.granularPermissions || {};
    const hasPermissions = Object.keys(granularPermissions).length > 0;
    const isSuperAdmin = user?.role === 'superAdmin';

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#1a1f24] w-full max-w-2xl max-h-[90vh] rounded-2xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col transform transition-all hover:shadow-[0_0_50px_rgba(6,182,212,0.3)] hover:border-cyan-500/50"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#131619] rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-900/30 flex items-center justify-center text-cyan-400">
                            <FaShieldAlt size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Permissions Overview</h3>
                            <p className="text-sm text-gray-400">User: <span className="text-cyan-400">{user?.name}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-gray-800 p-2 rounded-full">
                        <FaTimes />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {isSuperAdmin ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-cyan-500/20 mx-auto flex items-center justify-center mb-4">
                                <FaShieldAlt size={32} className="text-cyan-400" />
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2">Super Admin Privileges</h4>
                            <p className="text-gray-400 max-w-sm mx-auto">This user has full access to all modules and operations in the system.</p>
                        </div>
                    ) : (hasPermissions ? (
                        Object.entries(granularPermissions).map(([moduleKey, sections]) => {
                            const moduleConfig = PERMISSION_MODULES[moduleKey];
                            if (!moduleConfig) return null; // Skip unknown modules

                            // Check if module has any active sections
                            const hasActiveSections = Object.keys(sections).length > 0;
                            if (!hasActiveSections) return null;

                            return (
                                <div key={moduleKey} className="bg-[#131619] rounded-xl border border-gray-800 overflow-hidden">
                                    <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-800">
                                        <h4 className="font-bold text-cyan-400 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                            {moduleConfig.label}
                                        </h4>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(sections).map(([sectionKey, operations]) => {
                                            const sectionConfig = moduleConfig.sections[sectionKey];
                                            if (!sectionConfig) return null;

                                            return (
                                                <div key={sectionKey} className="bg-[#1a1f24] border border-gray-700/50 rounded-lg p-3 hover:border-cyan-500/30 transition-colors">
                                                    <h5 className="text-sm font-semibold text-gray-300 mb-3 pb-2 border-b border-gray-700/50">
                                                        {sectionConfig.label}
                                                    </h5>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['create', 'edit', 'delete'].map(op => (
                                                            <span key={op} className={`text-xs px-2 py-1 rounded border capitalize flex items-center gap-1.5 ${operations[op]
                                                                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                                                    : 'bg-gray-800 text-gray-500 border-gray-700 opacity-50'
                                                                }`}>
                                                                {operations[op] ? <FaCheck size={8} /> : <FaTimes size={8} />}
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
