import axios from 'axios';

const test = async () => {
    try {
        const res = await axios.get('http://localhost:5000/api/red-flags');
        console.log('Status:', res.status);
        console.log('Data:', res.data);
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Response Data:', err.response.data);
            console.error('Response Status:', err.response.status);
        }
    }
};

test();
