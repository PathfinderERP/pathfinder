import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const checkMapping = async () => {
    const accountSid = process.env.EXOTEL_ACCOUNT_SID;
    const appId = process.env.EXOTEL_APP_ID;
    const appSecret = process.env.EXOTEL_APP_SECRET;

    // Get App Token
    const tokenUrl = 'https://integrationscore.mum1.exotel.com/v2/integrations/token';
    const appTokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Id: appId,
            Secret: appSecret,
            Entity: 'app'
        })
    });
    const appTokenData = await appTokenResponse.json();
    const appToken = appTokenData.Data;

    const userId = 'rohan@pathfinder.edu.in';

    const checkUrl = `https://integrationscore.mum1.exotel.com/v2/integrations/usermapping?user_id=${encodeURIComponent(userId)}`;
    const checkRes = await fetch(checkUrl, {
        method: 'GET',
        headers: { 'Authorization': appToken }
    });

    const checkData = await checkRes.json();
    console.log("Status Code:", checkRes.status);
    console.log("Mapping Data:", JSON.stringify(checkData, null, 2));
};

checkMapping();
