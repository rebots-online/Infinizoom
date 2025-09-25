/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';

export const DropZone: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-green-500/50 rounded-lg text-center p-8">
        <h2 className="text-2xl font-bold text-green-400 mb-2">[ CSI Image Enhancer v2.5 ]</h2>
        <p className="text-green-500">Awaiting Image Input...</p>
        <p className="text-sm text-green-600 mt-4">Drag & Drop an image file anywhere on this screen to begin analysis.</p>
    </div>
  );
};
