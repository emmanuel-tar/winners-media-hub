
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async generateMediaMetadata(description: string) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Given this church message description: "${description}", suggest a catchy spiritual title and 3 relevant tags.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedTitle: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["suggestedTitle", "tags"]
          }
        }
      });
      return JSON.parse(response.text);
    } catch (error) {
      console.error("Gemini Error:", error);
      return null;
    }
  }
};
