import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 5000;
const url = `http://localhost:${port}/api/superAdmin/login`;

async function test() {
    try {
        console.log(`Sending POST request to ${url}...`);
        const res = await axios.post(url, {
            email: 'mimmahamudul6@gmail.com',
            password: 'EMP26000586'
        });
        console.log('Login successful!');
        console.log('Status Code:', res.status);
        console.log('Token:', res.data.token ? 'Received (valid length)' : 'Missing');
        console.log('User role:', res.data.user?.role);
        console.log('User EmployeeId:', res.data.user?.employeeId);
    } catch (err) {
        console.error('Login failed:', err.message);
        if (err.response) {
            console.error('Response status:', err.response.status);
            console.error('Response data:', err.response.data);
        }
    }
}

test();
