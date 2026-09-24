<script lang="ts">
  import { base } from '$app/paths';

  interface ArchitectureSpec {
    id: string;
    name: string;
    org: string;
    year: number;
    topology: 'Dense' | 'MoE';
    summary: string;
    pillars: {
      attention: { type: string; detail: string };
      ffn: { type: string; detail: string };
      norm: { type: string; detail: string };
      position: { type: string; detail: string };
    };
    referenceShape: {
      label: string;
      layers: number;
      dim: number;
      heads: number;
      vocab: string;
    };
    status: 'interactive' | 'spec_sheet';
    route?: string;
  }

  const architectures: ArchitectureSpec[] = [
    {
      id: 'llama3',
      name: 'Llama 3',
      org: 'Meta',
      year: 2024,
      topology: 'Dense',
      summary: 'The modern open-weights reference recipe: Pre-RMSNorm, ubiquitous GQA, and SwiGLU with untied 128k embeddings.',
      pillars: {
        attention: { type: 'GQA', detail: '4:1 Head Share (32 Q : 8 KV)' },
        ffn: { type: 'SwiGLU', detail: '14,336-d (~1.3x 2/3 ratio, 3 matrices)' },
        norm: { type: 'RMSNorm', detail: 'Pre-norm (eps = 1e-5, no bias)' },
        position: { type: 'RoPE', detail: 'theta = 500,000 (128k native ctx)' }
      },
      referenceShape: {
        label: '8B Base',
        layers: 32,
        dim: 4096,
        heads: 32,
        vocab: '128k'
      },
      status: 'interactive',
      route: '/architectures/llama3'
    },
    {
      id: 'deepseek-v3',
      name: 'DeepSeek-V3',
      org: 'DeepSeek',
      year: 2024,
      topology: 'MoE',
      summary: 'Extreme throughput architecture combining Multi-Head Latent Attention (MLA) for minimal KV cache with fine-grained 256-expert routing.',
      pillars: {
        attention: { type: 'MLA', detail: 'Low-rank compressed KV (576-d latent)' },
        ffn: { type: 'DeepSeekMoE', detail: '256 routed + 1 shared (8 active per token)' },
        norm: { type: 'RMSNorm', detail: 'Pre-norm (eps = 1e-6)' },
        position: { type: 'Decoupled RoPE', detail: 'NoPE (512-d) + RoPE (64-d)' }
      },
      referenceShape: {
        label: '671B (37B active)',
        layers: 61,
        dim: 7168,
        heads: 128,
        vocab: '129k'
      },
      status: 'spec_sheet'
    },
    {
      id: 'mixtral-8x7b',
      name: 'Mixtral 8x7B',
      org: 'Mistral AI',
      year: 2023,
      topology: 'MoE',
      summary: 'Sparse mixture-of-experts model deploying top-2 token routing across 8 SwiGLU expert feed-forward blocks with grouped-query attention.',
      pillars: {
        attention: { type: 'GQA', detail: '4:1 Head Share (32 Q : 8 KV)' },
        ffn: { type: 'Top-2 MoE', detail: '8 experts per layer (2 active per token)' },
        norm: { type: 'RMSNorm', detail: 'Pre-norm (eps = 1e-5)' },
        position: { type: 'RoPE', detail: 'theta = 1,000,000 (32k native ctx)' }
      },
      referenceShape: {
        label: '46.7B (12.9B active)',
        layers: 32,
        dim: 4096,
        heads: 32,
        vocab: '32k'
      },
      status: 'spec_sheet'
    },
    {
      id: 'gemma2',
      name: 'Gemma 2',
      org: 'Google',
      year: 2024,
      topology: 'Dense',
      summary: 'Dense transformer alternating local sliding-window and global attention with logit soft-capping and dual pre/post normalization.',
      pillars: {
        attention: { type: 'Hybrid GQA', detail: 'Alternates 4k sliding window & global' },
        ffn: { type: 'GeGLU', detail: 'Approx. 3.5x expansion (GELU gated)' },
        norm: { type: 'RMSNorm', detail: 'Pre-norm + Post-norm dual scaling' },
        position: { type: 'RoPE', detail: 'theta = 10,000 (8k native ctx)' }
      },
      referenceShape: {
        label: '9B Base',
        layers: 42,
        dim: 3584,
        heads: 16,
        vocab: '256k'
      },
      status: 'spec_sheet'
    }
  ];

  // Filtering State
  let searchQuery = '';
  let selectedTopology: 'All' | 'Dense' | 'MoE' = 'All';
  let selectedAttention: 'All' | 'GQA' | 'MLA' = 'All';

  $: filteredArchitectures = architectures.filter(arch => {
    // Search matching
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      arch.name.toLowerCase().includes(q) ||
      arch.org.toLowerCase().includes(q) ||
      arch.summary.toLowerCase().includes(q) ||
      arch.pillars.attention.type.toLowerCase().includes(q) ||
      arch.pillars.ffn.type.toLowerCase().includes(q) ||
      arch.pillars.position.type.toLowerCase().includes(q);

    // Topology filter
    const matchesTopology = selectedTopology === 'All' || arch.topology === selectedTopology;

    // Attention filter
    const matchesAttention = selectedAttention === 'All' || arch.pillars.attention.type.includes(selectedAttention);

    return matchesSearch && matchesTopology && matchesAttention;
  });
</script>

<svelte:head>
  <title>Architectures Catalog — Transformer Encyclopedia</title>
</svelte:head>

<div class="page-container">
  
  <!-- PAGE HEADER -->
  <header class="page-header">
    <div class="breadcrumb">INDEX › ARCHITECTURES</div>
    <div class="header-content">
      <h1>Model Architectures</h1>
      <p>
        Standardized technical blueprints, parameter topologies, and tensor specifications across modern foundation model families.
      </p>
    </div>
  </header>

  <!-- FILTER & SEARCH BAR -->
  <section class="toolbar-section">
    <div class="search-box">
      <span class="search-prompt">&gt;</span>
      <input 
        type="text" 
        placeholder="Search architectures, mechanisms (SwiGLU, MLA, RoPE), orgs..." 
        bind:value={searchQuery}
        class="search-input"
      />
      {#if searchQuery}
        <button class="clear-btn" on:click={() => searchQuery = ''}>×</button>
      {/if}
    </div>

    <div class="filters-row">
      <div class="filter-group">
        <span class="filter-lbl">Topology:</span>
        <div class="pills-track">
          <button class="filter-pill" class:active={selectedTopology === 'All'} on:click={() => selectedTopology = 'All'}>All</button>
          <button class="filter-pill" class:active={selectedTopology === 'Dense'} on:click={() => selectedTopology = 'Dense'}>Dense</button>
          <button class="filter-pill" class:active={selectedTopology === 'MoE'} on:click={() => selectedTopology = 'MoE'}>MoE</button>
        </div>
      </div>

      <div class="filter-group">
        <span class="filter-lbl">Attention:</span>
        <div class="pills-track">
          <button class="filter-pill" class:active={selectedAttention === 'All'} on:click={() => selectedAttention = 'All'}>All</button>
          <button class="filter-pill" class:active={selectedAttention === 'GQA'} on:click={() => selectedAttention = 'GQA'}>GQA</button>
          <button class="filter-pill" class:active={selectedAttention === 'MLA'} on:click={() => selectedAttention = 'MLA'}>MLA</button>
        </div>
      </div>

      <div class="results-count">
        Showing <strong>{filteredArchitectures.length}</strong> of {architectures.length}
      </div>
    </div>
  </section>

  <!-- ARCHITECTURE SPEC-SHEET GRID -->
  <main class="grid-section">
    {#if filteredArchitectures.length === 0}
      <div class="empty-state">
        <p>No architectures match your filter criteria.</p>
        <button class="reset-link" on:click={() => { searchQuery = ''; selectedTopology = 'All'; selectedAttention = 'All'; }}>
          Reset filters
        </button>
      </div>
    {:else}
      <div class="cards-grid">
        {#each filteredArchitectures as arch}
          <article class="spec-card">
            
            <!-- CARD HEADER -->
            <div class="card-header">
              <div class="header-left">
                <div class="title-row">
                  <h2>{arch.name}</h2>
                  <span class="year-tag">{arch.year}</span>
                </div>
                <span class="org-sub">{arch.org}</span>
              </div>
              
              <div class="header-right">
                <span class="topology-badge" class:moe-badge={arch.topology === 'MoE'}>
                  {arch.topology}
                </span>
              </div>
            </div>

            <!-- SUMMARY NOTE -->
            <p class="summary-text">{arch.summary}</p>

            <!-- THE 4 STRUCTURAL PILLARS -->
            <div class="pillars-container">
              <div class="pillars-title">STRUCTURAL SPECIFICATION</div>
              
              <div class="pillar-row">
                <span class="pillar-key">ATTN</span>
                <span class="pillar-type">{arch.pillars.attention.type}</span>
                <span class="pillar-val">{arch.pillars.attention.detail}</span>
              </div>

              <div class="pillar-row">
                <span class="pillar-key">FFN</span>
                <span class="pillar-type">{arch.pillars.ffn.type}</span>
                <span class="pillar-val">{arch.pillars.ffn.detail}</span>
              </div>

              <div class="pillar-row">
                <span class="pillar-key">NORM</span>
                <span class="pillar-type">{arch.pillars.norm.type}</span>
                <span class="pillar-val">{arch.pillars.norm.detail}</span>
              </div>

              <div class="pillar-row">
                <span class="pillar-key">POS</span>
                <span class="pillar-type">{arch.pillars.position.type}</span>
                <span class="pillar-val">{arch.pillars.position.detail}</span>
              </div>
            </div>

            <!-- REFERENCE TENSOR FOOTPRINT -->
            <div class="shape-strip">
              <span class="shape-label">{arch.referenceShape.label}:</span>
              <span class="shape-stat">{arch.referenceShape.layers}L</span>
              <span class="dot">•</span>
              <span class="shape-stat">d={arch.referenceShape.dim}</span>
              <span class="dot">•</span>
              <span class="shape-stat">{arch.referenceShape.heads}H</span>
              <span class="dot">•</span>
              <span class="shape-stat">{arch.referenceShape.vocab} vocab</span>
            </div>

            <!-- ACTION FOOTER -->
            <div class="card-footer">
              {#if arch.status === 'interactive' && arch.route}
                <a href="{base}{arch.route}" class="action-btn interactive-btn">
                  <span>Explore Interactive Engine</span>
                  <span class="arrow">&rarr;</span>
                </a>
              {:else}
                <div class="action-btn spec-only-btn">
                  <span>Architecture Spec Sheet</span>
                  <span class="status-tag">Coming Soon</span>
                </div>
              {/if}
            </div>

          </article>
        {/each}
      </div>
    {/if}
  </main>

</div>

<style>
  .page-container {
    padding: 3rem 2rem 6rem 2rem;
    max-width: 1400px;
    margin: 0 auto;
    min-height: 100vh;
  }

  /* HEADER */
  .page-header { margin-bottom: 2.5rem; }
  .breadcrumb {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: var(--muted);
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
    text-transform: uppercase;
  }
  .page-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.02em;
  }
  .page-header p {
    color: var(--muted);
    font-size: 1.05rem;
    max-width: 700px;
    line-height: 1.6;
    margin: 0;
  }

  /* TOOLBAR & FILTERS */
  .toolbar-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .search-box {
    display: flex;
    align-items: center;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.6rem 1rem;
    gap: 0.75rem;
  }
  .search-prompt {
    font-family: 'JetBrains Mono', monospace;
    color: var(--accent);
    font-weight: 700;
  }
  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.95rem;
    outline: none;
  }
  .search-input::placeholder { color: var(--muted); opacity: 0.7; }
  .clear-btn {
    background: transparent;
    border: none;
    color: var(--muted);
    font-size: 1.2rem;
    cursor: pointer;
  }

  .filters-row {
    display: flex;
    align-items: center;
    gap: 2rem;
    flex-wrap: wrap;
  }
  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .filter-lbl {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: var(--muted);
    text-transform: uppercase;
  }
  .pills-track {
    display: flex;
    gap: 4px;
    background: var(--bg);
    border: 1px solid var(--border);
    padding: 3px;
    border-radius: 6px;
  }
  .filter-pill {
    background: transparent;
    border: none;
    padding: 0.3rem 0.75rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: var(--muted);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .filter-pill:hover { color: var(--text); }
  .filter-pill.active {
    background: var(--surface2);
    color: var(--accent);
    font-weight: 700;
  }
  .results-count {
    margin-left: auto;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8rem;
    color: var(--muted);
  }
  .results-count strong { color: var(--text); }

  /* CARDS GRID */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
    gap: 2rem;
  }
  @media (max-width: 500px) {
    .cards-grid { grid-template-columns: 1fr; }
  }

  .spec-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .spec-card:hover {
    border-color: var(--accent);
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  }

  /* CARD HEADER */
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .title-row h2 {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text);
    margin: 0;
  }
  .year-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    color: var(--muted);
    background: var(--bg);
    border: 1px solid var(--border);
    padding: 1px 6px;
    border-radius: 4px;
  }
  .org-sub {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.85rem;
    color: var(--muted);
  }

  .topology-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    background: rgba(99, 102, 241, 0.1);
    color: var(--accent);
    border: 1px solid rgba(99, 102, 241, 0.2);
  }
  .topology-badge.moe-badge {
    background: rgba(245, 158, 11, 0.1);
    color: var(--highlight);
    border-color: rgba(245, 158, 11, 0.2);
  }

  .summary-text {
    font-size: 0.88rem;
    color: var(--text);
    opacity: 0.85;
    line-height: 1.5;
    margin: 0;
  }

  /* 4 PILLARS */
  .pillars-container {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .pillars-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.65rem;
    color: var(--muted);
    letter-spacing: 0.08em;
    margin-bottom: 0.25rem;
  }
  .pillar-row {
    display: grid;
    grid-template-columns: 48px 105px 1fr;
    gap: 0.75rem;
    align-items: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
  }
  .pillar-key { color: var(--muted); font-weight: 600; }
  .pillar-type { color: var(--text); font-weight: 700; }
  .pillar-val { color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* SHAPE STRIP */
  .shape-strip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: var(--muted);
    background: var(--bg);
    border: 1px solid var(--border);
    padding: 0.5rem 0.85rem;
    border-radius: 6px;
    flex-wrap: wrap;
  }
  .shape-label { color: var(--text); font-weight: 700; }
  .dot { color: var(--border); }

  /* FOOTER */
  .card-footer { margin-top: auto; }
  .action-btn {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 1.25rem;
    border-radius: 8px;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 0.9rem;
    text-decoration: none;
    transition: all 0.2s;
  }
  .interactive-btn {
    background: rgba(99, 102, 241, 0.1);
    color: var(--accent);
    border: 1px solid var(--accent);
    cursor: pointer;
  }
  .interactive-btn:hover {
    background: var(--accent);
    color: white;
  }
  .interactive-btn .arrow {
    transition: transform 0.2s;
  }
  .interactive-btn:hover .arrow {
    transform: translateX(4px);
  }
  .spec-only-btn {
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--muted);
    cursor: default;
  }
  .status-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.65rem;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--surface);
    border: 1px solid var(--border);
  }

  /* EMPTY STATE */
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: var(--surface);
    border: 1px dashed var(--border);
    border-radius: 12px;
  }
  .empty-state p { color: var(--muted); margin: 0 0 1rem 0; font-size: 1rem; }
  .reset-link {
    background: none;
    border: none;
    color: var(--accent);
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    cursor: pointer;
  }
</style>