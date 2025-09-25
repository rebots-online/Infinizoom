/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import type { Rect } from '../types';

export const imageToDataUrl=(image:HTMLImageElement)=>{
  return cropImage(image, {x:0,y:0,w:image.naturalWidth,h:image.naturalHeight }, image.naturalWidth, image.naturalHeight, false)
}

export const cropImage = (
  image: HTMLImageElement,
  cropRect: Rect,
  targetWidth: number,
  targetHeight: number,
  pixelated: boolean
): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return resolve('');
    }
    
    if (pixelated) {
      ctx.imageSmoothingEnabled = false;
    }

    ctx.drawImage(
      image,
      cropRect.x,
      cropRect.y,
      cropRect.w,
      cropRect.h,
      0,
      0,
      targetWidth,
      targetHeight
    );

    resolve(canvas.toDataURL('image/png'));
  });
};
