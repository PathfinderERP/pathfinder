const parseMarkdownBlocks = (text) => {
    if (!text) return [];
    const lines = text.split('\n');
    const blocks = [];
    let currentTable = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith('|')) {
            let cells = line.split('|').map(c => c.trim());
            if (cells[0] === '') cells.shift();
            if (cells[cells.length - 1] === '') cells.pop();

            const isSeparator = cells.every(cell => cell === '' || /^:?-+:?$/.test(cell));

            if (isSeparator) {
                continue;
            }

            if (!currentTable) {
                currentTable = { type: 'table', headers: cells, rows: [] };
            } else {
                currentTable.rows.push(cells);
            }
        } else {
            if (currentTable) {
                blocks.push(currentTable);
                currentTable = null;
            }

            if (trimmed.startsWith('### ')) {
                blocks.push({ type: 'h5', text: line.slice(4) });
            } else if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
                const cleanLine = trimmed.startsWith('## ') ? line.slice(3) : line.slice(2);
                blocks.push({ type: 'h4', text: cleanLine });
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                // Wait! If the line has leading spaces, where does the list item text start?
                // Let's see: we should slice after the first occurrence of '-' or '*'!
                const index = line.indexOf(trimmed.startsWith('-') ? '-' : '*');
                blocks.push({ type: 'li', text: line.slice(index + 2) });
            } else if (/^\d+\.\s/.test(trimmed)) {
                const match = trimmed.match(/^(\d+)\.\s(.*)$/);
                if (match) {
                    blocks.push({ type: 'ol', num: match[1], text: match[2] });
                } else {
                    blocks.push({ type: 'p', text: line });
                }
            } else if (trimmed === '---' || trimmed === '***') {
                blocks.push({ type: 'hr' });
            } else if (!trimmed) {
                blocks.push({ type: 'empty' });
            } else {
                blocks.push({ type: 'p', text: line });
            }
        }
    }

    if (currentTable) {
        blocks.push(currentTable);
    }

    return blocks;
};

const rawResponse = `Pathfinder AI at your service! I've analyzed the live ERP data regarding lead generation.

---

### Lead Generation Analysis: Current State & Insights

*   **Total Leads:** 75,506
*   **Hot Leads:** 24,351 (32.25% of total) - Leads highly likely to convert.
*   **Warm Leads:** 12,740 (16.87% of total) - Leads showing interest.`;

console.log("Parsed Blocks:");
console.log(JSON.stringify(parseMarkdownBlocks(rawResponse), null, 2));
