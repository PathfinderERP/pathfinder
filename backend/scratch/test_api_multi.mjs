import axios from 'axios';

const test = async () => {
    try {
        const res = await axios.get('http://localhost:5000/api/dashboard');
        console.log('Dashboard Status:', res.status);
        const res2 = await axios.get('http://localhost:5000/api/red-flags');
        console.log('Red Flags Status:', res2.status);
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Response Data:', err.response.data);
            console.error('Response Status:', err.response.status);
        }
    }
};

test();
