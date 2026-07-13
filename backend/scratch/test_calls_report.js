import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
    try {
        console.log("Attempting login...");
        const loginRes = await fetch('http://localhost:5000/api/superAdmin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'rohan@pathfinder.edu.in',
                password: 'SA002'
            })
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.statusText}`);
        }

        const loginData = await loginRes.json();
        const jwtToken = loginData.token;
        console.log("Logged in successfully.");

        const testDate = "2026-07-12";

        // Test JSON report
        console.log("1. Fetching calls-report JSON...");
        const reportRes = await fetch(`http://localhost:5000/api/operations/daily-tracking/calls-report?fromDate=${testDate}&toDate=${testDate}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        console.log("JSON response status:", reportRes.status);
        if (reportRes.ok) {
            const data = await reportRes.json();
            console.log("JSON response data length:", data.length);
            const bagnanRows = data.filter(d => d.centreName.toUpperCase() === "BAGNAN");
            console.log("Bagnan rows for yesterday:", bagnanRows);
        } else {
            console.log("Error JSON:", await reportRes.text());
        }

        // Test Export Summary
        console.log("2. Fetching summary export...");
        const summaryRes = await fetch(`http://localhost:5000/api/operations/daily-tracking/calls-report/export?fromDate=${testDate}&toDate=${testDate}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        console.log("Summary export response status:", summaryRes.status);
        console.log("Summary export content-type:", summaryRes.headers.get("content-type"));
        if (summaryRes.ok) {
            const buf = await summaryRes.arrayBuffer();
            console.log("Summary Excel received byte size:", buf.byteLength);
        } else {
            console.log("Error summary:", await summaryRes.text());
        }

        // Test Export Bulk
        console.log("3. Fetching bulk details export...");
        const bulkRes = await fetch(`http://localhost:5000/api/operations/daily-tracking/calls-report/export-bulk?fromDate=${testDate}&toDate=${testDate}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        console.log("Bulk export response status:", bulkRes.status);
        console.log("Bulk export content-type:", bulkRes.headers.get("content-type"));
        if (bulkRes.ok) {
            const buf = await bulkRes.arrayBuffer();
            console.log("Bulk Excel received byte size:", buf.byteLength);
        } else {
            console.log("Error bulk:", await bulkRes.text());
        }

    } catch (e) {
        console.error("Test failed:", e);
    }
};

test();
