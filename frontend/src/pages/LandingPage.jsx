import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
            {/* Navbar */}
            <nav className="bg-white shadow-md py-4 px-8 flex justify-between items-center">
                <div className="text-2xl font-bold text-indigo-600">Pathfinder ERP</div>
                <button
                    onClick={() => navigate('/login')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-full transition duration-300 shadow-lg transform hover:scale-105"
                >
                    Login
                </button>
            </nav>

            {/* Hero Section */}
            <div className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl w-full space-y-8 text-center">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
                        Manage Your Institution <br />
                        <span className="text-indigo-600">With Excellence</span>
                    </h1>
                    <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
                        Streamline admissions, academics, finance, and HR with our all-in-one ERP solution designed for modern educational institutions.
                    </p>
                    <div className="mt-8 flex justify-center gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold py-3 px-8 rounded-lg shadow-xl transition duration-300 transform hover:-translate-y-1"
                        >
                            Get Started
                        </button>
                        <button className="bg-white hover:bg-gray-50 text-indigo-600 text-lg font-bold py-3 px-8 rounded-lg shadow-md border border-gray-200 transition duration-300">
                            Learn More
                        </button>
                    </div>
                </div>
            </div>

            {/* Features Preview */}
            <div className="bg-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                            <h3 className="text-xl font-bold text-blue-800 mb-2">Admissions</h3>
                            <p className="text-gray-600">Seamless student enrollment and application tracking.</p>
                        </div>
                        <div className="p-6 bg-purple-50 rounded-xl border border-purple-100">
                            <h3 className="text-xl font-bold text-purple-800 mb-2">Academics</h3>
                            <p className="text-gray-600">Comprehensive curriculum and grade management.</p>
                        </div>
                        <div className="p-6 bg-green-50 rounded-xl border border-green-100">
                            <h3 className="text-xl font-bold text-green-800 mb-2">Finance</h3>
                            <p className="text-gray-600">Efficient fee collection and financial reporting.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-800 text-white py-8 text-center">
                <p>&copy; {new Date().getFullYear()} Pathfinder ERP. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
