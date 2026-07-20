<script lang="ts">
  export let breadcrumb: string = '';
</script>

<section class="scroll-card">
  <div class="card-inner">
    <header class="card-header">
       {#if breadcrumb}
         <div class="breadcrumb">{breadcrumb}</div>
       {/if}
       <div class="controls"><slot name="controls"></slot></div>
    </header>
    
    <main class="card-content">
      <slot></slot>
    </main>
    
    {#if $$slots.footer}
    <footer class="card-footer">
      <div class="footer-box">
         <span class="diamond">♦</span>
         <div class="footer-text"><slot name="footer"></slot></div>
      </div>
    </footer>
    {/if}
  </div>
</section>

<style>
  .scroll-card { 
    height: calc(100vh - 52px); width: 100%; 
    scroll-snap-align: start; 
    display: flex; justify-content: center; align-items: center; 
    padding: 2rem; 
  }
  .card-inner { 
    width: 100%; max-width: 1300px; height: 100%; max-height: 850px; 
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px; 
    display: flex; flex-direction: column; padding: 2.5rem; 
    box-shadow: 0 20px 40px rgba(0,0,0,0.2); 
  }
  .card-header { 
    display: flex; justify-content: space-between; align-items: center; height: 40px; 
  }
  .breadcrumb { 
    font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; 
    color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; 
  }
  .card-content { 
    flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; 
    overflow: hidden; gap: 2rem; min-height: 0;
  }
  .card-footer { 
    margin-top: 1.5rem; 
  }
  .footer-box { 
    border: 1px solid var(--border); background: var(--bg); 
    border-radius: 8px; padding: 1.25rem 1.5rem; 
    display: flex; gap: 1rem; align-items: flex-start; 
  }
  .diamond { 
    color: var(--muted); font-size: 1.2rem; line-height: 1.2; 
  }
  .footer-text { 
    color: var(--text); font-size: 0.95rem; line-height: 1.6; opacity: 0.85; 
  }
  
  /* Generic Control Styling for Local Sliders */
  :global(.controls) { display: flex; gap: 1.5rem; }
  :global(.controls .ctrl-group) { display: flex; align-items: center; gap: 0.75rem; }
  :global(.controls .ctrl-group span) { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; }
  :global(.controls .ctrl-group strong) { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text); }
  :global(.controls input[type="range"]) { width: 100px; accent-color: var(--red); cursor: pointer; }
</style>