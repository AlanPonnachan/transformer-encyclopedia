<script lang="ts">
  import type { PageData } from './$types';
  import MhaDiagram from '$lib/components/mha/MhaDiagram.svelte';
  import MlaDiagram from '$lib/components/mla/MlaDiagram.svelte';
  import MathLabel from '$lib/atoms/MathLabel.svelte';
  import { activeStep, activeDimensions, fullScreen, inspectedCell, stepSequence } from '$lib/stores/diagram';
  import { onMount } from 'svelte';

  export let data: PageData;
  const diagrams: Record<string, unknown> = { mha: MhaDiagram, mla: MlaDiagram };
  $: DiagramComponent = diagrams[data.slug];
  $: title = data.metadata?.title ?? data.slug.toUpperCase();

  let phases: { id: string, el: HTMLElement, dims: string[] }[] = [];
  let articleSection: HTMLElement;
  let programmaticScrollTimer: ReturnType<typeof setTimeout>;
  let isScrollingProgrammatically = false;

  // Two-way sync logic
  $: if ($activeStep && phases.length > 0) {
    const targetPhase = phases.find(p => p.id === $activeStep);
    if (targetPhase && !targetPhase.el.classList.contains('is-active')) {
      isScrollingProgrammatically = true;
      
      phases.forEach(p => p.el.classList.remove('is-active'));
      targetPhase.el.classList.add('is-active');
      activeDimensions.set(targetPhase.dims);

      targetPhase.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      clearTimeout(programmaticScrollTimer);
      programmaticScrollTimer = setTimeout(() => { isScrollingProgrammatically = false; }, 800);
    }
  }

  function handleBackdropClick() { inspectedCell.set(null); }
  function stopClick(e: MouseEvent) { e.stopPropagation(); }

  onMount(() => {
    const stepNodes = Array.from(document.querySelectorAll('.step')) as HTMLElement[];
    phases = stepNodes.map(el => ({ 
      id: el.dataset.stepId || '', 
      el,
      dims: el.dataset.activeDims?.split(',') || []
    }));

    // Save sequence globally for the stepper
    stepSequence.set(phases.map(p => p.id));

    const io = new IntersectionObserver(
      entries => {
        if (isScrollingProgrammatically) return;
        for (const e of entries) {
          if (e.isIntersecting) {
            const target = e.target as HTMLElement;
            const id = target.dataset.stepId || '';
            
            activeStep.set(id);
            const targetPhase = phases.find(p => p.id === id);
            if (targetPhase) activeDimensions.set(targetPhase.dims);
            
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
        
        const id = s.dataset.stepId || '';
        activeStep.set(id);
        const targetPhase = phases.find(p => p.id === id);
        if (targetPhase) activeDimensions.set(targetPhase.dims);

        stepNodes.forEach(n => n.classList.remove('is-active'));
        s.classList.add('is-active');

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

    <!-- GLOBAL CELL INSPECTOR -->
    {#if $inspectedCell}
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
  </main>
</div>

<style>
  .apple-layout { display: flex; height: calc(100vh - 52px); overflow: hidden; background: var(--bg); }
  .left-pane {
    width: 38%; min-width: 400px; height: 100%; overflow-y: auto; border-right: 1px solid var(--border);
    background: var(--bg); position: relative; scroll-behavior: smooth;
    transition: width 0.4s cubic-bezier(0.25, 1, 0.5, 1), min-width 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  }
  .apple-layout.is-fullscreen .left-pane { width: 0; min-width: 0; border-right: none; opacity: 0; }
  .prose-container { padding: 2rem 2.5rem; }
  .right-pane { flex: 1; position: relative; background: radial-gradient(circle at center, var(--surface2) 0%, var(--bg) 100%); display: flex; justify-content: center; align-items: center; overflow: hidden; }
  .diagram-wrapper { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }

  /* Cell Inspector Global Styles */
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
  .badge { background: var(--accent); color: white; font-size: 0.65rem; font-weight: 700; padding: 0.3em 0.6em; border-radius: 4px; font-family: 'JetBrains Mono', monospace; }

  :global(.apple-prose .step) { background: transparent; border-left: 3px solid transparent; padding: 1.5rem 0 1.5rem 1.5rem; margin: 1rem 0 3rem 0; opacity: 0.25; transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1); cursor: pointer; min-height: auto; }
  :global(.apple-prose .step:hover) { opacity: 0.6; }
  :global(.apple-prose .step.is-active) { opacity: 1; border-left-color: var(--accent); background: linear-gradient(90deg, rgba(99, 102, 241, 0.05) 0%, transparent 100%); transform: translateX(5px); }
  :global(.apple-prose .step-badge) { margin-top: 0; }
</style>