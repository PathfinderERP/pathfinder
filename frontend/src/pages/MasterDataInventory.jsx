import React from "react";
import Layout from "../components/Layout";
import InventoryContent from "../components/MasterData/Inventory/InventoryContent";

export default function MasterDataInventory() {
    return (
        <Layout activePage="Master Data">
            <InventoryContent />
        </Layout>
    );
}
