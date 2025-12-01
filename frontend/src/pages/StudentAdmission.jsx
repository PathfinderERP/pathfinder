import React from "react";
import Layout from "../components/Layout";
import StudentAdmissionForm from "../components/Admissions/StudentAdmissionForm";

export default function StudentAdmission() {
    return (
        <Layout activePage="Admissions & Sales">
            <StudentAdmissionForm />
        </Layout>
    );
}
