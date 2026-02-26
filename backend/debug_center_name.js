import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const CentreSchema = new mongoose.Schema({
    centreName: String,
    enterCode: String
});
const Centre = mongoose.model('CentreSchema', CentreSchema);

async function checkCenterName() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const center = await Centre.findById("697088baabb4820c05aecdb2");
        if (center) {
            console.log(`Center Name: ${center.centreName}`);
        } else {
            console.log('Center not found');
        }
        await mongoose.disconnect();
    } catch (error) { }
}

checkCenterName();
