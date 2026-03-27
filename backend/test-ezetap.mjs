import crypto from 'crypto';

async function test() {
    const payload = {
        appKey: "e83e9a54-f640-4208-a5c7-26d94f416bc9",
        username: "1009293999",
        amount: 21,
        password: "123456Q",
        orgCode: "RVQ0CAL0T1KH1R_PATHFINDER",
        customerMobileNumber: "",
        externalRefNumber: "R-" + Date.now().toString().slice(-8),
        externalRefNumber2: "",
        externalRefNumber3: "",
        pushTo: {
            deviceId: "1495035990|ezetap_android"
        },
        mode: "PAY"
    };

    console.log("Sending:", JSON.stringify(payload));

    const response = await fetch("https://www.ezetap.com/api/3.0/p2padapter/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("Response:", data);
}

test();
