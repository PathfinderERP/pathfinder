import React from "react";
import Layout from "../components/Layout";
import MarketingConsole from "../components/PerformanceConsoles/MarketingConsole";

const MarketingCRM = () => {
    return (
        <Layout activePage="Marketing & CRM">
            <MarketingConsole />
        </Layout>
    );
};

export default MarketingCRM;
