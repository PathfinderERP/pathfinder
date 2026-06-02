import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });

const testMapping = async () => {
    const accountSid = process.env.EXOTEL_ACCOUNT_SID;
    const apiKey = process.env.EXOTEL_API_KEY;
    const apiToken = process.env.EXOTEL_API_TOKEN;
    const appId = process.env.EXOTEL_APP_ID;
    const appSecret = process.env.EXOTEL_APP_SECRET;
    const virtualNumber = process.env.EXOTEL_VIRTUAL_NUMBER;

    console.log("AccountSid:", accountSid);
    console.log("AppId:", appId);
    console.log("VirtualNumber:", virtualNumber);

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
    console.log("App Token Status:", appTokenResponse.status);

    const userId = 'rohan@pathfinder.edu.in';

    // Delete existing
    const deleteUrl = `https://integrationscore.mum1.exotel.com/v2/integrations/users/${userId}`;
    const delRes = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Authorization': appToken }
    });
    const delText = await delRes.text();
    console.log("Delete Mapping Status:", delRes.status, delText);

    // Create new mapping
    const userMappingUrl = 'https://integrationscore.mum1.exotel.com/v2/integrations/usermapping?entity=app';
    const mappingResponse = await fetch(userMappingUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': appToken
        },
        body: JSON.stringify([
            {
                AppUserId: userId,
                AppUsername: 'Rohan Singh',
                Email: userId,
                ExotelAccountSid: accountSid,
                ExotelUserName: 'Rohan Singh',
                VirtualNumber: virtualNumber
            }
        ])
    });

    const mappingData = await mappingResponse.json();
    console.log("Create Mapping Response Status:", mappingResponse.status);
    console.log("Create Mapping Response Body:", JSON.stringify(mappingData, null, 2));
};

testMapping();
