import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pdf;
try {
    pdf = require('pdf-parse');
} catch (e) {
    try {
        pdf = require('pdf-parse/lib/pdf-parse.js');
    } catch (e2) {
        console.error("Critical: Could not load pdf-parse module");
    }
}
import mammoth from 'mammoth';
import multer from 'multer';

// Configure Multer for in-memory storage (we process files immediately)
const storage = multer.memoryStorage();
export const uploadCVs = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === 'application/pdf' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.mimetype === 'application/msword'
        ) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and Word documents are allowed.'));
        }
    }
}).array('resumes', 50); // Limit to 50 files

// Helper to extract text from buffer
const extractText = async (file) => {
    try {
        if (file.mimetype === 'application/pdf') {
            // pdf-parse can have different export structures depending on version/environment

            // 1. Support for mehmet-kozan/pdf-parse (v2.x) - Class based
            if (pdf && typeof pdf.PDFParse === 'function') {
                try {
                    const uint8Array = new Uint8Array(file.buffer);
                    const parser = new pdf.PDFParse(uint8Array);
                    if (typeof parser.load === 'function' && typeof parser.getText === 'function') {
                        await parser.load();
                        return await parser.getText();
                    }
                } catch (e) {
                    console.error("Newer PDFParse class initialization failed, trying older styles...");
                }
            }

            // 2. Traditional pdf-parse styles (v1.1.1 and simple wrappers)
            let pdfParser;
            if (typeof pdf === 'function') {
                pdfParser = pdf;
            } else if (pdf && typeof pdf.default === 'function') {
                pdfParser = pdf.default;
            } else if (pdf && pdf.pdf && typeof pdf.pdf === 'function') {
                pdfParser = pdf.pdf;
            } else if (pdf && typeof pdf.parse === 'function') {
                pdfParser = pdf.parse;
            }

            if (!pdfParser) {
                console.error('PDF Parse Error: No function/class found in module', {
                    type: typeof pdf,
                    keys: Object.keys(pdf || {})
                });
                return "";
            }

            const data = await pdfParser(file.buffer);
            return data.text || "";
        } else if (
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.mimetype === 'application/msword'
        ) {
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            return result.value;
        }
    } catch (error) {
        console.error(`Error extraction text from ${file.originalname}:`, error);
        return "";
    }
    return "";
};

// Main Analysis Logic (Method B: Smart Keyword Matching)
export const analyzeCVs = async (req, res) => {
    try {
        const { jobDescription, topN } = req.body;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({ message: "No resumes uploaded" });
        }
        if (!jobDescription) {
            return res.status(400).json({ message: "Job description is required" });
        }

        const limit = parseInt(topN) || 10;

        // 1. Extract Keywords from JD
        // Simple tokenizer: split by spaces, filter stop words, distinct
        const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'resume', 'cv', 'experience', 'year', 'years', 'skills', 'education', 'note', 'fees', 'refundable', 'under', 'any', 'other', 'against']);
        const jdWords = jobDescription.toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]]/g, " ") // Replace punctuation with space
            .split(/\s+/)
            .filter(w => w.length > 1 && !stopWords.has(w));

        const jdKeywords = [...new Set(jdWords)]; // Unique keywords

        console.log(`🔍 Extracted ${jdKeywords.length} keywords from JD:`, jdKeywords.slice(0, 20));

        const analysisResults = [];

        // 2. Process each file
        for (const file of files) {
            try {
                const text = await extractText(file);
                const lowerText = (text || "").toLowerCase();

                // Debug: Log first 200 chars of extracted text
                console.log(`📄 ${file.originalname}: Extracted ${text.length} chars`);

                // Calculate Score based on keyword matches
                let matchCount = 0;
                const foundKeywords = [];

                jdKeywords.forEach(keyword => {
                    try {
                        // Escape regex special characters in keyword
                        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
                        if (regex.test(lowerText)) {
                            matchCount++;
                            foundKeywords.push(keyword);
                        }
                    } catch (regErr) {
                        // Fallback to simple includes if regex fails
                        if (lowerText.includes(keyword.toLowerCase())) {
                            matchCount++;
                            foundKeywords.push(keyword);
                        }
                    }
                });

                // Calculate percentage match
                // If no keywords in JD, give a base score based on text length
                let score = 0;
                if (jdKeywords.length > 0) {
                    score = Math.round((matchCount / jdKeywords.length) * 100);
                } else if (text.length > 100) {
                    // Fallback: if JD has no keywords but resume has content
                    score = 50;
                }

                // Boost score if resume has substantial content
                if (text.length > 500 && score < 20) {
                    score = Math.min(score + 10, 100);
                }

                // Extract Name (Heuristic: First line or look for specific patterns, tough without AI)
                // Fallback: Filename
                // Simple Email extraction
                const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
                const email = emailMatch ? emailMatch[0] : "N/A";

                // Simple Phone extraction
                const phoneMatch = text.match(/(\+\d{1,3}[- ]?)?\d{10}/);
                const phone = phoneMatch ? phoneMatch[0] : "N/A";

                analysisResults.push({
                    fileName: file.originalname,
                    name: file.originalname.replace(/\.[^/.]+$/, ""), // Fallback name from file
                    email,
                    phone,
                    score,
                    matchedKeywords: foundKeywords.slice(0, 10), // Top 10 matched words
                    matchCount
                });
            } catch (fileErr) {
                console.error(`Error processing file ${file.originalname}:`, fileErr);
                // Push a failed state so the UI at least shows the file existed
                analysisResults.push({
                    fileName: file.originalname,
                    name: file.originalname.replace(/\.[^/.]+$/, ""),
                    email: "Error",
                    phone: "Error",
                    score: 0,
                    matchedKeywords: [],
                    matchCount: 0
                });
            }
        }
        analysisResults.sort((a, b) => b.score - a.score);

        // 4. Return Top N
        const topCandidates = analysisResults.slice(0, limit);

        res.status(200).json({
            totalProcessed: files.length,
            topCandidates
        });

    } catch (error) {
        console.error("CV Analysis Error:", error);
        res.status(500).json({ message: "Error analyzing resumes", error: error.message });
    }
};
