import React from "react";
import Layout from "../components/Layout";
import BoardContent from "../components/MasterData/Board/BoardContent";

export default function MasterDataBoard() {
    return (
        <Layout activePage="Master Data">
            <BoardContent />
        </Layout>
    );
}
