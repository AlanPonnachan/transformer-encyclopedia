<script lang="ts">
  import BlueprintCard from '$lib/components/common/BlueprintCard.svelte';
  import InteractiveCard from '$lib/components/common/InteractiveCard.svelte';

  // --- MACRO STATE ---
  const configs = {
    '8B':  { dim: 4096, n_layers: 32, n_heads: 32, n_kv_heads: 8, vocab_size: '128k', ffn_hidden: '14,336', ctx: 8192 },
    '70B': { dim: 8192, n_layers: 80, n_heads: 64, n_kv_heads: 8, vocab_size: '128k', ffn_hidden: '28,672', ctx: 8192 }
  };
  let activeConfig: '8B' | '70B' = '8B';
  $: c = configs[activeConfig];
  let hoveredGroup: string | null = null;

  // --- ROPE STATE ---
  let tokenPos = 0;
  // A base frequency for visualization (in real RoPE, this varies per feature pair)
  const thetaBase = 0.5; 
  $: angleRad = tokenPos * thetaBase;
  // Initial vector [1, 0] rotated by angle
  $: vecX = Math.cos(angleRad);
  $: vecY = Math.sin(angleRad);
  
  // --- GQA STATE ---
  let kvHeadsVisual = 4; // visual Q heads = 16, so KV can be 1, 2, 4, 8, 16
  const qHeadsVisual = 16;
  $: groupSize = qHeadsVisual / kvHeadsVisual;
</script>

<svelte:head><title>Llama 3 Architecture — Transformer Encyclopedia</title></svelte:head>

<div class="page-container">
  
  <header class="page-header">
    <div class="breadcrumb">ARCHITECTURES › LLAMA 3</div>
    <div class="header-split">
      <div>
        <h1>Llama 3 Playbook</h1>
        <p>Explore the macro-architecture and interact with the micro-mechanisms that define Llama 3.</p>
      </div>
      <div class="config-selector">
        <span>Model Size:</span>
        <select bind:value={activeConfig}>
          <option value="8B">Llama 3 (8B)</option>
          <option value="70B">Llama 3 (70B)</option>
        </select>
      </div>
    </div>
  </header>

  <!-- CARD 1: THE MACRO BLUEPRINT -->
  <BlueprintCard id="llama3-macro" title="1. End-to-End Architecture" subtitle="The Macro view. Data flows bottom-to-top.">
    <div class="svg-container macro-svg">
      <svg viewBox="0 0 1000 850" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text)" /></marker>
          <marker id="arrow-blue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--blue)" /></marker>
        </defs>

        <!-- Big Transformer Block Container -->
        <rect x="250" y="200" width="300" height="420" rx="20" fill="var(--surface2)" stroke="var(--border)" stroke-width="2" />
        <rect x="280" y="230" width="240" height="360" rx="16" fill="rgba(0,0,0,0.1)" stroke="var(--border)" stroke-width="1.5" />

        <!-- 32x Bracket -->
        <path d="M 235 620 C 210 620, 210 410, 180 410 C 210 410, 210 200, 235 200" fill="none" stroke="var(--text)" stroke-width="3" />
        <text x="160" y="415" text-anchor="end" class="bold-text" fill="var(--blue)" font-size="20">{c.n_layers} ×</text>

        <!-- Residual Stream Line -->
        <line x1="400" y1="700" x2="400" y2="100" stroke="var(--text)" stroke-width="2" marker-end="url(#arrow)" />

        <text x="400" y="770" text-anchor="middle" class="small-text">Sample input text</text>
        <line x1="400" y1="755" x2="400" y2="735" stroke="var(--text)" stroke-width="2" marker-end="url(#arrow)" />

        <rect x="330" y="695" width="140" height="35" rx="8" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
        <text x="400" y="717" text-anchor="middle" class="node-text">Tokenized text</text>

        <rect x="300" y="615" width="200" height="40" rx="8" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
        <text x="400" y="640" text-anchor="middle" class="node-text">Token embedding layer</text>

        <rect x="330" y="525" width="140" height="35" rx="8" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
        <text x="400" y="547" text-anchor="middle" class="node-text">RMSNorm 1</text>

        <!-- RoPE Side Input -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <g style="cursor:pointer;" on:click={() => document.getElementById('rope-card')?.scrollIntoView({behavior:'smooth'})}>
          <rect x="180" y="450" width="70" height="30" rx="8" fill="rgba(236, 72, 153, 0.1)" stroke="var(--highlight)" stroke-width="2" />
          <text x="215" y="470" text-anchor="middle" class="bold-text" fill="var(--highlight)">RoPE</text>
          <line x1="250" y1="465" x2="285" y2="465" stroke="var(--highlight)" stroke-width="2" marker-end="url(#arrow)" />
        </g>

        <!-- Attention -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <g class="interactive-group" on:mouseenter={() => hoveredGroup = 'attn'} on:mouseleave={() => hoveredGroup = null} on:click={() => document.getElementById('gqa-card')?.scrollIntoView({behavior:'smooth'})}>
          <rect x="290" y="440" width="220" height="50" rx="8" fill="rgba(59, 130, 246, 0.1)" stroke="var(--blue)" stroke-width="2" style="transition: all 0.2s;" />
          <text x="400" y="465" text-anchor="middle" class="bold-text" fill="var(--blue)">Masked grouped-query</text>
          <text x="400" y="480" text-anchor="middle" class="bold-text" fill="var(--blue)">attention</text>
        </g>

        <circle cx="400" cy="400" r="14" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
        <text x="400" y="405" text-anchor="middle" class="bold-text">+</text>
        <path d="M 400 580 L 500 580 L 500 400 L 420 400" fill="none" stroke="var(--text)" stroke-width="2" marker-end="url(#arrow)" />

        <rect x="330" y="325" width="140" height="35" rx="8" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
        <text x="400" y="347" text-anchor="middle" class="node-text">RMSNorm 2</text>

        <!-- Feed Forward -->
        <rect x="320" y="245" width="160" height="40" rx="8" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
        <text x="400" y="270" text-anchor="middle" class="node-text">Feed forward</text>

        <circle cx="400" cy="210" r="14" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
        <text x="400" y="215" text-anchor="middle" class="bold-text">+</text>
        <path d="M 400 380 L 500 380 L 500 210 L 420 210" fill="none" stroke="var(--text)" stroke-width="2" marker-end="url(#arrow)" />

        <rect x="330" y="145" width="140" height="35" rx="8" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
        <text x="400" y="167" text-anchor="middle" class="node-text">Final RMSNorm</text>

        <rect x="320" y="65" width="160" height="35" rx="8" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
        <text x="400" y="87" text-anchor="middle" class="node-text">Linear output layer</text>

        <!-- Annotations -->
        <text x="120" y="550" text-anchor="end" class="bold-text">Supported</text>
        <text x="120" y="570" text-anchor="end" class="bold-text">context length</text>
        <text x="120" y="590" text-anchor="end" class="bold-text">of <tspan fill="var(--blue)">{c.ctx}</tspan> tokens</text>
        <path d="M 130 550 L 190 490" fill="none" stroke="var(--text)" stroke-width="2" stroke-dasharray="4,4" />

        <text x="560" y="45" text-anchor="start" class="bold-text">Vocabulary size of <tspan fill="var(--blue)">{c.vocab_size}</tspan></text>
        <line x1="550" y1="50" x2="490" y2="80" stroke="var(--text)" stroke-width="2" stroke-dasharray="4,4" />

        <text x="590" y="630" text-anchor="start" class="bold-text">Embedding</text>
        <text x="590" y="650" text-anchor="start" class="bold-text">dimension of <tspan fill="var(--blue)">{c.dim}</tspan></text>
        <line x1="580" y1="635" x2="510" y2="635" stroke="var(--text)" stroke-width="2" stroke-dasharray="4,4" />

        <text x="590" y="460" text-anchor="start" class="bold-text"><tspan fill="var(--blue)">{c.n_heads}</tspan> Q-heads</text>
        <text x="590" y="480" text-anchor="start" class="bold-text"><tspan fill="var(--blue)">{c.n_kv_heads}</tspan> KV-heads (GQA)</text>
        <line x1="580" y1="465" x2="520" y2="465" stroke="var(--text)" stroke-width="2" stroke-dasharray="4,4" />
      </svg>
    </div>
    <svelte:fragment slot="footer">
      This is the macro routing of Llama 3. Scroll down to interact with the specific mechanisms that make it unique.
    </svelte:fragment>
  </BlueprintCard>

  <!-- CARD 2: INTERACTIVE ROPE -->
  <span id="rope-card"></span>
  <InteractiveCard title="2. RoPE (Rotary Positional Embeddings)" subtitle="Instead of adding absolute position vectors, RoPE rotates feature pairs in the Query and Key matrices based on their sequence position.">
    
    <div class="split-layout">
      
      <!-- Controls -->
      <div class="control-panel">
        <div class="metric">
          <span class="lbl">Token Position (m)</span>
          <span class="val" style="color: var(--highlight)">{tokenPos}</span>
        </div>
        <input type="range" min="0" max="12" step="1" bind:value={tokenPos} style="width: 100%; margin: 1.5rem 0; accent-color: var(--highlight);" />
        
        <div class="math-box">
          <p class="muted">A 2D feature slice [x, y] is rotated by angle <br/><strong>θ = position × base_frequency</strong>.</p>
          <div class="math-line">x' = x·cos(θ) - y·sin(θ)</div>
          <div class="math-line">y' = x·sin(θ) + y·cos(θ)</div>
        </div>
      </div>

      <!-- Visualization -->
      <div class="viz-panel">
        <svg viewBox="-150 -150 300 300" class="rope-svg">
          <!-- Grid/Axes -->
          <line x1="-150" y1="0" x2="150" y2="0" stroke="var(--border)" stroke-width="1" />
          <line x1="0" y1="-150" x2="0" y2="150" stroke="var(--border)" stroke-width="1" />
          <circle cx="0" cy="0" r="100" fill="none" stroke="var(--surface2)" stroke-width="2" stroke-dasharray="4,4" />
          
          <!-- Base Vector (Position 0) -->
          <line x1="0" y1="0" x2="100" y2="0" stroke="var(--muted)" stroke-width="2" stroke-dasharray="2,2" />
          <circle cx="100" cy="0" r="4" fill="var(--muted)" />

          <!-- Rotated Vector -->
          <line x1="0" y1="0" x2={vecX * 100} y2={-vecY * 100} stroke="var(--highlight)" stroke-width="4" style="transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);" />
          <circle cx={vecX * 100} cy={-vecY * 100} r="6" fill="var(--highlight)" style="transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);" />

          <!-- Arc showing the rotation -->
          {#if tokenPos > 0}
            <path d="M 40 0 A 40 40 0 {angleRad > Math.PI ? 1 : 0} 0 {vecX * 40} {-vecY * 40}" fill="none" stroke="var(--highlight)" stroke-width="2" opacity="0.5" style="transition: all 0.3s;" />
          {/if}
        </svg>
      </div>
    </div>
    
    <svelte:fragment slot="footer">
      Drag the slider! Notice how the vector rotates further around the circle as the token position increases. This relative rotation allows the model to naturally understand distance between tokens when calculating Attention.
    </svelte:fragment>
  </InteractiveCard>

  <!-- CARD 3: INTERACTIVE GQA -->
  <span id="gqa-card"></span>
  <InteractiveCard title="3. Grouped-Query Attention (GQA)" subtitle="Standard Multi-Head Attention (MHA) has 1 Key/Value head for every Query head. This uses too much KV Cache memory. GQA shares KV heads across multiple Query heads.">
    
    <div class="split-layout">
      <!-- Controls -->
      <div class="control-panel">
        <div class="metric">
          <span class="lbl">KV Heads</span>
          <span class="val" style="color: var(--blue)">{kvHeadsVisual}</span>
        </div>
        <input type="range" min="1" max="16" step="1" bind:value={kvHeadsVisual} on:input={(e) => {
          // Snap to powers of 2 for clean visualization (1, 2, 4, 8, 16)
          const val = Number(e.currentTarget.value);
          const snapped = [1, 2, 4, 8, 16].reduce((prev, curr) => Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev);
          kvHeadsVisual = snapped;
        }} style="width: 100%; margin: 1.5rem 0; accent-color: var(--blue);" />
        
        <div class="badge-row">
          {#if kvHeadsVisual === 16}
            <span class="mode-badge">MHA (16:16) - High Memory</span>
          {:else if kvHeadsVisual === 1}
            <span class="mode-badge mqa">MQA (16:1) - Low Quality</span>
          {:else}
            <span class="mode-badge gqa">GQA (16:{kvHeadsVisual}) - Llama 3 Style</span>
          {/if}
        </div>
        
        <p class="muted" style="margin-top: 1rem;">
          Query Heads: 16<br/>
          Ratio: <strong>{groupSize} Q-heads</strong> per KV-head.
        </p>
      </div>

      <!-- Visualization -->
      <div class="viz-panel gqa-viz">
        <svg viewBox="0 0 600 300" width="100%" height="100%">
          
          <!-- Query Heads (Top Row) -->
          <text x="300" y="40" text-anchor="middle" class="bold-text">Query Heads (Q)</text>
          {#each Array(qHeadsVisual) as _, i}
            {@const x = 30 + i * 36}
            <rect x={x} y="60" width="24" height="24" rx="4" fill="var(--surface2)" stroke="var(--border)" stroke-width="2" />
          {/each}

          <!-- Connection Lines -->
          {#each Array(qHeadsVisual) as _, qIdx}
            <!-- Calculate which KV head this Q head routes to -->
            {@const kvIdx = Math.floor(qIdx / groupSize)}
            
            {@const qX = 30 + qIdx * 36 + 12}
            {@const qY = 84}
            
            <!-- KV heads are spaced evenly across the total width -->
            <!-- Total width = (16 * 36) = 576. Margin = 30. -->
            {@const spacingKV = 540 / (kvHeadsVisual + 1)}
            {@const kvX = 30 + spacingKV * (kvIdx + 1)}
            {@const kvY = 210}

            <path d="M {qX} {qY} C {qX} {qY + 60}, {kvX} {kvY - 60}, {kvX} {kvY}" 
                  fill="none" stroke="var(--blue)" stroke-width="2" opacity="0.6" 
                  style="transition: d 0.4s cubic-bezier(0.4, 0, 0.2, 1);" />
          {/each}

          <!-- KV Heads (Bottom Row) -->
          <text x="300" y="270" text-anchor="middle" class="bold-text">Key / Value Cache (KV)</text>
          {#each Array(kvHeadsVisual) as _, i}
            {@const spacingKV = 540 / (kvHeadsVisual + 1)}
            {@const x = 30 + spacingKV * (i + 1) - 16}
            <rect x={x} y="210" width="32" height="32" rx="6" fill="rgba(59, 130, 246, 0.2)" stroke="var(--blue)" stroke-width="2" 
                  style="transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);" />
          {/each}

        </svg>
      </div>
    </div>
    
    <svelte:fragment slot="footer">
      As you reduce the KV heads, multiple Query heads route to a single shared KV cache block. In Llama 3 8B, they use a 4:1 ratio (32 Q-heads, 8 KV-heads), saving 75% of the memory footprint during generation!
    </svelte:fragment>
  </InteractiveCard>

</div>

<style>
  .page-container { padding: 3rem 2rem; max-width: 1400px; margin: 0 auto; min-height: 100vh; }
  
  .page-header { margin-bottom: 2rem; }
  .header-split { display: flex; justify-content: space-between; align-items: flex-end; }
  .breadcrumb { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); letter-spacing: 0.1em; margin-bottom: 1rem; text-transform: uppercase; }
  .page-header h1 { font-size: 2.5rem; color: var(--text); font-weight: 700; margin: 0 0 0.5rem 0; }
  .page-header p { color: var(--muted); max-width: 600px; line-height: 1.6; margin: 0; }
  
  .config-selector { display: flex; align-items: center; gap: 1rem; background: var(--surface2); padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 8px; }
  .config-selector span { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); text-transform: uppercase; }
  .config-selector select { background: var(--bg); color: var(--text); border: 1px solid var(--border); padding: 0.25rem 0.5rem; border-radius: 4px; font-family: 'Space Grotesk', sans-serif; font-weight: 600; cursor: pointer; outline: none; }
  
  /* SVG Text Styling */
  .node-text { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 500; fill: var(--text); pointer-events: none; }
  .small-text { font-family: 'JetBrains Mono', monospace; font-size: 12px; fill: var(--muted); pointer-events: none; }
  .bold-text { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 700; fill: var(--text); pointer-events: none; }
  .macro-svg { width: 100%; max-height: 700px; display: flex; justify-content: center; }

  /* Interactive Cards Layout */
  .split-layout { display: flex; gap: 3rem; align-items: center; width: 100%; padding: 1rem 0; }
  .control-panel { flex: 0 0 300px; background: var(--surface2); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border); }
  .viz-panel { flex: 1; display: flex; justify-content: center; align-items: center; min-height: 350px; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px dashed var(--border); }
  
  .metric { display: flex; flex-direction: column; }
  .metric .lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; margin-bottom: 4px; }
  .metric .val { font-family: 'Space Grotesk', sans-serif; font-size: 2.5rem; font-weight: 700; line-height: 1; }
  
  .math-box { background: var(--bg); border: 1px solid var(--border); padding: 1rem; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text); }
  .math-line { color: var(--accent); margin-top: 0.5rem; }
  
  .rope-svg { width: 100%; max-width: 350px; }
  .gqa-viz { padding: 1rem; }
  
  .badge-row { display: flex; gap: 0.5rem; }
  .mode-badge { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 999px; background: var(--surface); border: 1px solid var(--border); color: var(--text); }
  .mode-badge.gqa { background: rgba(59, 130, 246, 0.1); border-color: var(--blue); color: var(--blue); font-weight: 600; }
  .mode-badge.mqa { background: rgba(239, 68, 68, 0.1); border-color: var(--red); color: var(--red); }
</style>