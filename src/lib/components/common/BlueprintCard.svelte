<script lang="ts">
  export let id: string;
  export let title: string = '';
  export let subtitle: string = '';
</script>

<section {id} class="blueprint-card">
  <div class="card-grid-bg"></div>
  
  <header class="card-header">
    <div class="header-content">
      <h2>{title}</h2>
      {#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
    </div>
    <div class="tech-deco">
      <span class="crosshair">+</span>
      <span class="id-tag">SEC-{id.toUpperCase()}</span>
    </div>
  </header>
  
  <div class="card-body">
    <slot></slot>
  </div>
  
  {#if $$slots.footer}
    <footer class="card-footer">
      <div class="footer-box">
        <div class="tech-line"></div>
        <div class="footer-text"><slot name="footer"></slot></div>
      </div>
    </footer>
  {/if}
</section>

<style>
  .blueprint-card {
    position: relative; width: 100%; max-width: 1200px; margin: 0 auto 6rem auto;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 4px; /* Sharp corners for technical look */
    padding: 3rem; display: flex; flex-direction: column;
    overflow: hidden;
  }
  
  /* The Signature Blueprint Grid Background */
  .card-grid-bg {
    position: absolute; inset: 0; pointer-events: none; opacity: 0.3;
    background-size: 30px 30px;
    background-image: 
      linear-gradient(to right, var(--border) 1px, transparent 1px),
      linear-gradient(to bottom, var(--border) 1px, transparent 1px);
    z-index: 0;
  }

  .card-header, .card-body, .card-footer { position: relative; z-index: 10; }
  
  .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3rem; border-bottom: 1px dashed var(--border); padding-bottom: 1.5rem; }
  .card-header h2 { font-size: 1.75rem; color: var(--text); margin: 0 0 0.5rem 0; font-weight: 700; letter-spacing: -0.02em; }
  .subtitle { font-size: 0.95rem; color: var(--muted); margin: 0; line-height: 1.6; max-width: 600px; }
  
  .tech-deco { display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; color: var(--muted); }
  .crosshair { font-family: monospace; font-size: 1.2rem; line-height: 1; }
  .id-tag { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; background: var(--surface2); padding: 0.2rem 0.5rem; border: 1px solid var(--border); }
  
  .card-body { flex: 1; min-height: 400px; display: flex; flex-direction: column; }
  
  .card-footer { margin-top: 3rem; }
  .footer-box { display: flex; gap: 1.5rem; align-items: stretch; background: var(--surface2); padding: 1.5rem; border: 1px solid var(--border); border-left: 3px solid var(--accent); }
  .tech-line { width: 1px; background: var(--border); }
  .footer-text { color: var(--text); font-size: 0.95rem; line-height: 1.7; width: 100%; }
</style>