import React from "react";
import AllFeedback from "./AllFeedback";
import FeedbackEvaluation from "../Employee/FeedbackEvaluation";
import Layout from "../../components/Layout";

const FeedbackHub = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSpecialRole = ["admin", "superAdmin", "HR"].includes(user.role);

    return (
        <Layout activePage={isSpecialRole ? "HR & Manpower" : "Employee Center"}>
            {isSpecialRole ? <AllFeedback /> : <FeedbackEvaluation />}
        </Layout>
    );
};

export default FeedbackHub;
