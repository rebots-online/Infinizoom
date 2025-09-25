/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Rect } from '../types';

interface ImageDisplayProps {
  imageSrc: string;
  onSelect: (originalRect: Rect, screenRect: Rect, canvasDataUrl: string) => void;
  isEnhancing: boolean;
  historicalSelection?: Rect | null;
  useFixedSelectionBox: boolean;
  fixedSelectionSizePercentage: number;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ imageSrc, onSelect, isEnhancing, historicalSelection, useFixedSelectionBox, fixedSelectionSizePercentage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [selection, setSelection] = useState<Rect | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  
  // Load image from src
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => setImage(img);
  }, [imageSrc]);

  const getCanvasScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return { scale: 1, offsetX: 0, offsetY: 0, dWidth: 0, dHeight: 0 };
    
    const { width: canvasWidth, height: canvasHeight } = canvas.getBoundingClientRect();

    const canvasAspect = canvasWidth / canvasHeight;
    const imageAspect = image.naturalWidth / image.naturalHeight;
    
    let dWidth, dHeight, offsetX, offsetY;

    if (canvasAspect > imageAspect) {
      dHeight = canvasHeight;
      dWidth = dHeight * imageAspect;
    } else {
      dWidth = canvasWidth;
      dHeight = dWidth / imageAspect;
    }
    
    offsetX = (canvasWidth - dWidth) / 2;
    offsetY = (canvasHeight - dHeight) / 2;
    const scale = dWidth / image.naturalWidth;
    
    return { scale, offsetX, offsetY, dWidth, dHeight };
  }, [image]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !image) return;
    
    const dpr = window.devicePixelRatio || 1;
    // The context is scaled, so we clear using CSS dimensions
    const { width: cssWidth, height: cssHeight } = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    
    const { scale, offsetX, offsetY, dWidth, dHeight } = getCanvasScale();
    
    ctx.drawImage(image, offsetX, offsetY, dWidth, dHeight);

    if (selection) {
      ctx.strokeStyle = '#39FF14'; // Neon green
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(selection.x, selection.y, selection.w, selection.h);
      ctx.setLineDash([]);
      
      // Draw labels
      ctx.font = '10px "Fira Code", monospace';
      const info = `x:${Math.round(selection.x)} y:${Math.round(selection.y)} w:${Math.round(selection.w)} h:${Math.round(selection.h)}`;
      const textMetrics = ctx.measureText(info);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(selection.x -1, selection.y - 14, textMetrics.width + 4, 12);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(info, selection.x + 1, selection.y - 4);
    } else if (historicalSelection) {
      const screenRect = {
          x: historicalSelection.x * scale + offsetX,
          y: historicalSelection.y * scale + offsetY,
          w: historicalSelection.w * scale,
          h: historicalSelection.h * scale,
      };

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenRect.x, screenRect.y, screenRect.w, screenRect.h);
      
      ctx.font = '10px "Fira Code", monospace';
      const info = `PREV. CROP`;
      const textMetrics = ctx.measureText(info);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(screenRect.x - 1, screenRect.y - 14, textMetrics.width + 4, 12);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(info, screenRect.x + 1, screenRect.y - 4);
    }
  }, [image, selection, getCanvasScale, historicalSelection]);

  // Resize and draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const { width, height } = parent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
        }
        
        draw();
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [draw, image]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isEnhancing) return;
    const pos = getMousePos(e);

    if (useFixedSelectionBox) {
        if (!image) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { scale, offsetX, offsetY, dWidth, dHeight } = getCanvasScale();

        // Check if click is inside the image area on canvas
        if (pos.x < offsetX || pos.x > offsetX + dWidth || pos.y < offsetY || pos.y > offsetY + dHeight) {
            return;
        }
        
        // Convert click position to original image coordinates
        const originalClickX = (pos.x - offsetX) / scale;
        const originalClickY = (pos.y - offsetY) / scale;
        
        // Calculate fixed box dimensions in original image coordinates
        const boxWidth = image.naturalWidth * fixedSelectionSizePercentage;
        const boxHeight = image.naturalHeight * fixedSelectionSizePercentage; // This preserves the original image aspect ratio
        
        // Center the box on the click, then clamp to image boundaries
        let originalX = originalClickX - boxWidth / 2;
        let originalY = originalClickY - boxHeight / 2;
        
        if (originalX < 0) originalX = 0;
        if (originalY < 0) originalY = 0;
        if (originalX + boxWidth > image.naturalWidth) originalX = image.naturalWidth - boxWidth;
        if (originalY + boxHeight > image.naturalHeight) originalY = image.naturalHeight - boxHeight;
        
        const originalRect: Rect = {
            x: originalX,
            y: originalY,
            w: boxWidth,
            h: boxHeight
        };
        
        // Calculate screen rect for the animation
        const screenRect: Rect = {
            x: originalRect.x * scale + offsetX,
            y: originalRect.y * scale + offsetY,
            w: originalRect.w * scale,
            h: originalRect.h * scale,
        };
        
        // Manually draw the selection box so it's included in the data URL
        ctx.strokeStyle = '#39FF14';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(screenRect.x, screenRect.y, screenRect.w, screenRect.h);
        ctx.setLineDash([]);
        
        const canvasDataUrl = canvas.toDataURL('image/png');
        
        // Redraw the canvas without the temporary box to restore visual consistency
        draw();
        
        onSelect(originalRect, screenRect, canvasDataUrl);

    } else {
        setStartPoint(pos);
        setSelection({ ...pos, w: 0, h: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (useFixedSelectionBox || !startPoint || isEnhancing) return;
    const pos = getMousePos(e);
    const x = Math.min(pos.x, startPoint.x);
    const y = Math.min(pos.y, startPoint.y);
    const w = Math.abs(pos.x - startPoint.x);
    const h = Math.abs(pos.y - startPoint.y);
    setSelection({ x, y, w, h });
  };

  const handleMouseUp = () => {
    if (useFixedSelectionBox) return;

    if (!selection || !image || selection.w < 10 || selection.h < 10 || isEnhancing) {
      setStartPoint(null);
      setSelection(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { scale, offsetX, offsetY } = getCanvasScale();
    const originalRect: Rect = {
        x: (selection.x - offsetX) / scale,
        // FIX: Corrected typo from 'offxsetY' to 'offsetY'.
        y: (selection.y - offsetY) / scale,
        w: selection.w / scale,
        h: selection.h / scale
    };
    
    const canvasDataUrl = canvas.toDataURL('image/png');
    onSelect(originalRect, selection, canvasDataUrl);

    setStartPoint(null);
    setSelection(null);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`max-w-full max-h-full w-full h-full transition-[filter] duration-700 ${isEnhancing ? 'filter brightness-50 cursor-wait' : 'filter brightness-100 ' + (useFixedSelectionBox ? 'cursor-zoom-in' : 'cursor-crosshair')}`}
    />
  );
};