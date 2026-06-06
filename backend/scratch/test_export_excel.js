import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
    try {
        console.log("Attempting login for rohan@pathfinder.edu.in...");
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
        console.log("Logged in successfully. JWT Token acquired.");

        console.log("Fetching board export...");
        const exportRes = await fetch('http://localhost:5000/api/daily-tracking-logs/board/export?date=2026-06-05', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwtToken}`
            }
        });

        console.log("Response status:", exportRes.status);
        console.log("Response content-type:", exportRes.headers.get("content-type"));
        
        if (!exportRes.ok) {
            const body = await exportRes.text();
            console.log("Error response body:", body);
        } else {
            console.log("Excel export was successful! Received byte size:", (await exportRes.arrayBuffer()).byteLength);
        }

    } catch (e) {
        console.error("Test failed:", e);
    }
};

test();
