import fs from 'fs';
import path from 'path';

const distDir = './dist/assets';
const files = fs.readdirSync(distDir);
const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));

if (jsFile) {
    const filePath = path.join(distDir, jsFile);
    console.log(`Reading file: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');

    // Find all occurrences of require(
    const regex = /require\([^)]*\)/g;
    const matches = content.match(regex);
    console.log(`Total require(...) matches found: ${matches ? matches.length : 0}`);
    if (matches) {
        matches.forEach((m, idx) => {
            // Find context (100 chars before and after)
            const pos = content.indexOf(m);
            const context = content.substring(Math.max(0, pos - 80), Math.min(content.length, pos + 100));
            console.log(`\nMatch ${idx + 1}: ${m}`);
            console.log(`Context: ... ${context.replace(/\s+/g, ' ')} ...`);
        });
    }
} else {
    console.log('No index JS file found in dist/assets');
}
