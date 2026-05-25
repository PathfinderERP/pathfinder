import React from "react";
import Layout from "../components/Layout";
import FinanceExpenseCategoryContent from "./FinanceExpenseCategoryContent.jsx";

const FinanceExpenseCategory = () => {
    return (
        <Layout activePage="Finance & Fees">
            <FinanceExpenseCategoryContent />
        </Layout>
    );
};

export default FinanceExpenseCategory;
