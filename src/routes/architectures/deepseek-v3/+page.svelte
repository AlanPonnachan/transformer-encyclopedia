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
      n_dense: 1,
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
  $: inMla = hoveredNode === 'mla';
  $: inDenseFFN = hoveredNode === 'dense_ffn';
  $: inMoe = hoveredNode === 'moe';
  $: inNorm = hoveredNode === 'norm';
  $: inHead = hoveredNode === 'head';
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
          The architecture combining <strong>Multi-Head Latent Attention (MLA)</strong> with <strong>DeepSeekMoE</strong> fine-grained expert segmentation and <strong>FP8 Block-Level Quantization</strong>.
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
  <BlueprintCard id="v3-macro" title="DeepSeek-V3 System Overview" subtitle="Trace tensors through the hybrid architecture. Layer 0 uses a dense MLP, while Layers 1–60 route tokens through 256 fine-grained experts.">
    <div class="macro-layout">
      
      <!-- SVG DATAFLOW DIAGRAM -->
      <div class="macro-diagram">
        <svg viewBox="0 0 700 860" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 2 L 8 5 L 0 8 z" fill="var(--muted)" /></marker>
          </defs>

          <!-- LAYER 0 DENSE BRACKET -->
          <rect x="140" y="600" width="420" height="80" rx="10" fill="var(--surface2)" stroke="var(--border)" stroke-width="1.5" />
          <text x="70" y="640" font-family="Space Grotesk" font-weight="700" fill="var(--text)" font-size="16">Layer 0 (Dense)</text>

          <!-- LAYERS 1-60 MOE BRACKET -->
          <path d="M 125 560 C 80 560, 80 340, 50 340 C 80 340, 80 120, 125 120" fill="none" stroke="var(--border)" stroke-width="2" />
          <text x="40" y="340" text-anchor="end" dominant-baseline="middle" class="bold-text" fill="var(--text)" font-size="22">60 × MoE</text>

          <rect x="140" y="120" width="420" height="440" rx="16" fill="var(--surface2)" stroke="var(--border)" stroke-width="1.5" />

          <!-- BASE WIRES -->
          <g class="wires" stroke="var(--muted)" stroke-width="2">
            <line x1="350" y1="840" x2="350" y2="780" marker-end="url(#arrow)" />
            <line x1="350" y1="740" x2="350" y2="690" marker-end="url(#arrow)" class:active-wire={inEmbed} />
            <line x1="350" y1="600" x2="350" y2="570" marker-end="url(#arrow)" class:active-wire={inDenseFFN} />
            <line x1="350" y1="530" x2="350" y2="475" marker-end="url(#arrow)" class:active-wire={inMla} />
            <line x1="350" y1="435" x2="350" y2="385" marker-end="url(#arrow)" class:active-wire={inMla} />
            <line x1="350" y1="345" x2="350" y2="280" marker-end="url(#arrow)" class:active-wire={inMoe} />
            <line x1="350" y1="240" x2="350" y2="170" marker-end="url(#arrow)" class:active-wire={inMoe} />
            <line x1="350" y1="120" x2="350" y2="70" marker-end="url(#arrow)" class:active-wire={inNorm} />
            <line x1="350" y1="30" x2="350" y2="0" marker-end="url(#arrow)" class:active-wire={inHead} />
          </g>

          <!-- NODES -->
          <!-- Input -->
          <rect x="270" y="790" width="160" height="30" rx="6" fill="var(--bg)" stroke="var(--border)" stroke-width="1.5" />
          <text x="350" y="805" text-anchor="middle" dominant-baseline="middle" class="small-text">Input Tokens</text>

          <!-- Embedding -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inEmbed} on:mouseenter={() => handleNodeHover('embed')} on:mouseleave={clearHover}>
            <rect x="240" y="740" width="220" height="38" rx="8" />
            <text x="350" y="759" text-anchor="middle" dominant-baseline="middle">ParallelEmbedding</text>
          </g>

          <!-- Layer 0 Dense FFN -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inDenseFFN} on:mouseenter={() => handleNodeHover('dense_ffn')} on:mouseleave={clearHover}>
            <rect x="230" y="620" width="240" height="40" rx="8" />
            <text x="350" y="640" text-anchor="middle" dominant-baseline="middle">Dense SwiGLU (Layer 0)</text>
          </g>

          <!-- MLA Block (Layers 1-60) -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inMla} on:mouseenter={() => handleNodeHover('mla')} on:mouseleave={clearHover} on:click={() => scrollTo('mla-card')}>
            <rect x="210" y="440" width="280" height="45" rx="8" />
            <text x="350" y="462.5" text-anchor="middle" dominant-baseline="middle">MLA (Latent Attention + RoPE)</text>
          </g>

          <!-- MoE Block (Layers 1-60) -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inMoe} on:mouseenter={() => handleNodeHover('moe')} on:mouseleave={clearHover}>
            <rect x="200" y="240" width="300" height="48" rx="8" />
            <text x="350" y="264" text-anchor="middle" dominant-baseline="middle">DeepSeekMoE (256 Routed + 1 Shared)</text>
          </g>

          <!-- RMSNorm Final -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <g class="interactive-node" class:hovered={inNorm} on:mouseenter={() => handleNodeHover('norm')} on:mouseleave={clearHover}>
            <rect x="270" y="40" width="160" height="32" rx="6" />
            <text x="350" y="56" text-anchor="middle" dominant-baseline="middle">RMSNorm (eps = 1e-6)</text>
          </g>
        </svg>
      </div>

      <!-- RIGHT COLUMN: TELEMETRY HUD -->
      <div class="macro-hud">
        <div class="telemetry-hud" class:active={hoveredNode}>
          <div class="hud-header">
            <span class="hud-title">DeepSeek-V3 Layer Dossier</span>
          </div>

          <div class="hud-content">
            {#if !hoveredNode}
              <div class="hud-empty">
                Hover over any block to inspect its PyTorch shapes, parameter counts, and mathematical operations.
              </div>
            {:else if hoveredNode === 'embed'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">ParallelEmbedding</strong></div>
              <div class="data-group"><span class="lbl">DIMENSIONS</span><span class="tensor">Vocab {c.vocab} ➔ Hidden {c.dim}</span></div>
              <div class="data-group"><span class="lbl">PRECISION</span><span class="val note">FP8 Weights with Block-Level Dequantization (tile = 128)</span></div>
            {:else if hoveredNode === 'dense_ffn'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">MLP (Dense SwiGLU)</strong></div>
              <div class="data-group"><span class="lbl">APPLIES TO</span><span class="tensor">Layer 0 Only (n_dense_layers = 1)</span></div>
              <div class="data-group"><span class="lbl">EXPANSION</span><span class="val note">{c.dim} ➔ 10,944 ➔ {c.dim}</span></div>
              <div class="data-group"><span class="lbl">NOTE</span><span class="val note">DeepSeek stabilizes low-level token representations by using an initial unrouted dense layer.</span></div>
            {:else if hoveredNode === 'mla'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">MLA (Multi-Head Latent Attention)</strong></div>
              <div class="data-group"><span class="lbl">COMPRESSION</span><span class="tensor">KV: {c.dim} ➔ 512 Latent + 64 RoPE</span></div>
              <div class="data-group"><span class="lbl">HEADS</span><span class="val note">{c.n_heads} Heads (head_dim = 128 NoPE + 64 RoPE)</span></div>
              <div class="data-group"><span class="lbl">CACHE PER TOKEN</span><span class="tensor highlight">576 floats (1.125 KB) across ALL heads</span></div>
              <div class="hud-math">q_nope @ kv_cache.T + q_pe @ pe_cache.T</div>
            {:else if hoveredNode === 'moe'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">DeepSeekMoE (Layers 1 to 60)</strong></div>
              <div class="data-group"><span class="lbl">ROUTED EXPERTS</span><span class="tensor">{c.n_routed} Experts ({c.n_activated} active per token)</span></div>
              <div class="data-group"><span class="lbl">SHARED EXPERTS</span><span class="tensor">{c.n_shared} Shared Expert (Always active)</span></div>
              <div class="data-group"><span class="lbl">ROUTER SCORING</span><span class="val note">Sigmoid Gate + Bias Balancing (Auxiliary-Loss-Free)</span></div>
              <div class="hud-math">y = Σ (w_i · Expert_i(x)) + SharedExpert(x)</div>
            {:else if hoveredNode === 'norm'}
              <div class="data-group"><span class="lbl">MODULE</span><strong class="val">RMSNorm</strong></div>
              <div class="data-group"><span class="lbl">EPSILON</span><span class="tensor">1e-6 (Tighter than Llama 3's 1e-5)</span></div>
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
  .macro-diagram svg { width: 100%; max-width: 520px; height: auto; overflow: visible; }
  
  .macro-hud { position: sticky; top: 80px; align-self: flex-start; width: 380px; flex-shrink: 0; z-index: 50; }
  @media (max-width: 950px) { .macro-hud { width: 100%; position: static; } }
  .telemetry-hud { width: 100%; background: var(--glass-bg); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.15); transition: border-color 0.3s; }
  .telemetry-hud.active { border-color: var(--accent); }
  .hud-header { padding: 0.85rem 1.25rem; background: var(--surface2); border-bottom: 1px solid var(--border); }
  .hud-title { font-family: 'Space Grotesk', sans-serif; font-size: 0.85rem; font-weight: 700; color: var(--text); }
  .hud-content { padding: 1.5rem; min-height: 250px; display: flex; flex-direction: column; gap: 1.2rem; }
  .hud-empty { font-family: 'Space Grotesk', sans-serif; font-size: 0.85rem; color: var(--muted); line-height: 1.5; text-align: center; margin: auto 0; padding: 2rem 1rem; }

  .data-group { display: flex; flex-direction: column; gap: 4px; }
  .data-group .lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; font-weight: 700; color: var(--muted); }
  .data-group .val { font-family: 'Space Grotesk', sans-serif; font-size: 0.95rem; font-weight: 600; color: var(--text); }
  .data-group .val.note { font-weight: 400; font-size: 0.85rem; color: var(--text); opacity: 0.85; line-height: 1.4; }
  .data-group .tensor { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--accent); font-weight: 700; }
  .data-group .tensor.highlight { color: var(--green); }
  .hud-math { margin-top: auto; padding-top: 1rem; border-top: 1px dashed var(--border); font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; font-weight: 600; color: var(--highlight); text-align: center; }

  .interactive-node { cursor: pointer; }
  .interactive-node rect { fill: var(--surface); stroke: var(--border); stroke-width: 2; transition: all 0.2s; }
  .interactive-node text { font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 600; fill: var(--text); pointer-events: none; }
  .interactive-node:hover rect, .interactive-node.hovered rect { stroke: var(--accent); fill: rgba(99, 102, 241, 0.08); }
  .interactive-node:hover text, .interactive-node.hovered text { fill: var(--accent); }
  .small-text { font-family: 'JetBrains Mono', monospace; font-size: 13px; fill: var(--muted); pointer-events: none; }
  .bold-text { font-family: 'Space Grotesk', sans-serif; font-weight: 700; fill: var(--text); }
  .active-wire { stroke: var(--accent) !important; stroke-width: 3 !important; stroke-dasharray: 6,4; animation: march 1s linear infinite; }
  @keyframes march { to { stroke-dashoffset: -20; } }
</style>