import fs from 'fs';
import path from 'path';

const svgPath = 'frontend/src/assets/logo-1.svg';
const targetDir = 'backend/assets';
const targetPath = path.join(targetDir, 'logo.png');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

const svg = fs.readFileSync(svgPath, 'utf8');
// The xlink:href uses double quotes in the file view
const match = svg.match(/xlink:href="data:image\/png;base64,([^"]+)"/);

if (match) {
    fs.writeFileSync(targetPath, Buffer.from(match[1], 'base64'));
    console.log(`Extracted logo to ${targetPath}`);
} else {
    // Try single quotes just in case
    const matchSingle = svg.match(/xlink:href='data:image\/png;base64,([^']+)'/);
    if (matchSingle) {
        fs.writeFileSync(targetPath, Buffer.from(matchSingle[1], 'base64'));
        console.log(`Extracted logo to ${targetPath}`);
    } else {
        console.log('No embedded PNG found in SVG');
    }
}
