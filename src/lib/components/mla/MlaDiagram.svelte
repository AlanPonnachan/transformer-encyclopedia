<script lang="ts">
  import Matrix from '$lib/atoms/Matrix.svelte';
  import MathLabel from '$lib/atoms/MathLabel.svelte';
  import { activeStep } from '$lib/stores/diagram';
  import { dModel, numHeads, seqLen, latentDim } from '$lib/stores/config';
  import { computeMlaShapes } from './mla-logic';
  import { derived } from 'svelte/store';
  const shapes = derived([dModel,numHeads,seqLen,latentDim], ([$d,$h,$s,$l]) => computeMlaShapes({dModel:$d,numHeads:$h,seqLen:$s,latentDim:$l}));
  $: step = $activeStep;
  const C=22, S=16;

  const eqnKV = String.raw`c_{KV}=XW_{DKV},\;K=c_{KV}W_{UK},\;V=c_{KV}W_{UV}`;
  const eqnCache = String.raw`\text{Cache: }\mathcal{O}(L\cdot d_{latent})\ll\mathcal{O}(L\cdot 2d_{model})`;
</script>

<div class="d">
  <div class="dt">Multi-Head Latent Attention <span class="b ds">DeepSeek V2/V3</span></div>
  <div class="cfg">
    d_model=<strong>{$dModel}</strong> | d_latent=<strong>{$latentDim}</strong> |
    compression=<strong>{(($latentDim/$dModel)*100).toFixed(0)}%</strong> |
    <span class="sv">KV saved≈<strong>{$shapes.memorySaved}%</strong></span>
  </div>

  <!-- Input -->
  <div class="sec" class:act={step===''||step==='mla-input'}>
    <div class="sl">① Input Embeddings</div>
    <Matrix rows={$seqLen} cols={7} cellSize={C} label="X" sublabel="[{$seqLen}×{$dModel}]" id="mla-x" highlight={step==='mla-input'||step===''}/>
  </div>

  <!-- KV Compression -->
  <div class="sec" class:act={step==='mla-compress'}>
    <div class="sl">② Down-project KV → Latent (this is what gets cached 💾)</div>
    <div class="row">
      <Matrix rows={$seqLen} cols={6} cellSize={S} label="X" id="x2" dimmed={step==='mla-compress'}/>
      <div class="arr">×W_DKV→</div>
      <div class="cache-box" class:glow={step==='mla-compress'}>
        <div class="cbadge">💾 KV Cache</div>
        <Matrix rows={$seqLen} cols={Math.max(2,Math.floor($latentDim/64))} cellSize={C} label="c_KV" sublabel="[{$seqLen}×{$latentDim}]" id="kv-lat" highlight={step==='mla-compress'}/>
        <div class="cmp"><span class="old">MHA: {$seqLen*$dModel*2}</span><span class="new">MLA: {$seqLen*$latentDim} ✓</span></div>
      </div>
    </div>
  </div>

  <!-- KV Expansion -->
  <div class="sec" class:act={step==='mla-expand'}>
    <div class="sl">③ Expand at inference (extra matmul, huge memory win)</div>
    <div class="row">
      <Matrix rows={$seqLen} cols={Math.max(2,Math.floor($latentDim/64))} cellSize={S} label="c_KV" id="kv-e" dimmed={step!=='mla-expand'&&step!==''}/>
      <div class="arr">→W_UK/UV→</div>
      <Matrix rows={$seqLen} cols={5} cellSize={S} label="K" sublabel="[{$seqLen}×{$dModel}]" id="K-exp" highlight={step==='mla-expand'} colorMode="signed"/>
      <Matrix rows={$seqLen} cols={5} cellSize={S} label="V" sublabel="[{$seqLen}×{$dModel}]" id="V-exp" highlight={step==='mla-expand'}/>
    </div>
  </div>

  <!-- Q compression -->
  <div class="sec" class:act={step==='mla-q'}>
    <div class="sl">④ Q Compression — training only, not cached</div>
    <div class="row">
      <Matrix rows={$seqLen} cols={6} cellSize={S} label="X" id="x-q"/>
      <div class="arr">→W_DQ→</div>
      <Matrix rows={$seqLen} cols={Math.max(2,Math.floor($latentDim/64))} cellSize={S} label="c_Q" sublabel="[{$seqLen}×{$latentDim}]" id="q-lat" highlight={step==='mla-q'}/>
      <div class="arr">→W_UQ→</div>
      <Matrix rows={$seqLen} cols={5} cellSize={S} label="Q" sublabel="[{$seqLen}×{$dModel}]" id="q-exp" highlight={step==='mla-q'} colorMode="signed"/>
    </div>
  </div>

  <div class="fml">
    <MathLabel math={eqnKV} display/>
    <MathLabel math={eqnCache} display/>
  </div>
</div>

<style>
  .d { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:1.25rem; height:100%; overflow-y:auto; display:flex; flex-direction:column; gap:1rem; }
  .dt { font-size:1rem; font-weight:700; color:var(--text); display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .b  { background:var(--accent); color:white; font-size:0.62rem; font-weight:700; padding:0.15em 0.5em; border-radius:4px; font-family:'JetBrains Mono',monospace; }
  .ds { background:var(--green); }
  .cfg{ font-family:'JetBrains Mono',monospace; font-size:0.7rem; color:var(--muted); flex-wrap:wrap; display:flex; gap:8px; }
  .cfg strong { color:var(--highlight); } .sv strong { color:var(--green); }
  .sec{ border:1px solid var(--border); border-radius:8px; padding:1rem; background:var(--bg); transition:border-color 0.3s; }
  .sec.act { border-color:var(--accent); }
  .sl { font-family:'JetBrains Mono',monospace; font-size:0.68rem; color:var(--muted); margin-bottom:0.75rem; }
  .row{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .arr{ font-size:0.7rem; color:var(--muted); font-family:'JetBrains Mono',monospace; white-space:nowrap; }
  .cache-box { display:flex; flex-direction:column; align-items:center; gap:6px; padding:10px; border:1.5px dashed var(--border); border-radius:8px; background:var(--surface); transition:border-color 0.3s; }
  .cache-box.glow { border-color:var(--green); }
  .cbadge { font-size:0.65rem; font-family:'JetBrains Mono',monospace; color:var(--green); font-weight:700; }
  .cmp { display:flex; flex-direction:column; gap:2px; }
  .old { font-size:0.58rem; font-family:'JetBrains Mono',monospace; color:var(--red); text-decoration:line-through; }
  .new { font-size:0.58rem; font-family:'JetBrains Mono',monospace; color:var(--green); font-weight:600; }
  .fml { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:1rem; }
</style>