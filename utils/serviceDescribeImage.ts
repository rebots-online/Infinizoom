/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { GoogleGenAI } from "@google/genai";
import { extractJson } from './extractJson';
import type { ImageDescription } from '../types';

const dataUrlToBlob = (dataUrl: string): {mimeType: string, data: string} => {
    const parts = dataUrl.split(',');
    const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const data = parts[1];
    return { mimeType, data };
}

export const serviceDescribeImage = async (imageDataUrl: string, history: ImageDescription[]): Promise<ImageDescription> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { mimeType, data: base64Data } = dataUrlToBlob(imageDataUrl);

    if (!base64Data) {
        console.error("Invalid image data URL provided to serviceDescribeImage.");
        return {selectionDescription:"user selected a region to enhance"}; // Fallback description
    }
    
    const imagePart = {
        inlineData: {
            mimeType,
            data: base64Data,
        },
    };
    
const textPart = {
    text: `You are an advanced image enhancement system. Your two tasks are:

1. **Selection Description:** Provide a precise, internal-use description of what the user has selected. Format this as: "The user selected...".

2. **Enhancement Prompt:** Write a short, non-narrative prompt for an image enhancement model. The model is a 'black box' and only receives your prompt and the cropped image. It cannot access history.

### Enhancement Prompt Rules

- **Camera Angle & Perspective:** Always provide a camera angle. Crucially, infer the most plausible perspective from the selection's context. For architectural features like windows, assume an **external perspective** (looking in) unless the image content or history clearly indicates an interior scene.

- **Content & Detail:**
  - If the selection is clear, provide a concise, high-level description of the image type and angle (e.g., "microscopic photography, close-up"). Do not describe the content itself.
  - If the selection is blurry or too zoomed in, provide a creative, plausible, and imprecise description of what could be in the frame. Avoid details about color or shape, allowing the enhancement model to infer them from the image's pixels. Example: a blurry section of water could suggest "a contour of a fish beneath the surface," while a blurry sky could suggest "the faint glow of a distant nebula."

- **Final Check:** Do not include a full narrative or describe anything outside the selection box. The prompt must be concise.

### Output
Return a JSON object in the following format:

\`\`\`json
{
  "selectionDescription": "string",
  "prompt": "string"
}
\`\`\`

Here's the selection history for your reference:

${history.length ? history.filter(Boolean).map((desc,index)=>`${index+1} - ${desc.selectionDescription}`).join('\n\n* ') : 'No current history, this is the first selection'}
`

};

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });
        const text = response.text.trim();

        const data = extractJson<ImageDescription>(text);
        
        if (!data) {
            return {selectionDescription:"user selected a region to enhance"};
        }
        return data;
    } catch (error) {
        console.error("Error describing image with Gemini:", error);
        return {selectionDescription:"user selected a region to enhance"}; // Fallback description on error
    }
};
