<script lang="ts">
  import Matrix from '$lib/atoms/Matrix.svelte';
  import MathLabel from '$lib/atoms/MathLabel.svelte';
  import { activeStep, activeDimensions, fullScreen, inspectedCell } from '$lib/stores/diagram';
  import { dModel, numHeads, seqLen } from '$lib/stores/config';
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

  // Navigation Logic for Full-Screen Stepper
  const sequence = ['input', 'projections', 'heads', 'attn', 'output'];
  $: stepIndex = sequence.indexOf(phase) !== -1 ? sequence.indexOf(phase) : 0;
  
  function nextStep() { if (stepIndex < sequence.length - 1) activeStep.set(sequence[stepIndex + 1]); }
  function prevStep() { if (stepIndex > 0) activeStep.set(sequence[stepIndex - 1]); }

  $: updateCamera(phase);

  async function updateCamera(p: string) {
    await tick();
    const target = sectionRefs[p];
    if (target && viewport) {
      const targetCenter = target.offsetTop + (target.offsetHeight / 2);
      const viewportCenter = viewport.offsetHeight / 2;
      let calcY = targetCenter - viewportCenter;
      panY = Math.max(0, calcY); 
    }
  }

  // Prevent Inspector clicks from propagating to backdrop closer
  function stopClick(e: MouseEvent) { e.stopPropagation(); }
</script>

<div class="camera-viewport" bind:this={viewport}>

  <!-- ENCAPSULATED CONTROLS -->
  <div class="canvas-controls" on:click={stopClick}>
    <button class="icon-btn" on:click={() => $fullScreen = !$fullScreen} title="Toggle Full Screen">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
    </button>
    
    <div class="div-line"></div>

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

    {#if $fullScreen}
      <div class="div-line"></div>
      <div class="stepper">
        <button on:click={prevStep} disabled={stepIndex === 0}>←</button>
        <span class="badge">STEP {stepIndex + 1}/{sequence.length}</span>
        <button on:click={nextStep} disabled={stepIndex === sequence.length - 1}>→</button>
      </div>
    {/if}
  </div>

  <!-- CELL INSPECTOR OVERLAY -->
  {#if $inspectedCell}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="cell-inspector" on:click={stopClick}>
      <div class="insp-header">
        <span class="badge">Cell Inspector</span>
        <button class="close-btn" on:click={() => inspectedCell.set(null)}>×</button>
      </div>
      <div class="insp-data">
        <div class="insp-row"><span>Matrix</span> <strong>{$inspectedCell.label || $inspectedCell.id}</strong></div>
        <div class="insp-row"><span>Position</span> <strong>[Row {$inspectedCell.r}, Col {$inspectedCell.c}]</strong></div>
        <div class="insp-row"><span>Value</span> <strong class="val">{$inspectedCell.val.toFixed(3)}</strong></div>
      </div>
      <div class="insp-math">
        <MathLabel math={`M_{${$inspectedCell.r},${$inspectedCell.c}} = ${$inspectedCell.val.toFixed(3)}`} display/>
      </div>
    </div>
  {/if}

  <!-- AUTO-PAN STAGE -->
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

  /* Controls Updates */
  .canvas-controls {
    position: absolute; top: 1.5rem; left: 50%; transform: translateX(-50%);
    background: rgba(17, 17, 24, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border); border-radius: 12px; padding: 0.85rem 1.5rem;
    display: flex; gap: 1.5rem; align-items: center; z-index: 100; 
    box-shadow: 0 10px 30px rgba(0,0,0,0.5); transition: all 0.3s ease;
  }
  
  .icon-btn {
    background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 4px;
    display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: color 0.2s, background 0.2s;
  }
  .icon-btn:hover { color: var(--text); background: var(--surface2); }
  
  .div-line { width: 1px; height: 24px; background: var(--border); }
  
  label { display: flex; align-items: center; gap: 0.75rem; transition: opacity 0.4s ease; }
  label.dimmed { opacity: 0.25; pointer-events: none; }
  label span { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; }
  label strong { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--highlight); width: 25px; display: inline-block; }
  input[type="range"] { width: 100px; accent-color: var(--accent); cursor: pointer; }
  
  .stepper { display: flex; align-items: center; gap: 0.5rem; }
  .stepper button { background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: 4px; padding: 2px 8px; cursor: pointer; }
  .stepper button:disabled { opacity: 0.3; cursor: not-allowed; }
  
  .badge { background: var(--accent); color: white; font-size: 0.65rem; font-weight: 700; padding: 0.3em 0.6em; border-radius: 4px; font-family: 'JetBrains Mono', monospace; }

  /* Cell Inspector UI */
  .cell-inspector {
    position: absolute; bottom: 2rem; right: 2rem; z-index: 150;
    background: rgba(17, 17, 24, 0.9); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem;
    box-shadow: 0 15px 40px rgba(0,0,0,0.6); min-width: 240px;
    animation: slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .insp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .close-btn { background: none; border: none; color: var(--muted); font-size: 1.2rem; cursor: pointer; line-height: 1; padding: 0 5px; }
  .close-btn:hover { color: var(--red); }
  .insp-data { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
  .insp-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; }
  .insp-row span { color: var(--muted); }
  .insp-row strong { color: var(--text); }
  .insp-row .val { color: var(--highlight); }
  .insp-math { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 0.5rem; }

  /* Stage */
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