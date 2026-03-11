import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Centre from './models/Master_data/Centre.js';

dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const user = await User.findOne({ role: { $in: ['superAdmin', 'Super Admin'] } });
        const centres = await Centre.find({});

        console.log(JSON.stringify({
            admin: user ? { name: user.name, id: user._id } : null,
            centres: centres.map(c => ({ name: c.centreName, id: c._id, code: c.enterCode }))
        }, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
check();
