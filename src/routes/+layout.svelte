<script lang="ts">
  import '../app.postcss';
  import { base } from '$app/paths';
</script>
<div style="min-height:100vh;display:flex;flex-direction:column;background:var(--bg)">
  <nav style="height:52px;background:rgba(10,10,15,0.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 1.5rem;position:sticky;top:0;z-index:100">
    <a href="{base}/" style="font-family:'JetBrains Mono',monospace;font-size:0.9rem;font-weight:700;text-decoration:none">
      <span style="color:var(--muted)">[</span><span style="color:var(--text)">Transformer</span><span style="color:var(--accent)">Encyclopedia</span><span style="color:var(--muted)">]</span>
    </a>
    <div style="display:flex;gap:1.5rem;align-items:center">
      <a href="{base}/mha" style="color:var(--muted);text-decoration:none;font-size:0.8rem;font-family:'JetBrains Mono',monospace;font-weight:500">MHA</a>
      <a href="{base}/mla" style="color:var(--muted);text-decoration:none;font-size:0.8rem;font-family:'JetBrains Mono',monospace;font-weight:500">MLA</a>
      <span style="color:var(--border);font-size:0.75rem;font-family:'JetBrains Mono',monospace">GQA (soon)</span>
      <span style="color:var(--border);font-size:0.75rem;font-family:'JetBrains Mono',monospace">RoPE (soon)</span>
    </div>
  </nav>
  <main style="flex:1"><slot /></main>
</div>