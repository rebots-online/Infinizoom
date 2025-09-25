/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';
import { AppState } from '../types';

interface StatusBarProps {
  state: AppState;
  useFixedSelectionBox: boolean;
  isInitialState: boolean;
  onUploadClick: () => void;
}

const getStatusMessage = (state: AppState, useFixedSelectionBox:boolean): string => {
  switch (state) {
    case AppState.IDLE:
      return 'SYSTEM IDLE. AWAITING INPUT.';
    case AppState.LOADING:
      return 'LOADING INITIAL ASSETS... STANDBY...';
    case AppState.LOADED:
      return 'IMAGE LOADED. '+ (useFixedSelectionBox ? 'CLICK TO SELECT AREA TO ENHANCE' : 'DRAW SELECTION TO ENHANCE.');
    case AppState.SELECTING:
        return 'DEFINING SELECTION AREA...';
    case AppState.ENHANCING:
      return 'ANALYZING SELECTION... ENHANCING...';
    case AppState.ENHANCED:
      return 'APPLYING ENHANCEMENT...';
    default:
      return '...';
  }
};

export const StatusBar: React.FC<StatusBarProps> = ({ state, useFixedSelectionBox, isInitialState, onUploadClick }) => {
  // Special UI for the initial loaded state, combining the prompt and status
  if (state === AppState.LOADED && isInitialState) {
    return (
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-center text-green-400 font-mono tracking-widest text-sm border-t border-green-500/30 z-10 flex items-center justify-center h-12">
        <p className="hidden sm:block animate-pulse">Drag and drop a new image or click on the current one to begin</p>
        <button
          onClick={onUploadClick}
          className="block sm:hidden px-4 py-2 bg-green-500/20 border border-green-500/50 rounded text-green-300 hover:bg-green-500/30 transition-colors"
        >
          Select Image
        </button>
      </div>
    );
  }

  // Fallback to original status bar for all other states
  const message = getStatusMessage(state, useFixedSelectionBox);
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-center text-green-400 font-mono tracking-widest text-sm border-t border-green-500/30 z-10 flex items-center justify-center h-12">
        <p className="animate-pulse">{message}</p>
    </div>
  );
};
