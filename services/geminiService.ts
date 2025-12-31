
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const refineIdentity = async (base64Image: string, prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: `Enhance this identity for a professional virtual camera output. ${prompt}` },
            { inlineData: { data: base64Image, mimeType: 'image/jpeg' } }
          ]
        }
      ],
      config: {
        systemInstruction: "You are a face restoration expert. Describe the lighting and anatomical features clearly for a mapping engine."
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Refinement Error:", error);
    return null;
  }
};

/**
 * Performs a face swap simulation using Gemini.
 * @param sourceBase64 The current webcam frame.
 * @param targetBase64 The persona identity face.
 * @param previousResultBase64 (Optional) The previous swapped frame for temporal consistency.
 */
export const performFaceSwap = async (sourceBase64: string, targetBase64: string, previousResultBase64?: string) => {
  try {
    const cleanSource = sourceBase64.includes(',') ? sourceBase64.split(',')[1] : sourceBase64;
    const cleanTarget = targetBase64.includes(',') ? targetBase64.split(',')[1] : targetBase64;
    const cleanPrevious = previousResultBase64?.includes(',') ? previousResultBase64.split(',')[1] : previousResultBase64;

    const parts: any[] = [
      {
        inlineData: {
          data: cleanSource,
          mimeType: 'image/jpeg',
        },
      },
      {
        inlineData: {
          data: cleanTarget,
          mimeType: 'image/jpeg',
        },
      }
    ];

    if (cleanPrevious) {
      parts.push({
        inlineData: {
          data: cleanPrevious,
          mimeType: 'image/jpeg',
        },
      });
    }

    parts.push({
      text: `ACTIVATE IDENTITY LOCK: 
      1. Image 1 is the CURRENT real-time webcam frame (Source).
      2. Image 2 is the TARGET persona identity (Identity).
      ${cleanPrevious ? '3. Image 3 is the PREVIOUS successful swap (Consistency Reference).' : ''}
      
      TASK: Replace ONLY the face in Image 1 with the features of Image 2. 
      STRICT CONSTRAINTS:
      - DO NOT change the background, hair, body, or clothing from Image 1.
      - DO NOT change the lighting or head orientation from Image 1.
      - ONLY morph the internal facial features (eyes, nose, mouth) to match Image 2.
      ${cleanPrevious ? '- Ensure the resulting face looks exactly like the face in Image 3 to maintain temporal consistency.' : ''}
      - Output ONLY the modified Image 1.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Gemini Face Swap Error:", error);
    return null;
  }
};
