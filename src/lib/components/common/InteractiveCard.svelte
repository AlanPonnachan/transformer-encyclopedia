<script lang="ts">
  export let title: string = '';
  export let subtitle: string = '';
</script>

<section class="interactive-card">
  {#if title}
    <header class="card-header">
      <h2>{title}</h2>
      {#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
    </header>
  {/if}
  
  <div class="card-body">
    <slot></slot>
  </div>
  
  {#if $$slots.footer}
    <footer class="card-footer">
      <div class="footer-box">
        <span class="diamond">♦</span>
        <div class="footer-text"><slot name="footer"></slot></div>
      </div>
    </footer>
  {/if}
</section>

<style>
  .interactive-card {
    width: 100%; max-width: 1200px; margin: 0 auto 6rem auto;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; padding: 3rem; display: flex; flex-direction: column;
    box-shadow: 0 20px 50px rgba(0,0,0,0.15);
  }
  .card-header { margin-bottom: 3rem; }
  .card-header h2 { font-size: 1.75rem; color: var(--text); margin: 0 0 0.5rem 0; font-weight: 700; }
  .subtitle { font-size: 1rem; color: var(--muted); margin: 0; line-height: 1.5; }
  .card-body { flex: 1; position: relative; min-height: 400px; display: flex; }
  
  .card-footer { margin-top: 3rem; }
  .footer-box { 
    border: 1px solid var(--border); background: var(--bg); 
    border-radius: 8px; padding: 1.25rem 1.5rem; 
    display: flex; gap: 1rem; align-items: flex-start; 
  }
  .diamond { color: var(--muted); font-size: 1.2rem; line-height: 1.2; }
  .footer-text { color: var(--text); font-size: 0.95rem; line-height: 1.6; opacity: 0.85; width: 100%; }
</style>