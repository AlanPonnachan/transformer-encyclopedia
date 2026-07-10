<script lang="ts">
  import Matrix from '$lib/atoms/Matrix.svelte';
  import MathLabel from '$lib/atoms/MathLabel.svelte';
  import DiagramControls from '$lib/components/common/DiagramControls.svelte';
  import { activeStep, activeDimensions } from '$lib/stores/diagram';
  import { dModel, numHeads, seqLen } from '$lib/stores/config';
  import { fakeAttentionWeights } from './mha-logic';
  import { tick } from 'svelte';

  $: phase = $activeStep || 'input';
  $: attnData = Array.from({length:Math.min($numHeads,3)}, (_,i) => fakeAttentionWeights($seqLen,i));
  const C=22, S=17;
  const eqnAttn = String.raw`\text{Attn}(Q,K,V)=\text{softmax}\!\left(\frac{QK^T}{\sqrt{d_{head}}}\right)\!V`;

  let viewport: HTMLElement;
  let sectionRefs: Record<string, HTMLElement> = {};
  let panY = 0;

  $: updateCamera(phase);

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
    <label class:dimmed={!$activeDimensions.includes('numHeads')}>
      <span>heads:</span><strong>{$numHeads}</strong>
      <input type="range" min="1" max="16" step="1" bind:value={$numHeads} />
    </label>
    <label class:dimmed={!$activeDimensions.includes('seqLen')}>
      <span>seq_len:</span><strong>{$seqLen}</strong>
      <input type="range" min="3" max="12" step="1" bind:value={$seqLen} />
    </label>
  </DiagramControls>

  <div class="camera-stage" style="transform: translateY(-{panY}px)">
    
    <div class="sec" class:act={phase==='input'} bind:this={sectionRefs['input']}>
      <div class="sl">Phase 01: Input Matrix</div>
      <Matrix id="input_X" rows={$seqLen} cols={6} cellSize={C} label="X" sublabel="[{$seqLen}×{$dModel}]" highlight={phase==='input'}/>
    </div>

    <div class="arr-down">↓</div>

    <div class="sec" class:act={phase==='projections'} bind:this={sectionRefs['projections']}>
      <div class="sl">Phase 02: Q, K, V Projections</div>
      <div class="row">
        <Matrix id="proj_Q" rows={4} cols={4} cellSize={S} label="W_Q" colorMode="signed" highlight={phase==='projections'}/>
        <Matrix id="proj_K" rows={4} cols={4} cellSize={S} label="W_K" colorMode="signed" highlight={phase==='projections'}/>
        <Matrix id="proj_V" rows={4} cols={4} cellSize={S} label="W_V" colorMode="signed" highlight={phase==='projections'}/>
      </div>
    </div>

    <div class="arr-down">↓</div>

    <div class="sec" class:act={phase==='heads'} bind:this={sectionRefs['heads']}>
      <div class="sl">Phase 03: Split into {$numHeads} Heads</div>
      <div class="row">
        <Matrix id="head_Q" rows={$seqLen} cols={5} cellSize={S} label="Q" colorMode="signed" highlight={phase==='heads'}/>
        <Matrix id="head_K" rows={$seqLen} cols={5} cellSize={S} label="K" colorMode="signed" highlight={phase==='heads'}/>
        <Matrix id="head_V" rows={$seqLen} cols={5} cellSize={S} label="V" highlight={phase==='heads'}/>
      </div>
    </div>

    <div class="arr-down">↓</div>

    <div class="sec" class:act={phase==='attn'} bind:this={sectionRefs['attn']}>
      <div class="sl">Phase 04: Scaled Dot-Product Attention</div>
      <div class="row">
        {#each attnData as attn, i}
          <div class="hd">
            <div class="hn">H{i+1}</div>
            <Matrix id={`attn_H${i+1}`} rows={$seqLen} cols={$seqLen} data={attn} cellSize={C} label={`Attn H${i+1}`} highlight={phase==='attn'}/>
          </div>
        {/each}
        {#if $numHeads > 3}<div class="etc">+{$numHeads-3} more</div>{/if}
      </div>
      <MathLabel math={eqnAttn} display/>
    </div>

    <div class="arr-down">↓</div>

    <div class="sec" class:act={phase==='output'} bind:this={sectionRefs['output']}>
      <div class="sl">Phase 05: Concat + W_O → Output</div>
      <div class="row">
        <Matrix id="out_concat" rows={$seqLen} cols={5} cellSize={S} label="Concat" colorMode="signed"/>
        <div class="arr">→</div>
        <Matrix id="out_W_O" rows={4} cols={4} cellSize={S} label="W_O" colorMode="signed"/>
        <div class="arr">→</div>
        <Matrix id="out_final" rows={$seqLen} cols={6} cellSize={C} label="Output" highlight={phase==='output'}/>
      </div>
    </div>

  </div>
</div>

<style>
  .camera-viewport { width: 100%; height: 100%; position: relative; }
  .camera-stage { display: flex; flex-direction: column; align-items: center; padding: 8rem 0 10rem 0; gap: 10px; transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1); }
  .sec { border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; background: var(--bg); transition: all 0.3s; opacity: 0.3; transform: scale(0.95); width: 100%; max-width: 650px; display: flex; flex-direction: column; align-items: center; }
  .sec.act { opacity: 1; transform: scale(1); border-color: var(--accent); box-shadow: 0 0 30px rgba(99, 102, 241, 0.1); background: var(--surface); }
  .sl { font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; color: var(--muted); margin-bottom: 0.75rem; text-align: center; }
  .sec.act .sl { color: var(--accent); font-weight: 700; }
  .arr-down { font-size: 1.5rem; color: var(--border); margin: 0; }
  .row{ display:flex; align-items:center; gap:15px; flex-wrap:wrap; justify-content: center; }
  .arr{ font-size:1rem; color:var(--muted); padding:0 2px; }
  .hd { display:flex; flex-direction:column; align-items:center; gap:5px; }
  .hn { font-family:'JetBrains Mono',monospace; font-size:0.62rem; color:var(--highlight); font-weight:700; }
  .etc{ font-size:0.75rem; color:var(--muted); font-family:'JetBrains Mono',monospace; }
</style>