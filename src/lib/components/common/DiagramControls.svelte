<script lang="ts">
  import { fullScreen, stepSequence, activeStep } from '$lib/stores/diagram';

  $: stepIndex = $stepSequence.indexOf($activeStep);
  
  function nextStep() { if (stepIndex < $stepSequence.length - 1) activeStep.set($stepSequence[stepIndex + 1]); }
  function prevStep() { if (stepIndex > 0) activeStep.set($stepSequence[stepIndex - 1]); }
  function stopClick(e: MouseEvent) { e.stopPropagation(); }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="canvas-controls" on:click={stopClick}>
  <button class="icon-btn" on:click={() => $fullScreen = !$fullScreen} title="Toggle Full Screen">
    {#if $fullScreen}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>
    {:else}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
    {/if}
  </button>
  
  <div class="div-line"></div>

  <!-- Sliders get injected here -->
  <slot></slot>

  {#if $fullScreen && $stepSequence.length > 0}
    <div class="div-line"></div>
    <div class="stepper">
      <button on:click={prevStep} disabled={stepIndex <= 0}>←</button>
      <span class="badge">STEP {Math.max(0, stepIndex) + 1}/{$stepSequence.length}</span>
      <button on:click={nextStep} disabled={stepIndex >= $stepSequence.length - 1}>→</button>
    </div>
  {/if}
</div>

<style>
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
  
  .stepper { display: flex; align-items: center; gap: 0.5rem; }
  .stepper button { background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: 4px; padding: 2px 8px; cursor: pointer; }
  .stepper button:disabled { opacity: 0.3; cursor: not-allowed; }
  
  .badge { background: var(--accent); color: white; font-size: 0.65rem; font-weight: 700; padding: 0.3em 0.6em; border-radius: 4px; font-family: 'JetBrains Mono', monospace; }

  /* Generic styles for injected labels */
  :global(.canvas-controls label) { display: flex; align-items: center; gap: 0.75rem; transition: opacity 0.4s ease; }
  :global(.canvas-controls label.dimmed) { opacity: 0.25; pointer-events: none; }
  :global(.canvas-controls label span) { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; }
  :global(.canvas-controls label strong) { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--highlight); width: 25px; display: inline-block; }
  :global(.canvas-controls input[type="range"]) { width: 100px; accent-color: var(--accent); cursor: pointer; }
</style>