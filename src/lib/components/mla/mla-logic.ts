export interface MlaConfig { dModel:number; numHeads:number; seqLen:number; latentDim:number; }
export function computeMlaShapes({dModel, seqLen, latentDim}: MlaConfig) {
  return {
    memorySaved: Math.round((1 - latentDim / (dModel*2)) * 100),
    kvCacheSizeMHA: seqLen * dModel * 2,
    kvCacheSizeMLA: seqLen * latentDim,
  };
}