import React from "react";
import Layout from "../components/Layout";
import UserManagementContent from "../components/UserManagement/UserManagementContent";

export default function UserManagement() {
    return (
        <Layout activePage="User Management">
            <UserManagementContent />
        </Layout>
    );
}
