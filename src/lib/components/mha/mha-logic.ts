import { makeMatrix, softmax } from '$lib/math/utils';
export interface MhaConfig { dModel:number; numHeads:number; seqLen:number; }
export function computeMhaShapes({dModel, numHeads, seqLen}: MhaConfig) {
  return { headDim: Math.floor(dModel/numHeads), input:[seqLen,dModel] as [number,number] };
}
export function fakeAttentionWeights(seqLen: number, headIdx: number): number[][] {
  const raw = makeMatrix(seqLen, seqLen, headIdx*17+5);
  return raw.map((row, r) => softmax(row.map((v,c) => c<=r ? v*3 : -1e9)));
}