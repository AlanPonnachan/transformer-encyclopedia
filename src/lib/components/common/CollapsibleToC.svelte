<script lang="ts">
  export let chapters: { id: string; title: string; sections: { id: string; title: string }[] }[] = [];
  export let activeSectionId: string = '';

  let isExpanded = false;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<nav 
  class="rail-toc" 
  class:expanded={isExpanded}
  on:mouseenter={() => isExpanded = true}
  on:mouseleave={() => isExpanded = false}
>
  <!-- The Visible Handle -->
  <div class="toc-handle" class:hidden={isExpanded}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
  </div>
  
  <div class="toc-content">
    <div class="toc-header">
      <span class="icon">▤</span>
      <span class="title">Contents</span>
    </div>
    
    <div class="toc-body">
      {#each chapters as chap, i}
        <div class="chapter">
          <div class="chap-title"><span class="num">{i + 1}.</span> {chap.title}</div>
          <div class="sections">
            {#each chap.sections as sec}
              <a 
                href="#{sec.id}" 
                class="sec-link" 
                class:active={activeSectionId === sec.id}
                on:click={() => isExpanded = false}
              >
                {sec.title}
              </a>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
</nav>

<style>
  .rail-toc {
    position: fixed; top: 52px; left: 0; height: calc(100vh - 52px);
    width: 0px; background: transparent; z-index: 150;
    transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s;
  }
  .rail-toc:hover, .rail-toc.expanded {
    width: 280px; 
    background: var(--glass-bg); /* Fixed Light Theme Bug */
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border-right: 1px solid var(--border);
    box-shadow: 10px 0 40px rgba(0,0,0,0.1);
  }
  
  /* The visible handle that users click/hover */
  .toc-handle {
    position: absolute; top: 2rem; left: 0; 
    background: var(--surface2); border: 1px solid var(--border); border-left: none;
    padding: 0.5rem 0.5rem 0.5rem 0.25rem; border-radius: 0 6px 6px 0;
    color: var(--muted); cursor: pointer; transition: opacity 0.2s, color 0.2s;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 2px 2px 10px rgba(0,0,0,0.05);
  }
  .toc-handle:hover { color: var(--text); background: var(--border); }
  .toc-handle.hidden { opacity: 0; pointer-events: none; }

  /* Content */
  .toc-content { width: 280px; padding: 2rem 1.5rem; opacity: 0; transition: opacity 0.2s; overflow-y: auto; height: 100%; }
  .rail-toc.expanded .toc-content { opacity: 1; transition-delay: 0.1s; }
  
  .toc-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem; color: var(--text); }
  .toc-header .icon { color: var(--accent); font-size: 1.2rem; }
  .toc-header .title { font-family: 'JetBrains Mono', monospace; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.8rem; }
  
  .chapter { margin-bottom: 1.5rem; }
  .chap-title { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .chap-title .num { color: var(--accent); }
  
  .sections { display: flex; flex-direction: column; gap: 4px; border-left: 1px solid var(--border); margin-left: 6px; padding-left: 12px; }
  .sec-link { text-decoration: none; color: var(--text); font-size: 0.9rem; opacity: 0.7; padding: 0.4rem 0.5rem; border-radius: 4px; transition: all 0.2s; }
  .sec-link:hover { opacity: 1; background: var(--surface2); }
  .sec-link.active { opacity: 1; color: var(--accent); font-weight: 600; background: rgba(99, 102, 241, 0.1); border-left: 2px solid var(--accent); margin-left: -13px; padding-left: calc(0.5rem + 11px); }
</style>