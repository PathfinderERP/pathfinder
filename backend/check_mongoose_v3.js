import fs from 'fs';
import path from 'path';

function checkDir(dir) {
    if (dir.includes('node_modules')) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            checkDir(fullPath);
        } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Match mongoose. but skip if it's imported or required
            if (content.match(/mongoose\./) && !content.includes('import mongoose') && !content.includes('require(\'mongoose\'')) {
                console.log(`FOUND IN: ${fullPath}`);
                // Print the line
                const lines = content.split('\n');
                lines.forEach((line, i) => {
                    if (line.includes('mongoose.')) {
                        console.log(`  L${i + 1}: ${line.trim()}`);
                    }
                })
            }
        }
    });
}

checkDir('c:/Users/USER/erp_1/backend');
