const formatAIResponseInline = (text) => {
    if (!text) return null;
    const parts = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    let lastIndex = 0;
    let match;

    console.log(`Input: "${text}"`);
    while ((match = regex.exec(text)) !== null) {
        console.log(`Match: "${match[0]}" at ${match.index}`);
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        const raw = match[0];
        if (raw.startsWith('**')) {
            parts.push(`[BOLD:${raw.slice(2, -2)}]`);
        } else if (raw.startsWith('*')) {
            parts.push(`[ITALIC:${raw.slice(1, -1)}]`);
        } else if (raw.startsWith('`')) {
            parts.push(`[CODE:${raw.slice(1, -1)}]`);
        }
        lastIndex = match.index + raw.length;
    }
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }
    return parts;
};

const text1 = "  **Total Leads:** 75,506";
const text2 = "  **Hot Leads:** 24,351 (32.25% of total) - Leads highly likely to convert.";

console.log("text1 result:", formatAIResponseInline(text1).join(""));
console.log("text2 result:", formatAIResponseInline(text2).join(""));
