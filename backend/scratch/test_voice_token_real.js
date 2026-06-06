import dotenv from 'dotenv';
dotenv.config();

const testRealToken = async () => {
    try {
        const appId = process.env.ENABLEX_APP_ID;
        const appKey = process.env.ENABLEX_APP_KEY;
        const domain = process.env.ENABLEX_DOMAIN || "localhost";

        console.log("Using credentials:");
        console.log("App ID:", appId);
        console.log("App Key:", appKey);
        console.log("Domain:", domain);

        const authString = Buffer.from(`${appId}:${appKey}`).toString('base64');
        const tokenResponse = await fetch('https://api.enablex.io/voice/v1/webclient/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify({ domain })
        });

        const status = tokenResponse.status;
        const statusText = tokenResponse.statusText;
        console.log(`Response Status: ${status} (${statusText})`);

        const tokenData = await tokenResponse.json();
        console.log("Response Body:", JSON.stringify(tokenData, null, 2));

    } catch (e) {
        console.error("Fetch threw error:", e);
    }
};

testRealToken();
