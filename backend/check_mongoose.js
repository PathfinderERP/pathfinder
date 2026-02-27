import fs from 'fs';
import path from 'path';

const dir = 'c:/Users/USER/erp_1/backend/controllers/leadManagement';
const files = fs.readdirSync(dir);

files.forEach(file => {
    if (file.endsWith('.js')) {
        const content = fs.readFileSync(path.join(dir, file), 'utf8');
        if (content.includes('mongoose') && !content.includes('import mongoose')) {
            console.log(`FOUND IN: ${file}`);
        }
    }
});
