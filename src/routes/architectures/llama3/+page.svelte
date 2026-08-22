<script lang="ts">
  import BlueprintCard from '$lib/components/common/BlueprintCard.svelte';
  import InteractiveCard from '$lib/components/common/InteractiveCard.svelte';
  import SwiGLUExplorer from '$lib/components/architectures/SwiGLUExplorer.svelte';
  import { inspectedCell } from '$lib/stores/diagram';
  import { onMount } from 'svelte';

  const configs = {
    '8B':  { dim: 4096, n_layers: 32, n_heads: 32, n_kv_heads: 8, vocab_size: '128k', ffn_hidden: '14,336', ctx: '128k' },
    '70B': { dim: 8192, n_layers: 80, n_heads: 64, n_kv_heads: 8, vocab_size: '128k', ffn_hidden: '28,672', ctx: '128k' }
  };
  let activeConfig: '8B' | '70B' = '8B';
  $: c = configs[activeConfig];
  $: headDim = c.dim / c.n_heads;

  // --- MACRO STATE (HUD & X-Ray) ---
  let hoveredNode: string | null = null;
  function handleNodeHover(nodeId: string) { hoveredNode = nodeId; }
  function clearHover() { hoveredNode = null; }
  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // --- CARD 2: TOKEN EMBEDDING STATE ---
  const presetSentences = [
    {
      text: "The wise king and graceful queen ruled the peaceful kingdom.",
      proofEq: 'vec("woman") - vec("man") ≈ vec("queen") - vec("king")',
      proofNote: "Gender relationship offsets prove semantic vector arithmetic!",
      tokens: [
        { word: "man", id: 582, x: 0.15, y: 0.25 },
        { word: "woman", id: 2215, x: 0.65, y: 0.35 },
        { word: "king", id: 3124, x: 0.20, y: 0.70 },
        { word: "queen", id: 3488, x: 0.70, y: 0.80 },
        { word: "kingdom", id: 8910, x: 0.45, y: 0.90 }
      ],
      relations: [
        { from: "man", to: "woman" },
        { from: "king", to: "queen" }
      ]
    },
    {
      text: "A loyal dog and playful cat rested near the warm fireplace.",
      proofEq: 'vec("kitten") - vec("cat") ≈ vec("puppy") - vec("dog")',
      proofNote: "Juvenile relationship offsets prove semantic vector arithmetic!",
      tokens: [
        { word: "cat", id: 6812, x: 0.20, y: 0.30 },
        { word: "kitten", id: 11205, x: 0.65, y: 0.40 },
        { word: "dog", id: 4102, x: 0.25, y: 0.75 },
        { word: "puppy", id: 9104, x: 0.70, y: 0.85 }
      ],
      relations: [
        { from: "cat", to: "kitten" },
        { from: "dog", to: "puppy" }
      ]
    },
    {
      text: "Fresh apples and ripe oranges were harvested from the sunny orchard.",
      proofEq: 'vec("orange") - vec("apple") ≈ vec("fruit") - vec("orchard")',
      proofNote: "Fruit & Nature relationship offsets prove semantic vector arithmetic!",
      tokens: [
        { word: "apple", id: 14201, x: 0.20, y: 0.30 },
        { word: "orange", id: 18320, x: 0.65, y: 0.40 },
        { word: "orchard", id: 12401, x: 0.25, y: 0.75 },
        { word: "fruit", id: 5102, x: 0.70, y: 0.85 }
      ],
      relations: [
        { from: "apple", to: "orange" },
        { from: "orchard", to: "fruit" }
      ]
    }
  ];

  let activePresetIdx = 0;
  $: activePreset = presetSentences[activePresetIdx];

  let activeTokenIdx = 0;
  $: if (activeTokenIdx >= activePreset.tokens.length) activeTokenIdx = 0;
  $: activeToken = activePreset.tokens[activeTokenIdx] || activePreset.tokens[0];

  function tokenVector(id: number): number[] {
    const vec: number[] = [];
    let seed = id;
    for (let i = 0; i < 8; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      vec.push(Number(((seed / 233280) * 2 - 1).toFixed(2)));
    }
    return vec;
  }

  $: activeVector = tokenVector(activeToken.id);

  function heatBg(val: number) {
    const norm = (val + 1) / 2;
    const r = Math.round(99 + (249 - 99) * norm);
    const g = Math.round(102 * (1 - norm));
    const b = Math.round(241 * (1 - norm) + 115 * norm);
    return `rgb(${r},${g},${b})`;
  }

  // --- CARD 3: RMSNORM STATE ---
  let noiseLevel = 1.0;
  const rawBase = [2.5, -6.1, 0.8, 14.2, -1.4, 4.2, -8.9, 3.1];
  $: rawVector = rawBase.map((v, i) => v * (1 + noiseLevel * (i % 2 === 0 ? 1.2 : -0.8)));
  $: rmsVal = Math.sqrt(rawVector.reduce((acc, v) => acc + v * v, 0) / rawVector.length + 1e-5);
  $: normalizedVector = rawVector.map(v => Number((v / rmsVal).toFixed(3)));

  // 2D Geometric Vector Presets
  const vec2DPresets = [
    { label: "[4.0, 2.0]", x: [4.0, 2.0] },
    { label: "[8.0, -4.0]", x: [8.0, -4.0] },
    { label: "[-3.0, 9.0]", x: [-3.0, 9.0] }
  ];
  let active2DIdx = 0;
  $: active2D = vec2DPresets[active2DIdx].x;
  $: rms2D = Math.sqrt((active2D[0] * active2D[0] + active2D[1] * active2D[1]) / 2 + 1e-5);
  $: norm2D = [
    Number((active2D[0] / rms2D).toFixed(3)),
    Number((active2D[1] / rms2D).toFixed(3))
  ];
  $: ratioOrig = Number((active2D[0] / active2D[1]).toFixed(3));
  $: ratioNorm = Number((norm2D[0] / norm2D[1]).toFixed(3));

  // --- CARD 4: GQA STATE ---
  let seqLenCtx = 16384;
  let attnMode: 'GQA' | 'MHA' | 'MQA' = 'GQA';
  let hoveredQHead: number | null = null;

  $: kvHeadsCount = attnMode === 'MHA' ? 32 : (attnMode === 'GQA' ? 8 : 1);
  $: vramBytes = 2 * seqLenCtx * kvHeadsCount * 128 * 2 * c.n_layers;
  $: vramGB = Number((vramBytes / (1024 * 1024 * 1024)).toFixed(2));

  // --- CARD 5: ROPE STATE (FIGURE 1 FROM ROFORMER PAPER) ---
  let ropePos = 3; // Position m (1 to 6)
  const basePair = [4.0, 2.5]; // Initial (x1, x2) pair
  const theta1 = 0.35; // Frequency theta_1

  $: currentAngle = ropePos * theta1;
  $: rotX1 = Number((basePair[0] * Math.cos(currentAngle) - basePair[1] * Math.sin(currentAngle)).toFixed(2));
  $: rotX2 = Number((basePair[0] * Math.sin(currentAngle) + basePair[1] * Math.cos(currentAngle)).toFixed(2));

  // SVG Coordinates for d=2 plane
  $: origSvgX = 110 + basePair[0] * 12;
  $: origSvgY = 100 - basePair[1] * 12;
  $: rotSvgX = 110 + rotX1 * 12;
  $: rotSvgY = 100 - rotX2 * 12;

  // --- CARD 6: SWIGLU STATE ---
  let ffnArchChoice: 'SwiGLU' | 'GELU' = 'SwiGLU';
  let gateShift = 0.0;
  const swigluInput = [0.5, -0.2, 0.8, -0.9];
  const w1_raw = [1.2, -1.8, 0.4, 2.1, -0.9, 1.5, -2.4, 0.7]; // Gate
  const w3_raw = [0.9, 0.6, -1.2, 1.4, 0.8, -0.5, 1.1, -0.3]; // Up / Content
  
  function silu(x: number) { return x / (1 + Math.exp(-x)); }
  $: gate_activations = w1_raw.map(v => silu(v + gateShift));
  $: swiglu_gated = gate_activations.map((g, i) => g * w3_raw[i]);
  $: swiglu_down = swiglu_gated.map(v => Number((v * 0.85).toFixed(2)));

  // --- CARD 7: CAUSAL MASK STATE ---
  const sampleSentence = ["The", "wise", "king", "ruled", "peacefully"];
  let selectedTokenRow = 3;
  const rawAttnMatrix = [
    [1.0, 0, 0, 0, 0],
    [0.6, 0.4, 0, 0, 0],
    [0.3, 0.5, 0.2, 0, 0],
    [0.1, 0.3, 0.5, 0.1, 0],
    [0.1, 0.2, 0.3, 0.3, 0.1]
  ];

  // --- CARD 8: SAMPLING STATE ---
  let temperature = 0.7;
  let topP = 0.90;
  const candidateTokens = [
    { word: "ruled", rawLogit: 8.5 },
    { word: "governed", rawLogit: 7.2 },
    { word: "lived", rawLogit: 5.8 },
    { word: "spoke", rawLogit: 4.1 },
    { word: "banana", rawLogit: 0.2 }
  ];

  $: scaledExp = candidateTokens.map(t => Math.exp(t.rawLogit / Math.max(0.01, temperature)));
  $: expSum = scaledExp.reduce((a, b) => a + b, 0);
  $: probs = candidateTokens.map((t, i) => ({
    ...t,
    prob: scaledExp[i] / expSum
  }));

  $: sortedProbs = [...probs].sort((a, b) => b.prob - a.prob);
  $: cumSumList = (() => {
    let acc = 0;
    return sortedProbs.map(p => {
      acc += p.prob;
      return { ...p, cumSum: acc, isKept: acc <= topP || acc - p.prob < topP };
    });
  })();

  onMount(() => inspectedCell.set(null));

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
  <BlueprintCard id="llama3-macro" title="Macro View" subtitle="Hover over the components to intercept the telemetry. The dashboard will follow you as you scroll.">
    <div class="macro-layout">
      <!-- LEFT COLUMN: The Diagram -->
      <div class="macro-diagram">
        <svg viewBox="0 0 700 800" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 8 5 L 0 8 z" fill="var(--muted)" /></marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 8 5 L 0 8 z" fill="var(--accent)" /></marker>
          </defs>

          <!-- 32x Bracket -->
          <path d="M 125 580 C 80 580, 80 370, 50 370 C 80 370, 80 160, 125 160" fill="none" stroke="var(--border)" stroke-width="2" />
          <text x="40" y="370" text-anchor="end" dominant-baseline="middle" class="bold-text" fill="var(--text)" font-size="24">{c.n_layers} ×</text>
          
          <rect x="140" y="160" width="420" height="420" rx="16" fill="var(--surface2)" stroke="var(--border)" stroke-width="1.5" />

          <!-- BASE WIRES -->
          <g class="wires" stroke="var(--muted)" stroke-width="2">
            <line x1="350" y1="800" x2="350" y2="750" marker-end="url(#arrow)" />
            <line x1="350" y1="720" x2="350" y2="680" marker-end="url(#arrow)" class:active-wire={inEmbed} />
            <line x1="350" y1="640" x2="350" y2="530" marker-end="url(#arrow)" class:active-wire={inEmbed || inNorm1} />
            <line x1="350" y1="500" x2="350" y2="465" marker-end="url(#arrow)" class:active-wire={inNorm1 || inAttn} />
            <line x1="220" y1="447.5" x2="250" y2="447.5" marker-end="url(#arrow)" class:active-wire={inRope || inAttn} />
            <line x1="350" y1="430" x2="350" y2="394" marker-end="url(#arrow)" class:active-wire={inAttn} />
            <path d="M 350 550 L 510 550 L 510 380 L 364 380" fill="none" marker-end="url(#arrow)" class:active-wire={inNorm1 || inAttn} />
            <line x1="350" y1="366" x2="350" y2="340" marker-end="url(#arrow)" class:active-wire={inNorm2} />
            <line x1="350" y1="310" x2="350" y2="270" marker-end="url(#arrow)" class:active-wire={inNorm2 || inFFN} />
            <line x1="350" y1="230" x2="350" y2="204" marker-end="url(#arrow)" class:active-wire={inFFN} />
            <path d="M 350 355 L 510 355 L 510 190 L 364 190" fill="none" marker-end="url(#arrow)" class:active-wire={inNorm2 || inFFN} />
            <line x1="350" y1="176" x2="350" y2="130" marker-end="url(#arrow)" class:active-wire={inNorm3} />
            <line x1="350" y1="100" x2="350" y2="55" marker-end="url(#arrow)" class:active-wire={inNorm3 || inOut} />
            <line x1="350" y1="20" x2="350" y2="-10" marker-end="url(#arrow)" class:active-wire={inOut} />
          </g>

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
          <g class="interactive-node" class:hovered={inNorm1} on:mouseenter={() => handleNodeHover('norm1')} on:mouseleave={clearHover} on:click={() => scrollTo('rmsnorm-card')}>
            <rect x="290" y="500" width="120" height="30" rx="6" />
            <text x="350" y="515" text-anchor="middle" dominant-baseline="middle">RMSNorm 1</text>
          </g>

          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inRope} on:mouseenter={() => handleNodeHover('rope')} on:mouseleave={clearHover} on:click={() => scrollTo('rope-card')}>
            <rect x="160" y="435" width="60" height="25" rx="6" />
            <text x="190" y="447.5" text-anchor="middle" dominant-baseline="middle" font-size="14">RoPE</text>
          </g>

          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inAttn} on:mouseenter={() => handleNodeHover('attn')} on:mouseleave={clearHover} on:click={() => scrollTo('gqa-card')}>
            <rect x="250" y="430" width="200" height="35" rx="8" />
            <text x="350" y="447.5" text-anchor="middle" dominant-baseline="middle">Grouped-query attention</text>
          </g>

          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inNorm2} on:mouseenter={() => handleNodeHover('norm2')} on:mouseleave={clearHover} on:click={() => scrollTo('rmsnorm-card')}>
            <rect x="290" y="310" width="120" height="30" rx="6" />
            <text x="350" y="325" text-anchor="middle" dominant-baseline="middle">RMSNorm 2</text>
          </g>

          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inFFN} on:mouseenter={() => handleNodeHover('ffn')} on:mouseleave={clearHover} on:click={() => scrollTo('swiglu-card')}>
            <rect x="240" y="230" width="220" height="40" rx="8" />
            <text x="350" y="250" text-anchor="middle" dominant-baseline="middle">Feed-forward (SwiGLU)</text>
          </g>

          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inNorm3} on:mouseenter={() => handleNodeHover('norm3')} on:mouseleave={clearHover} on:click={() => scrollTo('rmsnorm-card')}>
            <rect x="290" y="100" width="120" height="30" rx="6" />
            <text x="350" y="115" text-anchor="middle" dominant-baseline="middle">Final RMSNorm</text>
          </g>

          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inOut} on:mouseenter={() => handleNodeHover('output')} on:mouseleave={clearHover} on:click={() => scrollTo('sampling-card')}>
            <rect x="250" y="20" width="200" height="35" rx="8" />
            <text x="350" y="37.5" text-anchor="middle" dominant-baseline="middle">Linear output layer</text>
          </g>
        </svg>
      </div>
      
      <!-- RIGHT COLUMN: Deep Spec Telemetry HUD -->
      <div class="macro-hud">
        <div class="telemetry-hud" class:active={hoveredNode}>
          <div class="hud-header">
            <span class="hud-title">TELEMETRY</span>
            <span class="hud-status">{hoveredNode ? 'ACTIVE' : 'STANDBY'}</span>
          </div>
          
          <div class="hud-content">
            {#if !hoveredNode}
              <div class="hud-empty">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:0.5rem"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <br/>Hover over a module to intercept exact tensor specifications and PyTorch operations.
              </div>
            {:else if hoveredNode === 'embed'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">VocabParallelEmbedding</strong></div>
              <div class="data-group"><span class="lbl">SHAPE (IN → OUT)</span><span class="tensor">[bsz, seq] → [bsz, seq, {c.dim}]</span></div>
              <div class="data-group"><span class="lbl">PARAMETERS</span><span class="val param">{c.vocab_size} × {c.dim}</span></div>
              <div class="data-group"><span class="lbl">NOTE</span><span class="val note">Weights are untied from the output layer. Parallelized across GPUs to handle large {c.vocab_size} vocabulary.</span></div>
              <div class="hud-math">out = tokens @ W_e</div>
            
            {:else if hoveredNode === 'norm1' || hoveredNode === 'norm2' || hoveredNode === 'norm3'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">RMSNorm</strong></div>
              <div class="data-group"><span class="lbl">SHAPE (IN & OUT)</span><span class="tensor">[bsz, seq, {c.dim}]</span></div>
              <div class="data-group"><span class="lbl">PARAMETERS</span><span class="val param">{c.dim}</span></div>
              <div class="data-group"><span class="lbl">NOTE</span><span class="val note">Llama 3 uses <code>eps = 1e-5</code>. No mean-centering is applied, saving compute.</span></div>
              <div class="hud-math">out = x / √E[x²] * weight</div>
            
            {:else if hoveredNode === 'attn'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">Grouped-Query Attention</strong></div>
              <div class="data-group"><span class="lbl">Q SHAPE</span><span class="tensor">[bsz, seq, {c.n_heads}, {headDim}]</span></div>
              <div class="data-group"><span class="lbl">K, V SHAPE</span><span class="tensor">[bsz, seq, {c.n_kv_heads}, {headDim}]</span></div>
              <div class="data-group"><span class="lbl">PARAMETERS</span><span class="val param">W_q, W_k, W_v, W_o</span></div>
              <div class="data-group"><span class="lbl">NOTE</span><span class="val note">GQA reduces KV Cache memory overhead by {c.n_heads / c.n_kv_heads}x compared to standard Multi-Head Attention.</span></div>
              <div class="hud-math">Softmax(Q @ K.T) @ V</div>
            
            {:else if hoveredNode === 'rope'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">Rotary Positional Embeddings</strong></div>
              <div class="data-group"><span class="lbl">PARAMETERS</span><span class="val param">0 (Precomputed Matrix)</span></div>
              <div class="data-group"><span class="lbl">DATA TYPE</span><span class="val note">Operations performed in <code>complex64</code></span></div>
              <div class="data-group"><span class="lbl">NOTE</span><span class="val note">Llama 3 uses a massive <code>theta_base = 500,000</code> to support long {c.ctx} context windows.</span></div>
              <div class="hud-math">xq_, xk_ * freqs_cis</div>
            
            {:else if hoveredNode === 'ffn'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">SwiGLU Feed-Forward</strong></div>
              <div class="data-group"><span class="lbl">DIM EXPANSION</span><span class="tensor">{c.dim} → {c.ffn_hidden} → {c.dim}</span></div>
              <div class="data-group"><span class="lbl">PARAMETERS</span><span class="val param">3 × ({c.dim} × {c.ffn_hidden})</span></div>
              <div class="data-group"><span class="lbl">NOTE</span><span class="val note">Hidden dimension is scaled up, then forced to be a multiple of 256 for optimal GPU tile layout.</span></div>
              <div class="hud-math">w2(SiLU(w1(x)) * w3(x))</div>
            
            {:else if hoveredNode === 'output'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">Linear (lm_head)</strong></div>
              <div class="data-group"><span class="lbl">SHAPE (IN → OUT)</span><span class="tensor">[bsz, seq, {c.dim}] → [bsz, seq, {c.vocab_size}]</span></div>
              <div class="data-group"><span class="lbl">PARAMETERS</span><span class="val param">{c.dim} × {c.vocab_size}</span></div>
              <div class="data-group"><span class="lbl">NOTE</span><span class="val note">Maps the continuous hidden state back into probabilities over the {c.vocab_size} discrete vocabulary tokens.</span></div>
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
  
  <InteractiveCard title="Token Embedding" subtitle="How an LLM turns human words into continuous mathematical meaning.">
    <div class="embed-interactive-wrapper">
      
      <!-- PRESET SENTENCE SELECTOR -->
      <div class="prompt-bar">
        <span class="prompt-label">Select Example Context:</span>
        <div class="preset-chips">
          {#each presetSentences as p, i}
            <button 
              class="chip" 
              class:chip-active={activePresetIdx === i} 
              on:click={() => { activePresetIdx = i; activeTokenIdx = 0; }}
            >
              "{p.text}"
            </button>
          {/each}
        </div>
      </div>

      <!-- 3-STEP PIPELINE -->
      <div class="embed-pipeline">
        
        <!-- STEP 1: TOKEN TAPE -->
        <div class="pipe-card">
          <div class="step-badge">STEP 1</div>
          <h3>1. Text ➔ Token IDs</h3>
          <p class="pipe-desc">The tokenizer splits context into words and maps each to a vocabulary ID.</p>
          
          <div class="tokens-flex">
            {#each activePreset.tokens as tok, i}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div 
                class="token-flipper" 
                class:selected-tok={activeTokenIdx === i}
                on:click={() => activeTokenIdx = i}
              >
                <div class="tok-front">
                  <span class="tok-text">"{tok.word}"</span>
                  <span class="tok-sub">Click to inspect</span>
                </div>
                <div class="tok-back">
                  <span class="tok-id">ID: {tok.id}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="pipe-arrow">➔</div>

        <!-- STEP 2: 2D MATRIX GRID LOOKUP -->
        <div class="pipe-card">
          <div class="step-badge">STEP 2</div>
          <h3>2. Weight Matrix W<sub>e</sub> Lookup</h3>
          <p class="pipe-desc">Row <code>{activeToken.id}</code> is retrieved from the 128,000 × {c.dim} table.</p>
          
          <div class="matrix-grid-visual">
            <div class="grid-col-headers">
              <span class="idx-lbl">Index</span>
              <span>d0</span>
              <span>d512</span>
              <span>d1k</span>
              <span>d2k</span>
              <span>d3k</span>
              <span>d4k</span>
            </div>
            
            <div class="grid-rows-stack">
              <div class="grid-row ghost">
                <span class="row-tag">Row 00000</span>
                <div class="row-cells"><div class="c"></div><div class="c"></div><div class="c"></div><div class="c"></div><div class="c"></div><div class="c"></div></div>
              </div>
              <div class="grid-row ghost">
                <span class="row-tag">Row {Math.max(0, activeToken.id - 1)}</span>
                <div class="row-cells"><div class="c"></div><div class="c"></div><div class="c"></div><div class="c"></div><div class="c"></div><div class="c"></div></div>
              </div>
              
              <!-- ACTIVE ROW WITH LASER SCAN -->
              <div class="grid-row active-row">
                <span class="row-tag active-tag">Row {activeToken.id}</span>
                <div class="row-cells active-cells">
                  <div class="laser-beam"></div>
                  {#each activeVector.slice(0, 6) as v}
                    <div class="c active-c" style="background: {heatBg(v)}"></div>
                  {/each}
                </div>
              </div>
              
              <div class="grid-row ghost">
                <span class="row-tag">Row {activeToken.id + 1}</span>
                <div class="row-cells"><div class="c"></div><div class="c"></div><div class="c"></div><div class="c"></div><div class="c"></div><div class="c"></div></div>
              </div>
              <div class="grid-row ghost">
                <span class="row-tag">Row 127999</span>
                <div class="row-cells"><div class="c"></div><div class="c"></div><div class="c"></div><div class="c"></div><div class="c"></div><div class="c"></div></div>
              </div>
            </div>
          </div>
        </div>

        <div class="pipe-arrow">➔</div>

        <!-- STEP 3: 2D VECTOR SPACE SCATTER PLOT -->
        <div class="pipe-card">
          <div class="step-badge">STEP 3</div>
          <h3>3. Vector Arithmetic Space</h3>
          <p class="pipe-desc">Embedding space clusters similar meanings and preserves relational offsets.</p>
          
          <div class="vector-space-plot">
            <svg viewBox="0 0 300 240" class="plot-svg">
              <!-- Grid lines -->
              <line x1="30" y1="20" x2="30" y2="200" stroke="var(--border)" stroke-width="1.5"/>
              <line x1="30" y1="200" x2="280" y2="200" stroke="var(--border)" stroke-width="1.5"/>
              
              <!-- Axis labels -->
              <text x="25" y="18" text-anchor="end" class="axis-lbl">1.0</text>
              <text x="25" y="204" text-anchor="end" class="axis-lbl">0.0</text>
              <text x="280" y="218" text-anchor="middle" class="axis-lbl">1.0</text>
              
              <!-- Relationship Offset Arrows -->
              {#each activePreset.relations as rel}
                {@const fromTok = activePreset.tokens.find(t => t.word === rel.from)}
                {@const toTok = activePreset.tokens.find(t => t.word === rel.to)}
                {#if fromTok && toTok}
                  {@const x1 = 30 + fromTok.x * 240}
                  {@const y1 = 200 - fromTok.y * 180}
                  {@const x2 = 30 + toTok.x * 240}
                  {@const y2 = 200 - toTok.y * 180}
                  <line {x1} {y1} {x2} {y2} stroke="var(--highlight)" stroke-width="2" marker-end="url(#arrow-active)" />
                {/if}
              {/each}

              <!-- Token Scatter Points -->
              {#each activePreset.tokens as tok}
                {@const cx = 30 + tok.x * 240}
                {@const cy = 200 - tok.y * 180}
                {@const isSelected = tok.word === activeToken.word}
                
                <g class="point-group" class:is-active-point={isSelected}>
                  <circle {cx} {cy} r={isSelected ? 6 : 4} fill={isSelected ? 'var(--accent)' : 'var(--muted)'} />
                  <text 
                    x={cx + 8} 
                    y={cy - 4} 
                    fill={isSelected ? 'var(--accent)' : 'var(--text)'} 
                    class="point-lbl" 
                    font-weight={isSelected ? '700' : '500'}
                    dominant-baseline="middle"
                  >
                    {tok.word}
                  </text>
                </g>
              {/each}
            </svg>

            <!-- Dynamic Arithmetic Proof Callout -->
            <div class="proof-callout">
              <span class="proof-eq">{activePreset.proofEq}</span>
              <span class="proof-note">{activePreset.proofNote}</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  </InteractiveCard>

  <!-- ==========================================
       CARD 3: RMSNORM STABILIZER
       ========================================== -->
  <span id="rmsnorm-card" style="display:block; margin-top:-50px; padding-top:50px;"></span>
  
  <InteractiveCard title=" RMSNorm Activation Stabilizer" subtitle="As data flows through 32 deep residual blocks, numbers can drift. RMSNorm rescales token activations to maintain consistent signal energy.">
    <div class="rmsnorm-workspace">
      
      <!-- CONTROLS & EXPLANATION -->
      <div class="rms-controls">
        <div class="ctrl-group">
          <div class="lbl-row">
            <span>Simulate Outlier Noise (Spike)</span>
            <strong style="color: var(--highlight)">{noiseLevel.toFixed(1)}x</strong>
          </div>
          <input type="range" min="0" max="5" step="0.1" bind:value={noiseLevel} class="hl-slider" />
        </div>

        <div class="preset-buttons-row">
          <button class="chip" class:chip-active={noiseLevel === 0.5} on:click={() => noiseLevel = 0.5}>Stable Signal</button>
          <button class="chip" class:chip-active={noiseLevel === 2.5} on:click={() => noiseLevel = 2.5}>Outlier Spike</button>
          <button class="chip" class:chip-active={noiseLevel === 5.0} on:click={() => noiseLevel = 5.0}>Exploding Signal</button>
        </div>

        <div class="rms-info-card">
          <div class="info-title">MATHEMATICAL GROUND TRUTH</div>
          <div class="rms-math-display">
            RMSNorm(x) = ( x / √( Mean(x²) + ε ) ) × γ
          </div>
          <p class="info-text">
            Skipping mean-subtraction reduces computation while achieving comparable training stability in modern pre-norm transformers.
          </p>
          <span class="gamma-note">* Visualization assumes γ = 1.0 (learnable gain)</span>
          <div class="rms-gauge">
            <span>Signal Energy RMS(x):</span>
            <strong style="color: var(--accent)">{rmsVal.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      <!-- DUAL INSPECTOR: 2D GEOMETRY PLOT + 1D WAVEFORMS -->
      <div class="rms-dual-inspector">
        
        <!-- 2D GEOMETRIC DIRECTION PLOT -->
        <div class="vec2d-container">
          <span class="wave-title">2D Directional Ray Invariance</span>
          <div class="vec2d-presets-row">
            {#each vec2DPresets as p, i}
              <button 
                class="chip" 
                class:chip-active={active2DIdx === i} 
                on:click={() => active2DIdx = i}
              >
                x = {p.label}
              </button>
            {/each}
          </div>

          <div class="vec2d-plot-and-math">
            <svg viewBox="0 0 300 220" class="vec2d-svg">
              <defs>
                <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 8 5 L 0 8 z" fill="var(--highlight)" /></marker>
                <marker id="arrow-indigo" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 8 5 L 0 8 z" fill="var(--accent)" /></marker>
              </defs>

              <!-- Axes -->
              <line x1="20" y1="110" x2="280" y2="110" stroke="var(--border)" stroke-width="1.5" />
              <line x1="150" y1="20" x2="150" y2="200" stroke="var(--border)" stroke-width="1.5" />
              <circle cx="150" cy="110" r="3" fill="var(--muted)" />

              <!-- Directional Ray Line (Dashed) -->
              <line x1="150" y1="110" x2={150 + active2D[0] * 12} y2={110 - active2D[1] * 12} stroke="var(--highlight)" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6" />

              <!-- Original Vector Arrow x -->
              <line x1="150" y1="110" x2={150 + active2D[0] * 12} y2={110 - active2D[1] * 12} stroke="var(--highlight)" stroke-width="2.5" marker-end="url(#arrow-amber)" />
              <text x={150 + active2D[0] * 12 + 6} y={110 - active2D[1] * 12 - 4} fill="var(--highlight)" font-family="JetBrains Mono" font-size="11" font-weight="700">
                x = [{active2D[0]}, {active2D[1]}]
              </text>

              <!-- Normalized Vector Arrow y -->
              <line x1="150" y1="110" x2={150 + norm2D[0] * 12} y2={110 - norm2D[1] * 12} stroke="var(--accent)" stroke-width="3" marker-end="url(#arrow-indigo)" />
              <text x={150 + norm2D[0] * 12 + 6} y={110 - norm2D[1] * 12 + 12} fill="var(--accent)" font-family="JetBrains Mono" font-size="11" font-weight="700">
                y = [{norm2D[0]}, {norm2D[1]}]
              </text>
            </svg>

            <div class="ratio-proof-card">
              <div class="proof-row">
                <span>x Ratio (x₁ / x₂):</span>
                <strong>{active2D[0]} / {active2D[1]} = {ratioOrig}</strong>
              </div>
              <div class="proof-row">
                <span>y Ratio (y₁ / y₂):</span>
                <strong style="color: var(--accent)">{norm2D[0]} / {norm2D[1]} = {ratioNorm}</strong>
              </div>
              <div class="proof-insight">
                RMSNorm rescales magnitude while keeping feature directions and coordinate ratios 100% invariant!
              </div>
            </div>
          </div>
        </div>

        <!-- 1D WAVEFORMS -->
        <div class="rms-waves-container">
          <div class="wave-box">
            <span class="wave-title">1. Raw Input Signal (x) — Unbounded</span>
            <div class="bars-flex">
              {#each rawVector as val}
                {@const h = Math.min(75, Math.max(4, (Math.abs(val) / 40) * 75))}
                <div class="bar-col">
                  <div class="bar raw-bar" style="height: {h}px; background: {val >= 0 ? 'var(--highlight)' : 'var(--red)'}"></div>
                  <span class="bar-lbl">{val.toFixed(1)}</span>
                </div>
              {/each}
            </div>
          </div>

          <div class="rms-arrow">÷ RMS(x) = ÷ {rmsVal.toFixed(2)} ➔</div>

          <div class="wave-box normalized">
            <span class="wave-title">2. RMSNorm Output (y) — Unit RMS Scale</span>
            <div class="bars-flex">
              {#each normalizedVector as val}
                {@const h = Math.min(75, Math.max(4, ((Math.abs(val) * 2) / 40) * 75))}
                <div class="bar-col">
                  <div class="bar norm-bar" style="height: {h}px; background: {val >= 0 ? 'var(--green)' : 'var(--accent)'}"></div>
                  <span class="bar-lbl">{val.toFixed(2)}</span>
                </div>
              {/each}
            </div>
          </div>
        </div>

      </div>

    </div>
  </InteractiveCard>

  <!-- ==========================================
       CARD 4: GROUPED-QUERY ATTENTION & KV CACHE
       ========================================== -->
  <span id="gqa-card" style="display:block; margin-top:-50px; padding-top:50px;"></span>
  
  <InteractiveCard title=" Grouped-Query Attention (GQA) & KV Cache" subtitle="Llama 3 shares 1 Key/Value head across 4 Query heads, preventing 128k context windows from overflowing GPU memory.">
    <div class="gqa-workspace">
      
      <!-- LEFT: HEAD BROADCASTER MAP -->
      <div class="gqa-broadcaster">
        <div class="gqa-header">
          <h4>Head Sharing Map (32 Q ➔ 8 KV)</h4>
          <span class="gqa-sub">Hover over any Query Head to see its KV Group:</span>
        </div>

        <div class="heads-grid">
          <div class="q-heads-col">
            <span class="head-col-lbl">32 Query Heads</span>
            <div class="q-chips">
              {#each Array(32) as _, qIdx}
                {@const isHighlighted = hoveredQHead === qIdx}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div 
                  class="q-chip" 
                  class:highlighted-q={isHighlighted}
                  on:mouseenter={() => hoveredQHead = qIdx}
                  on:mouseleave={() => hoveredQHead = null}
                >
                  Q{qIdx + 1}
                </div>
              {/each}
            </div>
          </div>

          <div class="gqa-broad-arrow">4:1 Broadcast</div>

          <div class="kv-heads-col">
            <span class="head-col-lbl">8 Shared KV Heads</span>
            <div class="kv-chips">
              {#each Array(8) as _, kvIdx}
                {@const isTargetGroup = hoveredQHead !== null && Math.floor(hoveredQHead / 4) === kvIdx}
                <div class="kv-chip" class:target-kv={isTargetGroup}>
                  KV Head {kvIdx + 1}
                  <span class="group-tag">Shares Q{kvIdx * 4 + 1}..Q{kvIdx * 4 + 4}</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: KV CACHE VRAM CALCULATOR -->
      <div class="gqa-calculator">
        <h4>Live KV Cache Memory Simulator</h4>
        
        <div class="mode-toggle-row">
          <button class="mode-btn" class:active-mode={attnMode === 'MHA'} on:click={() => attnMode = 'MHA'}>
            MHA (32 KV Heads)
          </button>
          <button class="mode-btn" class:active-mode={attnMode === 'GQA'} on:click={() => attnMode = 'GQA'}>
            GQA (8 KV Heads — Llama 3)
          </button>
          <button class="mode-btn" class:active-mode={attnMode === 'MQA'} on:click={() => attnMode = 'MQA'}>
            MQA (1 KV Head)
          </button>
        </div>

        <div class="ctrl-group margin-top">
          <div class="lbl-row">
            <span>Context Length (Tokens)</span>
            <strong style="color: var(--highlight)">{seqLenCtx.toLocaleString()} tokens</strong>
          </div>
          <input type="range" min="1024" max="131072" step="1024" bind:value={seqLenCtx} class="hl-slider" />
        </div>

        <div class="vram-meter-box">
          <div class="vram-label-row">
            <span>KV Cache Memory Needed:</span>
            <strong class="vram-num" class:vram-danger={vramGB > 10} class:vram-safe={vramGB <= 10}>{vramGB} GB</strong>
          </div>

          <div class="vram-bar-track">
            <div 
              class="vram-bar-fill" 
              style="width: {Math.min(100, (vramGB / 16) * 100)}%"
              class:fill-danger={vramGB > 10}
            ></div>
          </div>

          <div class="vram-note">
            {#if attnMode === 'MHA'}
              ⚠️ Standard MHA wastes memory! At 128k context, KV Cache consumes {vramGB} GB VRAM per request.
            {:else if attnMode === 'GQA'}
              ✅ <strong>75% Memory Saved!</strong> GQA keeps the 128k KV Cache at {vramGB} GB VRAM with zero loss in quality.
            {:else}
              ⚡ Extreme MQA compression ({vramGB} GB VRAM), but slightly degrades model modeling capability.
            {/if}
          </div>
        </div>

      </div>

    </div>
  </InteractiveCard>

  <!-- ==========================================
       CARD 5: RE-ENGINEERED ROPE (FIGURE 1 FROM PAPER)
       ========================================== -->
  <span id="rope-card" style="display:block; margin-top:-50px; padding-top:50px;"></span>
  <InteractiveCard title=" RoPE (Rotary Positional Embeddings)" subtitle="RoPE encodes position by rotating Query and Key feature pairs in 2D sub-planes before attention is computed.">
    <div class="rope-workspace">
      
      <!-- CONTROLS & FORMULA -->
      <div class="rope-controls">
        <div class="ctrl-group">
          <div class="lbl-row">
            <span>Token Position (m)</span>
            <strong style="color: var(--highlight)">Pos m = {ropePos}</strong>
          </div>
          <input type="range" min="1" max="6" step="1" bind:value={ropePos} class="hl-slider" />
        </div>

        <div class="math-box">
          <div class="math-eq">θ<sub>i</sub> = 1 / 500,000<sup>2i/d</sup></div>
          <div class="math-eq">angle = m · θ<sub>i</sub></div>
          <div class="math-res">Applied strictly to Query & Key vectors (xq, xk).</div>
        </div>
      </div>

      <!-- FIGURE 1 TOP: d=2 SUB-PLANE 2D ROTATION -->
      <div class="rope-subplane-box">
        <div class="wheel-box">
          <span class="wheel-lbl">2D Sub-Plane Rotation (Pair #1: x₁, x₂)</span>
          
          <div class="subplane-svg-and-vals">
            <svg viewBox="0 0 220 200" class="subplane-svg">
              <defs>
                <marker id="arrow-rope-rot" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 8 5 L 0 8 z" fill="var(--accent)" /></marker>
              </defs>

              <!-- Axes x1 and x2 -->
              <line x1="20" y1="100" x2="200" y2="100" stroke="var(--border)" stroke-width="1.5" />
              <line x1="110" y1="20" x2="110" y2="180" stroke="var(--border)" stroke-width="1.5" />
              <text x="195" y="115" class="axis-lbl">x₁</text>
              <text x="115" y="30" class="axis-lbl">x₂</text>

              <!-- Unrotated Baseline (Pos 0) -->
              <line x1="110" y1="100" x2={origSvgX} y2={origSvgY} stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="3,3" />
              <circle cx={origSvgX} cy={origSvgY} r="3" fill="var(--muted)" />
              <text x={origSvgX + 4} y={origSvgY + 12} fill="var(--muted)" font-family="JetBrains Mono" font-size="10">(x₁, x₂)</text>

              <!-- Rotated Vector (x'_1, x'_2) -->
              <line x1="110" y1="100" x2={rotSvgX} y2={rotSvgY} stroke="var(--accent)" stroke-width="2.5" marker-end="url(#arrow-rope-rot)" />
              <circle cx={rotSvgX} cy={rotSvgY} r="4" fill="var(--accent)" />
              <text x={rotSvgX + 4} y={rotSvgY - 6} fill="var(--accent)" font-family="JetBrains Mono" font-size="11" font-weight="700">(x'₁, x'₂)</text>

              <!-- Arc indicating angle m*theta1 -->
              <path d="M {110 + 25} 100 A 25 25 0 0 0 {110 + 25 * Math.cos(currentAngle)} {100 - 25 * Math.sin(currentAngle)}" fill="none" stroke="var(--highlight)" stroke-width="1.5" />
              <text x="142" y="90" fill="var(--highlight)" font-family="JetBrains Mono" font-size="10" font-weight="700">m·θ₁</text>
            </svg>

            <div class="subplane-readout">
              <div class="readout-row">
                <span>Original Pair:</span>
                <strong>[{basePair[0]}, {basePair[1]}]</strong>
              </div>
              <div class="readout-row">
                <span>Rotated Pair (Pos {ropePos}):</span>
                <strong style="color:var(--accent)">[{rotX1}, {rotX2}]</strong>
              </div>
              <div class="proof-insight">
                Rotates Q & K in 2D sub-planes without altering vector magnitude.
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </InteractiveCard>

  <!-- ==========================================
       CARD 6: RE-ENGINEERED SWIGLU FFN
       ========================================== -->
  <span id="swiglu-card" style="display:block; margin-top:-50px; padding-top:50px;"></span>
  <SwiGLUExplorer />

  <!-- ==========================================
       CARD 7: CAUSAL MASKING & ATTENTION
       ========================================== -->
  <span id="causal-card" style="display:block; margin-top:-50px; padding-top:50px;"></span>
  <InteractiveCard title=" Causal Masking & Attention Matrix" subtitle="Autoregressive models must not look into the future. The upper-triangular -∞ mask blocks future words.">
    <div class="causal-workspace">
      
      <div class="causal-matrix-box">
        <div class="matrix-head-row">
          <span class="corner-cell">Tokens</span>
          {#each sampleSentence as word}
            <span class="col-head">{word}</span>
          {/each}
        </div>

        {#each sampleSentence as rowWord, rIdx}
          <div class="matrix-data-row" class:active-row-attn={selectedTokenRow === rIdx} on:click={() => selectedTokenRow = rIdx}>
            <span class="row-label">{rowWord}</span>
            {#each sampleSentence as _, cIdx}
              {#if cIdx > rIdx}
                <!-- MASKED FUTURE TOKEN -->
                <div class="cell-attn masked-cell">-∞</div>
              {:else}
                <!-- VALID PAST TOKEN -->
                {@const score = rawAttnMatrix[rIdx][cIdx]}
                <div class="cell-attn valid-cell" style="background: rgba(99, 102, 241, {score + 0.1})">
                  {(score * 100).toFixed(0)}%
                </div>
              {/if}
            {/each}
          </div>
        {/each}
      </div>

      <div class="causal-info">
        <h4>Row Spotlight: "{sampleSentence[selectedTokenRow]}"</h4>
        <p>
          Token <code>"{sampleSentence[selectedTokenRow]}"</code> can only attend to past tokens:
          <strong>[{sampleSentence.slice(0, selectedTokenRow + 1).join(', ')}]</strong>.
          Future positions are blocked by the <code>-∞</code> Causal Shield.
        </p>
      </div>

    </div>
  </InteractiveCard>

  <!-- ==========================================
       CARD 8: OUTPUT PROJECTION & SAMPLING
       ========================================== -->
  <span id="sampling-card" style="display:block; margin-top:-50px; padding-top:50px;"></span>
  <InteractiveCard title=" Output Projection & Token Sampling" subtitle="Projecting 4,096-d hidden states back to 128,000 logits, then sampling the next word using Temperature & Top-P.">
    <div class="sampling-workspace">
      
      <div class="sampling-controls">
        <div class="ctrl-group">
          <div class="lbl-row">
            <span>Temperature Dial (T)</span>
            <strong style="color: var(--highlight)">{temperature.toFixed(2)}</strong>
          </div>
          <input type="range" min="0.05" max="2.0" step="0.05" bind:value={temperature} class="hl-slider" />
          <span class="ctrl-hint">Low T = Sharp & Deterministic | High T = Flat & Random</span>
        </div>

        <div class="ctrl-group">
          <div class="lbl-row">
            <span>Top-P (Nucleus Cutoff)</span>
            <strong style="color: var(--accent)">{topP.toFixed(2)}</strong>
          </div>
          <input type="range" min="0.1" max="1.0" step="0.05" bind:value={topP} class="blue-slider" />
          <span class="ctrl-hint">Cuts off tail words once cumulative probability hits {topP}.</span>
        </div>
      </div>

      <div class="sampling-bars-container">
        <h4>Next Token Candidate Probabilities:</h4>
        <div class="cand-bars">
          {#each cumSumList as item}
            <div class="cand-row" class:guillotined={!item.isKept}>
              <span class="cand-word">{item.word}</span>
              <div class="bar-track">
                <div class="bar-fill" style="width: {item.prob * 100}%" class:kept-fill={item.isKept}></div>
              </div>
              <span class="cand-pct">{(item.prob * 100).toFixed(1)}%</span>
              {#if !item.isKept}
                <span class="sliced-tag">Sliced by Top-P</span>
              {/if}
            </div>
          {/each}
        </div>
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
  
  /* ================== MACRO & HUD ================== */
  .macro-layout { display: flex; align-items: flex-start; justify-content: space-between; gap: 3rem; width: 100%; position: relative; padding-bottom: 2rem; }
  .macro-diagram { flex: 1; display: flex; justify-content: center; }
  .macro-diagram svg { width: 100%; max-width: 500px; height: auto; overflow: visible; }
  .macro-hud { position: sticky; top: 80px; align-self: flex-start; width: 380px; flex-shrink: 0; z-index: 50; }
  .telemetry-hud { width: 100%; background: var(--glass-bg); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.15); transition: border-color 0.3s, box-shadow 0.3s; }
  .telemetry-hud.active { border-color: var(--accent); box-shadow: 0 20px 50px rgba(99,102,241,0.2); }
  .hud-header { display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1.5rem; background: var(--surface2); border-bottom: 1px solid var(--border); }
  .hud-title { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; font-weight: 700; color: var(--text); letter-spacing: 0.1em; }
  .hud-status { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; padding: 2px 8px; border-radius: 4px; background: rgba(99,102,241,0.15); color: var(--accent); font-weight: 600; }
  .telemetry-hud:not(.active) .hud-status { background: var(--bg); color: var(--muted); }
  .hud-content { padding: 1.5rem; min-height: 250px; display: flex; flex-direction: column; gap: 1.2rem; }
  .hud-empty { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--muted); font-style: italic; text-align: center; margin: auto; opacity: 0.7; }
  .data-group { display: flex; flex-direction: column; gap: 4px; }
  .data-group .lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; font-weight: 700; color: var(--muted); letter-spacing: 0.05em; }
  .data-group .val { font-family: 'Space Grotesk', sans-serif; font-size: 0.95rem; font-weight: 600; color: var(--text); }
  .data-group .val.param { font-family: 'JetBrains Mono', monospace; color: var(--blue); font-size: 0.85rem; }
  .data-group .val.note { font-family: 'Space Grotesk', sans-serif; font-weight: 400; font-size: 0.85rem; color: var(--text); opacity: 0.85; line-height: 1.4; }
  .data-group .tensor { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--accent); font-weight: 700; }
  .hud-math { margin-top: auto; padding-top: 1rem; border-top: 1px dashed var(--border); font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; font-weight: 600; color: var(--highlight); text-align: center; }

  .active-wire { stroke: var(--accent) !important; stroke-width: 3 !important; stroke-dasharray: 6,4; animation: march 1s linear infinite; }
  @keyframes march { to { stroke-dashoffset: -20; } }

  .small-text { font-family: 'JetBrains Mono', monospace; font-size: 14px; fill: var(--muted); pointer-events: none; }
  .bold-text { font-family: 'Space Grotesk', sans-serif; font-weight: 700; fill: var(--text); pointer-events: none; }
  .interactive-node { cursor: pointer; transition: opacity 0.3s; }
  .interactive-node rect { fill: var(--surface); stroke: var(--border); stroke-width: 2; transition: all 0.2s; }
  .interactive-node text { font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 600; fill: var(--text); pointer-events: none; transition: fill 0.2s; }
  .interactive-node:hover rect, .interactive-node.hovered rect { stroke: var(--accent); fill: rgba(99, 102, 241, 0.08); }
  .interactive-node:hover text, .interactive-node.hovered text { fill: var(--accent); }

  /* ================== TOKEN EMBEDDING ================== */
  .embed-interactive-wrapper { display: flex; flex-direction: column; gap: 2rem; width: 100%; }
  .prompt-bar { display: flex; align-items: center; gap: 1.5rem; background: var(--surface2); padding: 1rem 1.5rem; border: 1px solid var(--border); border-radius: 12px; }
  .prompt-label { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; font-weight: 700; color: var(--accent); }
  .preset-chips { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .chip { background: var(--bg); border: 1px solid var(--border); color: var(--muted); padding: 0.4rem 0.85rem; border-radius: 999px; font-size: 0.8rem; font-family: 'Space Grotesk', sans-serif; cursor: pointer; transition: all 0.2s; }
  .chip:hover { border-color: var(--text); color: var(--text); }
  .chip-active { border-color: var(--accent); color: var(--accent); background: rgba(99, 102, 241, 0.1); font-weight: 600; }

  .embed-pipeline { display: flex; align-items: stretch; gap: 1.25rem; width: 100%; overflow-x: auto; padding-bottom: 0.5rem; }
  .pipe-card { flex: 1; min-width: 320px; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
  .step-badge { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; font-weight: 700; color: var(--accent); background: rgba(99, 102, 241, 0.1); padding: 2px 8px; border-radius: 4px; width: fit-content; }
  .pipe-card h3 { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text); }
  .pipe-desc { font-size: 0.85rem; color: var(--muted); margin: 0; line-height: 1.4; }
  .pipe-arrow { display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: var(--muted); user-select: none; }

  .tokens-flex { display: flex; flex-direction: column; gap: 0.75rem; margin-top: auto; }
  .token-flipper { background: var(--surface); border: 1px solid var(--border); padding: 0.85rem 1.25rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; }
  .token-flipper:hover { border-color: var(--accent); transform: translateX(4px); }
  .selected-tok { border-color: var(--highlight) !important; background: rgba(245, 158, 11, 0.08) !important; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.15); }
  .tok-text { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.05rem; color: var(--text); }
  .tok-sub { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); }
  .tok-id { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--highlight); font-size: 0.95rem; }

  .matrix-grid-visual { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; margin-top: auto; }
  .grid-col-headers { display: grid; grid-template-columns: 72px repeat(6, 1fr); gap: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); align-items: center; }
  .grid-col-headers span { text-align: center; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .grid-col-headers .idx-lbl { text-align: left; }
  .grid-rows-stack { display: flex; flex-direction: column; gap: 4px; }
  .grid-row { display: grid; grid-template-columns: 72px 1fr; gap: 4px; align-items: center; }
  .row-tag { font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; color: var(--muted); white-space: nowrap; overflow: hidden; }
  .row-cells { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; height: 22px; }
  .c { background: var(--surface); border: 1px solid var(--border); border-radius: 3px; }
  .ghost { opacity: 0.45; }
  .active-row { background: rgba(245, 158, 11, 0.12); padding: 3px 0; border-radius: 4px; position: relative; }
  .active-tag { color: var(--highlight); font-weight: 700; }
  .active-cells { position: relative; }
  .active-c { border: 1px solid var(--highlight); }
  .laser-beam { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.4), transparent); animation: laser 1.5s ease-in-out infinite; pointer-events: none; }
  @keyframes laser { 0% { opacity: 0.2; } 50% { opacity: 0.8; } 100% { opacity: 0.2; } }

  .vector-space-plot { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; margin-top: auto; }
  .plot-svg { width: 100%; height: auto; max-height: 200px; overflow: visible; }
  .axis-lbl { font-family: 'JetBrains Mono', monospace; font-size: 10px; fill: var(--muted); }
  .point-lbl { font-family: 'Space Grotesk', sans-serif; font-size: 11px; }
  .point-group { transition: all 0.3s; }
  .is-active-point circle { filter: drop-shadow(0 0 6px var(--accent)); }
  .proof-callout { background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--accent); padding: 0.5rem 0.75rem; border-radius: 4px; display: flex; flex-direction: column; gap: 2px; }
  .proof-eq { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--highlight); font-weight: 700; }
  .proof-note { font-size: 0.7rem; color: var(--muted); }

  /* ================== RMSNORM WORKSPACE ================== */
  .rmsnorm-workspace { display: flex; gap: 2rem; align-items: flex-start; justify-content: space-between; padding: 1rem 0; width: 100%; flex-wrap: wrap; }
  .rms-controls { flex: 1; min-width: 320px; display: flex; flex-direction: column; gap: 1.25rem; }
  .ctrl-group { display: flex; flex-direction: column; gap: 0.5rem; }
  .lbl-row { display: flex; justify-content: space-between; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--muted); text-transform: uppercase; }
  .hl-slider { accent-color: var(--highlight); cursor: pointer; }
  .blue-slider { accent-color: var(--blue); cursor: pointer; }
  .preset-buttons-row { display: flex; gap: 0.5rem; }
  
  .rms-info-card { background: var(--surface2); border: 1px solid var(--border); border-left: 3px solid var(--accent); padding: 1.25rem; border-radius: 8px; display: flex; flex-direction: column; gap: 0.75rem; }
  .info-title { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; font-weight: 700; color: var(--accent); letter-spacing: 0.05em; }
  .rms-math-display { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--highlight); font-weight: 700; background: var(--bg); padding: 0.5rem; border-radius: 4px; border: 1px solid var(--border); text-align: center; }
  .info-text { font-size: 0.85rem; color: var(--text); opacity: 0.85; line-height: 1.5; margin: 0; }
  .gamma-note { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); font-style: italic; }
  .rms-gauge { display: flex; justify-content: space-between; align-items: center; background: var(--bg); padding: 0.5rem 0.75rem; border-radius: 4px; border: 1px solid var(--border); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--muted); }

  .rms-dual-inspector { flex: 1.6; min-width: 360px; display: flex; gap: 1.5rem; flex-wrap: wrap; }
  .vec2d-container { flex: 1; min-width: 280px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .vec2d-presets-row { display: flex; gap: 0.4rem; }
  .vec2d-plot-and-math { display: flex; flex-direction: column; gap: 0.75rem; align-items: center; }
  .vec2d-svg { width: 100%; max-width: 260px; height: auto; overflow: visible; }
  .ratio-proof-card { width: 100%; background: var(--surface2); border: 1px solid var(--border); padding: 0.75rem; border-radius: 6px; display: flex; flex-direction: column; gap: 0.4rem; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; }
  .proof-row { display: flex; justify-content: space-between; color: var(--text); }
  .proof-insight { font-size: 0.65rem; color: var(--muted); border-top: 1px dashed var(--border); padding-top: 0.4rem; margin-top: 0.2rem; }

  .rms-waves-container { flex: 1; min-width: 280px; display: flex; flex-direction: column; gap: 1rem; }
  .wave-box { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; overflow: hidden; }
  .wave-title { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); font-weight: 600; }
  .bars-flex { display: flex; align-items: flex-end; justify-content: space-around; height: 95px; padding-top: 15px; border-bottom: 1px stroke var(--border); }
  .bar-col { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .bar { width: 14px; border-radius: 3px 3px 0 0; transition: height 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s; max-height: 75px; }
  .bar-lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.6rem; color: var(--muted); }
  .rms-arrow { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--accent); text-align: center; font-weight: 600; }

  /* ================== GQA WORKSPACE ================== */
  .gqa-workspace { display: flex; gap: 3rem; align-items: flex-start; justify-content: space-between; padding: 1rem 0; width: 100%; flex-wrap: wrap; }
  .gqa-broadcaster { flex: 1; min-width: 340px; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
  .gqa-header h4 { font-size: 1.05rem; font-weight: 700; margin: 0 0 0.25rem 0; color: var(--text); }
  .gqa-sub { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); }
  .heads-grid { display: flex; align-items: center; gap: 1.5rem; }
  .head-col-lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; font-weight: 700; color: var(--accent); margin-bottom: 0.5rem; display: block; }
  .q-heads-col { flex: 1; }
  .q-chips { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
  .q-chip { background: var(--bg); border: 1px solid var(--border); color: var(--muted); font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; padding: 4px 2px; text-align: center; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
  .q-chip:hover, .highlighted-q { border-color: var(--highlight); color: var(--highlight); background: rgba(245, 158, 11, 0.15); font-weight: 700; }
  .gqa-broad-arrow { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--accent); font-weight: 700; text-align: center; user-select: none; }
  .kv-heads-col { flex: 1.1; }
  .kv-chips { display: flex; flex-direction: column; gap: 6px; }
  .kv-chip { background: var(--bg); border: 1px solid var(--border); padding: 0.4rem 0.75rem; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--text); display: flex; flex-direction: column; gap: 2px; transition: all 0.2s; }
  .group-tag { font-size: 0.6rem; color: var(--muted); }
  .target-kv { border-color: var(--accent) !important; background: rgba(99, 102, 241, 0.15) !important; color: var(--accent) !important; box-shadow: 0 0 10px rgba(99, 102, 241, 0.2); }

  .gqa-calculator { flex: 1; min-width: 320px; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
  .gqa-calculator h4 { font-size: 1.05rem; font-weight: 700; margin: 0; color: var(--text); }
  .mode-toggle-row { display: flex; gap: 0.5rem; }
  .mode-btn { flex: 1; background: var(--bg); border: 1px solid var(--border); color: var(--muted); padding: 0.5rem 0.25rem; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; cursor: pointer; transition: all 0.2s; }
  .active-mode { border-color: var(--accent); color: var(--accent); background: rgba(99, 102, 241, 0.15); font-weight: 700; }
  .margin-top { margin-top: 0.5rem; }
  .vram-meter-box { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .vram-label-row { display: flex; justify-content: space-between; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text); }
  .vram-num { font-size: 1.2rem; font-weight: 700; }
  .vram-safe { color: var(--green); }
  .vram-danger { color: var(--red); }
  .vram-bar-track { height: 10px; background: var(--surface); border-radius: 999px; overflow: hidden; border: 1px solid var(--border); }
  .vram-bar-fill { height: 100%; background: var(--green); transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s; }
  .fill-danger { background: var(--red) !important; }
  .vram-note { font-size: 0.82rem; color: var(--muted); line-height: 1.4; }

  /* ================== ROPE WORKSPACE ================== */
  .rope-workspace { display: flex; gap: 3rem; align-items: flex-start; justify-content: space-between; padding: 1rem 0; width: 100%; flex-wrap: wrap; }
  .rope-controls { flex: 1; min-width: 320px; display: flex; flex-direction: column; gap: 1.5rem; }
  .rope-subplane-box { flex: 1.5; min-width: 340px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
  .subplane-svg-and-vals { display: flex; gap: 1.5rem; align-items: center; justify-content: center; flex-wrap: wrap; }
  .subplane-svg { width: 100%; max-width: 220px; height: auto; overflow: visible; }
  .subplane-readout { display: flex; flex-direction: column; gap: 0.5rem; background: var(--surface2); border: 1px solid var(--border); padding: 1rem; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }
  .readout-row { display: flex; justify-content: space-between; gap: 1rem; color: var(--text); }

  /* ================== SWIGLU WORKSPACE ================== */
  .swiglu-workspace { display: flex; flex-direction: column; gap: 2rem; width: 100%; }
  .swiglu-header-bar { display: flex; justify-content: space-between; align-items: center; gap: 2rem; background: var(--surface2); padding: 1rem 1.5rem; border: 1px solid var(--border); border-radius: 12px; flex-wrap: wrap; }
  .budget-toggle { display: flex; gap: 0.5rem; flex: 1; min-width: 300px; }
  .budget-proof-box { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--highlight); flex: 1.2; text-align: right; }
  .swiglu-pipeline-box { background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
  .gate-branches-flex { display: flex; align-items: center; gap: 1rem; flex: 1; flex-wrap: wrap; }
  .branch-card { background: var(--surface2); border: 1px solid var(--border); padding: 1rem; border-radius: 8px; display: flex; flex-direction: column; gap: 0.5rem; }
  .branch-lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); }
  .cells-row { display: flex; gap: 4px; }
  .gate-cell { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; padding: 4px 6px; border-radius: 3px; color: white; font-weight: 700; }
  .mult-symbol { font-size: 1.2rem; color: var(--accent); font-family: 'JetBrains Mono', monospace; font-weight: 700; }
  .result-card { border-color: var(--accent); background: rgba(99, 102, 241, 0.08); }

  /* ================== CAUSAL MASK WORKSPACE ================== */
  .causal-workspace { display: flex; gap: 3rem; align-items: center; justify-content: center; padding: 1rem 0; width: 100%; flex-wrap: wrap; }
  .causal-matrix-box { background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .matrix-head-row, .matrix-data-row { display: grid; grid-template-columns: 80px repeat(5, 55px); gap: 6px; align-items: center; }
  .corner-cell, .col-head, .row-label { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); text-align: center; }
  .row-label { text-align: left; font-weight: 700; color: var(--text); }
  .matrix-data-row { padding: 4px 0; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
  .matrix-data-row:hover, .active-row-attn { background: rgba(99, 102, 241, 0.12); }
  .cell-attn { height: 35px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; font-weight: 700; }
  .masked-cell { background: rgba(239, 68, 68, 0.1); color: var(--red); border: 1px dashed var(--red); }
  .valid-cell { color: white; border: 1px solid var(--accent); }
  .causal-info { max-width: 350px; background: var(--surface2); border: 1px solid var(--border); border-left: 3px solid var(--accent); padding: 1.5rem; border-radius: 8px; }
  .causal-info h4 { font-size: 1rem; color: var(--accent); margin: 0 0 0.5rem 0; font-family: 'JetBrains Mono', monospace; }
  .causal-info p { font-size: 0.85rem; color: var(--text); opacity: 0.85; margin: 0; line-height: 1.5; }

  /* ================== SAMPLING WORKSPACE ================== */
  .sampling-workspace { display: flex; gap: 3rem; align-items: flex-start; justify-content: space-between; padding: 1rem 0; width: 100%; flex-wrap: wrap; }
  .sampling-controls { flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 1.5rem; }
  .ctrl-hint { font-size: 0.75rem; color: var(--muted); font-family: 'JetBrains Mono', monospace; }
  .sampling-bars-container { flex: 1.5; min-width: 360px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
  .sampling-bars-container h4 { font-size: 0.95rem; margin: 0; color: var(--text); font-family: 'Space Grotesk', sans-serif; }
  .cand-bars { display: flex; flex-direction: column; gap: 0.75rem; }
  .cand-row { display: grid; grid-template-columns: 90px 1fr 60px 100px; gap: 1rem; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; }
  .cand-row.guillotined { opacity: 0.35; }
  .cand-word { color: var(--text); font-weight: 700; }
  .bar-track { height: 12px; background: var(--surface); border-radius: 999px; overflow: hidden; border: 1px solid var(--border); }
  .bar-fill { height: 100%; background: var(--muted); transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  .kept-fill { background: var(--accent) !important; }
  .cand-pct { color: var(--accent); font-weight: 700; }
  .sliced-tag { font-size: 0.65rem; color: var(--red); border: 1px stroke var(--red); padding: 2px 4px; border-radius: 3px; }
</style>