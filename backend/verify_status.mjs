import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const baseUrl = process.env.EZETAP_MODE === 'production' 
    ? "https://www.ezetap.com/api/3.0/p2padapter" 
    : "https://demo.ezetap.com/api/3.0/p2padapter";

async function checkStatus(id, extRef) {
    console.log(`\n--- Checking Status for ID: ${id} (Ext: ${extRef}) ---`);
    const payload = {
        appKey: process.env.EZETAP_APP_KEY,
        username: process.env.EZETAP_USERNAME,
        password: process.env.EZETAP_PASSWORD,
        orgCode: process.env.EZETAP_ORG_CODE,
        p2pRequestId: id
    };

    try {
        console.log("Checking by p2pRequestId...");
        const response = await fetch(`${baseUrl}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        console.log("By p2pRequestId:", JSON.stringify(data));

        console.log(`\nChecking Global 3.0 Status Endpoint: /api/3.0/status...`);
        const v4Payload = { ...payload, p2pRequestId: id };
        const v4Response = await fetch(`https://www.ezetap.com/api/3.0/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(v4Payload)
        });
        const v4Data = await v4Response.json();
        console.log("Global 3.0 API:", JSON.stringify(v4Data));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

// Transaction data from user's latest logs
const failingId = "260327133650762E868842905";
const failingExt = "POS-1774618610648";

checkStatus(failingId, failingExt);
