import { writable, derived } from 'svelte/store';
export const dModel      = writable(512);
export const numHeads    = writable(8);
export const seqLen      = writable(6);
export const latentRatio = writable(0.25);
export const headDim     = derived([dModel, numHeads], ([$d,$h]) => Math.floor($d/$h));
export const latentDim   = derived([dModel, latentRatio], ([$d,$r]) => Math.floor($d*$r));