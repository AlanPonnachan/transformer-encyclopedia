<script lang="ts">
  import { onMount } from 'svelte';
  import BlueprintCard from '$lib/components/common/BlueprintCard.svelte';

  // Llama 3 Configurations based on Meta's model.py & standard sizes
  const configs = {
    '8B':  { dim: 4096, n_layers: 32, n_heads: 32, n_kv_heads: 8, vocab_size: 128256, ffn_hidden: 14336 },
    '70B': { dim: 8192, n_layers: 80, n_heads: 64, n_kv_heads: 8, vocab_size: 128256, ffn_hidden: 28672 }
  };

  let activeConfig: '8B' | '70B' = '8B';
  $: c = configs[activeConfig];

  let hoveredNode: { name: string, shape: string, desc: string, x: number, y: number } | null = null;

  function setHover(e: MouseEvent, name: string, shape: string, desc: string) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    hoveredNode = { name, shape, desc, x: rect.left + window.scrollX + rect.width + 20, y: rect.top + window.scrollY };
  }

  function clearHover() { hoveredNode = null; }
</script>

<svelte:head><title>Llama 3 Architecture — Transformer Encyclopedia</title></svelte:head>

<div class="page-container">
  
  <header class="page-header">
    <div class="breadcrumb">ARCHITECTURES › LLAMA 3</div>
    <h1>Llama 3 Blueprint</h1>
    <p>A macro-view of the Llama 3 architecture. Hover over nodes to see how tensor shapes transform as they flow through the network.</p>
    
    <div class="config-selector">
      <span>Model Size:</span>
      <select bind:value={activeConfig}>
        <option value="8B">Llama 3 (8B)</option>
        <option value="70B">Llama 3 (70B)</option>
      </select>
    </div>
  </header>

  <BlueprintCard id="llama3-macro" title="Macro View" subtitle="Data flows top-to-bottom. The gray area is the Transformer Block, repeated {c.n_layers} times.">
    
    <div class="diagram-canvas">
      
      <!-- Input -->
      <div class="node input" on:mouseenter={(e) => setHover(e, 'Tokenized Text', '[seq_len]', 'Input token IDs from the prompt.')} on:mouseleave={clearHover}>
        Sample Input Text
      </div>
      
      <div class="arrow">↓</div>
      
      <!-- Embeddings -->
      <div class="node embed" on:mouseenter={(e) => setHover(e, 'Token Embedding', `[seq_len, ${c.dim}]`, `Looks up vectors in a [${c.vocab_size} × ${c.dim}] matrix.`)} on:mouseleave={clearHover}>
        Token Embedding Layer
      </div>

      <div class="arrow">↓</div>

      <!-- THE TRANSFORMER BLOCK -->
      <div class="transformer-block">
        <div class="block-multiplier">{c.n_layers} ×</div>
        
        <!-- Residual Stream Start -->
        <div class="residual-stream">
          
          <div class="stream-line"></div>

          <!-- Attention Branch -->
          <div class="branch">
            <div class="arrow-right">→</div>
            <div class="sub-block">
              <div class="node norm" on:mouseenter={(e) => setHover(e, 'RMSNorm 1', `[seq_len, ${c.dim}]`, 'Normalizes variance to stabilize gradients.')} on:mouseleave={clearHover}>RMSNorm 1</div>
              <div class="arrow">↓</div>
              <div class="node attn" on:mouseenter={(e) => setHover(e, 'Grouped-Query Attention', `[seq_len, ${c.dim}]`, `${c.n_heads} Q-heads and ${c.n_kv_heads} KV-heads calculate context.`)} on:mouseleave={clearHover}>
                Masked Grouped-Query Attention <span class="badge">RoPE</span>
              </div>
            </div>
            <div class="arrow-left">→</div>
            <div class="add-node" on:mouseenter={(e) => setHover(e, 'Residual Add', `[seq_len, ${c.dim}]`, 'Adds attention output back into the main stream.')} on:mouseleave={clearHover}>⊕</div>
          </div>

          <div class="stream-line"></div>

          <!-- FFN Branch -->
          <div class="branch">
            <div class="arrow-right">→</div>
            <div class="sub-block">
              <div class="node norm" on:mouseenter={(e) => setHover(e, 'RMSNorm 2', `[seq_len, ${c.dim}]`, 'Normalizes before the FeedForward layer.')} on:mouseleave={clearHover}>RMSNorm 2</div>
              <div class="arrow">↓</div>
              <div class="node ffn" on:mouseenter={(e) => setHover(e, 'SwiGLU FeedForward', `[seq_len, ${c.dim}]`, `Expands dim to ${c.ffn_hidden}, applies SiLU, and projects back.`)} on:mouseleave={clearHover}>
                FeedForward (SwiGLU)
              </div>
            </div>
            <div class="arrow-left">→</div>
            <div class="add-node" on:mouseenter={(e) => setHover(e, 'Residual Add', `[seq_len, ${c.dim}]`, 'Adds FFN output back into the main stream.')} on:mouseleave={clearHover}>⊕</div>
          </div>
          
          <div class="stream-line"></div>

        </div>
      </div>

      <div class="arrow">↓</div>

      <!-- Output Processing -->
      <div class="node norm" on:mouseenter={(e) => setHover(e, 'Final RMSNorm', `[seq_len, ${c.dim}]`, 'Final normalization before the classifier head.')} on:mouseleave={clearHover}>
        Final RMSNorm
      </div>

      <div class="arrow">↓</div>

      <div class="node output" on:mouseenter={(e) => setHover(e, 'Linear Output Layer', `[seq_len, ${c.vocab_size}]`, `Projects final hidden states to vocabulary probabilities.`)} on:mouseleave={clearHover}>
        Linear Output Layer
      </div>

    </div>

    <!-- Tooltip / Info Panel rendered inline but absolute -->
    {#if hoveredNode}
      <div class="info-tooltip" style="top: {hoveredNode.y - 120}px; left: {hoveredNode.x}px;">
        <div class="tt-title">{hoveredNode.name}</div>
        <div class="tt-shape">Shape: <strong>{hoveredNode.shape}</strong></div>
        <div class="tt-desc">{hoveredNode.desc}</div>
        {#if hoveredNode.name.includes('Attention')}
          <div class="tt-hint">Click to open Micro View →</div>
        {/if}
      </div>
    {/if}
    
  </BlueprintCard>
</div>

<style>
  .page-container { padding: 3rem 2rem; max-width: 1300px; margin: 0 auto; min-height: 100vh; }
  
  .page-header { margin-bottom: 3rem; }
  .breadcrumb { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--accent); letter-spacing: 0.1em; margin-bottom: 1rem; }
  .page-header h1 { font-size: 3rem; color: var(--text); font-weight: 700; margin: 0 0 1rem 0; }
  .page-header p { color: var(--muted); max-width: 600px; line-height: 1.6; margin-bottom: 2rem; }
  
  .config-selector { display: flex; align-items: center; gap: 1rem; background: var(--surface2); padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 8px; width: max-content; }
  .config-selector span { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); text-transform: uppercase; }
  .config-selector select { background: var(--bg); color: var(--text); border: 1px solid var(--border); padding: 0.25rem 0.5rem; border-radius: 4px; font-family: 'Space Grotesk', sans-serif; cursor: pointer; outline: none; }
  
  /* Diagram Canvas */
  .diagram-canvas { display: flex; flex-direction: column; align-items: center; padding: 2rem 0; }
  
  .node { 
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; 
    padding: 0.75rem 2rem; color: var(--text); font-weight: 600; font-size: 0.95rem;
    cursor: crosshair; transition: all 0.2s; min-width: 280px; text-align: center;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  }
  .node:hover { border-color: var(--accent); transform: scale(1.02); background: rgba(99,102,241,0.1); box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 10; }
  .node.input { background: transparent; border-style: dashed; }
  
  .badge { display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; background: var(--bg); border: 1px solid var(--border); padding: 0.1rem 0.4rem; border-radius: 4px; vertical-align: middle; margin-left: 0.5rem; }

  /* Transformer Block styles */
  .transformer-block { 
    position: relative; background: rgba(255,255,255,0.02); border: 1px dashed var(--muted); 
    border-radius: 16px; padding: 2rem; width: 600px; display: flex; justify-content: center;
    margin: 1rem 0;
  }
  .block-multiplier { position: absolute; left: -2rem; bottom: 2rem; font-family: 'JetBrains Mono', monospace; font-size: 1.5rem; color: var(--text); font-weight: 700; }
  
  /* Residual Stream styles */
  .residual-stream { display: flex; flex-direction: column; align-items: center; position: relative; }
  .stream-line { width: 3px; height: 30px; background: var(--border); }
  
  .branch { display: flex; align-items: center; justify-content: center; }
  .arrow-right, .arrow-left { font-family: monospace; font-size: 1.25rem; color: var(--muted); width: 30px; text-align: center; }
  
  .sub-block { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; align-items: center; width: 350px; }
  .sub-block .node { min-width: 250px; }
  .sub-block .node.attn { border-color: rgba(99, 102, 241, 0.5); }
  .sub-block .node.ffn { border-color: rgba(16, 185, 129, 0.5); }
  
  .add-node { 
    width: 40px; height: 40px; border-radius: 50%; background: var(--surface2); border: 2px solid var(--border);
    display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: var(--text);
    cursor: crosshair; transition: all 0.2s;
  }
  .add-node:hover { border-color: var(--accent); color: var(--accent); transform: scale(1.1); }
  
  .arrow { font-family: monospace; font-size: 1.5rem; color: var(--muted); margin: -4px 0; line-height: 1; z-index: 0; }

  /* Tooltip */
  .info-tooltip {
    position: absolute; z-index: 100; pointer-events: none;
    background: var(--glass-bg); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--accent); border-radius: 8px; padding: 1.25rem;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3); width: 300px;
    display: flex; flex-direction: column; gap: 0.5rem;
  }
  .tt-title { font-size: 1.1rem; color: var(--text); font-weight: 700; }
  .tt-shape { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--text); background: var(--bg); padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid var(--border); }
  .tt-shape strong { color: var(--accent); }
  .tt-desc { font-size: 0.9rem; color: var(--muted); line-height: 1.5; }
  .tt-hint { margin-top: 0.5rem; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--green); text-transform: uppercase; font-weight: 700; }
</style>