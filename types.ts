/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  LOADED = 'LOADED',
  SELECTING = 'SELECTING',
  ENHANCING = 'ENHANCING',
  ENHANCED = 'ENHANCED',
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ImageDescription {
    selectionDescription:string;
    prompt?:string;
}

export interface HistoryStep {
  imageSrc: string;
  description: ImageDescription | null;
  originalRect: Rect | null;
}
