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
            const id = (e.target as HTMLElement).dataset.stepId || '';
            activeStep.set(id);
            const foundIndex = phases.findIndex(p => p.id === id);
            if (foundIndex !== -1) currentIndex = foundIndex;
          }
        }
      },
      { root: articleSection, threshold: 0.1, rootMargin: "-10% 0px -40% 0px" }
    );
    
    stepNodes.forEach(s => io.observe(s));
    return () => io.disconnect();
  });

  function goToPhase(index: number) {
    if (index >= 0 && index < phases.length) {
      currentIndex = index;
      const target = phases[index];
      activeStep.set(target.id);
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
  </section>

  <!-- MIDDLE: HORIZONTAL CONTROL BAR -->
  <section class="control-bar">
    <div class="controls-left">
      <span class="badge">{data.slug.toUpperCase()}</span>
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
          <span>latent: <strong>{$latentRatio}</strong></span>
          <input type="range" min="0.05" max="0.5" step="0.05" bind:value={$latentRatio} />
        </label>
      {/if}
    </div>
    
    <div class="controls-right">
      <button disabled={currentIndex <= 0} on:click={() => goToPhase(currentIndex - 1)}>← Prev</button>
      <div class="dots">
        {#each phases as _, i}
          <div class="dot" class:active={i === currentIndex}></div>
        {/each}
      </div>
      <button disabled={currentIndex >= phases.length - 1} on:click={() => goToPhase(currentIndex + 1)}>Next →</button>
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
  .layout { display: flex; flex-direction: column; height: calc(100vh - 52px); overflow: hidden; background: var(--bg); }
  
  /* Canvas Area: 55vh to give room to the control bar */
  .canvas-section { position: relative; width: 100%; height: 55vh; flex-shrink: 0; background: radial-gradient(circle at center, var(--surface2) 0%, var(--bg) 100%); display: flex; justify-content: center; align-items: center; overflow: hidden; z-index: 10; }
  .diagram-wrapper { width: 100%; height: 100%; padding: 1rem; overflow: hidden; display: flex; justify-content: center; align-items: center; }

  /* Control Bar: Flattens the Tour Card */
  .control-bar { flex: 0 0 60px; background: rgba(17, 17, 24, 0.95); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; z-index: 20; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5); }
  
  .controls-left { display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap; }
  .badge { background: var(--accent); color: white; font-size: 0.65rem; font-weight: 700; padding: 0.25em 0.6em; border-radius: 4px; font-family: 'JetBrains Mono', monospace; }
  
  label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
  label span { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); }
  label strong { color: var(--highlight); display: inline-block; width: 30px; }
  input[type="range"] { width: 100px; accent-color: var(--accent); cursor: pointer; }

  .controls-right { display: flex; gap: 1rem; align-items: center; }
  button { background: var(--surface); color: var(--text); border: 1px solid var(--border); padding: 0.3rem 0.6rem; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; cursor: pointer; transition: all 0.2s; }
  button:hover:not(:disabled) { background: var(--accent); border-color: var(--accent); }
  button:disabled { opacity: 0.3; cursor: not-allowed; }
  .dots { display: flex; gap: 4px; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); }
  .dot.active { background: var(--accent); box-shadow: 0 0 8px var(--accent); }

  .article-section { flex: 1; overflow-y: auto; padding: 2rem 2rem 5rem 2rem; display: flex; justify-content: center; background: var(--bg); }
  .prose { width: 100%; max-width: 768px; }
  .not-found { font-family: 'JetBrains Mono', monospace; color: var(--muted); }
</style>