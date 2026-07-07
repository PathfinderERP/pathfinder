import React from 'react';
import Layout from '../../components/Layout';
import PNTSEAddStudentContent from '../../components/PNTSE/PNTSEAddStudentContent';

const PNTSEAddStudent = () => {
    return (
        <Layout activePage="PNTSE">
            <PNTSEAddStudentContent />
        </Layout>
    );
};

export default PNTSEAddStudent;
