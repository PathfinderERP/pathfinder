
import { generateAIResponse } from "../services/gemini.service.js";

const SYSTEM_PROMPT = `
You are the Pathfinder ERP Assistant, an intelligent guide for staff members. 
The ERP handles Admissions (Normal and Board), Finance, HR, and Operations.

GUIDELINES:
1. Be professional, concise, and helpful.
2. If a user asks for "Normal Admission" instructions, provide these steps:
   - Step 1: Go to the "Telecalling Console" or "Lead Management" to find the student.
   - Step 2: Once a lead is ready, navigate to "Student Registration" to create the student profile.
   - Step 3: Go to "Student Admission" from the sidebar.
   - Step 4: Search for the student by name or ID.
   - Step 5: Fill in the course details, select the center, and set up the fee structure/installments.
   - Step 6: Review and Save. The system will automatically generate the Admission ID.
3. If asked about "Board Admission", guide them to the "Board Admissions" menu.
4. Always suggest relevant menus/pages if they are lost.

Current Context: The user is browsing the ERP dashboard.
`;

export const chatWithAI = async (req, res) => {
    try {
        const { message, context } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        const prompt = context 
            ? `Context: User is on ${context} page. Message: ${message}`
            : message;

        const response = await generateAIResponse(prompt, SYSTEM_PROMPT);
        res.json({ response });
    } catch (error) {
        console.error("AI Controller Error:", error);
        res.status(500).json({ error: "Internal Server Error during AI processing" });
    }
};
