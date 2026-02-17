import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const getAiClient = () => {
  // process.env.API_KEY is defined globally by vite.config.ts during the build
  const apiKey = process.env.API_KEY || '';
  return new GoogleGenAI({ apiKey });
};

const cleanBase64 = (base64: string): string => {
  return base64.includes(',') ? base64.split(',')[1] : base64;
};

export const analyzePhoto = async (base64Image: string): Promise<AnalysisResult> => {
  const ai = getAiClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64(base64Image),
          },
        },
        {
          text: "You are GregTheBarber, an elite master stylist. Analyze this portrait for face shape and hair texture. Recommend 4 diverse, high-end haircut styles that would suit the subject perfectly. Return the analysis in JSON format.",
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          faceShape: { type: Type.STRING },
          hairTexture: { type: Type.STRING },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                whyItWorks: { type: Type.STRING },
                trendLevel: { type: Type.STRING, enum: ['Classic', 'Trending', 'Bold'] },
              },
              required: ["id", "name", "description", "whyItWorks", "trendLevel"]
            }
          }
        },
        required: ["faceShape", "hairTexture", "recommendations"]
      }
    }
  });

  try {
    const text = response.text;
    if (!text) throw new Error("Empty response from AI engine.");
    return JSON.parse(text) as AnalysisResult;
  } catch (e) {
    throw new Error("Analysis failed to parse: " + (e as Error).message);
  }
};

export const transformHairstyle = async (base64Image: string, styleName: string): Promise<string> => {
  const ai = getAiClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: cleanBase64(base64Image),
            mimeType: 'image/jpeg',
          },
        },
        {
          text: `Professional hair-stylist edit: Keep the person's exact face, eyes, and skin features. Change ONLY the hairstyle to a perfectly groomed ${styleName}. Use cinematic barbershop lighting. High contrast, photorealistic, sharp focus on the hair edges. The hairstyle must look like a real master-barber cut it.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  
  throw new Error("Visualizer engine error: Failed to generate stylized image.");
};