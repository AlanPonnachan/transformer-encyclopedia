<script lang="ts">
  import BlueprintCard from '$lib/components/common/BlueprintCard.svelte';
  import InteractiveCard from '$lib/components/common/InteractiveCard.svelte';
  import Matrix from '$lib/atoms/Matrix.svelte';
  import Vector from '$lib/atoms/Vector.svelte';

  const configs = {
    '8B':  { dim: 4096, n_layers: 32, n_heads: 32, n_kv_heads: 8, vocab_size: '128k', ffn_hidden: '14,336', ctx: 8192 },
    '70B': { dim: 8192, n_layers: 80, n_heads: 64, n_kv_heads: 8, vocab_size: '128k', ffn_hidden: '28,672', ctx: 8192 }
  };
  let activeConfig: '8B' | '70B' = '8B';
  $: c = configs[activeConfig];

  // --- MACRO STATE (X-Ray) ---
  let hoveredNode: string | null = null;
  function handleNodeHover(nodeId: string) { hoveredNode = nodeId; }
  function clearHover() { hoveredNode = null; }
  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // --- EMBEDDING MICRO VIEW STATE ---
  const visualVocabSize = 10;
  const visualDim = 8;
  const seqLen = 4;
  let inputTokens = [2, 7, 0, 9]; 
  let activeTokenIdx: number | null = null;

  // --- ROPE MICRO VIEW STATE ---
  let ropePos = 1; // Token position (m)
  let ropeFeatIdx = 0; // Feature dimension pair (i)
  const headDim = 128; // Llama 3 8B: 4096 / 32 = 128
  const thetaBase = 500000; // Llama 3 specific theta

  // Math: theta_i = base^(-2i / d) -> base^(-i / (d/2))
  $: theta_i = Math.pow(thetaBase, -(ropeFeatIdx / headDim));
  $: angleRad = ropePos * theta_i;
  
  // Plotting a base vector [1, 0] rotated by angleRad
  $: vecX = Math.cos(angleRad) * 100;
  $: vecY = Math.sin(angleRad) * 100;
</script>

<svelte:head><title>Llama 3 Architecture — Transformer Encyclopedia</title></svelte:head>

<div class="page-container">
  
  <header class="page-header">
    <div class="breadcrumb">ARCHITECTURES › LLAMA 3</div>
    <div class="header-split">
      <div>
        <h1>Llama 3 Engine</h1>
        <p>Bottom-to-top data flow. Hover to X-Ray the tensor shapes. Click to deep-dive.</p>
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

  <!-- ==========================================
       CARD 1: MACRO DATA FLOW (X-RAY SVG)
       ========================================== -->
  <BlueprintCard id="llama3-macro" title="Macro View" subtitle="Hover over any component to see the exact input and output tensor shapes flowing through it.">
    
    <div class="svg-container">
      <!-- Fixed the clipping issue by adjusting viewBox and removing height: 100% -->
      <svg viewBox="0 0 1000 900" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)" /></marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" /></marker>
        </defs>

        <!-- Base group dims when a node is hovered -->
        <g style="transition: opacity 0.3s;" opacity={hoveredNode ? 0.2 : 1}>
          <rect x="250" y="200" width="300" height="420" rx="20" fill="var(--surface2)" stroke="var(--border)" stroke-width="2" />
          <rect x="280" y="230" width="240" height="360" rx="16" fill="rgba(0,0,0,0.1)" stroke="var(--border)" stroke-width="1.5" />

          <!-- 32x Bracket -->
          <path d="M 235 620 C 210 620, 210 410, 180 410 C 210 410, 210 200, 235 200" fill="none" stroke="var(--text)" stroke-width="3" />
          <text x="160" y="415" text-anchor="end" class="bold-text" fill="var(--text)" font-size="20">{c.n_layers} ×</text>

          <!-- Default Base Wires -->
          <line x1="400" y1="700" x2="400" y2="100" stroke="var(--muted)" stroke-width="2" marker-end="url(#arrow)" />
          <line x1="400" y1="755" x2="400" y2="735" stroke="var(--muted)" stroke-width="2" marker-end="url(#arrow)" />
          <line x1="250" y1="465" x2="285" y2="465" stroke="var(--muted)" stroke-width="2" marker-end="url(#arrow)" />
          <path d="M 400 580 L 500 580 L 500 400 L 420 400" fill="none" stroke="var(--muted)" stroke-width="2" marker-end="url(#arrow)" />
          <path d="M 400 380 L 500 380 L 500 210 L 420 210" fill="none" stroke="var(--muted)" stroke-width="2" marker-end="url(#arrow)" />

          <circle cx="400" cy="400" r="14" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
          <text x="400" y="405" text-anchor="middle" class="bold-text">+</text>
          <circle cx="400" cy="210" r="14" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
          <text x="400" y="215" text-anchor="middle" class="bold-text">+</text>

          <!-- Annotations -->
          <text x="120" y="550" text-anchor="end" class="bold-text">Context length</text>
          <text x="120" y="570" text-anchor="end" class="bold-text">of <tspan fill="var(--text)">{c.ctx}</tspan> tokens</text>
          <path d="M 130 550 L 190 490" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4,4" />

          <text x="560" y="45" text-anchor="start" class="bold-text">Vocabulary size <tspan fill="var(--text)">{c.vocab_size}</tspan></text>
          <line x1="550" y1="50" x2="490" y2="80" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4,4" />

          <text x="560" y="630" text-anchor="start" class="bold-text">Embedding dim <tspan fill="var(--text)">{c.dim}</tspan></text>
          <line x1="550" y1="635" x2="510" y2="635" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4,4" />
        </g>

        <!-- X-RAY ACTIVE WIRES (Rendered on top) -->
        {#if hoveredNode === 'embed'}
          <line x1="400" y1="695" x2="400" y2="655" stroke="var(--accent)" stroke-width="3" marker-end="url(#arrow-active)" />
          <rect x="420" y="665" width="130" height="24" rx="4" fill="var(--surface)" stroke="var(--accent)" stroke-width="1" />
          <text x="485" y="682" text-anchor="middle" class="tensor-text">[bsz, seqlen]</text>
          
          <line x1="400" y1="615" x2="400" y2="560" stroke="var(--accent)" stroke-width="3" marker-end="url(#arrow-active)" />
          <rect x="420" y="575" width="160" height="24" rx="4" fill="var(--surface)" stroke="var(--accent)" stroke-width="1" />
          <text x="500" y="592" text-anchor="middle" class="tensor-text">[bsz, seqlen, {c.dim}]</text>
        {/if}

        {#if hoveredNode === 'rope'}
          <!-- RoPE applies positional rotation to Q and K inside the Attention block -->
          <line x1="250" y1="465" x2="280" y2="465" stroke="var(--accent)" stroke-width="3" marker-end="url(#arrow-active)" />
          <rect x="180" y="390" width="150" height="40" rx="4" fill="var(--bg)" stroke="var(--accent)" stroke-width="1" />
          <text x="255" y="407" text-anchor="middle" class="tensor-text">Rotates Q & K</text>
          <text x="255" y="422" text-anchor="middle" class="tensor-text">based on position</text>
          <path d="M 255 430 L 255 450" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4,4" />
        {/if}

        {#if hoveredNode === 'attn'}
          <line x1="400" y1="525" x2="400" y2="490" stroke="var(--accent)" stroke-width="3" marker-end="url(#arrow-active)" />
          <rect x="415" y="495" width="160" height="24" rx="4" fill="var(--surface)" stroke="var(--accent)" stroke-width="1" />
          <text x="495" y="512" text-anchor="middle" class="tensor-text">[bsz, seqlen, {c.dim}]</text>
          
          <line x1="400" y1="440" x2="400" y2="415" stroke="var(--accent)" stroke-width="3" marker-end="url(#arrow-active)" />
          <rect x="415" y="420" width="160" height="24" rx="4" fill="var(--surface)" stroke="var(--accent)" stroke-width="1" />
          <text x="495" y="437" text-anchor="middle" class="tensor-text">[bsz, seqlen, {c.dim}]</text>
        {/if}

        {#if hoveredNode === 'ffn'}
          <line x1="400" y1="325" x2="400" y2="285" stroke="var(--accent)" stroke-width="3" marker-end="url(#arrow-active)" />
          <rect x="415" y="295" width="160" height="24" rx="4" fill="var(--surface)" stroke="var(--accent)" stroke-width="1" />
          <text x="495" y="312" text-anchor="middle" class="tensor-text">[bsz, seqlen, {c.dim}]</text>
          
          <line x1="400" y1="245" x2="400" y2="225" stroke="var(--accent)" stroke-width="3" marker-end="url(#arrow-active)" />
          <rect x="415" y="222" width="160" height="24" rx="4" fill="var(--surface)" stroke="var(--accent)" stroke-width="1" />
          <text x="495" y="239" text-anchor="middle" class="tensor-text">[bsz, seqlen, {c.dim}]</text>
          
          <!-- Special FFN Internal Hint -->
          <path d="M 480 265 L 540 265" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4,4" />
          <rect x="540" y="253" width="220" height="24" rx="4" fill="var(--bg)" stroke="var(--accent)" stroke-width="1" />
          <text x="650" y="270" text-anchor="middle" class="tensor-text">Internal expansion: {c.ffn_hidden}</text>
        {/if}

        <!-- INTERACTIVE BLOCKS (Always on top to catch hover) -->
        <text x="400" y="770" text-anchor="middle" class="small-text">Sample input text</text>

        <rect x="330" y="695" width="140" height="35" rx="8" fill="var(--bg)" stroke="var(--border)" stroke-width="2" opacity={hoveredNode ? 0.3 : 1} />
        <text x="400" y="717" text-anchor="middle" class="node-text" opacity={hoveredNode ? 0.3 : 1}>Tokenized text</text>

        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <g class="interactive-node" on:mouseenter={() => handleNodeHover('embed')} on:mouseleave={clearHover} on:click={() => scrollTo('embed-card')} style="opacity: {hoveredNode === 'embed' || !hoveredNode ? 1 : 0.3}">
          <rect x="300" y="615" width="200" height="40" rx="8" />
          <text x="400" y="640" text-anchor="middle">Token embedding layer</text>
        </g>

        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <g class="interactive-node" on:mouseenter={() => handleNodeHover('norm1')} on:mouseleave={clearHover} style="opacity: {hoveredNode === 'norm1' || !hoveredNode ? 1 : 0.3}">
          <rect x="330" y="525" width="140" height="35" rx="8" />
          <text x="400" y="547" text-anchor="middle">RMSNorm 1</text>
        </g>

        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <g class="interactive-node" on:mouseenter={() => handleNodeHover('rope')} on:mouseleave={clearHover} on:click={() => scrollTo('rope-card')} style="opacity: {hoveredNode === 'rope' || !hoveredNode ? 1 : 0.3}">
          <rect x="180" y="450" width="70" height="30" rx="8" />
          <text x="215" y="470" text-anchor="middle">RoPE</text>
        </g>

        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <g class="interactive-node" on:mouseenter={() => handleNodeHover('attn')} on:mouseleave={clearHover} style="opacity: {hoveredNode === 'attn' || !hoveredNode ? 1 : 0.3}">
          <rect x="290" y="440" width="220" height="50" rx="8" />
          <text x="400" y="465" text-anchor="middle">Grouped-query</text>
          <text x="400" y="480" text-anchor="middle">attention</text>
        </g>

        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <g class="interactive-node" on:mouseenter={() => handleNodeHover('norm2')} on:mouseleave={clearHover} style="opacity: {hoveredNode === 'norm2' || !hoveredNode ? 1 : 0.3}">
          <rect x="330" y="325" width="140" height="35" rx="8" />
          <text x="400" y="347" text-anchor="middle">RMSNorm 2</text>
        </g>

        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <g class="interactive-node" on:mouseenter={() => handleNodeHover('ffn')} on:mouseleave={clearHover} style="opacity: {hoveredNode === 'ffn' || !hoveredNode ? 1 : 0.3}">
          <rect x="320" y="245" width="160" height="40" rx="8" />
          <text x="400" y="270" text-anchor="middle">Feed forward</text>
        </g>

        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <g class="interactive-node" on:mouseenter={() => handleNodeHover('norm3')} on:mouseleave={clearHover} style="opacity: {hoveredNode === 'norm3' || !hoveredNode ? 1 : 0.3}">
          <rect x="330" y="145" width="140" height="35" rx="8" />
          <text x="400" y="167" text-anchor="middle">Final RMSNorm</text>
        </g>

        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <g class="interactive-node" on:mouseenter={() => handleNodeHover('output')} on:mouseleave={clearHover} style="opacity: {hoveredNode === 'output' || !hoveredNode ? 1 : 0.3}">
          <rect x="320" y="65" width="160" height="35" rx="8" />
          <text x="400" y="87" text-anchor="middle">Linear output layer</text>
        </g>
      </svg>
    </div>
  </BlueprintCard>

  <!-- ==========================================
       CARD 2: TOKEN EMBEDDING DEEP DIVE
       ========================================== -->
  <span id="embed-card" style="display:block; margin-top:-50px; padding-top:50px;"></span>
  
  <InteractiveCard title="Layer 0: Token Embedding" subtitle="Before any math happens, discrete words are converted into continuous vectors.">
    
    <div class="embed-workspace">
      <!-- INPUT SEQUENCE -->
      <div class="col">
        <div class="col-title">1. Tokenized Prompt<br/><code>[seqlen={seqLen}]</code></div>
        <div class="token-tape">
          {#each inputTokens as tok, i}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="token-cell" 
                 class:active={activeTokenIdx === i}
                 on:mouseenter={() => activeTokenIdx = i}
                 on:mouseleave={() => activeTokenIdx = null}>
              <span class="lbl">Seq[{i}]</span>
              <span class="val">ID: {tok}</span>
            </div>
          {/each}
        </div>
        <p class="helper">Hover to slice tensor →</p>
      </div>

      <!-- LOOKUP OPERATION -->
      <div class="col">
        <div class="col-title">2. Embedding Matrix<br/><code>[vocab_size={c.vocab_size}, dim={c.dim}]</code></div>
        <div class="matrix-viz">
          <Matrix id="embed_weight" rows={visualVocabSize} cols={visualDim} cellSize={22} colorMode="signed" />
          {#if activeTokenIdx !== null}
            {@const tokID = inputTokens[activeTokenIdx]}
            <div class="row-highlight" style="top: {tokID * 22 + 1}px; height: 20px; width: {visualDim * 22 - 2}px;"></div>
          {/if}
        </div>
      </div>

      <!-- OUTPUT TENSOR -->
      <div class="col">
        <div class="col-title">3. Hidden State<br/><code>[seqlen={seqLen}, dim={c.dim}]</code></div>
        <div class="tensor-stack">
          {#each inputTokens as tok, i}
            <div class="extracted-vec" class:active-vec={activeTokenIdx === i}>
               <Vector length={visualDim} direction="horizontal" cellSize={22} />
            </div>
          {/each}
        </div>
      </div>
    </div>
  </InteractiveCard>

  <!-- ==========================================
       CARD 3: ROPE (ROTARY POSITIONAL EMBEDDING)
       ========================================== -->
  <span id="rope-card" style="display:block; margin-top:-50px; padding-top:50px;"></span>
  
  <InteractiveCard title="Micro: RoPE (Rotary Positional Embeddings)" subtitle="Llama 3 encodes position by rotating feature pairs in the Query and Key matrices in 2D space. The rotation angle depends on both the Token Position and the Feature Index.">
    
    <div class="rope-workspace">
      
      <!-- CONTROLS -->
      <div class="rope-controls">
        <div class="ctrl-group">
          <div class="lbl-row">
            <span>Token Position (m)</span>
            <strong style="color: var(--highlight)">{ropePos}</strong>
          </div>
          <input type="range" min="0" max="10" step="1" bind:value={ropePos} class="hl-slider" />
          <p class="muted-hint">Words later in the sentence rotate further.</p>
        </div>

        <div class="ctrl-group">
          <div class="lbl-row">
            <span>Feature Index Pair (i)</span>
            <strong style="color: var(--blue)">{ropeFeatIdx}</strong>
          </div>
          <input type="range" min="0" max={headDim - 2} step="2" bind:value={ropeFeatIdx} class="blue-slider" />
          <p class="muted-hint">Higher dimensions rotate much slower (Llama 3 uses a massive theta base of 500,000).</p>
        </div>

        <div class="math-box">
          <div class="math-title">Llama 3 Rotation Formula:</div>
          <div class="math-eq">θ = m × (500000 <sup>-2i / d</sup>)</div>
          <div class="math-res">Angle: {(angleRad * (180/Math.PI)).toFixed(1)}°</div>
        </div>
      </div>

      <!-- 2D ROTATION VIZ -->
      <div class="rope-viz">
        <svg viewBox="-120 -120 240 240" class="circle-svg">
          <!-- Background Grid & Circle -->
          <line x1="-120" y1="0" x2="120" y2="0" stroke="var(--border)" stroke-width="1" />
          <line x1="0" y1="-120" x2="0" y2="120" stroke="var(--border)" stroke-width="1" />
          <circle cx="0" cy="0" r="100" fill="none" stroke="var(--surface2)" stroke-width="2" stroke-dasharray="4,4" />
          
          <!-- Original Vector (m=0) -->
          <line x1="0" y1="0" x2="100" y2="0" stroke="var(--muted)" stroke-width="2" stroke-dasharray="2,2" />
          <circle cx="100" cy="0" r="4" fill="var(--muted)" />
          <text x="105" y="-5" class="svg-label" fill="var(--muted)">pos=0</text>

          <!-- Rotated Vector -->
          <line x1="0" y1="0" x2={vecX} y2={-vecY} stroke="var(--highlight)" stroke-width="3" style="transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);" />
          <circle cx={vecX} cy={-vecY} r="6" fill="var(--highlight)" style="transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);" />
          <text x={vecX + (vecX>=0?10:-35)} y={-vecY + (vecY>=0?-10:15)} class="svg-label" fill="var(--highlight)" style="transition: all 0.3s;">pos={ropePos}</text>

          <!-- Arc indicating rotation -->
          {#if ropePos > 0 && angleRad > 0.05}
            <path d="M 30 0 A 30 30 0 {angleRad > Math.PI ? 1 : 0} 0 {vecX * 0.3} {-vecY * 0.3}" fill="none" stroke="var(--highlight)" stroke-width="2" opacity="0.6" style="transition: all 0.3s;" />
          {/if}
        </svg>
      </div>

    </div>
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
  
  /* ================== MACRO SVG ================== */
  .svg-container { width: 100%; display: flex; justify-content: center; overflow: hidden; padding: 1rem 0; margin: 0 auto; }
  .svg-container svg { width: 100%; height: auto; max-height: 750px; overflow: visible; }
  
  .node-text { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 500; fill: var(--text); pointer-events: none; transition: fill 0.2s; }
  .small-text { font-family: 'JetBrains Mono', monospace; font-size: 12px; fill: var(--muted); pointer-events: none; }
  .bold-text { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 700; fill: var(--text); pointer-events: none; }
  .tensor-text { font-family: 'JetBrains Mono', monospace; font-size: 11px; fill: var(--accent); font-weight: 700; }

  .interactive-node { cursor: pointer; transition: opacity 0.3s; }
  .interactive-node rect { fill: var(--surface); stroke: var(--border); stroke-width: 2; transition: all 0.2s; }
  .interactive-node text { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 600; fill: var(--text); pointer-events: none; transition: fill 0.2s; }
  .interactive-node:hover rect { stroke: var(--accent); fill: rgba(99, 102, 241, 0.1); transform: scale(1.02); transform-origin: center; }
  .interactive-node:hover text { fill: var(--accent); }

  /* ================== COMPONENT: EMBEDDING ================== */
  .embed-workspace { display: flex; justify-content: center; gap: 4rem; align-items: flex-start; overflow-x: auto; padding: 2rem 0; width: 100%; }
  .col { display: flex; flex-direction: column; gap: 1.5rem; }
  .col-title { font-family: 'Space Grotesk', sans-serif; font-size: 0.95rem; font-weight: 600; color: var(--text); text-align: center; }
  .col-title code { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); display: block; margin-top: 0.4rem; }

  .token-tape { display: flex; flex-direction: column; gap: 0.5rem; }
  .token-cell { background: var(--surface); border: 1px solid var(--border); padding: 0.75rem 1.25rem; border-radius: 6px; display: flex; justify-content: space-between; gap: 2rem; cursor: crosshair; transition: all 0.2s; }
  .token-cell .lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); }
  .token-cell .val { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--text); }
  .token-cell.active { border-color: var(--highlight); background: rgba(245, 158, 11, 0.1); transform: translateX(5px); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2); }
  
  .helper { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--highlight); text-align: center; font-style: italic; opacity: 0.8; }

  .matrix-viz { position: relative; padding: 1px; background: var(--bg); border-radius: 4px; border: 1px solid var(--border); }
  .row-highlight { position: absolute; left: 1px; border: 2px solid var(--highlight); background: rgba(245, 158, 11, 0.3); border-radius: 2px; pointer-events: none; z-index: 10; transition: top 0.2s cubic-bezier(0.4, 0, 0.2, 1); }

  .tensor-stack { display: flex; flex-direction: column; gap: 2px; background: var(--bg); padding: 2px; border-radius: 4px; border: 1px solid var(--border); }
  .extracted-vec { transition: all 0.2s; background: var(--surface); border-radius: 2px; }
  .extracted-vec.active-vec { filter: drop-shadow(0 0 10px var(--highlight)); transform: scale(1.08); z-index: 10; position: relative; }

  /* ================== COMPONENT: ROPE ================== */
  .rope-workspace { display: flex; gap: 4rem; align-items: center; justify-content: center; padding: 2rem; }
  
  .rope-controls { flex: 1; max-width: 400px; display: flex; flex-direction: column; gap: 2rem; }
  .ctrl-group { display: flex; flex-direction: column; gap: 0.5rem; }
  .lbl-row { display: flex; justify-content: space-between; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--muted); text-transform: uppercase; }
  .lbl-row strong { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; }
  
  .hl-slider { accent-color: var(--highlight); cursor: pointer; }
  .blue-slider { accent-color: var(--blue); cursor: pointer; }
  .muted-hint { font-size: 0.8rem; color: var(--muted); line-height: 1.4; margin: 0; }

  .math-box { background: var(--surface2); border: 1px solid var(--border); border-left: 3px solid var(--accent); padding: 1.5rem; border-radius: 6px; }
  .math-title { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; margin-bottom: 0.75rem; }
  .math-eq { font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem; color: var(--text); font-weight: 600; margin-bottom: 0.5rem; }
  .math-res { font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; color: var(--accent); }

  .rope-viz { flex: 1; max-width: 400px; background: var(--bg); border: 1px dashed var(--border); border-radius: 12px; padding: 2rem; display: flex; justify-content: center; align-items: center; }
  .circle-svg { width: 100%; max-width: 300px; overflow: visible; }
  .svg-label { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
</style>