<script lang="ts">
  import InteractiveCard from '$lib/components/common/InteractiveCard.svelte';
  import Matrix from '$lib/atoms/Matrix.svelte';
  import Ref from '$lib/components/common/Ref.svelte';
  import { highlightId } from '$lib/stores/diagram';

  // State for Card 1 (Matrices)
  let tileSize = 6;
  
  // State for Card 2 (Memory Coalescing SVG)
  let stride = 1;
  const numThreads = 32;
  $: threads = Array.from({length: numThreads}, (_, i) => i);
  $: accessedMem = threads.map(t => t * stride);
  
  // State for Card 3 (CPU vs GPU HTML Grid)
  let gpuActive = 1;
</script>

<svelte:head><title>GPU Compute — Transformer Encyclopedia</title></svelte:head>

<div class="page-container">
  
  <!-- CARD 1: MATRIX VISUALIZATION (Dynamic Layout: Matrices Center, Text Bottom) -->
  <InteractiveCard 
    title="Tiling" 
    subtitle="How breaking computation into tiles unlocks data reuse and moves matrix multiply from memory-bound toward compute-bound."
  >
    <div class="card1-layout">
      <div class="matrices-row">
        <Matrix rows={tileSize} cols={tileSize} cellSize={30} label="A" colorMode="heat" highlight/>
        <span class="math">×</span>
        <Matrix rows={tileSize} cols={tileSize} cellSize={30} label="B" colorMode="signed"/>
        <span class="math">=</span>
        <Matrix rows={tileSize} cols={tileSize} cellSize={30} label="C" />
      </div>
    </div>
    
    <svelte:fragment slot="footer">
      Both threads stream the same row of A from HBM, and every output cell does it again. Naive matmul is pure memory traffic.
    </svelte:fragment>
  </InteractiveCard>


  <!-- CARD 2: PURE SVG VISUALIZATION (Dynamic Layout: Controls Top-Right, SVG Center) -->
  <InteractiveCard title="Memory Coalescing">
    <div class="card2-layout">
      <!-- Local Control Panel sitting absolutely in the top right -->
      <div class="local-hud">
        <label>
          <span>Stride</span> <strong>{stride}</strong>
          <input type="range" min="1" max="4" step="1" bind:value={stride} />
        </label>
        <div class="loads">
          <span>HBM Loads: </span> <strong>{Math.ceil((32 * stride) / 32)}</strong>
        </div>
      </div>

      <!-- Scaled SVG (No clipping) -->
      <div class="svg-container">
        <svg viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid meet">
          <!-- Memory Cache Lines -->
          <g transform="translate(100, 50)">
            <text x="400" y="-15" text-anchor="middle" class="lbl">HBM Cache Lines</text>
            {#each Array(4) as _, lIdx}
               <rect x={lIdx * 210} y="0" width="200" height="25" fill="none" stroke="var(--border)"/>
               {#each Array(32) as _, cIdx}
                  {@const globalIdx = lIdx * 32 + cIdx}
                  <rect x={lIdx * 210 + cIdx * 6 + 4} y="4" width="4" height="17" 
                        fill={accessedMem.includes(globalIdx) ? 'var(--red)' : 'var(--surface2)'} />
               {/each}
            {/each}
          </g>

          <!-- Threads -->
          <g transform="translate(100, 350)">
             <text x="400" y="30" text-anchor="middle" class="lbl">Warp (32 Threads)</text>
             {#each threads as t}
               <rect x={t * 25} y="-15" width="20" height="20" rx="3" fill="var(--surface2)" stroke="var(--border)" />
               <!-- Animated Line -->
               {#if t * stride < 128}
                 <line x1={t * 25 + 10} y1="-15" x2={Math.floor((t*stride)/32)*210 + ((t*stride)%32)*6 + 6} y2="-275" stroke="var(--red)" stroke-opacity="0.5" class="anim-line"/>
               {/if}
             {/each}
          </g>
        </svg>
      </div>
    </div>

    <svelte:fragment slot="footer">
      All 32 threads land in the same cache line. Memory access is coalesced.
    </svelte:fragment>
  </InteractiveCard>


  <!-- CARD 3: HTML DOM GRID VISUALIZATION (Dynamic Layout: Split Panels Left & Right) -->
  <InteractiveCard title="CPU vs GPU" subtitle="Different functionalities and execution models.">
    <div class="card3-layout">
      <!-- Left side: CPU -->
      <div class="compute-box">
        <h3>CPU</h3>
        <p class="muted">1 core: only one can help</p>
        <div class="core-bar">
           <div class="core-active" style="width: 100%">Core 0</div>
        </div>
      </div>
      
      <!-- Right side: GPU -->
      <div class="compute-box">
        <div style="display:flex; justify-content:space-between; align-items:center;">
           <div>
             <h3>GPU</h3>
             <p class="muted">32 ALUs, but dependency limits execution</p>
           </div>
           <input type="range" min="1" max="32" bind:value={gpuActive} />
        </div>
        
        <div class="alu-grid">
           {#each Array(32) as _, i}
             <div class="alu" class:active={i < gpuActive}></div>
           {/each}
        </div>
        <p class="muted mt">Active ALUs: {gpuActive} / 32</p>
      </div>
    </div>

    <svelte:fragment slot="footer">
      When each element depends on the previous one, parallelism can't help. All extra ALUs sit disabled because the dependency chain forbids them from running.
    </svelte:fragment>
  </InteractiveCard>

</div>

<style>
  .page-container { padding: 4rem 2rem; background: var(--bg); min-height: 100vh; }

  /* Generic Type classes */
  .math { font-size: 2rem; color: var(--muted); padding: 0 1rem; }
  .lbl { font-family: 'JetBrains Mono', monospace; font-size: 12px; fill: var(--muted); text-transform: uppercase; }
  .muted { color: var(--muted); font-size: 0.85rem; }
  .anim-line { transition: x2 0.3s cubic-bezier(0.25, 1, 0.5, 1); }

  /* Card 1 Specifics */
  .card1-layout { width: 100%; display: flex; justify-content: center; align-items: center; padding: 2rem 0; }
  .matrices-row { display: flex; align-items: center; gap: 1rem; }

  /* Card 2 Specifics */
  .card2-layout { width: 100%; position: relative; display: flex; flex-direction: column; }
  .local-hud { position: absolute; top: -3rem; right: 0; display: flex; gap: 2rem; align-items: center; background: var(--surface2); padding: 0.5rem 1.5rem; border-radius: 8px; border: 1px solid var(--border); }
  .local-hud span { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); text-transform: uppercase; }
  .local-hud strong { font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem; color: var(--text); }
  .svg-container { width: 100%; height: 400px; display: flex; justify-content: center; align-items: center; margin-top: 2rem; }
  svg { width: 100%; height: 100%; }

  /* Card 3 Specifics */
  .card3-layout { width: 100%; display: grid; grid-template-columns: 1fr 1.5fr; gap: 2rem; }
  .compute-box { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; }
  .compute-box h3 { margin: 0 0 0.25rem 0; color: var(--text); font-size: 1.25rem; }
  .core-bar { width: 100%; height: 24px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; margin-top: 1rem; overflow: hidden; }
  .core-active { height: 100%; background: var(--green); display: flex; align-items: center; padding-left: 0.5rem; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #000; font-weight: 700; }
  .alu-grid { display: grid; grid-template-columns: repeat(16, 1fr); gap: 4px; margin-top: 1rem; }
  .alu { aspect-ratio: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 2px; transition: background 0.2s; }
  .alu.active { background: var(--green); border-color: var(--green); }
  .mt { margin-top: 1rem; font-family: 'JetBrains Mono', monospace; }
</style>