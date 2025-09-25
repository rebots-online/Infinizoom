/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { GoogleGenAI, Modality } from "@google/genai";

const dataUrlToBase64 = (dataUrl: string): string => {
    const parts = dataUrl.split(',');
    if (parts.length > 1) {
        return parts[1];
    }
    return '';
}

export const serviceEnhance = async (croppedImageDataUrl: string, history: string[], hasFoundBanana:boolean): Promise<{ imageSrc: string, foundTheBanana: boolean }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = dataUrlToBase64(croppedImageDataUrl);
    const imagePart = {
        inlineData: {
            mimeType: 'image/png',
            data: base64Data,
        },
    };

    if (!history || history.length === 0) {
        console.error("Enhancement history is empty.");
        // Fallback to just returning the cropped image.
        return { imageSrc: croppedImageDataUrl, foundTheBanana: false };
    }

    const context = history[history.length-1];
  
    const generationPrompt = `The provided image is a low-resolution ${context ? 'photo of ' + context : 'image'}. Please upscale the image to a high-resolution, perfectly detailed image.

**DO NOT add any elements or render outside of the provided reference image subject.** The resulting image should be a clearer, higher-resolution version of the input, and nothing more and match in shapes and colors.

However, if the content of the image can't be determined, you are free to be creative and add objects or textures to match the shapes and colors within the image.
` + (hasFoundBanana ? '' : `
**Easter Egg:** There's a small chance you can hide a "nano banana" 🍌 in the image. Be subtle. If you add a banana, respond with the text part as a JSON object: \`{"foundTheBanana": true}\`. Otherwise, do not include a text part or set it to \`{"foundTheBanana": false}\`.`)

    console.log('generationPrompt',generationPrompt, 'wtgh?')
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {parts:[imagePart, {text:generationPrompt}]},
            config:{
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            }
        });

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0)
          throw new Error("No candidates returned from the API.");
        const contents = candidates[0].content;
        if (!contents) throw new Error("No contents returned from the API.");
        const parts = contents.parts;
        if (!parts) throw new Error("No parts returned from the API.");


        let foundTheBanana = false;
        let imageSrc = croppedImageDataUrl;

        for (const part of parts) {
          if (part.text) {
            try {
                const json = JSON.parse(part.text);
                if(json.foundTheBanana) {
                    foundTheBanana = true;
                }
            } catch(e) {
                // Ignore if parsing fails, it's probably not the JSON we want.
                console.log('Non-JSON text part from enhancement:', part.text);
            }
          } else if (part.inlineData) {
            const imageData = part.inlineData.data;
            imageSrc = `data:${part.inlineData.mimeType};base64,${imageData}`;
          }
        }
        
        return { imageSrc, foundTheBanana };

    } catch (error) {
        console.error("Error generating image with Gemini:", error);
        return { imageSrc: croppedImageDataUrl, foundTheBanana: false }; // Return original if generation fails
    }
};
