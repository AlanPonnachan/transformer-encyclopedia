<script lang="ts">
  import { onMount } from 'svelte';
  import CollapsibleToC from '$lib/components/common/CollapsibleToC.svelte';
  import BlueprintCard from '$lib/components/common/BlueprintCard.svelte';

  const tocChapters = [
    { id: 'chap1', title: 'Attention Mechanics', sections: [
      { id: 'stage-1', title: 'Stage 1: Q·K Dot Product' },
      { id: 'stage-2', title: 'Stage 2: Softmax & Values' }
    ]}
  ];
  let activeSection = 'stage-1';

  onMount(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) activeSection = e.target.id; });
    }, { rootMargin: '-40% 0px -40% 0px' });
    document.querySelectorAll('.blueprint-card').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  });

  // --- End-to-End Math Pipeline ---
  const seqLen = 4;
  const dHead = 3;
  const dVal = 2;
  
  // Random Initialization
  const Q = Array.from({length: seqLen}, () => Array.from({length: dHead}, () => parseFloat((Math.random() * 2 - 1).toFixed(1))));
  const K = Array.from({length: seqLen}, () => Array.from({length: dHead}, () => parseFloat((Math.random() * 2 - 1).toFixed(1))));
  const V = Array.from({length: seqLen}, () => Array.from({length: dVal}, () => parseFloat((Math.random() * 2 - 1).toFixed(1))));
  
  // Step 1: Raw Scores (Q * K^T)
  const scores = Array.from({length: seqLen}, (_, r) => 
    Array.from({length: seqLen}, (_, c) => {
      let sum = 0;
      for(let d=0; d<dHead; d++) sum += Q[r][d] * K[c][d];
      return sum;
    })
  );

  // Step 2: Softmax (Scaled by sqrt(dHead))
  const scale = Math.sqrt(dHead);
  const attnWeights = scores.map(row => {
    const max = Math.max(...row); // Stability
    const exps = row.map(v => Math.exp((v / scale) - max));
    const sum = exps.reduce((a,b) => a+b, 0);
    return exps.map(v => v/sum);
  });

  // Step 3: Output (Softmax * V)
  const output = attnWeights.map(row => {
    return Array.from({length: dVal}, (_, c) => {
      let sum = 0;
      for(let i=0; i<seqLen; i++) sum += row[i] * V[i][c];
      return sum;
    });
  });

  // --- Interaction States ---
  let hoveredScore: { r: number, c: number, val: number, x: number, y: number } | null = null;
  let hoveredOutput: { r: number, c: number, val: number, x: number, y: number } | null = null;

  function setScoreHover(r: number, c: number, val: number, e: MouseEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    hoveredScore = { r, c, val, x: rect.left + window.scrollX, y: rect.top + window.scrollY - 80 };
  }
  function setOutputHover(r: number, c: number, val: number, e: MouseEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    hoveredOutput = { r, c, val, x: rect.left + window.scrollX, y: rect.top + window.scrollY - 80 };
  }

  function getScoreColor(val: number) {
    const t = Math.max(0, Math.min(1, (val + 3) / 6)); 
    return `rgba(99, 102, 241, ${t * 0.8})`;
  }
  function getWeightColor(val: number) {
    return `rgba(16, 185, 129, ${val})`; 
  }
  function getOutputColor(val: number) {
    const t = Math.max(0, Math.min(1, (val + 1) / 2)); 
    return `rgba(245, 158, 11, ${t * 0.8})`;
  }
</script>

<svelte:head><title>Advanced Attention — Transformer Encyclopedia</title></svelte:head>

<CollapsibleToC chapters={tocChapters} activeSectionId={activeSection} />

<div class="page-container">

  <!-- CARD 1: STAGE 1 (Q * K) -->
  <BlueprintCard 
    id="stage-1" 
    title="Stage 1: Query-Key Matching" 
    subtitle="The attention mechanism begins by calculating how much each token relates to every other token. Hover over the Scores matrix to see the dot-product dependencies."
  >
    <div class="stage-workspace">
      
      <!-- Q -->
      <div class="matrix-col">
        <div class="mat-label">Q (Query) <span>[4×3]</span></div>
        <div class="mat-grid" style="grid-template-columns: repeat({dHead}, 45px);">
          {#each Q as row, r}
            {#each row as val, c}
              <div class="cell" class:hl-row={hoveredScore?.r === r}>{val.toFixed(1)}</div>
            {/each}
          {/each}
        </div>
      </div>
      
      <div class="math-op">×</div>
      
      <!-- K^T -->
      <div class="matrix-col">
        <div class="mat-label">K<sup>T</sup> (Key Transposed) <span>[3×4]</span></div>
        <div class="mat-grid" style="grid-template-columns: repeat({seqLen}, 45px);">
          {#each Array(dHead) as _, d}
            {#each Array(seqLen) as _, c}
              <div class="cell" class:hl-col={hoveredScore?.c === c}>{K[c][d].toFixed(1)}</div>
            {/each}
          {/each}
        </div>
      </div>
      
      <div class="math-op">=</div>
      
      <!-- Raw Scores -->
      <div class="matrix-col">
        <div class="mat-label">Raw Scores <span>[4×4]</span></div>
        <div class="mat-grid output-grid" style="grid-template-columns: repeat({seqLen}, 55px);">
          {#each scores as row, r}
            {#each row as val, c}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div 
                class="cell interact-cell" 
                style="background: {getScoreColor(val)};"
                class:hl-target={hoveredScore?.r === r && hoveredScore?.c === c}
                on:mouseenter={(e) => setScoreHover(r, c, val, e)}
                on:mouseleave={() => hoveredScore = null}
              >{val.toFixed(2)}</div>
            {/each}
          {/each}
        </div>
      </div>

    </div>

    <svelte:fragment slot="footer">
      Notice how the output is a perfectly square <code>[4×4]</code> matrix. This represents the relationship strength between all 4 tokens in our sequence.
    </svelte:fragment>
  </BlueprintCard>


  <!-- CARD 2: STAGE 2 (Softmax * V) -->
  <BlueprintCard 
    id="stage-2" 
    title="Stage 2: Softmax & Value Mixing" 
    subtitle="The raw scores are normalized into probabilities (Softmax). These probabilities are then used to mix the information contained in the Value (V) matrix."
  >
    <div class="stage-workspace">
      
      <!-- Softmax Weights -->
      <div class="matrix-col">
        <div class="mat-label">Softmax Weights <span>[4×4]</span></div>
        <div class="mat-grid" style="grid-template-columns: repeat({seqLen}, 55px);">
          {#each attnWeights as row, r}
            {#each row as val, c}
              <div 
                class="cell prob-cell" 
                style="background: {getWeightColor(val)};"
                class:hl-row={hoveredOutput?.r === r}
              >{val.toFixed(2)}</div>
            {/each}
          {/each}
        </div>
      </div>
      
      <div class="math-op">×</div>
      
      <!-- Values -->
      <div class="matrix-col">
        <div class="mat-label">V (Value) <span>[4×2]</span></div>
        <div class="mat-grid" style="grid-template-columns: repeat({dVal}, 55px);">
          {#each V as row, r}
            {#each row as val, c}
              <div class="cell" class:hl-col={hoveredOutput?.c === c}>{val.toFixed(1)}</div>
            {/each}
          {/each}
        </div>
      </div>
      
      <div class="math-op">=</div>
      
      <!-- Final Output -->
      <div class="matrix-col">
        <div class="mat-label">Final Output <span>[4×2]</span></div>
        <div class="mat-grid output-grid" style="grid-template-columns: repeat({dVal}, 70px);">
          {#each output as row, r}
            {#each row as val, c}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div 
                class="cell interact-cell out-cell" 
                style="background: {getOutputColor(val)};"
                class:hl-target={hoveredOutput?.r === r && hoveredOutput?.c === c}
                on:mouseenter={(e) => setOutputHover(r, c, val, e)}
                on:mouseleave={() => hoveredOutput = null}
              >{val.toFixed(2)}</div>
            {/each}
          {/each}
        </div>
      </div>

    </div>

    <svelte:fragment slot="footer">
      The final output matrix restores the original dimension shape <code>[Seq × Dim]</code>. The network has successfully aggregated context from surrounding tokens!
    </svelte:fragment>
  </BlueprintCard>

</div>

<!-- TOOLTIPS -->
{#if hoveredScore}
  <div class="floating-tooltip" style="top: {hoveredScore.y}px; left: {hoveredScore.x}px;">
    <div class="tt-header">Dot Product Score</div>
    <div class="tt-math">Q<sub>{hoveredScore.r}</sub> · K<sup>T</sup><sub>{hoveredScore.c}</sub> = <span class="res" style="color:var(--accent)">{hoveredScore.val.toFixed(3)}</span></div>
  </div>
{/if}

{#if hoveredOutput}
  <div class="floating-tooltip" style="top: {hoveredOutput.y}px; left: {hoveredOutput.x}px;">
    <div class="tt-header">Weighted Value Sum</div>
    <div class="tt-math">∑ (Softmax<sub>{hoveredOutput.r}</sub> × V<sub>{hoveredOutput.c}</sub>) = <span class="res" style="color:var(--highlight)">{hoveredOutput.val.toFixed(3)}</span></div>
  </div>
{/if}

<style>
  .page-container { padding: 2rem 2rem 2rem 3rem; background: var(--bg); min-height: 100vh; }
  
  .stage-workspace { display: flex; align-items: center; justify-content: center; gap: 3rem; width: 100%; padding: 3rem 0; overflow-x: auto; }
  
  .matrix-col { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .mat-label { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--text); font-weight: 600; text-align: center; }
  .mat-label span { color: var(--muted); font-size: 0.7rem; font-weight: 400; }
  
  .mat-grid { display: grid; gap: 4px; }
  .cell { 
    height: 40px; display: flex; justify-content: center; align-items: center;
    background: var(--surface2); border: 1px solid var(--border);
    font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted);
    transition: all 0.2s; border-radius: 4px;
  }
  
  .prob-cell { color: #fff; font-weight: 600; border-color: rgba(16, 185, 129, 0.4); }
  .out-cell { height: 50px; font-size: 0.9rem; color: #fff; }
  
  /* Cross-Matrix Highlights */
  .cell.hl-row { background: rgba(99, 102, 241, 0.2); border-color: var(--accent); color: var(--text); box-shadow: 0 0 12px rgba(99, 102, 241, 0.3); z-index: 5; }
  .cell.hl-col { background: rgba(245, 158, 11, 0.2); border-color: var(--highlight); color: var(--text); box-shadow: 0 0 12px rgba(245, 158, 11, 0.3); z-index: 5; }
  
  .interact-cell { color: var(--text); font-weight: 600; cursor: crosshair; }
  .interact-cell:hover, .interact-cell.hl-target { border-color: #fff; transform: scale(1.15); z-index: 10; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
  
  .math-op { font-size: 2rem; color: var(--muted); font-family: 'JetBrains Mono'; padding-top: 1.5rem; }
  
  /* Tooltip */
  .floating-tooltip {
    position: absolute; transform: translate(-50%, -100%); z-index: 200;
    background: var(--glass-bg); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border); border-radius: 8px; padding: 1rem 1.25rem;
    box-shadow: 0 20px 50px rgba(0,0,0,0.3); pointer-events: none;
    display: flex; flex-direction: column; gap: 0.5rem;
  }
  .tt-header { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .tt-math { font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem; color: var(--text); }
  .tt-math .res { font-weight: 700; }
</style>