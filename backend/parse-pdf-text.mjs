import fs from 'fs';

const text = fs.readFileSync('exports_data_extracted.txt', 'utf8');

// Remove the letter-spacing (lots of spaces between each character)
// The PDF was extracted with individual character spacing
// Let's collapse runs of spaces that are between single characters
const cleaned = text
    .replace(/\r\n/g, '\n')
    // Join lines that are single characters separated by massive spaces
    .replace(/([a-zA-Z0-9"':,{}\[\]._\-\/]) {10,}([a-zA-Z0-9"':,{}\[\]._\-\/])/g, '$1$2')
    .replace(/([a-zA-Z0-9"':,{}\[\]._\-\/]) {5,}([a-zA-Z0-9"':,{}\[\]._\-\/])/g, '$1$2')
    .replace(/([a-zA-Z0-9"':,{}\[\]._\-\/]) {2,}([a-zA-Z0-9"':,{}\[\]._\-\/])/g, '$1$2');

// Find JSON blocks with appKey
const matches = cleaned.match(/\{[^{}]*appKey[^{}]*\}/gs);
if (matches) {
    console.log("=== JSON blocks containing appKey ===");
    matches.slice(0, 5).forEach((m, i) => console.log(`\n--- Block ${i+1} ---\n${m}`));
}

// Search for "pushTo" patterns
const pushMatches = cleaned.match(/.{0,200}pushTo.{0,200}/gs);
if (pushMatches) {
    console.log("\n=== pushTo patterns ===");
    pushMatches.slice(0, 5).forEach((m, i) => console.log(`\n--- ${i+1} ---\n${m}`));
}

// Find actual endpoint line
const endpointMatches = cleaned.match(/.{0,50}(ezetap\.com|2\.0\/server).{0,100}/gs);
if (endpointMatches) {
    console.log("\n=== Endpoint lines ===");
    [...new Set(endpointMatches.slice(0, 10))].forEach(m => console.log(m));
}
