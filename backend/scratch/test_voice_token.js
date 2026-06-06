

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

        console.log("Fetching lead management voice token...");
        const tokenRes = await fetch('http://localhost:5000/api/lead-management/call/token', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwtToken}`
            }
        });

        if (!tokenRes.ok) {
            throw new Error(`Voice Token Fetch failed: ${tokenRes.statusText}`);
        }

        const tokenData = await tokenRes.json();
        console.log("Voice Token API response:", JSON.stringify(tokenData, null, 2));

        // Call it a second time to ensure it works correctly and skips mapping deletion/recreation
        console.log("Fetching lead management voice token again to test skipping deletion/recreation...");
        const tokenRes2 = await fetch('http://localhost:5000/api/lead-management/call/token', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwtToken}`
            }
        });

        const tokenData2 = await tokenRes2.json();
        console.log("Second Voice Token API response:", JSON.stringify(tokenData2, null, 2));

    } catch (e) {
        console.error("Test failed:", e);
    }
};

test();
