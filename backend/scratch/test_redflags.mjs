import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 5000;
const loginUrl = `http://localhost:${port}/api/superAdmin/login`;
const redFlagsUrl = `http://localhost:${port}/api/red-flags`;

async function test() {
    try {
        console.log(`Logging in to get JWT token...`);
        const loginRes = await axios.post(loginUrl, {
            email: 'mimmahamudul6@gmail.com',
            password: 'EMP26000586'
        });
        const token = loginRes.data.token;
        console.log('Login successful! Token acquired.');

        console.log(`Fetching red flags for All Roles for 2026-05-12...`);
        const res = await axios.get(redFlagsUrl, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                role: 'All Roles',
                startDate: '2026-05-12',
                endDate: '2026-05-12'
            }
        });

        console.log('Fetch successful!');
        console.log('Status Code:', res.status);
        console.log('Total red flags returned:', res.data.length);
        if (res.data.length > 0) {
            console.log('First 3 red flags:');
            console.log(JSON.stringify(res.data.slice(0, 3), null, 2));
        }
    } catch (err) {
        console.error('Test failed:', err.message);
        if (err.response) {
            console.error('Response status:', err.response.status);
            console.error('Response data:', err.response.data);
        }
    }
}

test();
