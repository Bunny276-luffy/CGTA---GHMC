import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API with the Vite environment variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Helper function to convert a standard base64 data URL
 * (e.g., "data:image/jpeg;base64,/9j/4AAQSk...")
 * into the format required by the Gemini API.
 */
const base64ToGenerativePart = (base64String) => {
    // Split the data URL into its parts
    const [header, base64Data] = base64String.split(',');

    // Extract the mime type (e.g., "image/jpeg" or "image/png")
    const mimeType = header.split(':')[1].split(';')[0];

    return {
        inlineData: {
            data: base64Data,
            mimeType
        },
    };
};

/**
 * Analyzes an image and returns a clear, concise description
 * suitable for a civic grievance report.
 * @param {string} imageBase64DataUrl - The base64 data URL string of the image.
 * @returns {Promise<string>} The AI generated description.
 */
export const analyzeImageForGrievance = async (imageBase64DataUrl) => {
    if (!apiKey) {
        throw new Error("Gemini API key is missing. Please check your .env file.");
    }

    try {
        // We use gemini-2.5-flash as it is the recommended model for general multimodal tasks and is very fast
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            You are an AI assistant for a national civic grievance portal (CGTA).
            Analyze this image and provide a highly clear, concise, and actionable single paragraph description of the issue shown.
            Focus on what the problem is, its severity, and where it appears to be located relative to its surroundings if visible.
            Do not use conversational filler, just provide the description. Keep it under 3 sentences.
        `;

        const imagePart = base64ToGenerativePart(imageBase64DataUrl);

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error asking Gemini to analyze the image:", error);
        throw error;
    }
};

/**
 * Cleans up and professionally formats a potentially messy 
 * transcript from browser voice dictation.
 * @param {string} rawTranscript - The raw text from the Speech Recognition API.
 * @returns {Promise<string>} The cleaned up, professional text.
 */
export const enhanceGrievanceAudioText = async (rawTranscript) => {
    if (!apiKey) {
        throw new Error("Gemini API key is missing. Please check your .env file.");
    }

    if (!rawTranscript || rawTranscript.trim() === '') return '';

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            You are an AI assistant for a national civic grievance portal (CGTA).
            A citizen has used voice dictation to report an issue. The following text is the raw, unedited automatic transcript. It may contain errors, rambling, or strange formatting.
            Please clean up this text to make it sound professional, extremely clear, and actionable. Fix any spelling or grammar mistakes. 
            Keep the original intent and details, but format it as a proper public grievance report description.
            Do not add conversational filler, just provide the cleaned up text.

            Raw Transcript:
            "${rawTranscript}"
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error asking Gemini to enhance text:", error);
        throw new Error("Failed to enhance text using AI.");
    }
};

/**
 * Analyzes a grievance description and optional image to categorize it,
 * determine urgency, and provide a short summary.
 * Returns a JSON parsed object.
 */
export const categorizeGrievance = async (description, imageBase64DataUrl = null) => {
    if (!apiKey) return null;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            You are a civic grievance classification AI acting as a Deccani-NLP Classifier model specializing in Code-Mixed Hyderabad slang (English + Telugu + Urdu).
            Analyze the following grievance description${imageBase64DataUrl ? " and attached image" : ""}.
            
            Description: "${description}"
            
            Return ONLY a valid JSON object with EXACTLY these three keys:
            "category": Must be one of ["Roads and Buildings", "Sanitation", "Water Supply", "Electricity", "Parks and Gardens", "General Administration"]. Choose the best fit based on your Deccani language understanding.
            "urgency": Must be one of ["Low", "Medium", "High", "Critical"]. Strongly consider keywords like "Open Manhole", "Live Wire", "Fire", "Emergency", "Flood" to automatically score severity as "High" or "Critical".
            "summary": A very brief 1-sentence synopsis of the issue (max 15 words) translated into formal English.
            
            Do not include Markdown formatting like \`\`\`json. Just return the raw JSON string.
        `;

        const parts = [prompt];
        if (imageBase64DataUrl) {
            parts.push(base64ToGenerativePart(imageBase64DataUrl));
        }

        const result = await model.generateContent(parts);
        const responseText = result.response.text();

        // Clean markdown if Gemini accidentally included it
        const cleanedText = responseText.replace(/```json/i, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Error categorizing grievance:", error);
        return null; // Fail gracefully so it doesn't block submission
    }
};
