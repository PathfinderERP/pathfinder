import React from 'react';
import Layout from '../components/Layout';
import EnrolledStudentsContent from '../components/Admissions/EnrolledStudentsContent';

const EnrolledStudents = () => {
    return (
        <Layout activePage="Admissions & Sales">
            <EnrolledStudentsContent />
        </Layout>
    );
};

export default EnrolledStudents;
