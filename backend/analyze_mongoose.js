import fs from 'fs';
import path from 'path';

const dir = 'c:/Users/USER/erp_1/backend';

function checkFile(filePath) {
    if (filePath.includes('node_modules')) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let hasMongooseImport = false;
    let usesMongoose = false;

    lines.forEach(line => {
        if (line.includes('import mongoose') || line.includes('require(\'mongoose\'')) {
            hasMongooseImport = true;
        }
        if (line.match(/\bmongoose\b/)) {
            usesMongoose = true;
        }
    });

    if (usesMongoose && !hasMongooseImport) {
        // Double check if it's just a comment
        const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
        if (cleanContent.match(/\bmongoose\b/) && !cleanContent.includes('import mongoose') && !cleanContent.includes('require(\'mongoose\'')) {
            console.log(`POORLY DEFINED IN: ${filePath}`);
        }
    }
}

function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else if (item.endsWith('.js')) {
            checkFile(fullPath);
        }
    });
}

traverse(dir);
