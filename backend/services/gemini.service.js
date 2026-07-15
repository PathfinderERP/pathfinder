import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Single-turn generation with system instruction injected into the prompt.
 * Compatible with @google/generative-ai v0.24.x
 */
export const generateAIResponse = async (prompt, systemInstruction = "") => {
    // Try gemini-3.1-pro-preview first, fallback to gemini-2.5-flash if 503/404 or other errors occur
    const modelsToTry = ["gemini-3.1-pro-preview", "gemini-2.5-flash"];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`Attempting Gemini generation using model: ${modelName}`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    maxOutputTokens: 8192,
                    temperature: 0.4,
                },
            });

            // Inject system instruction manually into the prompt for compatibility
            const fullPrompt = systemInstruction
                ? `${systemInstruction}\n\n---\n\n${prompt}`
                : prompt;

            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.warn(`Gemini model ${modelName} failed. Error:`, error.message || error);
            lastError = error;
        }
    }

    console.error("All Gemini models failed. Last error:", lastError);
    throw new Error("Failed to generate AI response");
};

/**
 * Multi-turn chat session with history support.
 */
export const startAIChat = async (history = [], systemInstruction = "") => {
    const model = genAI.getGenerativeModel({
        model: "gemini-3.1-pro-preview",
        generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.4,
        },
    });

    return model.startChat({
        history: history,
        ...(systemInstruction && {
            systemInstruction: systemInstruction
        }),
    });
};

/**
 * Send a message in an existing chat session.
 */
export const sendChatMessage = async (chatSession, message) => {
    try {
        const result = await chatSession.sendMessage(message);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        throw new Error("Failed to send chat message");
    }
};
