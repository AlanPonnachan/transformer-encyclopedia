<script lang="ts">
  import Matrix from '$lib/atoms/Matrix.svelte';
  import MathLabel from '$lib/atoms/MathLabel.svelte';
  import { activeStep } from '$lib/stores/diagram';
  import { dModel, numHeads, seqLen, headDim } from '$lib/stores/config';
  import { fakeAttentionWeights } from './mha-logic';
  import { tick } from 'svelte';

  $: phase = $activeStep || 'input';
  $: attnData = Array.from({length:Math.min($numHeads,3)}, (_,i) => fakeAttentionWeights($seqLen,i));
  const C=22, S=17;
  const eqnAttn = String.raw`\text{Attn}(Q,K,V)=\text{softmax}\!\left(\frac{QK^T}{\sqrt{d_{head}}}\right)\!V`;

  // Auto-pan logic
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
      // Subtract half the padding (approx 100px) so the topmost item isn't shoved down
      let calcY = targetCenter - viewportCenter;
      panY = Math.max(0, calcY); 
    }
  }
</script>

<!-- OPTION B: AUTO-PAN CAMERA -->
<div class="camera-viewport" bind:this={viewport}>
  <div class="camera-stage" style="transform: translateY(-{panY}px)">
    
    <div class="sec" class:act={phase==='input'} bind:this={sectionRefs['input']}>
      <div class="sl">Phase 01: Input</div>
      <Matrix rows={$seqLen} cols={6} cellSize={C} label="X" sublabel="[{$seqLen}×{$dModel}]" highlight={phase==='input'}/>
    </div>

    <div class="arr-down">↓</div>

    <div class="sec" class:act={phase==='projections'} bind:this={sectionRefs['projections']}>
      <div class="sl">Phase 02: Q, K, V Projections</div>
      <div class="row">
        <Matrix rows={4} cols={4} cellSize={S} label="W_Q" colorMode="signed" highlight={phase==='projections'}/>
        <Matrix rows={4} cols={4} cellSize={S} label="W_K" colorMode="signed" highlight={phase==='projections'}/>
        <Matrix rows={4} cols={4} cellSize={S} label="W_V" colorMode="signed" highlight={phase==='projections'}/>
      </div>
    </div>

    <div class="arr-down">↓</div>

    <div class="sec" class:act={phase==='heads'||phase==='qkv'} bind:this={sectionRefs['heads']}>
      <div class="sl">Phase 03: Split into {$numHeads} Heads</div>
      <div class="row">
        <Matrix rows={$seqLen} cols={5} cellSize={S} label="Q" colorMode="signed" highlight={phase==='heads'}/>
        <Matrix rows={$seqLen} cols={5} cellSize={S} label="K" colorMode="signed" highlight={phase==='heads'}/>
        <Matrix rows={$seqLen} cols={5} cellSize={S} label="V" highlight={phase==='heads'}/>
      </div>
    </div>

    <div class="arr-down">↓</div>

    <div class="sec" class:act={phase==='attn'} bind:this={sectionRefs['attn']}>
      <div class="sl">Phase 04: Scaled Dot-Product Attention</div>
      <div class="row">
        {#each attnData as attn, i}
          <div class="hd">
            <div class="hn">H{i+1}</div>
            <Matrix rows={$seqLen} cols={$seqLen} data={attn} cellSize={C} highlight={phase==='attn'}/>
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
        <Matrix rows={$seqLen} cols={5} cellSize={S} label="Concat" colorMode="signed"/>
        <div class="arr">→</div>
        <Matrix rows={4} cols={4} cellSize={S} label="W_O" colorMode="signed"/>
        <div class="arr">→</div>
        <Matrix rows={$seqLen} cols={6} cellSize={C} label="Output" highlight={phase==='output'}/>
      </div>
    </div>

  </div>
</div>

<style>
  .camera-viewport { width: 100%; height: 100%; position: relative; }
  
  /* The stage moves smoothly up and down */
  .camera-stage { display: flex; flex-direction: column; align-items: center; padding: 4rem 0 10rem 0; gap: 10px; transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1); }
  
  .sec { border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; background: var(--bg); transition: all 0.3s; opacity: 0.4; transform: scale(0.95); width: 100%; max-width: 600px; display: flex; flex-direction: column; align-items: center; }
  
  /* Only the active section is fully bright and scaled up */
  .sec.act { opacity: 1; transform: scale(1); border-color: var(--accent); box-shadow: 0 0 30px rgba(99, 102, 241, 0.1); background: var(--surface); }
  
  .sl { font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; color: var(--muted); margin-bottom: 0.75rem; text-align: center; }
  .sec.act .sl { color: var(--accent); font-weight: 700; }
  
  .arr-down { font-size: 1.2rem; color: var(--border); margin: 0; }
  .row{ display:flex; align-items:center; gap:15px; flex-wrap:wrap; justify-content: center; }
  .arr{ font-size:1rem; color:var(--muted); padding:0 2px; }
  .hd { display:flex; flex-direction:column; align-items:center; gap:5px; }
  .hn { font-family:'JetBrains Mono',monospace; font-size:0.62rem; color:var(--highlight); font-weight:700; }
  .etc{ font-size:0.75rem; color:var(--muted); font-family:'JetBrains Mono',monospace; }
</style>