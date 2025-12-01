import React from 'react';
import Sidebar from '../components/Dashboard/Sidebar';
import Header from '../components/Dashboard/Header';
import EnrolledStudentsContent from '../components/Admissions/EnrolledStudentsContent';

const EnrolledStudents = () => {
    return (
        <div className="flex h-screen bg-[#0a0e12] overflow-hidden">
            <Sidebar activePage="Admissions & Sales" />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <EnrolledStudentsContent />
            </div>
        </div>
    );
};

export default EnrolledStudents;
