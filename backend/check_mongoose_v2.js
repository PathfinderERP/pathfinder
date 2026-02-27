import fs from 'fs';
import path from 'path';

function checkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            checkDir(fullPath);
        } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('mongoose') && !content.includes('import mongoose') && !content.includes('require(\'mongoose\'')) {
                console.log(`FOUND IN: ${fullPath}`);
            }
        }
    });
}

checkDir('c:/Users/USER/erp_1/backend/models');
checkDir('c:/Users/USER/erp_1/backend/controllers/leadManagement');
