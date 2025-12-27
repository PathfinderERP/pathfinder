import { generateOfferLetter } from './offerLetter.js';
import { generateAppointmentLetter } from './appointmentLetter.js';
import { generateContractLetter } from './contractLetter.js';
import { generateExperienceLetter } from './experienceLetter.js';
import { generateReleaseLetter } from './releaseLetter.js';
import { generateVirtualId } from './virtualId.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use OS temporary directory to avoid local folder dependency
const uploadDir = path.join(os.tmpdir(), 'pathfinder-letters');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

export const getUploadDir = () => uploadDir;

export default {
    generateOfferLetter,
    generateAppointmentLetter,
    generateContractLetter,
    generateExperienceLetter,
    generateReleaseLetter,
    generateVirtualId
};
