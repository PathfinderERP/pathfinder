import React from "react";
import Layout from "../components/Layout";
import CommunityFeed from "../components/Dashboard/CommunityFeed";

export default function Community() {
    return (
        <Layout activePage="Community">
            <CommunityFeed />
        </Layout>
    );
}
