<script lang="ts">
  import { base } from '$app/paths';
  const components = [
    { id:'mha', title:'Multi-Head Attention', abbr:'MHA', desc:'The foundational attention mechanism. Q, K, V, and all that jazz.', paper:'Attention Is All You Need (2017)', color:'#6366f1', ready:true },
    { id:'mla', title:'Multi-Head Latent Attention', abbr:'MLA', desc:"DeepSeek's KV cache compression. Smaller cache, better quality.", paper:'DeepSeek-V2 (2024)', color:'#10b981', ready:true },
    { id:'gqa', title:'Grouped Query Attention', abbr:'GQA', desc:'Share K/V heads across multiple Q heads. Used in Llama 2/3.', paper:'GQA (Ainslie et al., 2023)', color:'#f59e0b', ready:false },
    { id:'rope', title:'Rotary Positional Embeddings', abbr:'RoPE', desc:'Encode position by rotating Q and K in complex space.', paper:'RoFormer (Su et al., 2021)', color:'#ec4899', ready:false },
  ];
</script>
<svelte:head><title>Transformer Encyclopedia</title></svelte:head>
<div style="max-width:1100px;margin:0 auto;padding:3rem 1.5rem">
  <header style="margin-bottom:4rem">
    <div style="font-family:'JetBrains Mono',monospace;font-size:0.7rem;color:var(--accent);letter-spacing:0.15em;text-transform:uppercase;margin-bottom:1rem">Interactive Reference</div>
    <h1 style="font-size:clamp(2.5rem,6vw,4.5rem);font-weight:700;line-height:1.05;color:var(--text);margin:0 0 1.5rem;letter-spacing:-0.02em">
      Transformer<br/><span style="color:var(--accent)">Component</span><br/>Encyclopedia
    </h1>
    <p style="font-size:1rem;color:var(--muted);max-width:480px;line-height:1.7;margin-bottom:2rem">Blueprint-based visual explanations of modern Transformer architecture components. Zero model weights loaded.</p>
    <div style="display:flex;gap:2rem;font-family:'JetBrains Mono',monospace;font-size:0.8rem;color:var(--muted);flex-wrap:wrap">
      <span><strong style="color:var(--text)">0</strong> model files</span>
      <span><strong style="color:var(--text)">&lt;5MB</strong> bundle</span>
      <span><strong style="color:var(--text)">∞</strong> interactive sliders</span>
    </div>
  </header>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem">
    {#each components as c}
      <a href={c.ready?`${base}/${c.id}`:'#'}
        style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.5rem;text-decoration:none;display:flex;flex-direction:column;gap:0.75rem;transition:border-color 0.2s,transform 0.2s;{c.ready?'':'opacity:0.5;cursor:default'}"
        on:mouseover={e=>{if(c.ready){(e.currentTarget as HTMLElement).style.borderColor=c.color;(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';}}}
        on:mouseout={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)';(e.currentTarget as HTMLElement).style.transform=''}}
        on:focus={e=>{if(c.ready){(e.currentTarget as HTMLElement).style.borderColor=c.color;(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';}}}
        on:blur={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)';(e.currentTarget as HTMLElement).style.transform=''}}
      >
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;font-weight:700;color:{c.color}">{c.abbr}</span>
          {#if !c.ready}<span style="font-family:'JetBrains Mono',monospace;font-size:0.6rem;color:var(--muted);border:1px solid var(--border);padding:0.1em 0.5em;border-radius:3px">soon</span>{/if}
        </div>
        <h2 style="font-size:1rem;font-weight:600;color:var(--text);margin:0">{c.title}</h2>
        <p style="font-size:0.82rem;color:var(--muted);line-height:1.6;margin:0;flex:1">{c.desc}</p>
        <span style="font-family:'JetBrains Mono',monospace;font-size:0.6rem;color:var(--border)">{c.paper}</span>
      </a>
    {/each}
  </div>
</div>