import axios from 'axios';

const test = async () => {
    try {
        const res = await axios.get('http://localhost:5000/');
        console.log('Root Status:', res.status);
        console.log('Root Data:', res.data);
    } catch (err) {
        console.error('Error:', err.message);
    }
};

test();
