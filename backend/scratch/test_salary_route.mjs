async function run() {
    try {
        // 1. Login
        const loginRes = await fetch("http://localhost:5000/api/superAdmin/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: "mimmahamudul6@gmail.com",
                password: "EMP26000586"
            })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        if (!token) {
            console.error("Login failed:", loginData);
            return;
        }
        console.log("Logged in successfully. Token length:", token.length);

        // 2. Fetch salary centers
        const res = await fetch("http://localhost:5000/api/hr/salary/centers", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        console.log("STATUS:", res.status);
        const data = await res.json();
        console.log("BODY:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("ERROR:", err);
    }
}
run();
