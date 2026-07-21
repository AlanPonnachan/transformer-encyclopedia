<script lang="ts">
  import { onMount } from 'svelte';
  import Ref from '$lib/components/common/Ref.svelte';
  import { highlightId } from '$lib/stores/diagram';

  // State
  let stride = 1;
  let manualOverride = false;
  
  // Math Constants
  const numThreads = 32;
  const cacheLineSize = 32;
  const numCacheLines = 4;
  const totalMemElements = cacheLineSize * numCacheLines;

  // SVG Coordinate System (Fixed internal resolution, responsive external size)
  const svgW = 1000;
  const svgH = 800;

  // Layout calculations for Threads (Bottom)
  const threadW = 20;
  const threadGap = 5;
  const totalThreadW = (numThreads * (threadW + threadGap)) - threadGap;
  const threadStartX = (svgW - totalThreadW) / 2;
  const threadY = 650;

  // Layout calculations for Memory (Top)
  const cellW = 5;
  const cellGap = 1;
  const lineWidth = (cacheLineSize * (cellW + cellGap)) - cellGap;
  const lineGap = 30;
  const totalMemW = (numCacheLines * (lineWidth + lineGap)) - lineGap;
  const memStartX = (svgW - totalMemW) / 2;
  const memY = 150;

  // Derived state
  $: threads = Array.from({length: numThreads}, (_, i) => i);
  $: accessedMem = threads.map(t => t * stride);
  $: uniqueCacheLines = new Set(accessedMem.filter(m => m < totalMemElements).map(addr => Math.floor(addr / cacheLineSize)));
  $: efficiency = Math.round((1 / uniqueCacheLines.size) * 100);

  // Scroll tracking setup
  let stepEls: HTMLElement[] = [];
  onMount(() => {
    const observer = new IntersectionObserver((entries) => {
      // Only auto-update if the user hasn't touched the slider recently
      if (manualOverride) return; 
      entries.forEach(e => {
        if (e.isIntersecting) {
          const s = Number(e.target.dataset.stride);
          if (s) stride = s;
        }
      });
    }, { rootMargin: '-40% 0px -40% 0px' });
    
    stepEls.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  });

  function handleSlider(e: Event) {
    manualOverride = true;
    stride = Number((e.target as HTMLInputElement).value);
    // Reset manual override after 3 seconds of inactivity
    setTimeout(() => { manualOverride = false; }, 3000);
  }
</script>

<svelte:head><title>Memory Coalescing — Transformer Encyclopedia</title></svelte:head>

<div class="scrolly-layout">
  
  <!-- LEFT COLUMN: The Scrolling Narrative -->
  <aside class="text-column">
    <div class="prose">
      <div class="hero-spacer">
        <h1>Memory Coalescing</h1>
        <p>Memory access patterns determine the GPU's loading efficiency. Scroll to see how stride destroys bandwidth.</p>
      </div>

      <!-- Scenarios -->
      <section class="step" data-stride="1" bind:this={stepEls[0]}>
        <h3>Scenario 1: Perfect Coalescing</h3>
        <p>When <Ref target="t-0">Thread 0</Ref> reads index 0, and <Ref target="t-1">Thread 1</Ref> reads index 1, the GPU fetches a single <Ref target="c-0" color="var(--red)">Cache Line</Ref> from HBM.</p>
        <p>All 32 threads in the warp are satisfied by <strong>1 Load</strong>. 100% efficient.</p>
      </section>

      <section class="step" data-stride="2" bind:this={stepEls[1]}>
        <h3>Scenario 2: Stride 2</h3>
        <p>If we interleave data and every thread needs every <i>other</i> element, things break.</p>
        <p><Ref target="t-31">Thread 31</Ref> now needs index 62. The warp is forced to fetch <strong>2 Cache Lines</strong> to satisfy everyone. Efficiency drops to 50%.</p>
      </section>

      <section class="step" data-stride="4" bind:this={stepEls[2]}>
        <h3>Scenario 3: Stride 4</h3>
        <p>The wider the stride, the more memory traffic is generated for the exact same amount of compute.</p>
        <p>At a stride of 4, we pull <strong>4 entire lines</strong> (128 elements) just to process 32 threads. Most of the data fetched is wasted.</p>
      </section>
      
      <div class="spacer-bottom"></div>
    </div>
  </aside>

  <!-- RIGHT COLUMN: The Sticky Canvas -->
  <main class="sticky-canvas">
    
    <!-- Floating HUD (Controls) -->
    <div class="hud">
      <div class="metric">
        <span class="val" style="color: {efficiency > 50 ? 'var(--green)' : 'var(--red)'}">{efficiency}%</span>
        <span class="lbl">Efficiency</span>
      </div>
      <div class="metric">
        <span class="val">{uniqueCacheLines.size}</span>
        <span class="lbl">Loads</span>
      </div>
      <div class="div-line"></div>
      <label class="slider-ctrl">
        <span>Stride</span> <strong>{stride}</strong>
        <input type="range" min="1" max="4" step="1" value={stride} on:input={handleSlider} />
      </label>
    </div>

    <!-- PURE SVG VISUALIZATION -->
    <div class="svg-wrapper">
      <svg viewBox="0 0 {svgW} {svgH}" preserveAspectRatio="xMidYMid meet">
        
        <!-- Lines Connecting Threads to Memory -->
        <g class="connections">
          {#each threads as t}
            {@const m = t * stride}
            {#if m < totalMemElements}
              {@const mLineIdx = Math.floor(m / cacheLineSize)}
              {@const mCellIdx = m % cacheLineSize}
              
              <!-- Calculate exact coordinates inside SVG -->
              {@const tX = threadStartX + t * (threadW + threadGap) + (threadW / 2)}
              {@const mX = memStartX + mLineIdx * (lineWidth + lineGap) + mCellIdx * (cellW + cellGap) + (cellW / 2)}
              
              <line 
                x1={tX} y1={threadY - 5} 
                x2={mX} y2={memY + 25} 
                stroke={$highlightId === `t-${t}` || $highlightId === `m-${m}` ? 'var(--highlight)' : 'var(--red)'}
                stroke-width={$highlightId === `t-${t}` ? 3 : 1}
                stroke-opacity={$highlightId && $highlightId !== `t-${t}` && $highlightId !== `m-${m}` ? 0.2 : 0.6}
                class="anim-line"
              />
            {/if}
          {/each}
        </g>

        <!-- Memory Cache Lines (Top) -->
        <g class="memory-tier">
          <text x={svgW/2} y={memY - 20} text-anchor="middle" class="svg-label">HBM Cache Lines (32 elements each)</text>
          
          {#each Array(numCacheLines) as _, lIdx}
            {@const lineX = memStartX + lIdx * (lineWidth + lineGap)}
            {@const isHit = uniqueCacheLines.has(lIdx)}
            {@const isHl = $highlightId === `c-${lIdx}`}
            
            <!-- Cache Line Bounding Box -->
            <rect 
              x={lineX - 3} y={memY - 3} 
              width={lineWidth + 6} height={26} rx="4"
              fill={isHit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.2)'}
              stroke={isHl ? 'var(--highlight)' : isHit ? 'var(--red)' : 'var(--border)'}
              stroke-width={isHl ? 2 : 1}
              class="anim-shape"
            />
            
            <!-- Individual Cells -->
            {#each Array(cacheLineSize) as _, cIdx}
              {@const mIdx = lIdx * cacheLineSize + cIdx}
              {@const cellX = lineX + cIdx * (cellW + cellGap)}
              {@const isAccessed = accessedMem.includes(mIdx)}
              {@const isCellHl = $highlightId === `m-${mIdx}`}
              
              <rect 
                x={cellX} y={memY} width={cellW} height={20} rx="1"
                fill={isCellHl ? 'var(--highlight)' : isAccessed ? 'var(--red)' : 'var(--surface2)'}
                class="anim-shape"
              />
            {/each}
          {/each}
        </g>

        <!-- GPU Threads (Bottom) -->
        <g class="warp-tier">
          <text x={svgW/2} y={threadY - 20} text-anchor="middle" class="svg-label">Warp: 32 Threads</text>
          
          {#each threads as t}
            {@const tX = threadStartX + t * (threadW + threadGap)}
            {@const isHl = $highlightId === `t-${t}`}
            
            <!-- Interactive hit area -->
            <rect 
              x={tX} y={threadY} width={threadW} height={threadW} rx="4"
              fill={isHl ? 'var(--highlight)' : 'var(--surface2)'}
              stroke={isHl ? 'var(--highlight)' : 'var(--border)'}
              class="anim-shape" style="cursor: pointer;"
              on:mouseenter={() => $highlightId = `t-${t}`}
              on:mouseleave={() => $highlightId = null}
            />
            <text 
              x={tX + threadW/2} y={threadY + 14} 
              text-anchor="middle" class="svg-thread-text" 
              fill={isHl ? '#000' : 'var(--text)'}
              pointer-events="none"
            >{t}</text>
          {/each}
        </g>

      </svg>
    </div>
  </main>
</div>

<style>
  .scrolly-layout { display: flex; height: calc(100vh - 52px); background: var(--bg); }
  
  /* Left Narrative */
  .text-column { width: 400px; min-width: 350px; overflow-y: auto; border-right: 1px solid var(--border); padding: 0 2rem; scroll-behavior: smooth; }
  .hero-spacer { height: 70vh; display: flex; flex-direction: column; justify-content: center; }
  .hero-spacer h1 { font-size: 2rem; color: var(--text); margin-bottom: 1rem; }
  .hero-spacer p { color: var(--muted); line-height: 1.6; }
  
  .step { min-height: 60vh; display: flex; flex-direction: column; justify-content: center; opacity: 0.3; transition: opacity 0.4s; }
  .step h3 { font-size: 1.25rem; color: var(--accent); margin-bottom: 1rem; }
  .step p { color: var(--text); line-height: 1.7; margin-bottom: 1rem; opacity: 0.9; }
  .step:last-child { min-height: 80vh; justify-content: flex-start; padding-top: 20vh; }
  
  /* Observer handles active state styling via global/parent CSS if needed, 
     but keeping opacity shift on hover/focus makes it feel alive */
  .step:hover { opacity: 1; }

  /* Right Canvas */
  .sticky-canvas { flex: 1; position: sticky; top: 0; height: calc(100vh - 52px); display: flex; flex-direction: column; justify-content: center; align-items: center; background: radial-gradient(circle at center, var(--surface2) 0%, var(--bg) 100%); overflow: hidden;}
  
  /* HUD */
  .hud { position: absolute; top: 2rem; right: 2rem; display: flex; align-items: center; gap: 1.5rem; background: var(--glass-bg); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid var(--border); border-radius: 12px; padding: 1rem 1.5rem; z-index: 50; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
  .metric { display: flex; flex-direction: column; align-items: center; }
  .metric .val { font-family: 'Space Grotesk'; font-size: 1.25rem; font-weight: 700; line-height: 1; }
  .metric .lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.6rem; color: var(--muted); text-transform: uppercase; margin-top: 4px; }
  .div-line { width: 1px; height: 30px; background: var(--border); }
  .slider-ctrl { display: flex; align-items: center; gap: 0.75rem; }
  .slider-ctrl span { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; }
  .slider-ctrl strong { font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; color: var(--accent); width: 15px; }
  
  /* SVG Styles */
  .svg-wrapper { width: 95%; max-width: 1400px; max-height: 90vh; }
  .svg-label { font-family: 'JetBrains Mono', monospace; font-size: 14px; fill: var(--muted); font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; }
  .svg-thread-text { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; }
  .anim-line { transition: x2 0.4s cubic-bezier(0.25, 1, 0.5, 1), stroke 0.2s, stroke-width 0.2s; }
  .anim-shape { transition: fill 0.3s, stroke 0.3s; }
  
  .spacer-bottom { height: 50vh; }
</style>