import React from "react";
import Layout from "../components/Layout";
import StudentRegistrationForm from "../components/Admissions/StudentRegistrationForm";

export default function StudentRegistration() {
    return (
        <Layout activePage="Admissions & Sales">
            <StudentRegistrationForm />
        </Layout>
    );
}
