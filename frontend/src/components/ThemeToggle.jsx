import React from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
    const { theme, toggleTheme, isDarkMode } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border transition-all duration-300 active:scale-90 ${
                isDarkMode 
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20' 
                : 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700'
            }`}

            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        >
            {isDarkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
        </button>
    );
};

export default ThemeToggle;
