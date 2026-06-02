import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });

const fetchStatus = async () => {
    const accountSid = process.env.EXOTEL_ACCOUNT_SID;
    const appId = process.env.EXOTEL_APP_ID;
    const appSecret = process.env.EXOTEL_APP_SECRET;

    console.log("AccountSid:", accountSid);
    console.log("AppId:", appId);

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
    console.log("App Token:", appToken);

    // Fetch App
    const appUrl = 'https://integrationscore.mum1.exotel.com/v2/integrations/app';
    const appRes = await fetch(appUrl, {
        method: 'GET',
        headers: { 'Authorization': appToken }
    });
    const appData = await appRes.json();
    console.log("App details:", JSON.stringify(appData, null, 2));

    // Fetch App Settings
    const settingsUrl = 'https://integrationscore.mum1.exotel.com/v2/integrations/app_setting';
    const settingsRes = await fetch(settingsUrl, {
        method: 'GET',
        headers: { 'Authorization': appToken }
    });
    const settingsData = await settingsRes.json();
    console.log("App Settings:", JSON.stringify(settingsData, null, 2));

    // Fetch User Mapping
    const userId = 'rohan@pathfinder.edu.in';
    const userMappingUrl = `https://integrationscore.mum1.exotel.com/v2/integrations/usermapping?user_id=${userId}`;
    const mappingResponse = await fetch(userMappingUrl, {
        method: 'GET',
        headers: {
            'Authorization': appToken,
            'Content-Type': 'application/json'
        }
    });

    const mappingData = await mappingResponse.json();
    console.log("User Mapping Response Status:", mappingResponse.status);
    console.log("User Mapping Response:", JSON.stringify(mappingData, null, 2));
};

fetchStatus().catch(err => console.error("Error:", err));
