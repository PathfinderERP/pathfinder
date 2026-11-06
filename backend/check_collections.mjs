import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function check() {
    await mongoose.connect(process.env.MONGO_URL);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name).filter(n => n.toLowerCase().includes('attend') || n.toLowerCase().includes('punch') || n.toLowerCase().includes('biometric')));

    await mongoose.disconnect();
}
check().catch(console.error);
