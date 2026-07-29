<script lang="ts">
  import BlueprintCard from '$lib/components/common/BlueprintCard.svelte';
  import InteractiveCard from '$lib/components/common/InteractiveCard.svelte';
  import Matrix from '$lib/atoms/Matrix.svelte';
  import Vector from '$lib/atoms/Vector.svelte';
  import { inspectedCell } from '$lib/stores/diagram';
  import { onMount } from 'svelte';

  const configs = {
    '8B':  { dim: 4096, n_layers: 32, n_heads: 32, n_kv_heads: 8, vocab_size: '128k', ffn_hidden: '14,336', ctx: 8192 },
    '70B': { dim: 8192, n_layers: 80, n_heads: 64, n_kv_heads: 8, vocab_size: '128k', ffn_hidden: '28,672', ctx: 8192 }
  };
  let activeConfig: '8B' | '70B' = '8B';
  $: c = configs[activeConfig];

  // --- MACRO STATE (HUD & X-Ray) ---
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
  let ropePos = 1;
  let ropeFeatIdx = 0; 
  const headDim = 128; 
  const thetaBase = 500000; 
  $: theta_i = Math.pow(thetaBase, -(ropeFeatIdx / headDim));
  $: angleRad = ropePos * theta_i;
  $: vecX = Math.cos(angleRad) * 100;
  $: vecY = Math.sin(angleRad) * 100;

  // --- SWIGLU FFN MICRO VIEW STATE ---
  let swigluInput = [0.5, -0.2, 0.8, -0.9];
  let w1_val = [1.2, -0.5, 0.3, 0.8, -1.1, 0.4, 0.7, -0.2]; // Expanded hidden_dim
  let w3_val = [0.9, 0.1, -0.4, 0.7, 0.6, -0.8, 1.0, 0.2];
  
  function silu(x: number) { return x / (1 + Math.exp(-x)); }
  
  $: gate_silu = w1_val.map(v => silu(v));
  $: ffn_multiplied = gate_silu.map((v, i) => v * w3_val[i]);
  
  onMount(() => inspectedCell.set(null));

  // Reactive helpers for SVG marching ants
  $: inEmbed = hoveredNode === 'embed';
  $: inNorm1 = hoveredNode === 'norm1';
  $: inAttn = hoveredNode === 'attn';
  $: inRope = hoveredNode === 'rope';
  $: inNorm2 = hoveredNode === 'norm2';
  $: inFFN = hoveredNode === 'ffn';
  $: inNorm3 = hoveredNode === 'norm3';
  $: inOut = hoveredNode === 'output';
</script>

<svelte:head><title>Llama 3 Architecture — Transformer Encyclopedia</title></svelte:head>

<div class="page-container">
  
  <header class="page-header">
    <div class="breadcrumb">ARCHITECTURES › LLAMA 3</div>
    <div class="header-split">
      <div>
        <h1>Llama 3 Engine</h1>
        <p>Bottom-to-top data pipeline. Hover for exact PyTorch shapes. Click to deep-dive.</p>
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
       CARD 1: MACRO DATA FLOW (TELEMETRY HUD)
       ========================================== -->
  <BlueprintCard id="llama3-macro" title="Macro View" subtitle="Hover over the components. Notice how the wires light up to indicate data flow direction.">
    
    <div class="macro-layout">
      
      <!-- LEFT COLUMN: The Diagram (Zoomed out with precise pixel math) -->
      <div class="macro-diagram">
        <svg viewBox="0 0 700 800" preserveAspectRatio="xMidYMid meet">
          <!-- Arrow Markers adjusted (refX=8) so they never overlap borders -->
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 8 5 L 0 8 z" fill="var(--muted)" /></marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 8 5 L 0 8 z" fill="var(--accent)" /></marker>
          </defs>

          <!-- 32x Bracket -->
          <path d="M 125 580 C 80 580, 80 370, 50 370 C 80 370, 80 160, 125 160" fill="none" stroke="var(--border)" stroke-width="2" />
          <text x="40" y="370" text-anchor="end" dominant-baseline="middle" class="bold-text" fill="var(--text)" font-size="24">{c.n_layers} ×</text>
          
          <!-- Transformer Block Background -->
          <rect x="140" y="160" width="420" height="420" rx="16" fill="var(--surface2)" stroke="var(--border)" stroke-width="1.5" />

          <!-- BASE WIRES (Pixel-perfect coordinates to avoid collisions) -->
          <g class="wires" stroke="var(--muted)" stroke-width="2">
            <!-- Input to Tokens -->
            <line x1="350" y1="800" x2="350" y2="750" marker-end="url(#arrow)" />
            <!-- Tokens to Embed -->
            <line x1="350" y1="720" x2="350" y2="680" marker-end="url(#arrow)" class:active-wire={inEmbed} />
            <!-- Embed to Block -->
            <line x1="350" y1="640" x2="350" y2="530" marker-end="url(#arrow)" class:active-wire={inEmbed || inNorm1} />
            
            <!-- Norm1 to Attn -->
            <line x1="350" y1="500" x2="350" y2="465" marker-end="url(#arrow)" class:active-wire={inNorm1 || inAttn} />
            <!-- RoPE to Attn -->
            <line x1="220" y1="447.5" x2="250" y2="447.5" marker-end="url(#arrow)" class:active-wire={inRope || inAttn} />
            <!-- Attn to Add 1 -->
            <line x1="350" y1="430" x2="350" y2="394" marker-end="url(#arrow)" class:active-wire={inAttn} />
            
            <!-- Residual 1 (Splits exactly halfway between Embed and Norm1) -->
            <path d="M 350 550 L 510 550 L 510 380 L 364 380" fill="none" marker-end="url(#arrow)" class:active-wire={inNorm1 || inAttn} />
            
            <!-- Add 1 to Norm 2 -->
            <line x1="350" y1="366" x2="350" y2="340" marker-end="url(#arrow)" class:active-wire={inNorm2} />
            <!-- Norm 2 to FFN -->
            <line x1="350" y1="310" x2="350" y2="270" marker-end="url(#arrow)" class:active-wire={inNorm2 || inFFN} />
            <!-- FFN to Add 2 -->
            <line x1="350" y1="230" x2="350" y2="204" marker-end="url(#arrow)" class:active-wire={inFFN} />
            
            <!-- Residual 2 (Splits exactly halfway between Add1 and Norm2) -->
            <path d="M 350 355 L 510 355 L 510 190 L 364 190" fill="none" marker-end="url(#arrow)" class:active-wire={inNorm2 || inFFN} />

            <!-- Add 2 to Final Norm -->
            <line x1="350" y1="176" x2="350" y2="130" marker-end="url(#arrow)" class:active-wire={inNorm3} />
            <!-- Final Norm to Output -->
            <line x1="350" y1="100" x2="350" y2="55" marker-end="url(#arrow)" class:active-wire={inNorm3 || inOut} />
            <!-- Output to Logits -->
            <line x1="350" y1="20" x2="350" y2="-10" marker-end="url(#arrow)" class:active-wire={inOut} />
          </g>

          <!-- Residual Add Circles -->
          <circle cx="350" cy="380" r="14" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
          <text x="350" y="382" text-anchor="middle" dominant-baseline="middle" font-size="16" fill="var(--muted)" font-weight="bold">+</text>
          
          <circle cx="350" cy="190" r="14" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
          <text x="350" y="192" text-anchor="middle" dominant-baseline="middle" font-size="16" fill="var(--muted)" font-weight="bold">+</text>

          <!-- INTERACTIVE COMPONENTS -->
          <rect x="270" y="720" width="160" height="30" rx="6" fill="var(--bg)" stroke="var(--border)" stroke-width="1.5" />
          <text x="350" y="735" text-anchor="middle" dominant-baseline="middle" class="small-text">Tokenized text</text>

          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inEmbed} on:mouseenter={() => handleNodeHover('embed')} on:mouseleave={clearHover} on:click={() => scrollTo('embed-card')}>
            <rect x="250" y="640" width="200" height="40" rx="8" />
            <text x="350" y="660" text-anchor="middle" dominant-baseline="middle">Token embedding layer</text>
          </g>

          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inNorm1} on:mouseenter={() => handleNodeHover('norm1')} on:mouseleave={clearHover}>
            <rect x="290" y="500" width="120" height="30" rx="6" />
            <text x="350" y="515" text-anchor="middle" dominant-baseline="middle">RMSNorm 1</text>
          </g>

          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inRope} on:mouseenter={() => handleNodeHover('rope')} on:mouseleave={clearHover} on:click={() => scrollTo('rope-card')}>
            <rect x="160" y="435" width="60" height="25" rx="6" />
            <text x="190" y="447.5" text-anchor="middle" dominant-baseline="middle" font-size="14">RoPE</text>
          </g>

          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inAttn} on:mouseenter={() => handleNodeHover('attn')} on:mouseleave={clearHover}>
            <rect x="250" y="430" width="200" height="35" rx="8" />
            <text x="350" y="447.5" text-anchor="middle" dominant-baseline="middle">Grouped-query attention</text>
          </g>

          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inNorm2} on:mouseenter={() => handleNodeHover('norm2')} on:mouseleave={clearHover}>
            <rect x="290" y="310" width="120" height="30" rx="6" />
            <text x="350" y="325" text-anchor="middle" dominant-baseline="middle">RMSNorm 2</text>
          </g>

          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inFFN} on:mouseenter={() => handleNodeHover('ffn')} on:mouseleave={clearHover} on:click={() => scrollTo('ffn-card')}>
            <rect x="240" y="230" width="220" height="40" rx="8" />
            <text x="350" y="250" text-anchor="middle" dominant-baseline="middle">Feed-forward (SwiGLU)</text>
          </g>

          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inNorm3} on:mouseenter={() => handleNodeHover('norm3')} on:mouseleave={clearHover}>
            <rect x="290" y="100" width="120" height="30" rx="6" />
            <text x="350" y="115" text-anchor="middle" dominant-baseline="middle">Final RMSNorm</text>
          </g>

          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inOut} on:mouseenter={() => handleNodeHover('output')} on:mouseleave={clearHover}>
            <rect x="250" y="20" width="200" height="35" rx="8" />
            <text x="350" y="37.5" text-anchor="middle" dominant-baseline="middle">Linear output layer</text>
          </g>

        </svg>
      </div>
      
      <!-- RIGHT COLUMN: Sticky Telemetry HUD -->
      <div class="macro-hud">
        <div class="telemetry-hud" class:active={hoveredNode}>
          <div class="hud-header">
            <span class="hud-title">TELEMETRY</span>
            <span class="hud-status">{hoveredNode ? 'ACTIVE' : 'STANDBY'}</span>
          </div>
          
          <div class="hud-content">
            {#if !hoveredNode}
              <div class="hud-empty">Hover over a node to intercept tensor flow...</div>
            {:else if hoveredNode === 'embed'}
              <div class="hud-row"><span class="label">MODULE</span><strong class="val">VocabParallelEmbedding</strong></div>
              <div class="hud-row"><span class="label">INPUT</span><span class="tensor">[bsz, seqlen]</span></div>
              <div class="hud-row"><span class="label">OUTPUT</span><span class="tensor">[bsz, seqlen, {c.dim}]</span></div>
              <div class="hud-math">out = tokens @ W_e</div>
            {:else if hoveredNode === 'norm1' || hoveredNode === 'norm2' || hoveredNode === 'norm3'}
              <div class="hud-row"><span class="label">MODULE</span><strong class="val">RMSNorm</strong></div>
              <div class="hud-row"><span class="label">SHAPE</span><span class="tensor">[bsz, seqlen, {c.dim}]</span></div>
              <div class="hud-math">x / √E[x²] * weight</div>
            {:else if hoveredNode === 'attn'}
              <div class="hud-row"><span class="label">MODULE</span><strong class="val">Grouped Query Attn</strong></div>
              <div class="hud-row"><span class="label">Q SHAPE</span><span class="tensor">[bsz, seq, {c.n_heads}, {headDim}]</span></div>
              <div class="hud-row"><span class="label">KV SHAPE</span><span class="tensor">[bsz, seq, {c.n_kv_heads}, {headDim}]</span></div>
              <div class="hud-math">Softmax(Q @ K.T) @ V</div>
            {:else if hoveredNode === 'rope'}
              <div class="hud-row"><span class="label">MODULE</span><strong class="val">RoPE</strong></div>
              <div class="hud-row"><span class="label">THETA BASE</span><strong class="val">500,000</strong></div>
              <div class="hud-math">xq_, xk_ * freqs_cis</div>
            {:else if hoveredNode === 'ffn'}
              <div class="hud-row"><span class="label">MODULE</span><strong class="val">SwiGLU FFN</strong></div>
              <div class="hud-row"><span class="label">EXPANSION</span><span class="tensor">{c.dim} → {c.ffn_hidden}</span></div>
              <div class="hud-math">w2(SiLU(w1(x)) * w3(x))</div>
            {:else if hoveredNode === 'output'}
              <div class="hud-row"><span class="label">MODULE</span><strong class="val">Linear (lm_head)</strong></div>
              <div class="hud-row"><span class="label">SHAPE</span><span class="tensor">[bsz, seq, {c.vocab_size}]</span></div>
              <div class="hud-math">logits = x @ W_out</div>
            {/if}
          </div>
        </div>
      </div>

    </div>
  </BlueprintCard>

  <!-- ==========================================
       CARD 2: TOKEN EMBEDDING DEEP DIVE
       ========================================== -->
  <span id="embed-card" style="display:block; margin-top:-50px; padding-top:50px;"></span>
  
  <InteractiveCard title="Layer 0: Token Embedding" subtitle="Discrete words are converted into continuous vectors.">
    <div class="micro-workspace">
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
      </div>
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
       CARD 3: FEED-FORWARD (SWIGLU)
       ========================================== -->
  <span id="ffn-card" style="display:block; margin-top:-50px; padding-top:50px;"></span>
  
  <InteractiveCard title="Micro: SwiGLU Feed-Forward Expansion" subtitle="Llama 3 blows the dimension up from {c.dim} to {c.ffn_hidden}, performs gating, and shrinks back to {c.dim}. Click a cell in the expanded state to inspect the math.">
    <div class="ffn-workspace">
      <div class="pipeline">
        <div class="step">
          <span class="step-label">x (Dim: {c.dim})</span>
          <Vector length={4} direction="vertical" cellSize={24} data={swigluInput} />
        </div>
        <div class="pathway expand">
           <svg width="60" height="100"><path d="M0,50 C30,50 30,10 60,10 M0,50 C30,50 30,90 60,90" fill="none" stroke="var(--border)" stroke-width="2" /></svg>
        </div>
        <div class="step gate-step">
          <div class="gate-branch">
             <span class="step-label">SiLU(w1)</span>
             <Matrix id="ffn-silu" rows={8} cols={1} cellSize={24} data={gate_silu.map(x=>[x])} colorMode="heat" />
          </div>
          <div class="gate-op">⊗</div>
          <div class="gate-branch">
             <span class="step-label">w3</span>
             <Matrix id="ffn-w3" rows={8} cols={1} cellSize={24} data={w3_val.map(x=>[x])} colorMode="signed" />
          </div>
        </div>
        <div class="pathway">
           <svg width="40" height="24"><line x1="0" y1="12" x2="40" y2="12" stroke="var(--border)" stroke-width="2" marker-end="url(#arrow)"/></svg>
        </div>
        <div class="step">
          <span class="step-label">Multiplied<br/>(Hidden: {c.ffn_hidden})</span>
          <Matrix id="ffn-mult" rows={8} cols={1} cellSize={24} data={ffn_multiplied.map(x=>[x])} colorMode="signed" />
        </div>
      </div>

      <div class="inspector-panel">
        {#if $inspectedCell && ($inspectedCell.id === 'ffn-silu' || $inspectedCell.id === 'ffn-w3' || $inspectedCell.id === 'ffn-mult')}
          {@const r = $inspectedCell.r}
          <h4>Element Inspector: Index [{r}]</h4>
          <div class="math-row">
            <div class="var">
               <span class="var-name">w1(x)[{r}]</span>
               <span class="var-val">{w1_val[r].toFixed(3)}</span>
            </div>
            <span>→ SiLU →</span>
            <div class="var hl">
               <span class="var-name">gate</span>
               <span class="var-val">{gate_silu[r].toFixed(3)}</span>
            </div>
          </div>
          <div class="math-row multiply">
            <span>×</span>
            <div class="var">
               <span class="var-name">w3(x)[{r}]</span>
               <span class="var-val">{w3_val[r].toFixed(3)}</span>
            </div>
          </div>
          <div class="math-row result">
            <span>=</span>
            <div class="var final">
               <span class="var-name">Output</span>
               <span class="var-val">{ffn_multiplied[r].toFixed(3)}</span>
            </div>
          </div>
        {:else}
          <div class="empty-inspector">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
             <p>Click any cell in the expanded hidden layers (SiLU, w3, or Multiplied) to inspect the element-wise scalar math.</p>
          </div>
        {/if}
      </div>
    </div>
  </InteractiveCard>

  <!-- ==========================================
       CARD 4: ROPE
       ========================================== -->
  <span id="rope-card" style="display:block; margin-top:-50px; padding-top:50px;"></span>
  <InteractiveCard title="Micro: RoPE (Rotary Positional Embeddings)" subtitle="Llama 3 rotates feature pairs based on Token Position (m) and Feature Index (i).">
    <div class="rope-workspace">
      <div class="rope-controls">
        <div class="ctrl-group">
          <div class="lbl-row"><span>Token Position (m)</span><strong style="color: var(--highlight)">{ropePos}</strong></div>
          <input type="range" min="0" max="10" step="1" bind:value={ropePos} class="hl-slider" />
        </div>
        <div class="ctrl-group">
          <div class="lbl-row"><span>Feature Index Pair (i)</span><strong style="color: var(--blue)">{ropeFeatIdx}</strong></div>
          <input type="range" min="0" max={headDim - 2} step="2" bind:value={ropeFeatIdx} class="blue-slider" />
        </div>
        <div class="math-box">
          <div class="math-title">Llama 3 Rotation Formula:</div>
          <div class="math-eq">θ = m × (500000 <sup>-2i / d</sup>)</div>
          <div class="math-res">Angle: {(angleRad * (180/Math.PI)).toFixed(1)}°</div>
        </div>
      </div>
      <div class="rope-viz">
        <svg viewBox="-120 -120 240 240" class="circle-svg">
          <line x1="-120" y1="0" x2="120" y2="0" stroke="var(--border)" stroke-width="1" />
          <line x1="0" y1="-120" x2="0" y2="120" stroke="var(--border)" stroke-width="1" />
          <circle cx="0" cy="0" r="100" fill="none" stroke="var(--surface2)" stroke-width="2" stroke-dasharray="4,4" />
          <line x1="0" y1="0" x2="100" y2="0" stroke="var(--muted)" stroke-width="2" stroke-dasharray="2,2" />
          <circle cx="100" cy="0" r="4" fill="var(--muted)" />
          <line x1="0" y1="0" x2={vecX} y2={-vecY} stroke="var(--highlight)" stroke-width="3" style="transition: all 0.3s;" />
          <circle cx={vecX} cy={-vecY} r="6" fill="var(--highlight)" style="transition: all 0.3s;" />
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
  
  /* ================== MACRO & HUD (Sticky Layout) ================== */
  .macro-layout { 
    display: flex; align-items: flex-start; justify-content: space-between; 
    gap: 3rem; width: 100%; position: relative;
  }
  
  .macro-diagram { flex: 1; display: flex; justify-content: center; }
  /* Notice the reduced max-width (500px instead of 700px). This effectively "zooms out" the whole SVG. */
  .macro-diagram svg { width: 100%; max-width: 500px; height: auto; overflow: visible; }
  
  .macro-hud { 
    position: sticky; top: 100px; 
    width: 340px; flex-shrink: 0; 
  }
  
  .telemetry-hud { 
    width: 100%; background: var(--glass-bg); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
    box-shadow: 0 10px 40px rgba(0,0,0,0.1); transition: border-color 0.3s;
  }
  .telemetry-hud.active { border-color: var(--accent); box-shadow: 0 10px 40px rgba(99,102,241,0.15); }
  
  .hud-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1.25rem; background: var(--surface2); border-bottom: 1px solid var(--border); }
  .hud-title { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; font-weight: 700; color: var(--text); letter-spacing: 0.1em; }
  .hud-status { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; background: rgba(99,102,241,0.1); color: var(--accent); }
  .telemetry-hud:not(.active) .hud-status { background: var(--bg); color: var(--muted); }
  
  .hud-content { padding: 1.5rem 1.25rem; min-height: 160px; display: flex; flex-direction: column; gap: 0.85rem; }
  .hud-empty { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--muted); font-style: italic; text-align: center; margin: auto; }
  
  .hud-row { display: flex; justify-content: space-between; align-items: center; }
  .hud-row .label { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); }
  .hud-row .val { font-family: 'Space Grotesk', sans-serif; font-size: 0.95rem; font-weight: 600; color: var(--text); }
  .hud-row .tensor { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--accent); font-weight: 600; }
  .hud-math { margin-top: 0.75rem; padding-top: 1rem; border-top: 1px dashed var(--border); font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; color: var(--highlight); text-align: center; }

  /* SVG Interactions & Animations */
  .active-wire { stroke: var(--accent) !important; stroke-width: 3 !important; stroke-dasharray: 6,4; animation: march 1s linear infinite; }
  @keyframes march { to { stroke-dashoffset: -20; } }

  .small-text { font-family: 'JetBrains Mono', monospace; font-size: 14px; fill: var(--muted); pointer-events: none; }
  .bold-text { font-family: 'Space Grotesk', sans-serif; font-weight: 700; fill: var(--text); pointer-events: none; }

  .interactive-node { cursor: pointer; transition: opacity 0.3s; }
  .interactive-node rect { fill: var(--surface); stroke: var(--border); stroke-width: 2; transition: all 0.2s; }
  /* Increased font size since SVG is scaled down */
  .interactive-node text { font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 600; fill: var(--text); pointer-events: none; transition: fill 0.2s; }
  
  .interactive-node:hover rect, .interactive-node.hovered rect { stroke: var(--accent); fill: rgba(99, 102, 241, 0.1); }
  .interactive-node:hover text, .interactive-node.hovered text { fill: var(--accent); }

  /* ================== MICRO VIEWS ================== */
  .micro-workspace { display: flex; justify-content: center; gap: 4rem; align-items: flex-start; overflow-x: auto; padding: 2rem 0; width: 100%; }
  .col { display: flex; flex-direction: column; gap: 1.5rem; }
  .col-title { font-family: 'Space Grotesk', sans-serif; font-size: 0.95rem; font-weight: 600; color: var(--text); text-align: center; }
  .col-title code { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); display: block; margin-top: 0.4rem; }
  .token-tape { display: flex; flex-direction: column; gap: 0.5rem; }
  .token-cell { background: var(--surface); border: 1px solid var(--border); padding: 0.75rem 1.25rem; border-radius: 6px; display: flex; justify-content: space-between; gap: 2rem; cursor: crosshair; transition: all 0.2s; }
  .token-cell .lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); }
  .token-cell .val { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--text); }
  .token-cell.active { border-color: var(--highlight); background: rgba(245, 158, 11, 0.1); transform: translateX(5px); }
  .matrix-viz { position: relative; padding: 1px; background: var(--bg); border-radius: 4px; border: 1px solid var(--border); }
  .row-highlight { position: absolute; left: 1px; border: 2px solid var(--highlight); background: rgba(245, 158, 11, 0.3); border-radius: 2px; pointer-events: none; z-index: 10; transition: top 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
  .tensor-stack { display: flex; flex-direction: column; gap: 2px; background: var(--bg); padding: 2px; border-radius: 4px; border: 1px solid var(--border); }
  .extracted-vec { transition: all 0.2s; background: var(--surface); border-radius: 2px; }
  .extracted-vec.active-vec { filter: drop-shadow(0 0 10px var(--highlight)); transform: scale(1.08); z-index: 10; position: relative; }

  /* ================== SWIGLU FFN ================== */
  .ffn-workspace { display: flex; gap: 4rem; align-items: center; justify-content: center; padding: 2rem; width: 100%; }
  
  .pipeline { display: flex; align-items: center; gap: 1rem; }
  .step { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  .step-label { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); text-align: center; }
  
  .gate-step { display: flex; flex-direction: row; align-items: center; gap: 1rem; padding: 1rem; background: var(--surface2); border: 1px dashed var(--border); border-radius: 12px; }
  .gate-branch { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  .gate-op { font-size: 1.5rem; color: var(--accent); font-weight: 300; margin-top: 1.5rem; }
  
  .inspector-panel { 
    flex: 1; max-width: 400px; min-height: 250px; background: var(--surface2); 
    border: 1px solid var(--border); border-radius: 12px; padding: 2rem; 
    display: flex; flex-direction: column; justify-content: center; 
  }
  .inspector-panel h4 { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--accent); margin: 0 0 1.5rem 0; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
  
  .math-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
  .math-row span { font-family: 'JetBrains Mono', monospace; color: var(--muted); font-size: 0.9rem; }
  .math-row.multiply { padding-left: 2rem; }
  .math-row.result { padding-left: 2rem; border-top: 1px dashed var(--border); padding-top: 1rem; }
  
  .var { display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--border); padding: 0.5rem 1rem; border-radius: 6px; }
  .var.hl { border-color: var(--highlight); background: rgba(245, 158, 11, 0.1); }
  .var.final { border-color: var(--accent); background: rgba(99, 102, 241, 0.1); }
  .var-name { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); margin-bottom: 0.25rem; }
  .var-val { font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem; color: var(--text); font-weight: 600; }
  
  .empty-inspector { display: flex; flex-direction: column; align-items: center; gap: 1rem; color: var(--muted); text-align: center; opacity: 0.6; }
  .empty-inspector p { font-size: 0.9rem; line-height: 1.5; margin: 0; }

  /* ================== ROPE ================== */
  .rope-workspace { display: flex; gap: 4rem; align-items: center; justify-content: center; padding: 2rem; }
  .rope-controls { flex: 1; max-width: 400px; display: flex; flex-direction: column; gap: 2rem; }
  .ctrl-group { display: flex; flex-direction: column; gap: 0.5rem; }
  .lbl-row { display: flex; justify-content: space-between; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--muted); text-transform: uppercase; }
  .lbl-row strong { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; }
  .hl-slider { accent-color: var(--highlight); cursor: pointer; }
  .blue-slider { accent-color: var(--blue); cursor: pointer; }
  .math-box { background: var(--surface2); border: 1px solid var(--border); border-left: 3px solid var(--accent); padding: 1.5rem; border-radius: 6px; }
  .math-title { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; margin-bottom: 0.75rem; }
  .math-eq { font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem; color: var(--text); font-weight: 600; margin-bottom: 0.5rem; }
  .math-res { font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; color: var(--accent); }
  .rope-viz { flex: 1; max-width: 400px; background: var(--bg); border: 1px dashed var(--border); border-radius: 12px; padding: 2rem; display: flex; justify-content: center; align-items: center; }
  .circle-svg { width: 100%; max-width: 300px; overflow: visible; }
</style>