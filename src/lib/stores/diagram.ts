import { writable } from 'svelte/store';
export const activeStep  = writable<string>('');
export const hoveredId   = writable<string | null>(null);
export const highlightId = writable<string | null>(null);