
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Single-turn generation with system instruction injected into the prompt.
 * Compatible with @google/generative-ai v0.24.x
 */
export const generateAIResponse = async (prompt, systemInstruction = "") => {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            generationConfig: {
                maxOutputTokens: 2048,
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
        console.error("Gemini AI Error:", error);
        throw new Error("Failed to generate AI response");
    }
};

/**
 * Multi-turn chat session with history support.
 */
export const startAIChat = async (history = [], systemInstruction = "") => {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
            maxOutputTokens: 2048,
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
