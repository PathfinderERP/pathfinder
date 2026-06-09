import dotenv from 'dotenv';
dotenv.config();

const appId = process.env.ENABLEX_APP_ID;
const appKey = process.env.ENABLEX_APP_KEY;
const fromNumber = process.env.ENABLEX_FROM_NUMBER || "+911169040030";

const testHost = async (host) => {
    console.log(`\n--- Testing host: ${host} ---`);
    const authString = Buffer.from(`${appId}:${appKey}`).toString('base64');
    const payload = {
        name: "test-diagnostic",
        owner_ref: fromNumber,
        from: fromNumber,
        to: "+918299099816",
        auto_record: false,
        action_on_connect: {
            play: {
                text: "Connecting your call.",
                language: "en-US",
                voice: "female"
            }
        },
        event_url: "https://example.com/webhook"
    };

    try {
        const response = await fetch(`https://${host}/voice/v1/call`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify(payload)
        });

        console.log(`Status Code: ${response.status} (${response.statusText})`);
        const text = await response.text();
        console.log("Response Body:", text);
    } catch (err) {
        console.error(`Error connecting to ${host}:`, err.message);
    }
};

const run = async () => {
    await testHost('api.enablex.io');
    await testHost('api-qa.enablex.io');
};

run();
