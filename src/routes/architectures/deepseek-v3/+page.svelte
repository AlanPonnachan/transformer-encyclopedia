<script lang="ts">
  import BlueprintCard from '$lib/components/common/BlueprintCard.svelte';
  import InteractiveCard from '$lib/components/common/InteractiveCard.svelte';
  import CollapsibleToC from '$lib/components/common/CollapsibleToC.svelte';
  import MLAExplorer from '$lib/components/architectures/MLAExplorer.svelte';
  import SamplingExplorer from '$lib/components/architectures/SamplingExplorer.svelte';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  const configs = {
    '671B': {
      dim: 7168,
      n_layers: 61,
      n_dense: 3,
      n_heads: 128,
      q_lora_rank: 1536,
      kv_lora_rank: 512,
      qk_nope: 128,
      qk_rope: 64,
      v_head_dim: 128,
      n_routed: 256,
      n_activated: 8,
      n_shared: 1,
      moe_inter_dim: 2048,
      dense_inter_dim: 18432,
      vocab: '129k',
      ctx: '128k'
    },
    '16B-Stub': {
      dim: 2048,
      n_layers: 27,
      n_dense: 1,
      n_heads: 16,
      q_lora_rank: 0,
      kv_lora_rank: 512,
      qk_nope: 128,
      qk_rope: 64,
      v_head_dim: 128,
      n_routed: 64,
      n_activated: 6,
      n_shared: 2,
      moe_inter_dim: 1408,
      dense_inter_dim: 10944,
      vocab: '102k',
      ctx: '16k'
    }
  };

  let activeConfigKey: '671B' | '16B-Stub' = '671B';
  $: c = configs[activeConfigKey];

  // Macro HUD hover state
  let hoveredNode: string | null = null;
  function handleNodeHover(nodeId: string) { hoveredNode = nodeId; }
  function clearHover() { hoveredNode = null; }

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Table of Contents specification
  const tocChapters = [
    {
      id: 'system',
      title: 'Architecture Overview',
      sections: [
        { id: 'v3-macro', title: 'Macro Dataflow (61 Layers)' }
      ]
    },
    {
      id: 'mla',
      title: 'Attention & Cache',
      sections: [
        { id: 'mla-card', title: '01. Multi-Head Latent Attention' }
      ]
    },
    {
      id: 'decoding',
      title: 'Decoding & Sampling',
      sections: [
        { id: 'sampling-card', title: '02. Output Generation & Sampling' }
      ]
    }
  ];

  let activeSectionId = 'v3-macro';

  onMount(() => {
    const sectionIds = ['v3-macro', 'mla-card', 'sampling-card'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) activeSectionId = entry.target.id;
        });
      },
      { rootMargin: '-15% 0px -70% 0px' }
    );
    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  });

  $: inEmbed = hoveredNode === 'embed';
  $: inNorm1 = hoveredNode === 'norm1';
  $: inMla   = hoveredNode === 'mla';
  $: inRope  = hoveredNode === 'rope';
  $: inNorm2 = hoveredNode === 'norm2';
  $: inMoe   = hoveredNode === 'moe';
  $: inNorm3 = hoveredNode === 'norm3';
  $: inOut   = hoveredNode === 'output';
</script>

<svelte:head>
  <title>DeepSeek-V3 Architecture — Transformer Encyclopedia</title>
</svelte:head>

<CollapsibleToC chapters={tocChapters} {activeSectionId} />

<div class="page-container">

  <!-- PAGE HEADER -->
  <header class="page-header">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="{base}/" class="crumb-link">Transformer Encyclopedia</a>
      <span class="crumb-sep">›</span>
      <a href="{base}/architectures" class="crumb-link">Architectures</a>
      <span class="crumb-sep">›</span>
      <span class="crumb-current">DeepSeek-V3</span>
    </nav>

    <div class="header-split">
      <div>
        <h1>DeepSeek-V3 Architecture</h1>
        <p>
          Autoregressive Mixture-of-Experts model combining <strong>Multi-Head Latent Attention (MLA)</strong>, 
          <strong>DeepSeekMoE</strong> (256 routed + 1 shared expert), and <strong>FP8 tile-based dequantization</strong>.
        </p>
      </div>

      <div class="config-selector">
        <span>Model Scale:</span>
        <select bind:value={activeConfigKey}>
          <option value="671B">DeepSeek-V3 (671B Total / 37B Active)</option>
          <option value="16B-Stub">Inference Minimal Stub (16B)</option>
        </select>
      </div>
    </div>
  </header>

  <!-- ==========================================
       CARD 1: MACRO DATAFLOW & TELEMETRY HUD
       ========================================== -->
  <BlueprintCard id="v3-macro" title="DeepSeek-V3 Macro Architecture" subtitle="Trace activations from token embedding through the 61-layer transformer stack. Hover over any block to inspect PyTorch tensor shapes and mathematical formulations.">
    <div class="macro-layout">
      
      <!-- SVG DATAFLOW DIAGRAM -->
      <div class="macro-diagram">
        <svg viewBox="0 0 700 840" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 2 L 8 5 L 0 8 z" fill="var(--muted)" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 2 L 8 5 L 0 8 z" fill="var(--accent)" />
            </marker>
          </defs>

          <!-- 61x BRACKET (LEFT) -->
          <path d="M 125 580 C 80 580, 80 370, 50 370 C 80 370, 80 160, 125 160" fill="none" stroke="var(--border)" stroke-width="2" />
          <text x="40" y="360" text-anchor="end" dominant-baseline="middle" class="bold-text" fill="var(--text)" font-size="24">{c.n_layers} ×</text>
          <text x="40" y="385" text-anchor="end" dominant-baseline="middle" class="sub-bracket-text" fill="var(--accent)" font-size="12">Blocks</text>
          <text x="40" y="405" text-anchor="end" dominant-baseline="middle" class="sub-bracket-text" fill="var(--muted)" font-size="10.5">L1–{c.n_dense}: Dense SwiGLU</text>
          <text x="40" y="420" text-anchor="end" dominant-baseline="middle" class="sub-bracket-text" fill="var(--muted)" font-size="10.5">L{c.n_dense + 1}–{c.n_layers}: MoE Layer</text>

          <!-- REPEATED TRANSFORMER BLOCK CONTAINER -->
          <rect x="140" y="160" width="420" height="420" rx="16" fill="var(--surface2)" stroke="var(--border)" stroke-width="1.5" />

          <!-- BASE WIRES -->
          <g class="wires" stroke="var(--muted)" stroke-width="2">
            <!-- Input to Tokenized Text -->
            <line x1="350" y1="800" x2="350" y2="750" marker-end="url(#arrow)" />
            
            <!-- Tokenized Text to Embedding Layer -->
            <line x1="350" y1="720" x2="350" y2="680" marker-end="url(#arrow)" class:active-wire={inEmbed} />
            
            <!-- Embedding Layer to Block Entrance -->
            <line x1="350" y1="640" x2="350" y2="530" marker-end="url(#arrow)" class:active-wire={inEmbed || inNorm1} />
            
            <!-- Pre-RMSNorm 1 to MLA Attention -->
            <line x1="350" y1="500" x2="350" y2="465" marker-end="url(#arrow)" class:active-wire={inNorm1 || inMla} />
            
            <!-- Decoupled RoPE injection into MLA -->
            <line x1="220" y1="447.5" x2="250" y2="447.5" marker-end="url(#arrow)" class:active-wire={inRope || inMla} />
            
            <!-- MLA Attention to Addition Circle 1 -->
            <line x1="350" y1="430" x2="350" y2="394" marker-end="url(#arrow)" class:active-wire={inMla} />
            
            <!-- RESIDUAL SKIP CONNECTION 1 (AROUND MLA) -->
            <path d="M 350 550 L 510 550 L 510 380 L 364 380" fill="none" marker-end="url(#arrow)" class:active-wire={inNorm1 || inMla} />
            
            <!-- Addition Circle 1 to Pre-RMSNorm 2 -->
            <line x1="350" y1="366" x2="350" y2="340" marker-end="url(#arrow)" class:active-wire={inNorm2} />
            
            <!-- Pre-RMSNorm 2 to MoE / FFN -->
            <line x1="350" y1="310" x2="350" y2="270" marker-end="url(#arrow)" class:active-wire={inNorm2 || inMoe} />
            
            <!-- MoE / FFN to Addition Circle 2 -->
            <line x1="350" y1="230" x2="350" y2="204" marker-end="url(#arrow)" class:active-wire={inMoe} />
            
            <!-- RESIDUAL SKIP CONNECTION 2 (AROUND MOE) -->
            <path d="M 350 355 L 510 355 L 510 190 L 364 190" fill="none" marker-end="url(#arrow)" class:active-wire={inNorm2 || inMoe} />
            
            <!-- Addition Circle 2 out of block to Final RMSNorm -->
            <line x1="350" y1="176" x2="350" y2="130" marker-end="url(#arrow)" class:active-wire={inNorm3} />
            
            <!-- Final RMSNorm to Linear Output Layer -->
            <line x1="350" y1="100" x2="350" y2="55" marker-end="url(#arrow)" class:active-wire={inNorm3 || inOut} />
            
            <!-- Linear Output Layer to next-token prediction -->
            <line x1="350" y1="20" x2="350" y2="-10" marker-end="url(#arrow)" class:active-wire={inOut} />
          </g>

          <!-- RESIDUAL ADDITION CIRCLES -->
          <!-- Addition Circle 1 (Post-MLA) -->
          <circle cx="350" cy="380" r="14" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
          <text x="350" y="382" text-anchor="middle" dominant-baseline="middle" font-size="16" fill="var(--muted)" font-weight="bold">+</text>
          
          <!-- Addition Circle 2 (Post-MoE) -->
          <circle cx="350" cy="190" r="14" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
          <text x="350" y="192" text-anchor="middle" dominant-baseline="middle" font-size="16" fill="var(--muted)" font-weight="bold">+</text>

          <!-- ================= INTERACTIVE NODES ================= -->

          <!-- Tokenized Text (Bottom Input) -->
          <rect x="270" y="720" width="160" height="30" rx="6" fill="var(--bg)" stroke="var(--border)" stroke-width="1.5" />
          <text x="350" y="735" text-anchor="middle" dominant-baseline="middle" class="small-text">Tokenized text</text>

          <!-- Token Embedding Layer -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inEmbed} on:mouseenter={() => handleNodeHover('embed')} on:mouseleave={clearHover}>
            <rect x="250" y="640" width="200" height="40" rx="8" />
            <text x="350" y="660" text-anchor="middle" dominant-baseline="middle">Token embedding layer</text>
          </g>

          <!-- RMSNorm 1 (Pre-Attention) -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inNorm1} on:mouseenter={() => handleNodeHover('norm1')} on:mouseleave={clearHover}>
            <rect x="290" y="500" width="120" height="30" rx="6" />
            <text x="350" y="515" text-anchor="middle" dominant-baseline="middle">RMSNorm 1</text>
          </g>

          <!-- Decoupled RoPE (Injects into MLA) -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inRope} on:mouseenter={() => handleNodeHover('rope')} on:mouseleave={clearHover}>
            <rect x="160" y="435" width="60" height="25" rx="6" />
            <text x="190" y="447.5" text-anchor="middle" dominant-baseline="middle" font-size="14">RoPE</text>
          </g>

          <!-- Multi-Head Latent Attention (MLA) -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inMla} on:mouseenter={() => handleNodeHover('mla')} on:mouseleave={clearHover} on:click={() => scrollTo('mla-card')}>
            <rect x="250" y="430" width="200" height="35" rx="8" />
            <text x="350" y="447.5" text-anchor="middle" dominant-baseline="middle">Multi-head latent attention</text>
          </g>

          <!-- RMSNorm 2 (Pre-MoE) -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inNorm2} on:mouseenter={() => handleNodeHover('norm2')} on:mouseleave={clearHover}>
            <rect x="290" y="310" width="120" height="30" rx="6" />
            <text x="350" y="325" text-anchor="middle" dominant-baseline="middle">RMSNorm 2</text>
          </g>

          <!-- MoE Layer (or Dense FFN on initial layers) -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inMoe} on:mouseenter={() => handleNodeHover('moe')} on:mouseleave={clearHover}>
            <rect x="240" y="230" width="220" height="40" rx="8" />
            <text x="350" y="250" text-anchor="middle" dominant-baseline="middle">MoE (256 routed + 1 shared)</text>
          </g>

          <!-- Final RMSNorm -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inNorm3} on:mouseenter={() => handleNodeHover('norm3')} on:mouseleave={clearHover}>
            <rect x="290" y="100" width="120" height="30" rx="6" />
            <text x="350" y="115" text-anchor="middle" dominant-baseline="middle">Final RMSNorm</text>
          </g>

          <!-- Linear Output Layer -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inOut} on:mouseenter={() => handleNodeHover('output')} on:mouseleave={clearHover} on:click={() => scrollTo('sampling-card')}>
            <rect x="250" y="20" width="200" height="35" rx="8" />
            <text x="350" y="37.5" text-anchor="middle" dominant-baseline="middle">Linear output layer</text>
          </g>
        </svg>
      </div>

      <!-- RIGHT COLUMN: TELEMETRY HUD -->
      <div class="macro-hud">
        <div class="telemetry-hud" class:active={hoveredNode}>
          <div class="hud-header">
            <span class="hud-title">Layer Info</span>
          </div>

          <div class="hud-content">
            {#if !hoveredNode}
              <div class="hud-empty">
                Hover over any block in the diagram to see its dimensions and operations.
              </div>
            {:else if hoveredNode === 'embed'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">ParallelEmbedding</strong></div>
              <div class="data-group"><span class="lbl">SHAPE (IN → OUT)</span><span class="tensor">[bsz, seq] → [bsz, seq, {c.dim}]</span></div>
              <div class="data-group"><span class="lbl">VOCABULARY</span><span class="val param">{c.vocab} tokens</span></div>
              <div class="data-group"><span class="lbl">NOTE</span><span class="val note">Parallelized across model-parallel ranks. Weights dequantized on-the-fly from FP8 block tiles.</span></div>
              <div class="hud-math">out = tokens @ W_e</div>

            {:else if hoveredNode === 'norm1' || hoveredNode === 'norm2' || hoveredNode === 'norm3'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">RMSNorm</strong></div>
              <div class="data-group"><span class="lbl">SHAPE (IN & OUT)</span><span class="tensor">[bsz, seq, {c.dim}]</span></div>
              <div class="data-group"><span class="lbl">EPSILON</span><span class="val param">1e-6</span></div>
              <div class="data-group"><span class="lbl">NOTE</span><span class="val note">DeepSeek-V3 uses <code>eps = 1e-6</code> for tighter gradient bounds across its 61 layers.</span></div>
              <div class="hud-math">out = x / √E[x²] * weight</div>

            {:else if hoveredNode === 'rope'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">Decoupled Rotary Position Embedding</strong></div>
              <div class="data-group"><span class="lbl">DIMENSION (d_R)</span><span class="tensor">64-d per head</span></div>
              <div class="data-group"><span class="lbl">BASE THETA</span><span class="val param">10,000 (extended via YaRN to {c.ctx})</span></div>
              <div class="data-group"><span class="lbl">NOTE</span><span class="val note">Decoupled from low-rank latent compression so that positional rotation matrices commute properly during inference.</span></div>
              <div class="hud-math">q_pe, k_pe * freqs_cis</div>

            {:else if hoveredNode === 'mla'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">Multi-Head Latent Attention (MLA)</strong></div>
              <div class="data-group"><span class="lbl">Q COMPRESSION</span><span class="tensor">{c.dim} → {c.q_lora_rank} → ({c.qk_nope} + {c.qk_rope}) × {c.n_heads}</span></div>
              <div class="data-group"><span class="lbl">KV COMPRESSION</span><span class="tensor">{c.dim} → 512 Latent + 64 RoPE = 576 floats/token</span></div>
              <div class="data-group"><span class="lbl">CACHE EFFICIENCY</span><span class="val note">Compresses KV cache footprint by <strong>93.3%</strong> via associative Matrix Absorption.</span></div>
              <div class="hud-math">Softmax(q_nope @ kv_cache.T + q_pe @ pe_cache.T) @ V</div>

            {:else if hoveredNode === 'moe'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">DeepSeekMoE (Layers 4–61)</strong></div>
              <div class="data-group"><span class="lbl">ROUTED EXPERTS</span><span class="tensor">{c.n_routed} Experts ({c.n_activated} active per token)</span></div>
              <div class="data-group"><span class="lbl">SHARED EXPERTS</span><span class="tensor">{c.n_shared} Shared Expert (Always active)</span></div>
              <div class="data-group"><span class="lbl">DENSE BASELINE</span><span class="val note">First {c.n_dense} layers use dense SwiGLU ({c.dense_inter_dim}-d) before switching to MoE ({c.moe_inter_dim}-d per expert).</span></div>
              <div class="hud-math">y = Σ (w_i · Expert_i(x)) + SharedExpert(x)</div>

            {:else if hoveredNode === 'output'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">Linear (lm_head)</strong></div>
              <div class="data-group"><span class="lbl">SHAPE (IN → OUT)</span><span class="tensor">[bsz, seq, {c.dim}] → [bsz, seq, {c.vocab}]</span></div>
              <div class="data-group"><span class="lbl">NOTE</span><span class="val note">Projects hidden dimension {c.dim} into logits over the {c.vocab} token vocabulary.</span></div>
              <div class="hud-math">logits = x @ W_head</div>
            {/if}
          </div>
        </div>
      </div>

    </div>
  </BlueprintCard>

  <!-- ==========================================
       CARD 2: MLA INTERACTIVE HERO
       ========================================== -->
  <span id="mla-card" style="display:block; margin-top:-50px; padding-top:50px;"></span>
  <MLAExplorer />

  <!-- ==========================================
       CARD 3: OUTPUT DECODING & SAMPLING
       ========================================== -->
  <span id="sampling-card" style="display:block; margin-top:-50px; padding-top:50px;"></span>
  <SamplingExplorer />

</div>

<style>
  .page-container { padding: 3rem 2rem; max-width: 1400px; margin: 0 auto; min-height: 100vh; }
  .page-header { margin-bottom: 2.5rem; }
  .header-split { display: flex; justify-content: space-between; align-items: flex-end; gap: 2rem; flex-wrap: wrap; }
  .breadcrumb { display: flex; align-items: center; gap: 0.5rem; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; letter-spacing: 0.05em; margin-bottom: 0.85rem; text-transform: uppercase; }
  .crumb-link { color: var(--muted); text-decoration: none; transition: color 0.15s ease; }
  .crumb-link:hover { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
  .crumb-sep { color: var(--muted); opacity: 0.5; user-select: none; }
  .crumb-current { color: var(--text); font-weight: 600; }
  .page-header h1 { font-size: 2.5rem; color: var(--text); font-weight: 700; margin: 0 0 0.5rem 0; letter-spacing: -0.02em; }
  .page-header p { color: var(--muted); max-width: 700px; line-height: 1.6; margin: 0; }

  .config-selector { display: flex; align-items: center; gap: 1rem; background: var(--surface2); padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 8px; }
  .config-selector span { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); text-transform: uppercase; }
  .config-selector select { background: var(--bg); color: var(--text); border: 1px solid var(--border); padding: 0.25rem 0.5rem; border-radius: 4px; font-family: 'Space Grotesk', sans-serif; font-weight: 600; cursor: pointer; outline: none; }

  /* MACRO HUD LAYOUT */
  .macro-layout { display: flex; align-items: flex-start; justify-content: space-between; gap: 3rem; width: 100%; position: relative; padding-bottom: 2rem; }
  @media (max-width: 950px) { .macro-layout { flex-direction: column; } }
  .macro-diagram { flex: 1; display: flex; justify-content: center; }
  .macro-diagram svg { width: 100%; max-width: 500px; height: auto; overflow: visible; }
  
  .macro-hud { position: sticky; top: 80px; align-self: flex-start; width: 380px; flex-shrink: 0; z-index: 50; }
  @media (max-width: 950px) { .macro-hud { width: 100%; position: static; } }
  .telemetry-hud { width: 100%; background: var(--glass-bg); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.15); transition: border-color 0.3s; }
  .telemetry-hud.active { border-color: var(--accent); }
  .hud-header { padding: 0.85rem 1.25rem; background: var(--surface2); border-bottom: 1px solid var(--border); }
  .hud-title { font-family: 'Space Grotesk', sans-serif; font-size: 0.85rem; font-weight: 600; color: var(--text); }
  .hud-content { padding: 1.5rem; min-height: 250px; display: flex; flex-direction: column; gap: 1.2rem; }
  .hud-empty { font-family: 'Space Grotesk', sans-serif; font-size: 0.85rem; color: var(--muted); line-height: 1.5; text-align: center; margin: auto 0; padding: 2rem 1rem; }

  .data-group { display: flex; flex-direction: column; gap: 4px; }
  .data-group .lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; font-weight: 700; color: var(--muted); }
  .data-group .val { font-family: 'Space Grotesk', sans-serif; font-size: 0.95rem; font-weight: 600; color: var(--text); }
  .data-group .val.param { font-family: 'JetBrains Mono', monospace; color: var(--blue); font-size: 0.85rem; }
  .data-group .val.note { font-weight: 400; font-size: 0.85rem; color: var(--text); opacity: 0.85; line-height: 1.4; }
  .data-group .tensor { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--accent); font-weight: 700; }
  .hud-math { margin-top: auto; padding-top: 1rem; border-top: 1px dashed var(--border); font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; font-weight: 600; color: var(--highlight); text-align: center; }

  .interactive-node { cursor: pointer; }
  .interactive-node rect { fill: var(--surface); stroke: var(--border); stroke-width: 2; transition: all 0.2s; }
  .interactive-node text { font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 600; fill: var(--text); pointer-events: none; }
  .interactive-node:hover rect, .interactive-node.hovered rect { stroke: var(--accent); fill: rgba(99, 102, 241, 0.08); }
  .interactive-node:hover text, .interactive-node.hovered text { fill: var(--accent); }
  
  .small-text { font-family: 'JetBrains Mono', monospace; font-size: 14px; fill: var(--muted); pointer-events: none; }
  .bold-text { font-family: 'Space Grotesk', sans-serif; font-weight: 700; fill: var(--text); }
  .sub-bracket-text { font-family: 'JetBrains Mono', monospace; }
  
  .active-wire { stroke: var(--accent) !important; stroke-width: 3 !important; stroke-dasharray: 6,4; animation: march 1s linear infinite; }
  @keyframes march { to { stroke-dashoffset: -20; } }
</style>