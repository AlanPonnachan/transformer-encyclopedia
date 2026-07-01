<script lang="ts">
  import type { PageData } from './$types';
  import MhaDiagram from '$lib/components/mha/MhaDiagram.svelte';
  import MlaDiagram from '$lib/components/mla/MlaDiagram.svelte';
  import { activeStep, activeDimensions, fullScreen, inspectedCell } from '$lib/stores/diagram';
  import { onMount } from 'svelte';

  export let data: PageData;
  const diagrams: Record<string, unknown> = { mha: MhaDiagram, mla: MlaDiagram };
  $: DiagramComponent = diagrams[data.slug];
  $: title = data.metadata?.title ?? data.slug.toUpperCase();

  let phases: { id: string, el: HTMLElement, dims: string[] }[] = [];
  let articleSection: HTMLElement;
  let programmaticScrollTimer: ReturnType<typeof setTimeout>;
  let isScrollingProgrammatically = false;

  // Two-way sync logic: Watch activeStep and scroll text if changed externally
  $: if ($activeStep && phases.length > 0) {
    const targetPhase = phases.find(p => p.id === $activeStep);
    // If the step doesn't have 'is-active', it means it was changed via the Canvas Mini-Stepper
    if (targetPhase && !targetPhase.el.classList.contains('is-active')) {
      isScrollingProgrammatically = true;
      
      // Update visual active classes
      phases.forEach(p => p.el.classList.remove('is-active'));
      targetPhase.el.classList.add('is-active');
      activeDimensions.set(targetPhase.dims);

      // Scroll it into view silently in the background
      targetPhase.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      clearTimeout(programmaticScrollTimer);
      programmaticScrollTimer = setTimeout(() => { isScrollingProgrammatically = false; }, 800);
    }
  }

  // Clear inspected cell when clicking empty space
  function handleBackdropClick() { inspectedCell.set(null); }

  onMount(() => {
    const stepNodes = Array.from(document.querySelectorAll('.step')) as HTMLElement[];
    phases = stepNodes.map(el => ({ 
      id: el.dataset.stepId || '', 
      el,
      dims: el.dataset.activeDims?.split(',') || []
    }));

    const io = new IntersectionObserver(
      entries => {
        if (isScrollingProgrammatically) return; // Ignore observer during manual mini-stepper navigation

        for (const e of entries) {
          if (e.isIntersecting) {
            const target = e.target as HTMLElement;
            const id = target.dataset.stepId || '';
            
            // Sync state
            activeStep.set(id);
            const targetPhase = phases.find(p => p.id === id);
            if (targetPhase) activeDimensions.set(targetPhase.dims);
            
            // UI visual update
            stepNodes.forEach(n => n.classList.remove('is-active'));
            target.classList.add('is-active');
          }
        }
      },
      { root: articleSection, threshold: 0.4, rootMargin: "-20% 0px -40% 0px" }
    );
    
    stepNodes.forEach(s => {
      io.observe(s);
      s.addEventListener('click', () => {
        isScrollingProgrammatically = true;
        s.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { isScrollingProgrammatically = false; }, 800);
      });
    });

    return () => {
      io.disconnect();
      clearTimeout(programmaticScrollTimer);
    };
  });
</script>

<svelte:head><title>{title} — Transformer Encyclopedia</title></svelte:head>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="apple-layout" class:is-fullscreen={$fullScreen} on:click={handleBackdropClick}>
  
  <aside class="left-pane" bind:this={articleSection}>
    <div class="prose-container">
      <div class="prose apple-prose">
        <svelte:component this={data.content}/>
      </div>
      <div style="height: 50vh;"></div>
    </div>
  </aside>

  <main class="right-pane">
    <div class="diagram-wrapper">
      {#if DiagramComponent}
        <svelte:component this={DiagramComponent}/>
      {:else}
        <div class="not-found">No diagram found for "{data.slug}"</div>
      {/if}
    </div>
  </main>
</div>

<style>
  .apple-layout { 
    display: flex; 
    height: calc(100vh - 52px); 
    overflow: hidden; 
    background: var(--bg); 
  }

  .left-pane {
    width: 38%; 
    min-width: 400px;
    height: 100%;
    overflow-y: auto;
    border-right: 1px solid var(--border);
    background: var(--bg);
    position: relative;
    scroll-behavior: smooth;
    transition: width 0.4s cubic-bezier(0.25, 1, 0.5, 1), min-width 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  }

  /* Full Screen Override */
  .apple-layout.is-fullscreen .left-pane {
    width: 0;
    min-width: 0;
    border-right: none;
    opacity: 0;
  }

  .prose-container { padding: 2rem 2.5rem; }

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

  :global(.apple-prose .step) {
    background: transparent;
    border-left: 3px solid transparent;
    padding: 1.5rem 0 1.5rem 1.5rem;
    margin: 1rem 0 3rem 0;
    opacity: 0.25;
    transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
    cursor: pointer;
    min-height: auto;
  }
  :global(.apple-prose .step:hover) { opacity: 0.6; }
  :global(.apple-prose .step.is-active) {
    opacity: 1;
    border-left-color: var(--accent);
    background: linear-gradient(90deg, rgba(99, 102, 241, 0.05) 0%, transparent 100%);
    transform: translateX(5px);
  }
  :global(.apple-prose .step-badge) { margin-top: 0; }
</style>