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

  let phases: { id: string, el: HTMLElement }[] = [];
  let currentIndex = 0;
  let articleSection: HTMLElement;

  onMount(() => {
    const stepNodes = Array.from(document.querySelectorAll('.step')) as HTMLElement[];
    phases = stepNodes.map(el => ({ id: el.dataset.stepId || '', el }));

    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const target = e.target as HTMLElement;
            const id = target.dataset.stepId || '';
            activeStep.set(id);
            
            // Remove active class from all, add to current
            stepNodes.forEach(n => n.classList.remove('is-active'));
            target.classList.add('is-active');

            const foundIndex = phases.findIndex(p => p.id === id);
            if (foundIndex !== -1) currentIndex = foundIndex;
          }
        }
      },
      { 
        root: articleSection, 
        threshold: 0.4, // Higher threshold so it triggers when the card is well in view
        rootMargin: "-20% 0px -40% 0px" 
      }
    );
    
    stepNodes.forEach(s => {
      io.observe(s);
      // Optional: click a text card to scroll it into view
      s.addEventListener('click', () => s.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    });

    return () => io.disconnect();
  });
</script>

<svelte:head><title>{title} — Transformer Encyclopedia</title></svelte:head>

<div class="apple-layout">
  
  <!-- LEFT PANE: CONTROLS & SCROLLING TEXT -->
  <aside class="left-pane" bind:this={articleSection}>
    
    <!-- Sticky Hyperparameters Header -->
    <header class="sticky-controls">
      <div class="controls-grid">
        <label>
          <span>d_model:</span><strong>{$dModel}</strong>
          <input type="range" min="128" max="1024" step="128" bind:value={$dModel} />
        </label>
        <label>
          <span>heads:</span><strong>{$numHeads}</strong>
          <input type="range" min="1" max="16" step="1" bind:value={$numHeads} />
        </label>
        <label>
          <span>seq_len:</span><strong>{$seqLen}</strong>
          <input type="range" min="3" max="12" step="1" bind:value={$seqLen} />
        </label>
        {#if data.slug === 'mla'}
          <label>
            <span>latent:</span><strong>{$latentRatio}</strong>
            <input type="range" min="0.05" max="0.5" step="0.05" bind:value={$latentRatio} />
          </label>
        {/if}
      </div>
    </header>

    <!-- The Scrollytelling Markdown -->
    <div class="prose-container">
      <div class="prose apple-prose">
        <svelte:component this={data.content}/>
      </div>
      <!-- Spacer to allow the last item to scroll up -->
      <div style="height: 50vh;"></div>
    </div>
  </aside>

  <!-- RIGHT PANE: FROZEN CANVAS -->
  <main class="right-pane">
    <div class="diagram-wrapper">
      {#if DiagramComponent}
        <!-- Keeping the auto-pan diagram we built -->
        <svelte:component this={DiagramComponent}/>
      {:else}
        <div class="not-found">No diagram found for "{data.slug}"</div>
      {/if}
    </div>
  </main>

</div>

<style>
  /* Apple-style layout architecture */
  .apple-layout { 
    display: flex; 
    height: calc(100vh - 52px); 
    overflow: hidden; 
    background: var(--bg); 
  }

  /* --- LEFT PANE --- */
  .left-pane {
    width: 38%; /* Takes up roughly a third of the screen */
    min-width: 400px;
    height: 100%;
    overflow-y: auto;
    border-right: 1px solid var(--border);
    background: var(--bg);
    position: relative;
    scroll-behavior: smooth;
  }

  /* Glassmorphic sticky header for controls */
  .sticky-controls {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(10, 10, 15, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    padding: 1.5rem;
  }

  .controls-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem 1.5rem;
  }

  label { display: flex; flex-direction: column; gap: 0.25rem; }
  label span { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
  label strong { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--highlight); }
  input[type="range"] { width: 100%; accent-color: var(--accent); cursor: pointer; }

  /* Markdown Container */
  .prose-container {
    padding: 2rem 2.5rem;
  }

  /* --- RIGHT PANE --- */
  .right-pane {
    flex: 1;
    position: relative;
    background: radial-gradient(circle at center, var(--surface2) 0%, var(--bg) 100%);
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  }

  .diagram-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* --- OVERRIDING THE PROSE STEPS (APPLE STYLE) --- */
  :global(.apple-prose .step) {
    background: transparent;
    border-left: 3px solid transparent;
    padding: 1.5rem 0 1.5rem 1.5rem;
    margin: 1rem 0 3rem 0;
    opacity: 0.25;
    transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
    cursor: pointer;
    min-height: auto; /* Remove the old 65vh min-height */
  }

  :global(.apple-prose .step:hover) {
    opacity: 0.6;
  }

  /* When the observer triggers, it adds the .is-active class */
  :global(.apple-prose .step.is-active) {
    opacity: 1;
    border-left-color: var(--accent);
    background: linear-gradient(90deg, rgba(99, 102, 241, 0.05) 0%, transparent 100%);
    transform: translateX(5px);
  }

  :global(.apple-prose .step-badge) { margin-top: 0; }
</style>