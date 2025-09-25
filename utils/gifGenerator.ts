/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import {GIFEncoder, quantize, applyPalette} from 'https://unpkg.com/gifenc'
import type { Rect, HistoryStep } from '../types';

// Easing function for smooth animation
const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Interpolation function for Rect properties
const interpolateRect = (start: Rect, end: Rect, t: number): Rect => ({
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
    w: start.w + (end.w - start.w) * t,
    h: start.h + (end.h - start.h) * t,
});


const addFrameToGif = (gif, ctx:CanvasRenderingContext2D, delay:number) => {
  const { data, width, height } = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);

  const palette = quantize(data, 256)
  const indexed = applyPalette(data, palette)

  gif.writeFrame(indexed, width, height, {
    palette,
    delay
  })
}

export const generateZoomGif = async (history: HistoryStep[]): Promise<Blob> => {
    if (history.length < 2) {
        throw new Error("History must contain at least two steps to generate a GIF.");
    }
    
    // --- 1. Load all images from history ---
    const images = await Promise.all(
        history.map(step => new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = step.imageSrc;
        }))
    );

    // --- 2. Initialize GIF Encoder ---
    // Use the first selection rectangle to determine the GIF's aspect ratio.
    const firstSelectionRect = history[1].originalRect;
    if (!firstSelectionRect) {
        throw new Error("The second history step must have a selection rectangle.");
    }
    const gifAspectRatio = firstSelectionRect.h / firstSelectionRect.w;
    const gifWidth = 512;
    const gifHeight = Math.round(gifWidth * gifAspectRatio);
    
    const gif = GIFEncoder();
    const canvas = document.createElement('canvas');
    canvas.width = gifWidth;
    canvas.height = gifHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Could not get canvas context");

    const fps = 30;
    const zoomDuration = 1.0; // seconds
    const holdDuration = 0.5;   // seconds
    const zoomFrames = zoomDuration * fps;
    const holdFrames = holdDuration * fps;
    const frameDelay = 1000 / fps;

    // --- 3. Animate transitions between steps ---
    for (let i = 0; i < images.length - 1; i++) {
        const sourceImageForZoom = images[i];
        const nextEnhancedImage = images[i + 1];
        
        // The start rect is the full view of the current image.
        const startRect: Rect = { x: 0, y: 0, w: sourceImageForZoom.naturalWidth, h: sourceImageForZoom.naturalHeight };
        
        // The end rect is the selection that was made on the current image.
        const endRect = history[i + 1].originalRect;
        if (!endRect) continue; // Should not happen for steps > 0, but as a safeguard.

        // Animate Zoom from current image to the selected area.
        for (let f = 0; f < zoomFrames; f++) {
            const t = easeInOutCubic(f / zoomFrames);
            const currentRect = interpolateRect(startRect, endRect, t);
            
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, gifWidth, gifHeight);

            ctx.drawImage(
                sourceImageForZoom,
                currentRect.x, currentRect.y, currentRect.w, currentRect.h,
                0, 0, gifWidth, gifHeight
            );

            // Calculate the position and size of the selection box on the canvas for the current frame
            const scaleX = gifWidth / currentRect.w;
            const scaleY = gifHeight / currentRect.h;

            const rectOnCanvas = {
                x: (endRect.x - currentRect.x) * scaleX,
                y: (endRect.y - currentRect.y) * scaleY,
                w: endRect.w * scaleX,
                h: endRect.h * scaleY,
            };
            
            // Draw the selection box
            ctx.strokeStyle = '#EEE'; //  white
            ctx.lineWidth = 2; // Use a fixed line width for clarity
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(rectOnCanvas.x, rectOnCanvas.y, rectOnCanvas.w, rectOnCanvas.h);
            ctx.setLineDash([]); // Reset line dash

            addFrameToGif(gif, ctx, frameDelay);
        }
        
        // Hold on the new enhanced image that resulted from the zoom.
        for (let f = 0; f < holdFrames; f++) {
             ctx.fillStyle = 'black';
             ctx.fillRect(0, 0, gifWidth, gifHeight);
             ctx.drawImage(nextEnhancedImage, 0, 0, gifWidth, gifHeight);
             addFrameToGif(gif, ctx, frameDelay);
        }
    }

    // --- 4. Finalize and return GIF ---
    gif.finish();
    return new Blob([gif.bytesView()], { type: 'image/gif' });
};