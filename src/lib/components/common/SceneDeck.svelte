<script lang="ts">
  export let title: string = "Interactive Explorer";
  export let scenes: { id: string, title: string }[] = [];
  
  let activeIndex = 0;
  let tocOpen = false;

  function setScene(index: number) {
    activeIndex = index;
    tocOpen = false;
  }
</script>

<div class="scene-deck">
  <!-- The Floating Pill ToC -->
  <div class="floating-toc-wrapper">
    <button class="pill" on:click={() => tocOpen = !tocOpen}>
      <span class="muted">Scene {activeIndex + 1}/{scenes.length}</span>
      <span class="title">{scenes[activeIndex]?.title || title}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class:rotated={tocOpen}><path d="M6 9l6 6 6-6"/></svg>
    </button>
    
    {#if tocOpen}
      <div class="toc-menu">
        {#each scenes as scene, i}
          <button class="toc-item" class:active={activeIndex === i} on:click={() => setScene(i)}>
            <span class="num">{i + 1}</span> {scene.title}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- The Flexible Canvas Area -->
  <div class="canvas-area">
    <slot name="canvas" {activeIndex}></slot>
  </div>

  <!-- The Floating Overlay Area (Text & Controls) -->
  <div class="overlay-area">
    <slot name="overlay" {activeIndex}></slot>
  </div>
</div>

<style>
  .scene-deck { position: relative; width: 100vw; height: calc(100vh - 52px); overflow: hidden; background: var(--bg); }
  
  /* Pill Navigation */
  .floating-toc-wrapper { position: absolute; top: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 100; display: flex; flex-direction: column; align-items: center; }
  .pill { 
    background: var(--glass-bg); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border); border-radius: 999px; padding: 0.5rem 1.25rem;
    display: flex; align-items: center; gap: 0.75rem; cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    transition: all 0.2s; color: var(--text); font-family: 'Space Grotesk', sans-serif;
  }
  .pill:hover { border-color: var(--accent); }
  .pill .muted { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); text-transform: uppercase; }
  .pill .title { font-size: 0.85rem; font-weight: 600; }
  .pill svg { transition: transform 0.2s; color: var(--muted); }
  .pill svg.rotated { transform: rotate(180deg); }
  
  .toc-menu { 
    margin-top: 0.5rem; background: var(--glass-bg); backdrop-filter: blur(16px);
    border: 1px solid var(--border); border-radius: 12px; padding: 0.5rem; min-width: 250px;
    display: flex; flex-direction: column; gap: 2px; box-shadow: 0 15px 40px rgba(0,0,0,0.2);
  }
  .toc-item { 
    display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; 
    background: transparent; border: none; color: var(--text); text-align: left;
    border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: background 0.2s;
  }
  .toc-item:hover { background: var(--surface2); }
  .toc-item.active { background: rgba(99,102,241,0.1); color: var(--accent); font-weight: 600; }
  .toc-item .num { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); }

  /* Slots */
  .canvas-area { position: absolute; inset: 0; z-index: 1; }
  .overlay-area { position: absolute; inset: 0; z-index: 10; pointer-events: none; }
  :global(.overlay-area > *) { pointer-events: auto; }
</style>