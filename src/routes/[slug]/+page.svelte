<script lang="ts">
  import type { PageData } from './$types';
  import MhaDiagram from '$lib/components/mha/MhaDiagram.svelte';
  import MlaDiagram from '$lib/components/mla/MlaDiagram.svelte';
  import { dModel, numHeads, seqLen, latentRatio } from '$lib/stores/config';
  import { activeStep } from '$lib/stores/diagram';
  import { onMount } from 'svelte';

  export let data: PageData;
  const diagrams: Record<string, unknown> = { mha: MhaDiagram, mla: MlaDiagram };
  $: DiagramComponent = diagrams[data.slug];
  $: title = data.metadata?.title ?? data.slug.toUpperCase();

  let steps: { id: string, el: HTMLElement }[] =[];
  let currentIndex = 0;
  
  // Reference to the scrollable text pane
  let articleSection: HTMLElement;

  onMount(() => {
    const stepNodes = Array.from(document.querySelectorAll('.step')) as HTMLElement[];
    steps = stepNodes.map(el => ({ id: el.dataset.stepId || '', el }));

    // Sync scrolling to the Tour Card, but ONLY inside the article pane
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const id = (e.target as HTMLElement).dataset.stepId || '';
            activeStep.set(id);
            const foundIndex = steps.findIndex(s => s.id === id);
            if (foundIndex !== -1) currentIndex = foundIndex;
          }
        }
      },
      { 
        root: articleSection, // <--- THIS IS THE FIX: Only observe the bottom pane
        threshold: 0.1, 
        rootMargin: "-10% 0px -40% 0px" 
      }
    );
    
    stepNodes.forEach(s => io.observe(s));
    return () => io.disconnect();
  });

  function goToStep(index: number) {
    if (index >= 0 && index < steps.length) {
      currentIndex = index;
      const target = steps[index];
      activeStep.set(target.id);
      
      // Smooth scroll the target into view (natively scrolls the nearest scrollable ancestor)
      target.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
</script>

<svelte:head><title>{title} — Transformer Encyclopedia</title></svelte:head>

<div class="layout">
  
  <!-- TOP: FROZEN INTERACTIVE CANVAS -->
  <section class="canvas-section">
    <div class="diagram-wrapper">
      {#if DiagramComponent}
        <svelte:component this={DiagramComponent}/>
      {:else}
        <div class="not-found">No diagram found for "{data.slug}"</div>
      {/if}
    </div>

    <!-- The Floating Tour Card -->
    <div class="tour-card">
      <div class="tour-header">
        <h3>Interactive Controls</h3>
        <span class="badge">{data.slug.toUpperCase()}</span>
      </div>

      <div class="controls">
        <label>
          <span>d_model: <strong>{$dModel}</strong></span>
          <input type="range" min="128" max="1024" step="128" bind:value={$dModel} />
        </label>
        <label>
          <span>heads: <strong>{$numHeads}</strong></span>
          <input type="range" min="1" max="16" step="1" bind:value={$numHeads} />
        </label>
        <label>
          <span>seq_len: <strong>{$seqLen}</strong></span>
          <input type="range" min="3" max="12" step="1" bind:value={$seqLen} />
        </label>
        {#if data.slug === 'mla'}
          <label>
            <span>latent ratio: <strong>{$latentRatio}</strong></span>
            <input type="range" min="0.05" max="0.5" step="0.05" bind:value={$latentRatio} />
          </label>
        {/if}
      </div>

      <div class="tour-nav">
        <button disabled={currentIndex <= 0} on:click={() => goToStep(currentIndex - 1)}>
          ← Prev
        </button>
        <div class="dots">
          {#each steps as _, i}
            <div class="dot" class:active={i === currentIndex}></div>
          {/each}
        </div>
        <button disabled={currentIndex >= steps.length - 1} on:click={() => goToStep(currentIndex + 1)}>
          Next →
        </button>
      </div>
    </div>
  </section>

  <!-- BOTTOM: INDEPENDENTLY SCROLLING ARTICLE PANE -->
  <article bind:this={articleSection} class="article-section">
    <div class="prose">
      <svelte:component this={data.content}/>
    </div>
  </article>

</div>

<style>
  /* Layout Architecture: Fixed to exactly the screen height */
  .layout { 
    display: flex; 
    flex-direction: column; 
    height: calc(100vh - 52px); 
    overflow: hidden; /* <--- Prevents the whole window from scrolling */
    background: var(--bg); 
  }
  
  /* Canvas Area is frozen at 60vh */
  .canvas-section {
    position: relative;
    width: 100%;
    height: 60vh;
    flex-shrink: 0;
    background: radial-gradient(circle at center, var(--surface2) 0%, var(--bg) 100%);
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    z-index: 10;
  }
  
  .diagram-wrapper {
    width: 100%;
    height: 100%;
    padding: 2rem 2rem 6rem 2rem;
    overflow: auto;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .tour-card {
    position: absolute;
    bottom: 1.5rem;
    right: 1.5rem;
    width: 340px;
    background: rgba(17, 17, 24, 0.7);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    z-index: 50;
  }

  .tour-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.75rem;
  }

  .tour-header h3 { margin: 0; font-size: 0.9rem; font-family: 'JetBrains Mono', monospace; color: var(--text); }
  .badge { background: var(--accent); color: white; font-size: 0.6rem; font-weight: 700; padding: 0.2em 0.6em; border-radius: 4px; font-family: 'JetBrains Mono', monospace; }

  .controls { display: flex; flex-direction: column; gap: 0.75rem; }
  .controls label { display: flex; align-items: center; gap: 1rem; cursor: pointer; }
  .controls span { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); min-width: 130px; }
  .controls strong { color: var(--highlight); }
  .controls input[type="range"] { flex: 1; accent-color: var(--accent); cursor: pointer; }

  .tour-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .tour-nav button {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .tour-nav button:hover:not(:disabled) { background: var(--accent); border-color: var(--accent); }
  .tour-nav button:disabled { opacity: 0.3; cursor: not-allowed; }

  .dots { display: flex; gap: 4px; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); transition: background 0.3s; }
  .dot.active { background: var(--accent); box-shadow: 0 0 8px var(--accent); }

  /* Deep Dive Article: INDEPENDENTLY SCROLLING PANE */
  .article-section { 
    flex: 1; 
    overflow-y: auto; /* <--- THIS IS THE FIX: Article scrolls independently */
    padding: 3rem 2rem 5rem 2rem; 
    display: flex; 
    justify-content: center; 
    background: var(--bg);
    box-shadow: inset 0 15px 15px -15px rgba(0,0,0,0.8); /* Nice inner shadow to separate from canvas */
  }
  
  .prose { width: 100%; max-width: 768px; }
  .not-found { font-family: 'JetBrains Mono', monospace; color: var(--muted); }
</style>