
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const generateAIResponse = async (prompt, systemInstruction = "") => {
    try {
        const fullPrompt = systemInstruction 
            ? `System: ${systemInstruction}\n\nUser: ${prompt}`
            : prompt;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini AI Error:", error);
        throw new Error("Failed to generate AI response");
    }
};

export const startAIChat = async (history = []) => {
    return model.startChat({
        history: history,
        generationConfig: {
            maxOutputTokens: 1000,
        },
    });
};
