import React from 'react';
import Layout from '../../components/Layout';
import PNTSEAllStudentsContent from '../../components/PNTSE/PNTSEAllStudentsContent';

const PNTSEAllStudents = () => {
    return (
        <Layout activePage="PNTSE">
            <PNTSEAllStudentsContent />
        </Layout>
    );
};

export default PNTSEAllStudents;
