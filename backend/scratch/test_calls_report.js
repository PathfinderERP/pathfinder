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

        // Test admissions JSON
        console.log("0. Fetching admissions...");
        const admRes = await fetch("http://localhost:5000/api/admission", {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        console.log("Admissions response status:", admRes.status);
        if (admRes.ok) {
            const data = await admRes.json();
            console.log("Admissions count:", data.length);
            const first = data[0];
            if (first) {
                console.log("First admission ID:", first._id);
                console.log("First admission student.leadBy:", first.student?.leadBy);
                console.log("First admission leadBy:", first.leadBy);
                console.log("First admission counselledByDetails:", first.counselledByDetails);
            }
        } else {
            console.log("Error admissions:", await admRes.text());
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
