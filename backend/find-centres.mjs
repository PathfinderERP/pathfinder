import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URL);
const Centre = (await import('./models/Master_data/Centre.js')).default;

// Find HAZRA variants
const hazra = await Centre.find({ centreName: /hazra/i }, { centreName: 1, posKey: 1 });
console.log("Hazra variants:", hazra);

const diamond = await Centre.find({ centreName: /diamond/i }, { centreName: 1, posKey: 1 });
console.log("Diamond variants:", diamond);

const tamluk = await Centre.find({ centreName: /tamluk/i }, { centreName: 1, posKey: 1 });
console.log("Tamluk variants:", tamluk);

await mongoose.disconnect();
