<script lang="ts">
  import Matrix from '$lib/atoms/Matrix.svelte';
  import MathLabel from '$lib/atoms/MathLabel.svelte';
  import DiagramControls from '$lib/components/common/DiagramControls.svelte';
  import { activeStep, activeDimensions } from '$lib/stores/diagram';
  import { dModel, seqLen, latentDim, latentRatio } from '$lib/stores/config';
  import { computeMlaShapes } from './mla-logic';
  import { derived } from 'svelte/store';
  import { tick } from 'svelte';

  const shapes = derived([dModel,seqLen,latentDim], ([$d,$s,$l]) => computeMlaShapes({dModel:$d,numHeads:1,seqLen:$s,latentDim:$l}));
  $: step = $activeStep || 'mla-input';
  const C=22, S=16;

  const eqnKV = String.raw`c_{KV}=XW_{DKV},\;K=c_{KV}W_{UK},\;V=c_{KV}W_{UV}`;
  const eqnCache = String.raw`\text{Cache: }\mathcal{O}(L\cdot d_{latent})\ll\mathcal{O}(L\cdot 2d_{model})`;

  let viewport: HTMLElement;
  let sectionRefs: Record<string, HTMLElement> = {};
  let panY = 0;

  $: updateCamera(step);

  async function updateCamera(p: string) {
    await tick();
    const target = sectionRefs[p];
    if (target && viewport) {
      const targetCenter = target.offsetTop + (target.offsetHeight / 2);
      const viewportCenter = viewport.offsetHeight / 2;
      panY = Math.max(0, targetCenter - viewportCenter); 
    }
  }
</script>

<div class="camera-viewport" bind:this={viewport}>

  <DiagramControls>
    <label class:dimmed={!$activeDimensions.includes('dModel')}>
      <span>d_model:</span><strong>{$dModel}</strong>
      <input type="range" min="128" max="1024" step="128" bind:value={$dModel} />
    </label>
    <label class:dimmed={!$activeDimensions.includes('latentRatio')}>
      <span>ratio:</span><strong>{($latentRatio*100).toFixed(0)}%</strong>
      <input type="range" min="0.1" max="0.5" step="0.05" bind:value={$latentRatio} />
    </label>
    <label class:dimmed={!$activeDimensions.includes('seqLen')}>
      <span>seq_len:</span><strong>{$seqLen}</strong>
      <input type="range" min="3" max="12" step="1" bind:value={$seqLen} />
    </label>
  </DiagramControls>

  <div class="camera-stage" style="transform: translateY(-{panY}px)">
    
    <!-- Header info specific to MLA -->
    <div class="dt-box">
      <div class="dt">Multi-Head Latent Attention <span class="b ds">DeepSeek V2/V3</span></div>
      <div class="cfg">
        d_model=<strong>{$dModel}</strong> | d_latent=<strong>{$latentDim}</strong> |
        <span class="sv">KV saved≈<strong>{$shapes.memorySaved}%</strong></span>
      </div>
    </div>

    <div class="sec" class:act={step==='mla-input'} bind:this={sectionRefs['mla-input']}>
      <div class="sl">① Input Embeddings</div>
      <Matrix rows={$seqLen} cols={7} cellSize={C} label="X" sublabel="[{$seqLen}×{$dModel}]" id="mla_x" highlight={step==='mla-input'}/>
    </div>

    <div class="arr-down">↓</div>

    <div class="sec" class:act={step==='mla-compress'} bind:this={sectionRefs['mla-compress']}>
      <div class="sl">② Down-project KV → Latent (cached 💾)</div>
      <div class="row">
        <Matrix rows={$seqLen} cols={6} cellSize={S} label="X" id="mla_x2" dimmed={step!=='mla-compress'}/>
        <div class="arr">×W_DKV→</div>
        <div class="cache-box" class:glow={step==='mla-compress'}>
          <div class="cbadge">💾 KV Cache</div>
          <Matrix rows={$seqLen} cols={Math.max(2,Math.floor($latentDim/64))} cellSize={C} label="c_KV" sublabel="[{$seqLen}×{$latentDim}]" id="mla_kv_lat" highlight={step==='mla-compress'}/>
          <div class="cmp"><span class="old">MHA: {$seqLen*$dModel*2}</span><span class="new">MLA: {$seqLen*$latentDim} ✓</span></div>
        </div>
      </div>
    </div>

    <div class="arr-down">↓</div>

    <div class="sec" class:act={step==='mla-expand'} bind:this={sectionRefs['mla-expand']}>
      <div class="sl">③ Expand at inference (extra matmul)</div>
      <div class="row">
        <Matrix rows={$seqLen} cols={Math.max(2,Math.floor($latentDim/64))} cellSize={S} label="c_KV" id="mla_kv_e" dimmed={step!=='mla-expand'}/>
        <div class="arr">→W_UK/UV→</div>
        <Matrix rows={$seqLen} cols={5} cellSize={S} label="K" sublabel="[{$seqLen}×{$dModel}]" id="mla_K_exp" highlight={step==='mla-expand'} colorMode="signed"/>
        <Matrix rows={$seqLen} cols={5} cellSize={S} label="V" sublabel="[{$seqLen}×{$dModel}]" id="mla_V_exp" highlight={step==='mla-expand'}/>
      </div>
    </div>

    <div class="arr-down">↓</div>

    <div class="sec" class:act={step==='mla-q'} bind:this={sectionRefs['mla-q']}>
      <div class="sl">④ Q Compression (training only)</div>
      <div class="row">
        <Matrix rows={$seqLen} cols={6} cellSize={S} label="X" id="mla_x_q" dimmed={step!=='mla-q'}/>
        <div class="arr">→W_DQ→</div>
        <Matrix rows={$seqLen} cols={Math.max(2,Math.floor($latentDim/64))} cellSize={S} label="c_Q" sublabel="[{$seqLen}×{$latentDim}]" id="mla_q_lat" highlight={step==='mla-q'}/>
        <div class="arr">→W_UQ→</div>
        <Matrix rows={$seqLen} cols={5} cellSize={S} label="Q" sublabel="[{$seqLen}×{$dModel}]" id="mla_q_exp" highlight={step==='mla-q'} colorMode="signed"/>
      </div>
      
      <div class="fml" style="margin-top: 2rem;">
        <MathLabel math={eqnKV} display/>
        <MathLabel math={eqnCache} display/>
      </div>
    </div>

  </div>
</div>

<style>
  .camera-viewport { width: 100%; height: 100%; position: relative; }
  .camera-stage { display: flex; flex-direction: column; align-items: center; padding: 8rem 0 10rem 0; gap: 10px; transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1); }
  
  .dt-box { text-align: center; margin-bottom: 1rem; }
  .dt { font-size:1rem; font-weight:700; color:var(--text); display:flex; align-items:center; justify-content: center; gap:10px; flex-wrap:wrap; margin-bottom: 0.5rem; }
  .b  { background:var(--accent); color:white; font-size:0.62rem; font-weight:700; padding:0.15em 0.5em; border-radius:4px; font-family:'JetBrains Mono',monospace; }
  .ds { background:var(--green); }
  .cfg{ font-family:'JetBrains Mono',monospace; font-size:0.7rem; color:var(--muted); display:flex; justify-content: center; gap:8px; flex-wrap: wrap;}
  .cfg strong { color:var(--highlight); } .sv strong { color:var(--green); }

  .sec { border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; background: var(--bg); transition: all 0.3s; opacity: 0.3; transform: scale(0.95); width: 100%; max-width: 650px; display: flex; flex-direction: column; align-items: center; }
  .sec.act { opacity: 1; transform: scale(1); border-color: var(--accent); box-shadow: 0 0 30px rgba(99, 102, 241, 0.1); background: var(--surface); }
  .sl { font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; color: var(--muted); margin-bottom: 0.75rem; text-align: center; }
  .sec.act .sl { color: var(--accent); font-weight: 700; }
  
  .arr-down { font-size: 1.5rem; color: var(--border); margin: 0; }
  .row{ display:flex; align-items:center; gap:15px; flex-wrap:wrap; justify-content: center; }
  .arr{ font-size:1rem; color:var(--muted); padding:0 2px; }

  .cache-box { display:flex; flex-direction:column; align-items:center; gap:6px; padding:10px; border:1.5px dashed var(--border); border-radius:8px; background:var(--surface); transition:border-color 0.3s; }
  .cache-box.glow { border-color:var(--green); }
  .cbadge { font-size:0.65rem; font-family:'JetBrains Mono',monospace; color:var(--green); font-weight:700; }
  .cmp { display:flex; flex-direction:column; gap:2px; text-align: center; }
  .old { font-size:0.58rem; font-family:'JetBrains Mono',monospace; color:var(--red); text-decoration:line-through; }
  .new { font-size:0.58rem; font-family:'JetBrains Mono',monospace; color:var(--green); font-weight:600; }
  .fml { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:1rem; width: 100%; }
</style>