import { writable } from 'svelte/store';

export const activeStep = writable<string>('');
export const hoveredId = writable<string | null>(null);
export const highlightId = writable<string | null>(null);

export const fullScreen = writable<boolean>(false);
export const activeDimensions = writable<string[]>([]);
export interface CellData { id: string; r: number; c: number; val: number; label?: string; }
export const inspectedCell = writable<CellData | null>(null);