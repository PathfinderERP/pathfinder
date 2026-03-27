import fs from 'fs';

const text = fs.readFileSync('exports_data_extracted.txt', 'utf8').replace(/\s{2,}/g, ' ');

// Extract all URLs
const urls = text.match(/https?:\/\/[^\s"'<>]+/g);
if (urls) {
    console.log("=== All URLs found in PDF ===");
    console.log([...new Set(urls)].join('\n'));
}

// Extract key API endpoint patterns
console.log("\n=== Endpoint patterns ===");
const endpoints = text.match(/\/api\/[^\s"'<>)]+/g);
if (endpoints) {
    console.log([...new Set(endpoints)].join('\n'));
}

// Look for demo server pattern
const demos = text.match(/demo\.ezetap[^\s"'<>)]{0,100}/g);
if (demos) {
    console.log("\n=== Demo patterns ===");
    console.log([...new Set(demos)].join('\n'));
}
