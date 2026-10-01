<script lang="ts">
  import { base } from '$app/paths';

  interface ModelSpec {
    id: string;
    name: string;
    org: string;
    year: number;
    topology: 'Dense' | 'Sparse MoE';
    attention: {
      code: 'GQA' | 'MLA' | 'MHA' | 'Hybrid GQA';
      label: string;
      detail: string;
    };
    ffn: {
      code: 'SwiGLU' | 'DeepSeekMoE' | 'Top-2 MoE' | 'GeGLU' | 'Dense GELU';
      label: string;
      detail: string;
    };
    norm: {
      code: 'RMSNorm' | 'LayerNorm' | 'Dual RMSNorm';
      label: string;
      detail: string;
    };
    position: {
      code: 'RoPE' | 'Decoupled RoPE' | 'Absolute' | 'ALiBi';
      label: string;
      theta: string;
      context: string;
    };
    referenceScale: {
      config: string;
      layers: number;
      dim: number;
      heads: number;
      vocab: string;
    };
    hasInteractive: boolean;
    route?: string;
    notes: string;
  }

  const modelMatrix: ModelSpec[] = [
    {
      id: 'llama3',
      name: 'Llama 3',
      org: 'Meta',
      year: 2024,
      topology: 'Dense',
      attention: { code: 'GQA', label: 'GQA (4:1)', detail: '32 Q : 8 KV heads (head_dim=128)' },
      ffn: { code: 'SwiGLU', label: 'SwiGLU', detail: '14,336-d (~1.3x 2/3 ratio, 3 matrices)' },
      norm: { code: 'RMSNorm', label: 'Pre-RMSNorm', detail: 'eps = 1e-5 (No mean centering or bias)' },
      position: { code: 'RoPE', label: 'RoPE', theta: '500,000', context: '128k' },
      referenceScale: { config: '8B Base', layers: 32, dim: 4096, heads: 32, vocab: '128k' },
      hasInteractive: true,
      route: '/architectures/llama3',
      notes: 'A standard dense autoregressive Transformer. Rather than adopting a mixture-of-experts model, Meta prioritized training stability at scale. Architectural changes over Llama 2 are deliberately targeted: 8 KV-head Grouped-Query Attention across all scales, an expanded 128K vocabulary, and raising the RoPE base frequency to 500,000 to natively support up to 128K context windows.'
    },
    {
      id: 'deepseek-v3',
      name: 'DeepSeek-V3',
      org: 'DeepSeek',
      year: 2024,
      topology: 'Sparse MoE',
      attention: { code: 'MLA', label: 'MLA (Latent)', detail: 'Low-rank KV projection into 576-d latent space' },
      ffn: { code: 'DeepSeekMoE', label: 'DeepSeekMoE', detail: '256 routed + 1 shared exp (8 active per token)' },
      norm: { code: 'RMSNorm', label: 'Pre-RMSNorm', detail: 'eps = 1e-6' },
      position: { code: 'Decoupled RoPE', label: 'Decoupled RoPE', theta: '10,000', context: '128k' },
      referenceScale: { config: '671B Total (37B Active)', layers: 61, dim: 7168, heads: 128, vocab: '129k' },
      hasInteractive: false,
      notes: 'Radically compresses KV cache memory overhead by ~93% via Multi-Head Latent Attention. Uses fine-grained expert segmentation.'
    },
    {
      id: 'mixtral-8x7b',
      name: 'Mixtral 8x7B',
      org: 'Mistral AI',
      year: 2023,
      topology: 'Sparse MoE',
      attention: { code: 'GQA', label: 'GQA (4:1)', detail: '32 Q : 8 KV heads (head_dim=128)' },
      ffn: { code: 'Top-2 MoE', label: 'Top-2 MoE', detail: '8 SwiGLU experts per layer (2 routed per token)' },
      norm: { code: 'RMSNorm', label: 'Pre-RMSNorm', detail: 'eps = 1e-5' },
      position: { code: 'RoPE', label: 'RoPE', theta: '1,000,000', context: '32k' },
      referenceScale: { config: '46.7B Total (12.9B Active)', layers: 32, dim: 4096, heads: 32, vocab: '32k' },
      hasInteractive: false,
      notes: 'The landmark sparse architecture proving routing across SwiGLU expert feed-forward blocks maintains dense-level quality with 3x faster inference.'
    },
    {
      id: 'qwen2-5',
      name: 'Qwen 2.5',
      org: 'Alibaba',
      year: 2024,
      topology: 'Dense',
      attention: { code: 'GQA', label: 'GQA (4:1)', detail: '28 Q : 4 KV heads (7B) / 64 Q : 8 KV (72B)' },
      ffn: { code: 'SwiGLU', label: 'SwiGLU', detail: '18,944-d expansion for 7B' },
      norm: { code: 'RMSNorm', label: 'Pre-RMSNorm', detail: 'eps = 1e-6' },
      position: { code: 'RoPE', label: 'RoPE', theta: '1,000,000', context: '128k' },
      referenceScale: { config: '7B Base', layers: 28, dim: 3584, heads: 28, vocab: '152k' },
      hasInteractive: false,
      notes: 'Combines dual-chunk attention with 1M base RoPE. Features an ultra-wide intermediate dimension in its SwiGLU FFN.'
    },
    {
      id: 'gemma2',
      name: 'Gemma 2',
      org: 'Google',
      year: 2024,
      topology: 'Dense',
      attention: { code: 'Hybrid GQA', label: 'Hybrid GQA', detail: 'Alternates 4k local sliding-window & 8k global GQA' },
      ffn: { code: 'GeGLU', label: 'GeGLU', detail: 'Approx 3.5x expansion (GELU-activated gate)' },
      norm: { code: 'Dual RMSNorm', label: 'Dual RMSNorm', detail: 'Pre-norm + Post-norm scaling in every block' },
      position: { code: 'RoPE', label: 'RoPE', theta: '10,000', context: '8k' },
      referenceScale: { config: '9B Base', layers: 42, dim: 3584, heads: 16, vocab: '256k' },
      hasInteractive: false,
      notes: 'Introduces dual pre-and-post RMSNorm scaling around blocks and logit soft-capping to stabilize deep gradients.'
    },
    {
      id: 'gpt2',
      name: 'GPT-2',
      org: 'OpenAI',
      year: 2019,
      topology: 'Dense',
      attention: { code: 'MHA', label: 'MHA (1:1)', detail: 'Full Multi-Head Attention without KV sharing' },
      ffn: { code: 'Dense GELU', label: 'Standard GELU', detail: '2 matrices (4d intermediate = 6400)' },
      norm: { code: 'LayerNorm', label: 'Pre-LayerNorm', detail: 'Standard LayerNorm with mean subtraction & variance' },
      position: { code: 'Absolute', label: 'Learned Abs', theta: 'None', context: '1024' },
      referenceScale: { config: '1.5B XL', layers: 48, dim: 1600, heads: 25, vocab: '50k' },
      hasInteractive: false,
      notes: 'The historical classical baseline. Illustrates why modern LLMs abandoned learned absolute embeddings, LayerNorm, and unshared MHA.'
    }
  ];

  // Filtering & Search
  let searchQuery = '';
  let selectedTopology: 'All' | 'Dense' | 'Sparse MoE' = 'All';
  let selectedAttention: 'All' | 'GQA' | 'MLA' | 'MHA' = 'All';

  // Cross-Highlighting State
  let activeHighlight: {
    category: 'topology' | 'attention' | 'ffn' | 'norm' | 'position';
    code: string;
  } | null = null;

  function setHighlight(category: 'topology' | 'attention' | 'ffn' | 'norm' | 'position', code: string) {
    activeHighlight = { category, code };
  }
  function clearHighlight() {
    activeHighlight = null;
  }

  // Selected Model Drawer
  let selectedModel: ModelSpec | null = null;
  function openModel(model: ModelSpec) {
    selectedModel = model;
  }
  function closeDrawer() {
    selectedModel = null;
  }

  $: filteredMatrix = modelMatrix.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      m.name.toLowerCase().includes(q) ||
      m.org.toLowerCase().includes(q) ||
      m.attention.code.toLowerCase().includes(q) ||
      m.ffn.code.toLowerCase().includes(q) ||
      m.norm.code.toLowerCase().includes(q) ||
      m.position.code.toLowerCase().includes(q);

    const matchesTopology = selectedTopology === 'All' || m.topology === selectedTopology;
    const matchesAttention = selectedAttention === 'All' || m.attention.code.includes(selectedAttention);

    return matchesSearch && matchesTopology && matchesAttention;
  });
</script>

<svelte:head>
  <title>Architecture Matrix — Transformer Encyclopedia</title>
</svelte:head>

<div class="matrix-page">

  <!-- PAGE HEADER -->
  <header class="page-header">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="{base}/" class="crumb-link">Transformer Encyclopedia</a>
      <span class="crumb-sep">›</span>
      <span class="crumb-current">Architectures</span>
    </nav>
    <div class="header-main">
      <div>
        <h1>Model Architectures</h1>
        <p>
          A catalog of modern foundation models. Compare attention mechanisms, normalization, and feed-forward designs across model families.
        </p>
      </div>

      <div class="legend-box">
        <span class="legend-item"><span class="dot-interactive">●</span> Interactive Walkthrough</span>
        <span class="legend-item"><span class="dot-spec">○</span> Technical Spec</span>
      </div>
    </div>
  </header>

  <!-- CONTROLS & FILTER TOOLBAR -->
  <div class="matrix-toolbar">
    <div class="search-field">
      <span class="cli-prompt">&gt;</span>
      <input 
        type="text" 
        placeholder="Filter by model, org, or primitive (e.g. SwiGLU, MLA, RoPE)..." 
        bind:value={searchQuery}
        class="search-input"
      />
      {#if searchQuery}
        <button class="clear-btn" on:click={() => searchQuery = ''}>×</button>
      {/if}
    </div>

    <div class="filter-controls">
      <div class="filter-pill-group">
        <span class="group-label">TOPOLOGY:</span>
        <button class="pill" class:active={selectedTopology === 'All'} on:click={() => selectedTopology = 'All'}>All</button>
        <button class="pill" class:active={selectedTopology === 'Dense'} on:click={() => selectedTopology = 'Dense'}>Dense</button>
        <button class="pill" class:active={selectedTopology === 'Sparse MoE'} on:click={() => selectedTopology = 'Sparse MoE'}>Sparse MoE</button>
      </div>

      <div class="filter-pill-group">
        <span class="group-label">ATTENTION:</span>
        <button class="pill" class:active={selectedAttention === 'All'} on:click={() => selectedAttention = 'All'}>All</button>
        <button class="pill" class:active={selectedAttention === 'GQA'} on:click={() => selectedAttention = 'GQA'}>GQA</button>
        <button class="pill" class:active={selectedAttention === 'MLA'} on:click={() => selectedAttention = 'MLA'}>MLA</button>
        <button class="pill" class:active={selectedAttention === 'MHA'} on:click={() => selectedAttention = 'MHA'}>MHA</button>
      </div>

      {#if activeHighlight}
        <div class="cross-indicator">
          <span>Highlighting:</span>
          <strong>{activeHighlight.code}</strong>
        </div>
      {/if}
    </div>
  </div>

  <!-- THE DENSE DATA MATRIX -->
  <div class="table-container">
    <table class="engineering-table">
      <thead>
        <tr>
          <th style="width: 200px;">MODEL & ORG</th>
          <th style="width: 110px;">TOPOLOGY</th>
          <th style="width: 150px;">ATTENTION</th>
          <th style="width: 150px;">FEED-FORWARD</th>
          <th style="width: 140px;">NORMALIZATION</th>
          <th style="width: 140px;">POS ENCODING</th>
          <th style="width: 150px;">BASE SCALE</th>
          <th style="width: 100px; text-align: center;">STATUS</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredMatrix as row}
          {@const isRowSelected = selectedModel?.id === row.id}
          <tr 
            class="data-row" 
            class:row-selected={isRowSelected}
            on:click={() => openModel(row)}
          >
            <!-- MODEL & ORG -->
            <td class="model-cell">
              <div class="model-title-wrap">
                <strong class="model-name">{row.name}</strong>
                <span class="year-lbl">{row.year}</span>
              </div>
              <span class="org-tag">{row.org}</span>
            </td>

            <!-- TOPOLOGY -->
            <td>
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <span 
                class="spec-pill" 
                class:pill-highlight={activeHighlight?.category === 'topology' && activeHighlight?.code === row.topology}
                on:mouseenter={() => setHighlight('topology', row.topology)}
                on:mouseleave={clearHighlight}
              >
                {row.topology}
              </span>
            </td>

            <!-- ATTENTION -->
            <td>
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div 
                class="cell-spec-group"
                class:cell-highlight={activeHighlight?.category === 'attention' && activeHighlight?.code === row.attention.code}
                on:mouseenter={() => setHighlight('attention', row.attention.code)}
                on:mouseleave={clearHighlight}
              >
                <span class="code-tag">{row.attention.label}</span>
                <span class="sub-detail">{row.attention.detail}</span>
              </div>
            </td>

            <!-- FEED-FORWARD -->
            <td>
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div 
                class="cell-spec-group"
                class:cell-highlight={activeHighlight?.category === 'ffn' && activeHighlight?.code === row.ffn.code}
                on:mouseenter={() => setHighlight('ffn', row.ffn.code)}
                on:mouseleave={clearHighlight}
              >
                <span class="code-tag">{row.ffn.label}</span>
                <span class="sub-detail">{row.ffn.detail}</span>
              </div>
            </td>

            <!-- NORMALIZATION -->
            <td>
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div 
                class="cell-spec-group"
                class:cell-highlight={activeHighlight?.category === 'norm' && activeHighlight?.code === row.norm.code}
                on:mouseenter={() => setHighlight('norm', row.norm.code)}
                on:mouseleave={clearHighlight}
              >
                <span class="code-tag">{row.norm.label}</span>
                <span class="sub-detail">{row.norm.detail}</span>
              </div>
            </td>

            <!-- POSITIONAL ENCODING -->
            <td>
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div 
                class="cell-spec-group"
                class:cell-highlight={activeHighlight?.category === 'position' && activeHighlight?.code === row.position.code}
                on:mouseenter={() => setHighlight('position', row.position.code)}
                on:mouseleave={clearHighlight}
              >
                <span class="code-tag">{row.position.label}</span>
                <span class="sub-detail">θ = {row.position.theta} • {row.position.context}</span>
              </div>
            </td>

            <!-- REFERENCE SCALE -->
            <td class="scale-cell">
              <span class="cfg-lbl">{row.referenceScale.config}</span>
              <span class="cfg-shape">{row.referenceScale.layers}L • d={row.referenceScale.dim}</span>
            </td>

            <!-- STATUS / LAUNCH -->
            <td class="action-cell">
              {#if row.hasInteractive}
                <span class="status-badge interactive">● Interactive</span>
              {:else}
                <span class="status-badge spec">○ Spec</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- SLIDE-IN TECHNICAL DRAWER (WHEN A ROW IS CLICKED) -->
  {#if selectedModel}
    <div class="drawer-backdrop" on:click={closeDrawer}></div>
    <aside class="tech-drawer">
      <div class="drawer-header">
        <div>
          <span class="drawer-pre">{selectedModel.org} • {selectedModel.year}</span>
          <h2>{selectedModel.name}</h2>
        </div>
        <button class="close-btn" on:click={closeDrawer}>×</button>
      </div>

      <div class="drawer-body">
        <div class="drawer-section">
          <h3>Architecture Overview</h3>
          <p class="role-desc">{selectedModel.notes}</p>
        </div>

        <div class="drawer-section">
          <h3>Key Hyperparameters ({selectedModel.referenceScale.config})</h3>
          <div class="stats-matrix">
            <div class="stat-box"><span class="k">LAYERS</span><strong class="v">{selectedModel.referenceScale.layers}</strong></div>
            <div class="stat-box"><span class="k">HIDDEN DIM</span><strong class="v">{selectedModel.referenceScale.dim}</strong></div>
            <div class="stat-box"><span class="k">Q HEADS</span><strong class="v">{selectedModel.referenceScale.heads}</strong></div>
            <div class="stat-box"><span class="k">VOCAB SIZE</span><strong class="v">{selectedModel.referenceScale.vocab}</strong></div>
          </div>
        </div>

        <div class="drawer-section">
          <h3>Primitive Breakdown</h3>
          <div class="primitive-dossier">
            <div class="prim-row">
              <span class="prim-k">Attention</span>
              <strong class="prim-type">{selectedModel.attention.label}</strong>
              <span class="prim-d">{selectedModel.attention.detail}</span>
            </div>
            <div class="prim-row">
              <span class="prim-k">Feed-Forward</span>
              <strong class="prim-type">{selectedModel.ffn.label}</strong>
              <span class="prim-d">{selectedModel.ffn.detail}</span>
            </div>
            <div class="prim-row">
              <span class="prim-k">Normalization</span>
              <strong class="prim-type">{selectedModel.norm.label}</strong>
              <span class="prim-d">{selectedModel.norm.detail}</span>
            </div>
            <div class="prim-row">
              <span class="prim-k">Position Encoding</span>
              <strong class="prim-type">{selectedModel.position.label}</strong>
              <span class="prim-d">Base Theta = {selectedModel.position.theta} | Context: {selectedModel.position.context}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer-footer">
        {#if selectedModel.hasInteractive && selectedModel.route}
          <a href="{base}{selectedModel.route}" class="drawer-action-btn launch-btn">
            <span>⚡ Launch Full Interactive Engine</span>
            <span>&rarr;</span>
          </a>
        {:else}
          <div class="drawer-action-btn disabled-btn">
            <span>Interactive Walkthrough in Development</span>
            <span class="spec-tag">Spec Complete</span>
          </div>
        {/if}
      </div>
    </aside>
  {/if}

</div>

<style>
  .matrix-page {
    padding: 3rem 2rem 6rem 2rem;
    max-width: 1440px;
    margin: 0 auto;
    min-height: 100vh;
  }

  /* HEADER */
  .page-header { margin-bottom: 2.5rem; }
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    margin-bottom: 0.85rem;
    text-transform: uppercase;
  }
  .crumb-link {
    color: var(--muted);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .crumb-link:hover {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .crumb-sep {
    color: var(--muted);
    opacity: 0.5;
    user-select: none;
  }
  .crumb-current {
    color: var(--text);
    font-weight: 600;
  }
  .header-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 2rem;
    flex-wrap: wrap;
  }
  .header-main h1 {
    font-size: 2.4rem;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.02em;
  }
  .header-main p {
    color: var(--muted);
    font-size: 0.95rem;
    max-width: 750px;
    line-height: 1.6;
    margin: 0;
  }
  .legend-box {
    display: flex;
    gap: 1.25rem;
    background: var(--surface2);
    border: 1px solid var(--border);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
  }
  .legend-item { display: flex; align-items: center; gap: 0.4rem; color: var(--muted); }
  .dot-interactive { color: var(--accent); }
  .dot-spec { color: var(--muted); }

  /* TOOLBAR */
  .matrix-toolbar {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .search-field {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.5rem 0.85rem;
  }
  .cli-prompt {
    font-family: 'JetBrains Mono', monospace;
    color: var(--accent);
    font-weight: 700;
  }
  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.9rem;
  }
  .search-input::placeholder { color: var(--muted); opacity: 0.6; }
  .clear-btn { background: none; border: none; color: var(--muted); font-size: 1.2rem; cursor: pointer; }

  .filter-controls {
    display: flex;
    align-items: center;
    gap: 2rem;
    flex-wrap: wrap;
  }
  .filter-pill-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .group-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    color: var(--muted);
    margin-right: 0.25rem;
  }
  .pill {
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .pill:hover { border-color: var(--text); color: var(--text); }
  .pill.active {
    background: var(--surface2);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 700;
  }
  .cross-indicator {
    margin-left: auto;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    background: rgba(99, 102, 241, 0.1);
    border: 1px solid var(--accent);
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    color: var(--accent);
  }

  /* TABLE */
  .table-container {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow-x: auto;
  }
  .engineering-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8rem;
    text-align: left;
  }
  .engineering-table th {
    background: var(--surface2);
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--border);
    color: var(--muted);
    font-size: 0.7rem;
    letter-spacing: 0.05em;
    font-weight: 700;
  }
  .data-row {
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background 0.15s;
  }
  .data-row:hover {
    background: rgba(99, 102, 241, 0.04);
  }
  .data-row.row-selected {
    background: rgba(99, 102, 241, 0.08);
  }
  .data-row td {
    padding: 1rem;
    vertical-align: middle;
  }

  /* CELL TYPES */
  .model-cell { display: flex; flex-direction: column; gap: 0.2rem; }
  .model-title-wrap { display: flex; align-items: center; gap: 0.5rem; }
  .model-name { font-family: 'Space Grotesk', sans-serif; font-size: 1rem; color: var(--text); font-weight: 700; }
  .year-lbl { font-size: 0.65rem; color: var(--muted); background: var(--bg); border: 1px solid var(--border); padding: 1px 4px; border-radius: 3px; }
  .org-tag { font-family: 'Space Grotesk', sans-serif; font-size: 0.75rem; color: var(--muted); }

  .spec-pill {
    display: inline-block;
    background: var(--bg);
    border: 1px solid var(--border);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    color: var(--text);
    transition: all 0.2s;
  }
  .pill-highlight {
    border-color: var(--highlight) !important;
    background: rgba(245, 158, 11, 0.15) !important;
    color: var(--highlight) !important;
  }

  .cell-spec-group {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.2s;
  }
  .cell-highlight {
    background: rgba(99, 102, 241, 0.12);
    border-radius: 4px;
  }
  .cell-highlight .code-tag {
    color: var(--accent) !important;
    font-weight: 700;
  }
  .code-tag { color: var(--text); font-weight: 600; font-size: 0.8rem; }
  .sub-detail { font-size: 0.7rem; color: var(--muted); line-height: 1.3; }

  .scale-cell { display: flex; flex-direction: column; gap: 0.2rem; }
  .cfg-lbl { font-weight: 700; color: var(--text); font-size: 0.75rem; }
  .cfg-shape { font-size: 0.7rem; color: var(--muted); }

  .action-cell { text-align: center; }
  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    white-space: nowrap;
  }
  .status-badge.interactive { background: rgba(99, 102, 241, 0.1); color: var(--accent); border: 1px solid rgba(99, 102, 241, 0.2); }
  .status-badge.spec { background: var(--bg); color: var(--muted); border: 1px solid var(--border); }

  /* TECH DRAWER */
  .drawer-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100;
    backdrop-filter: blur(2px);
  }
  .tech-drawer {
    position: fixed; top: 0; right: 0; bottom: 0; width: 500px; max-width: 90vw;
    background: var(--surface); border-left: 1px solid var(--border);
    z-index: 101; display: flex; flex-direction: column;
    box-shadow: -10px 0 40px rgba(0,0,0,0.3);
    animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

  .drawer-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 2rem; border-bottom: 1px solid var(--border); background: var(--surface2);
  }
  .drawer-pre { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); }
  .drawer-header h2 { font-size: 1.8rem; font-weight: 700; margin: 0.25rem 0 0 0; color: var(--text); }
  .close-btn { background: none; border: none; font-size: 1.8rem; color: var(--muted); cursor: pointer; line-height: 1; }
  .close-btn:hover { color: var(--text); }

  .drawer-body { flex: 1; overflow-y: auto; padding: 2rem; display: flex; flex-direction: column; gap: 2rem; }
  .drawer-section h3 { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); letter-spacing: 0.08em; margin: 0 0 0.75rem 0; }
  .role-desc { font-size: 0.95rem; line-height: 1.6; color: var(--text); margin: 0; opacity: 0.9; }

  .stats-matrix { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .stat-box { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
  .stat-box .k { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); }
  .stat-box .v { font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; color: var(--text); }

  .primitive-dossier { display: flex; flex-direction: column; gap: 0.75rem; }
  .prim-row { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.2rem; }
  .prim-k { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; }
  .prim-type { font-family: 'Space Grotesk', sans-serif; font-size: 1rem; color: var(--accent); }
  .prim-d { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--text); opacity: 0.85; }

  .drawer-footer { padding: 1.5rem 2rem; border-top: 1px solid var(--border); background: var(--surface2); }
  .drawer-action-btn {
    width: 100%; display: flex; justify-content: space-between; align-items: center;
    padding: 1rem 1.5rem; border-radius: 8px; font-family: 'Space Grotesk', sans-serif;
    font-weight: 700; font-size: 0.95rem; text-decoration: none;
  }
  .launch-btn { background: var(--accent); color: white; border: none; cursor: pointer; transition: opacity 0.2s; }
  .launch-btn:hover { opacity: 0.9; }
  .disabled-btn { background: var(--bg); border: 1px solid var(--border); color: var(--muted); cursor: default; }
  .spec-tag { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); }
</style>