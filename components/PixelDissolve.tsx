/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useEffect, useCallback } from 'react';

interface PixelDissolveProps {
  lowResSrc: string;
  highResSrc: string;
  onComplete: () => void;
}

export const PixelDissolve: React.FC<PixelDissolveProps> = ({ lowResSrc, highResSrc, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  const startAnimation = useCallback((lowResImg: HTMLImageElement, highResImg: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if(!parent) return;

    const { width, height } = parent.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    
    const offscreenLow = document.createElement('canvas');
    const offscreenHigh = document.createElement('canvas');
    offscreenLow.width = canvas.width;
    offscreenLow.height = canvas.height;
    offscreenHigh.width = canvas.width;
    offscreenHigh.height = canvas.height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const ctxLow = offscreenLow.getContext('2d', { willReadFrequently: true });
    const ctxHigh = offscreenHigh.getContext('2d', { willReadFrequently: true });

    if (!ctx || !ctxLow || !ctxHigh) return;

    ctxLow.imageSmoothingEnabled = false;
    ctxLow.drawImage(lowResImg, 0, 0, canvas.width, canvas.height);

    ctxHigh.imageSmoothingEnabled = true;
    ctxHigh.drawImage(highResImg, 0, 0, canvas.width, canvas.height);
    
    const lowData = ctxLow.getImageData(0, 0, canvas.width, canvas.height);
    const highData = ctxHigh.getImageData(0, 0, canvas.width, canvas.height);
    
    ctx.putImageData(lowData, 0, 0);

    const totalPixels = canvas.width * canvas.height;
    const pixelIndices = Array.from({ length: totalPixels }, (_, i) => i);

    // Fisher-Yates shuffle
    for (let i = pixelIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pixelIndices[i], pixelIndices[j]] = [pixelIndices[j], pixelIndices[i]];
    }
    
    let currentPixel = 0;
    const pixelsPerFrame = Math.max(1, Math.ceil(totalPixels / 60)); // Aim for a ~1s transition, ensure at least 1 pixel per frame

    const animate = () => {
        if (!canvasRef.current) return; // Stop if component unmounted

        if (currentPixel >= totalPixels) {
            ctx.putImageData(highData, 0, 0);
            onComplete();
            return;
        }

        const endPixel = Math.min(currentPixel + pixelsPerFrame, totalPixels);
        for (let i = currentPixel; i < endPixel; i++) {
            const pIndex = pixelIndices[i] * 4;
            if (lowData.data.length > pIndex + 3 && highData.data.length > pIndex + 3) {
                lowData.data[pIndex] = highData.data[pIndex];
                lowData.data[pIndex + 1] = highData.data[pIndex + 1];
                lowData.data[pIndex + 2] = highData.data[pIndex + 2];
                lowData.data[pIndex + 3] = highData.data[pIndex + 3];
            }
        }

        ctx.putImageData(lowData, 0, 0);
        currentPixel = endPixel;
        animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();

  }, [onComplete]);


  useEffect(() => {
    let lowResImg: HTMLImageElement;
    let highResImg: HTMLImageElement;

    const lowPromise = new Promise<HTMLImageElement>(resolve => {
        lowResImg = new Image();
        lowResImg.crossOrigin = "anonymous";
        lowResImg.src = lowResSrc;
        lowResImg.onload = () => resolve(lowResImg);
    });

    const highPromise = new Promise<HTMLImageElement>(resolve => {
        highResImg = new Image();
        highResImg.crossOrigin = "anonymous";
        highResImg.src = highResSrc;
        highResImg.onload = () => resolve(highResImg);
    });
    
    Promise.all([lowPromise, highPromise]).then(([loadedLow, loadedHigh]) => {
        startAnimation(loadedLow, loadedHigh);
    });

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [lowResSrc, highResSrc, startAnimation]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};
