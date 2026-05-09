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

  onMount(() => {
    const steps = document.querySelectorAll('.step');
    const io = new IntersectionObserver(
      entries => { for (const e of entries) if (e.isIntersecting) activeStep.set((e.target as HTMLElement).dataset.stepId ?? ''); },
      { threshold: 0.5 }
    );
    steps.forEach(s => io.observe(s));
    return () => io.disconnect();
  });
</script>
<svelte:head><title>{title} — Transformer Encyclopedia</title></svelte:head>
<div style="display:grid;grid-template-columns:1fr 1fr;height:calc(100vh - 52px);overflow:hidden">
  <!-- LEFT: sticky diagram -->
  <aside style="border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden">
    <div style="flex:1;overflow:auto;padding:1rem">
      {#if DiagramComponent}
        <svelte:component this={DiagramComponent}/>
      {:else}
        <div style="display:flex;align-items:center;justify-content:center;height:200px;font-family:'JetBrains Mono',monospace;font-size:0.8rem;color:var(--muted)">No diagram for "{data.slug}"</div>
      {/if}
    </div>
    <!-- Controls -->
    <div style="border-top:1px solid var(--border);padding:0.75rem 1rem;background:var(--surface);display:flex;flex-direction:column;gap:0.6rem">
      <div style="font-family:'JetBrains Mono',monospace;font-size:0.62rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px">⚙ Parameters</div>
      
      <label style="display:flex;align-items:center;gap:0.75rem;cursor:pointer">
        <span style="font-family:'JetBrains Mono',monospace;font-size:0.7rem;color:var(--muted);min-width:120px">d_model: <strong style="color:var(--highlight)">{$dModel}</strong></span>
        <input type="range" min="128" max="1024" step="128" bind:value={$dModel} style="flex:1;accent-color:var(--accent);cursor:pointer"/>
      </label>

      <label style="display:flex;align-items:center;gap:0.75rem;cursor:pointer">
        <span style="font-family:'JetBrains Mono',monospace;font-size:0.7rem;color:var(--muted);min-width:120px">heads: <strong style="color:var(--highlight)">{$numHeads}</strong></span>
        <input type="range" min="1" max="16" step="1" bind:value={$numHeads} style="flex:1;accent-color:var(--accent);cursor:pointer"/>
      </label>

      <label style="display:flex;align-items:center;gap:0.75rem;cursor:pointer">
        <span style="font-family:'JetBrains Mono',monospace;font-size:0.7rem;color:var(--muted);min-width:120px">seq_len: <strong style="color:var(--highlight)">{$seqLen}</strong></span>
        <input type="range" min="3" max="12" step="1" bind:value={$seqLen} style="flex:1;accent-color:var(--accent);cursor:pointer"/>
      </label>

      {#if data.slug === 'mla'}
        <label style="display:flex;align-items:center;gap:0.75rem;cursor:pointer">
          <span style="font-family:'JetBrains Mono',monospace;font-size:0.7rem;color:var(--muted);min-width:120px">latent ratio: <strong style="color:var(--highlight)">{$latentRatio}</strong></span>
          <input type="range" min="0.05" max="0.5" step="0.05" bind:value={$latentRatio} style="flex:1;accent-color:var(--accent);cursor:pointer"/>
        </label>
      {/if}
    </div>
  </aside>
  <!-- RIGHT: scrollable article -->
  <article style="overflow-y:auto;padding:2rem;background:var(--bg)">
    <div class="prose">
      <svelte:component this={data.content}/>
    </div>
  </article>
</div>