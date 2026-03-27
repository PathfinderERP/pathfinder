import fs from 'fs';

const text = fs.readFileSync('exports_data_extracted.txt', 'utf8');

// Clean up the heavily spaced text
const clean = text.replace(/[ \t]{2,}/g, ' ').replace(/\r/g, '');

// Find sections around "p2p" keyword
const lines = clean.split('\n');
for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/p2p|payment|api\/|endpoint|url|ezetap\.com|server/i.test(l) && l.trim().length > 5) {
        console.log(`L${i}: ${l.trim().substring(0, 300)}`);
    }
}
