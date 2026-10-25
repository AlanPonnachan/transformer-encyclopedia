<script lang="ts">
  import InteractiveCard from '$lib/components/common/InteractiveCard.svelte';

  let activeTab = 1;

  // ==========================================
  // TAB 1: PARADIGM COMPARISON & VRAM STATS
  // ==========================================
  type AttnMode = 'MHA' | 'GQA' | 'MQA' | 'MLA';
  let selectedMode: AttnMode = 'MLA';

  let seqLenTokens = 32768; // 32k context default
  const nLayers = 61;
  const nHeads = 128;
  const dHead = 128;
  const dRope = 64;

  // Bytes per token per layer calculation (FP16/BF16 = 2 bytes)
  function getBytesPerToken(mode: AttnMode): number {
    switch (mode) {
      case 'MHA': return nHeads * (dHead + dRope + dHead) * 2; // 128 * 320 * 2 = 81,920 B
      case 'GQA': return (nHeads / 8) * (dHead + dRope + dHead) * 2; // 16 * 320 * 2 = 10,240 B
      case 'MQA': return 1 * (dHead + dRope + dHead) * 2; // 1 * 320 * 2 = 640 B
      case 'MLA': return (512 + 64) * 2; // (d_KV + d_R) * 2 = 1,152 B
    }
  }

  $: bytesPerToken = getBytesPerToken(selectedMode);
  $: totalCacheGB = Number(((bytesPerToken * nLayers * seqLenTokens) / (1024 ** 3)).toFixed(2));
  $: mhaCacheGB = Number(((getBytesPerToken('MHA') * nLayers * seqLenTokens) / (1024 ** 3)).toFixed(2));
  $: reductionPct = Number(((1 - (totalCacheGB / mhaCacheGB)) * 100).toFixed(1));

  // ==========================================
  // TAB 3: MATRIX ABSORPTION PROOF SANDBOX
  // ==========================================
  let showAbsorbed = true;
</script>

<InteractiveCard 
  title="Multi-Head Latent Attention (MLA)" 
  subtitle="DeepSeek-V3's attention mechanism compresses the Key-Value cache into a 576-dimensional latent vector, achieving a 93.3% memory reduction through Matrix Absorption during generation."
>
  <div class="mla-explorer">
    
    <!-- TABS NAVIGATION -->
    <div class="tabs-header">
      <button class="tab-btn" class:active={activeTab === 1} on:click={() => activeTab = 1}>01 - Paradigm Shift</button>
      <button class="tab-btn" class:active={activeTab === 2} on:click={() => activeTab = 2}>02 - Projection Architecture</button>
      <button class="tab-btn" class:active={activeTab === 3} on:click={() => activeTab = 3}>03 - Matrix Absorption Proof</button>
      <button class="tab-btn" class:active={activeTab === 4} on:click={() => activeTab = 4}>04 - Why Decouple RoPE?</button>
    </div>

    <div class="tab-content">
      
      <!-- ==========================================
           TAB 1: PARADIGM COMPARISON
           ========================================== -->
      {#if activeTab === 1}
        <div class="stage-wrapper tab1">
          <div class="paradigm-grid">
            
            <div class="paradigm-left">
              <h3>Inference Cache Footprint Comparison</h3>
              <p class="desc">
                In classical architectures, the KV cache grows proportionally with the number of heads. MLA projects Keys and Values into a single compressed latent vector (c<sub>t</sub><sup>KV</sup>), cutting inference VRAM by over 93%.
              </p>

              <div class="selector-pills">
                <button class="pill" class:active={selectedMode === 'MHA'} on:click={() => selectedMode = 'MHA'}>
                  <strong>MHA</strong>
                  <span>128 K/V Heads</span>
                </button>
                <button class="pill" class:active={selectedMode === 'GQA'} on:click={() => selectedMode = 'GQA'}>
                  <strong>GQA</strong>
                  <span>16 K/V Heads</span>
                </button>
                <button class="pill" class:active={selectedMode === 'MQA'} on:click={() => selectedMode = 'MQA'}>
                  <strong>MQA</strong>
                  <span>1 K/V Head</span>
                </button>
                <button class="pill active-mla" class:active={selectedMode === 'MLA'} on:click={() => selectedMode = 'MLA'}>
                  <strong>MLA</strong>
                  <span>Compressed Latent</span>
                </button>
              </div>

              <!-- Interactive Context Slider -->
              <div class="ctrl-group">
                <div class="lbl-row">
                  <span>Context Window Length</span>
                  <strong class="hl-num">{seqLenTokens.toLocaleString()} tokens</strong>
                </div>
                <input type="range" min="4096" max="131072" step="4096" bind:value={seqLenTokens} class="slider-hl" />
              </div>

              <!-- Telemetry Gauge -->
              <div class="telemetry-box">
                <div class="telem-row">
                  <span>Cache Per Token (1 Layer):</span>
                  <strong>{(bytesPerToken / 1024).toFixed(2)} KB</strong>
                </div>
                <div class="telem-row">
                  <span>Total 61-Layer KV Cache:</span>
                  <strong class="large-num" class:red={totalCacheGB > 100} class:green={totalCacheGB <= 20}>
                    {totalCacheGB} GB
                  </strong>
                </div>
                <div class="telem-row">
                  <span>Reduction vs. Full MHA:</span>
                  <strong class="accent">{reductionPct}% savings</strong>
                </div>

                <div class="bar-meter">
                  <div class="bar-fill" style="width: {Math.max(2, (totalCacheGB / mhaCacheGB) * 100)}%"></div>
                </div>
              </div>
            </div>

            <!-- Architectural Graphic -->
            <div class="paradigm-visual">
              <div class="diagram-canvas">
                <div class="vis-header">
                  <span class="vis-title">{selectedMode} Cache Architecture</span>
                  <span class="hatched-legend"><span class="hatch-box"></span> Cached in VRAM</span>
                </div>

                <div class="pillars-container">
                  <!-- VALUES -->
                  <div class="tier">
                    <span class="tier-lbl">Values</span>
                    <div class="heads-row">
                      {#if selectedMode === 'MHA'}
                        {#each Array(8) as _}
                          <div class="head-bar hatched"></div>
                        {/each}
                      {:else if selectedMode === 'GQA'}
                        {#each Array(4) as _}
                          <div class="head-bar hatched wide"></div>
                        {/each}
                      {:else if selectedMode === 'MQA'}
                        <div class="head-bar hatched full-width"></div>
                      {:else}
                        <!-- MLA: Uncached virtual heads, backed by compressed latent -->
                        <div class="mla-virtual-heads">
                          {#each Array(8) as _}
                            <div class="head-bar outline"></div>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>

                  <!-- KEYS -->
                  <div class="tier">
                    <span class="tier-lbl">Keys</span>
                    <div class="heads-row">
                      {#if selectedMode === 'MHA'}
                        {#each Array(8) as _}
                          <div class="head-bar hatched"></div>
                        {/each}
                      {:else if selectedMode === 'GQA'}
                        {#each Array(4) as _}
                          <div class="head-bar hatched wide"></div>
                        {/each}
                      {:else if selectedMode === 'MQA'}
                        <div class="head-bar hatched full-width"></div>
                      {:else}
                        <div class="mla-virtual-heads">
                          {#each Array(8) as _}
                            <div class="head-bar outline"></div>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>

                  <!-- QUERIES -->
                  <div class="tier">
                    <span class="tier-lbl">Queries (128 Heads)</span>
                    <div class="heads-row">
                      {#each Array(8) as _}
                        <div class="head-bar outline"></div>
                      {/each}
                    </div>
                  </div>

                  <!-- MLA LATENT STRIP -->
                  {#if selectedMode === 'MLA'}
                    <div class="mla-latent-strip">
                      <div class="latent-arrow">⤹ Low-Rank Projection</div>
                      <div class="latent-box hatched">
                        <span>Compressed Latent KV (c<sub>t</sub><sup>KV</sup>)</span>
                        <strong>512-d Latent + 64-d RoPE</strong>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            </div>

          </div>
        </div>

      <!-- ==========================================
           TAB 2: PROJECTION ARCHITECTURE
           ========================================== -->
      {:else if activeTab === 2}
        <div class="stage-wrapper tab2">
          <div class="flow-layout">
            <div class="flow-intro">
              <h3>Dual-Stream Projection Pipeline</h3>
              <p class="desc">
                Following DeepSeek-V3's <code>MLA</code> class, the hidden representation x &in; &reals;<sup>7168</sup> splits into a Query compression path and a Key-Value compression path.
              </p>
            </div>

            <div class="spec-pipeline">
              
              <!-- INPUT -->
              <div class="node-block input-node">
                <span class="dim-tag">[seq, 7168]</span>
                <strong>Input Hidden State x</strong>
              </div>

              <div class="split-pipes">
                <!-- QUERY STREAM -->
                <div class="stream-branch query-branch">
                  <div class="stream-title">Query Low-Rank Path</div>
                  
                  <div class="pipe-step">
                    <span class="op">Down-Projection: W<sup>DQ</sup></span>
                    <span class="shape">7168 ➔ 1536 (d<sub>Q</sub>)</span>
                  </div>
                  <div class="arrow-down">↓</div>
                  
                  <div class="pipe-step norm">
                    <span class="op">RMSNorm (q<sub>norm</sub>)</span>
                    <span class="shape">dim = 1536</span>
                  </div>
                  <div class="arrow-down">↓</div>

                  <div class="pipe-step dual-up">
                    <div class="sub-step">
                      <strong>W<sup>UQ</sup> (Up-Proj)</strong>
                      <span>128 heads &times; 128-d (NoPE)</span>
                    </div>
                    <div class="sub-step">
                      <strong>W<sup>QR</sup> (RoPE)</strong>
                      <span>128 heads &times; 64-d (d<sub>R</sub>)</span>
                    </div>
                  </div>
                </div>

                <!-- KEY-VALUE STREAM -->
                <div class="stream-branch kv-branch">
                  <div class="stream-title">KV Low-Rank & Decoupled Path</div>

                  <div class="pipe-step kv-split">
                    <div class="sub-step">
                      <strong>W<sup>DKV</sup> (Down-Proj)</strong>
                      <span class="shape">7168 ➔ 512 (d<sub>KV</sub>)</span>
                    </div>
                    <div class="sub-step rope-sub">
                      <strong>W<sup>KR</sup> (Decoupled RoPE)</strong>
                      <span class="shape">7168 ➔ 64 (d<sub>R</sub>)</span>
                    </div>
                  </div>
                  <div class="arrow-down">↓</div>

                  <div class="pipe-step norm">
                    <span class="op">RMSNorm (kv<sub>norm</sub>)</span>
                    <span class="shape">dim = 512 (applied only to latent)</span>
                  </div>
                  <div class="arrow-down">↓</div>

                  <!-- THE CACHED ITEM -->
                  <div class="cache-target-card">
                    <div class="cache-badge">⚡ STORED IN KV CACHE</div>
                    <div class="cache-dims">
                      <div class="c-col latent">
                        <span>c<sub>t</sub><sup>KV</sup></span>
                        <strong>512-d</strong>
                      </div>
                      <span class="plus">+</span>
                      <div class="c-col rope">
                        <span>k<sub>t</sub><sup>R</sup> (RoPE)</span>
                        <strong>64-d</strong>
                      </div>
                      <span class="eq">=</span>
                      <div class="c-col total">
                        <span>Per-Token Footprint</span>
                        <strong>576 floats</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      <!-- ==========================================
           TAB 3: MATRIX ABSORPTION PROOF
           ========================================== -->
      {:else if activeTab === 3}
        <div class="stage-wrapper tab3">
          <div class="proof-layout">
            <div class="proof-sidebar">
              <h3>Matrix Absorption: Why Decompression is Skipped</h3>
              <p class="desc">
                In naive MLA, one would decompress c<sup>KV</sup> using W<sup>UK</sup> to recover K. But matrix multiplication is associative:
              </p>

              <div class="proof-card">
                <div class="math-line">
                  Q &middot; K<sup>T</sup> = (x W<sub>Q</sub>) &middot; (c<sup>KV</sup> W<sup>UK</sup>)<sup>T</sup>
                </div>
                <div class="math-line hl">
                  = (x W<sub>Q</sub> W<sup>UK,T</sup>) &middot; (c<sup>KV</sup>)<sup>T</sup>
                </div>
                <div class="math-line accent">
                  = Q̃ &middot; (c<sup>KV</sup>)<sup>T</sup>
                </div>
              </div>

              <p class="desc">
                By pre-multiplying the Query projection by W<sup>UK,T</sup> (W̃<sub>Q</sub> = W<sub>Q</sub> W<sup>UK,T</sup>), the query is projected <strong>directly into the 512-dimensional latent space</strong>!
              </p>

              <div class="toggle-control">
                <label class="toggle-lbl">
                  <input type="checkbox" bind:checked={showAbsorbed} />
                  <span>Enable Matrix Absorption Mode</span>
                </label>
              </div>
            </div>

            <!-- Absorption visual -->
            <div class="proof-diagram-box">
              <div class="diagram-flow">
                {#if showAbsorbed}
                  <div class="absorption-flow">
                    <div class="flow-row">
                      <div class="d-box input-x">
                        <span>Input Token</span>
                        <strong>x [1, 7168]</strong>
                      </div>
                      <span class="d-arrow">➔</span>
                      <div class="d-box absorbed-w">
                        <span>Absorbed Weight</span>
                        <strong>W̃<sub>Q</sub> = W<sub>Q</sub> W<sup>UK,T</sup></strong>
                      </div>
                      <span class="d-arrow">➔</span>
                      <div class="d-box query-res">
                        <span>Projected to Latent Space</span>
                        <strong>Q̃ &in; &reals;<sup>512</sup></strong>
                      </div>
                    </div>

                    <div class="dot-section">
                      <span class="op-bubble">Dot Product (No decompression needed!)</span>
                      <div class="cache-direct">
                        <strong>Q̃ &times; [c<sup>KV</sup>]<sup>T</sup></strong>
                        <span>Direct 512-d dot product gives exact attention logits!</span>
                      </div>
                    </div>
                  </div>
                {:else}
                  <div class="naive-flow">
                    <div class="warning-callout">
                      ⚠️ <strong>Naive Mode:</strong> Decompresses 512 floats into 128 heads &times; 128-d (16,384 floats) in RAM before computing attention. High memory bandwidth overhead!
                    </div>
                    <div class="flow-row">
                      <div class="d-box cache-x">
                        <span>Cached Latent</span>
                        <strong>c<sup>KV</sup> [512]</strong>
                      </div>
                      <span class="d-arrow">➔</span>
                      <div class="d-box decompress-w">
                        <span>Up-Projection: W<sup>UK</sup></span>
                        <strong>512 ➔ 16,384</strong>
                      </div>
                      <span class="d-arrow">➔</span>
                      <div class="d-box decompressed-k">
                        <span>Full Keys</span>
                        <strong>K &in; &reals;<sup>128 &times; 128</sup></strong>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            </div>

          </div>
        </div>

      <!-- ==========================================
           TAB 4: WHY DECOUPLED ROPE?
           ========================================== -->
      {:else if activeTab === 4}
        <div class="stage-wrapper tab4">
          <div class="decoupled-container">
            <div class="decoupled-text">
              <h3>The Absorption Incompatibility Problem</h3>
              <p>
                Why didn't DeepSeek compress RoPE inside the 512-d latent vector along with content?
              </p>
              <div class="incompat-box">
                <span class="math-eq">(x W<sub>Q</sub> R<sub>&theta;,m</sub>) &middot; (x W<sub>K</sub> R<sub>&theta;,n</sub>)<sup>T</sup> &ne; (x W<sub>Q</sub> W<sup>UK,T</sup>) &middot; R<sub>...</sub></span>
                <p>
                  Because the RoPE rotation matrix R<sub>&theta;,t</sub> depends on the token's specific position t, it <strong>does not commute</strong> with the position-invariant projection matrix W<sup>UK</sup>:
                </p>
                <code>W_UK &middot; R_&theta;,t &ne; R_&theta;,t &middot; W_UK</code>
              </div>
              <p>
                If RoPE were applied prior to compression, W<sup>UK</sup> could not be absorbed into W<sub>Q</sub>. DeepSeek solves this elegantly by decoupling:
              </p>
              <ul>
                <li><strong>NoPE Branch (128-d):</strong> Pure semantic content. Compressible into latent vector and absorbed.</li>
                <li><strong>RoPE Branch (64-d):</strong> Dedicated positional coordinates. Rotated and carried alongside the latent without low-rank compression.</li>
              </ul>
            </div>

            <div class="split-diagram-card">
              <div class="stream-split-visual">
                <div class="s-card nope">
                  <span class="tag green">NoPE (128-d)</span>
                  <strong>Semantic Representation</strong>
                  <p>100% Position-Invariant</p>
                  <span class="verdict">✓ Safely Absorbed into W<sub>Q</sub></span>
                </div>
                <div class="s-card rope">
                  <span class="tag highlight">RoPE (64-d)</span>
                  <strong>Position Representation</strong>
                  <p>Position-Dependent (R<sub>&theta;,t</sub>)</p>
                  <span class="verdict">✓ Rotated Independently</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}

    </div>
  </div>
</InteractiveCard>

<style>
  .mla-explorer { display: flex; flex-direction: column; width: 100%; }
  
  .tabs-header { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 2rem; overflow-x: auto; }
  .tab-btn { background: none; border: none; padding: 1rem 1.5rem; font-family: 'Space Grotesk', sans-serif; font-weight: 600; color: var(--muted); cursor: pointer; transition: all 0.2s; border-bottom: 2px solid transparent; white-space: nowrap; }
  .tab-btn:hover { color: var(--text); }
  .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }

  .stage-wrapper { animation: fadeIn 0.3s ease-out; width: 100%; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

  .desc { font-size: 0.9rem; color: var(--muted); margin: 0.25rem 0 1.25rem 0; line-height: 1.5; }
  .desc code { font-family: 'JetBrains Mono', monospace; color: var(--highlight); }

  /* TAB 1: PARADIGM COMPARISON */
  .paradigm-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 2.5rem; }
  @media (max-width: 900px) { .paradigm-grid { grid-template-columns: 1fr; } }
  
  .selector-pills { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 1.5rem; }
  .pill { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 0.5rem; display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; transition: all 0.2s; }
  .pill strong { font-family: 'Space Grotesk', sans-serif; font-size: 0.95rem; color: var(--text); }
  .pill span { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); }
  .pill:hover { border-color: var(--text); }
  .pill.active { border-color: var(--accent); background: rgba(99, 102, 241, 0.1); }
  .pill.active-mla.active { border-color: var(--green); background: rgba(16, 185, 129, 0.1); }
  .pill.active-mla.active strong { color: var(--green); }

  .ctrl-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
  .lbl-row { display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--muted); }
  .hl-num { color: var(--highlight); }
  .slider-hl { accent-color: var(--highlight); cursor: pointer; }

  .telemetry-box { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .telem-row { display: flex; justify-content: space-between; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--muted); }
  .telem-row strong { color: var(--text); font-size: 0.95rem; }
  .large-num { font-size: 1.3rem !important; }
  .large-num.red { color: var(--red) !important; }
  .large-num.green { color: var(--green) !important; }
  .accent { color: var(--accent) !important; font-weight: 700; }

  .bar-meter { height: 8px; background: var(--bg); border-radius: 999px; overflow: hidden; border: 1px solid var(--border); margin-top: 0.5rem; }
  .bar-fill { height: 100%; background: var(--green); transition: width 0.3s ease; }

  .paradigm-visual { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; justify-content: center; }
  .vis-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); }
  .hatched-legend { display: flex; align-items: center; gap: 6px; }
  .hatch-box { width: 12px; height: 12px; background: repeating-linear-gradient(45deg, var(--accent), var(--accent) 2px, transparent 2px, transparent 6px); border: 1px solid var(--accent); }

  .pillars-container { display: flex; flex-direction: column; gap: 1.5rem; }
  .tier { display: flex; flex-direction: column; gap: 0.5rem; }
  .tier-lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; }
  .heads-row { display: flex; gap: 8px; align-items: center; }
  .head-bar { height: 36px; flex: 1; border-radius: 4px; }
  .head-bar.hatched { background: repeating-linear-gradient(45deg, var(--accent), var(--accent) 3px, rgba(99,102,241,0.2) 3px, rgba(99,102,241,0.2) 8px); border: 1px solid var(--accent); }
  .head-bar.outline { border: 1px dashed var(--border); background: var(--bg); }
  .mla-virtual-heads { display: flex; gap: 8px; width: 100%; }

  .mla-latent-strip { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
  .latent-arrow { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--green); font-weight: 700; text-align: center; }
  .latent-box { background: repeating-linear-gradient(45deg, var(--green), var(--green) 3px, rgba(16,185,129,0.15) 3px, rgba(16,185,129,0.15) 8px); border: 2px solid var(--green); border-radius: 8px; padding: 0.75rem; display: flex; justify-content: space-between; align-items: center; }
  .latent-box span { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.9rem; color: var(--text); }
  .latent-box strong { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--green); }

  /* TAB 2: PROJECTION FLOW */
  .spec-pipeline { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
  .input-node { background: var(--surface2); border: 2px solid var(--accent); border-radius: 8px; padding: 0.75rem 2rem; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .dim-tag { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--accent); font-weight: 700; }
  
  .split-pipes { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; width: 100%; }
  @media (max-width: 800px) { .split-pipes { grid-template-columns: 1fr; } }
  
  .stream-branch { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .stream-title { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; font-weight: 700; color: var(--text); margin-bottom: 0.5rem; }
  .pipe-step { background: var(--bg); border: 1px solid var(--border); padding: 0.75rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
  .pipe-step .op { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 0.85rem; }
  .pipe-step .shape { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--highlight); }
  .arrow-down { text-align: center; color: var(--muted); font-size: 1.1rem; }

  .dual-up, .kv-split { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .sub-step { background: var(--surface); border: 1px dashed var(--border); padding: 0.5rem; border-radius: 4px; display: flex; flex-direction: column; gap: 2px; }
  .sub-step strong { font-size: 0.8rem; color: var(--text); }
  .sub-step span { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); }

  .cache-target-card { background: rgba(16, 185, 129, 0.08); border: 2px solid var(--green); border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .cache-badge { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; font-weight: 700; color: var(--green); }
  .cache-dims { display: flex; justify-content: space-around; align-items: center; }
  .c-col { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .c-col span { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); }
  .c-col strong { font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; color: var(--text); }
  .plus, .eq { font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; color: var(--muted); }

  /* TAB 3: MATRIX ABSORPTION */
  .proof-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 2rem; }
  @media (max-width: 850px) { .proof-layout { grid-template-columns: 1fr; } }
  .proof-card { background: var(--surface2); border: 1px solid var(--border); border-left: 3px solid var(--accent); padding: 1rem; border-radius: 6px; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
  .math-line { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--muted); }
  .math-line.hl { color: var(--highlight); font-weight: 700; }
  .math-line.accent { color: var(--green); font-weight: 700; font-size: 1rem; }
  .toggle-control { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 1rem; margin-top: 1rem; }
  .toggle-lbl { display: flex; align-items: center; gap: 0.75rem; font-family: 'Space Grotesk', sans-serif; font-size: 0.85rem; font-weight: 600; cursor: pointer; color: var(--text); }

  .proof-diagram-box { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; align-items: center; justify-content: center; }
  .absorption-flow { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; }
  .flow-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .d-box { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 4px; min-width: 130px; }
  .d-box span { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); }
  .d-box strong { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--text); }
  .absorbed-w { border-color: var(--accent); }
  .absorbed-w strong { color: var(--accent); }
  .query-res { border-color: var(--green); }
  .query-res strong { color: var(--green); }
  .d-arrow { color: var(--muted); font-size: 1.2rem; }

  .dot-section { background: var(--bg); border: 1px dashed var(--green); border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; text-align: center; }
  .op-bubble { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--green); font-weight: 700; }
  .cache-direct strong { font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; color: var(--text); display: block; }
  .cache-direct span { font-size: 0.8rem; color: var(--muted); }

  .warning-callout { background: rgba(239, 68, 68, 0.1); border: 1px solid var(--red); color: var(--text); font-size: 0.8rem; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; }

  /* TAB 4: DECOUPLED ROPE */
  .decoupled-container { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
  @media (max-width: 800px) { .decoupled-container { grid-template-columns: 1fr; } }
  .incompat-box { background: var(--surface2); border: 1px solid var(--border); border-left: 3px solid var(--highlight); padding: 1rem; border-radius: 6px; margin: 1rem 0; }
  .incompat-box .math-eq { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--highlight); font-weight: 700; }
  .incompat-box code { display: block; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--red); margin-top: 0.5rem; }
  
  .stream-split-visual { display: flex; flex-direction: column; gap: 1rem; justify-content: center; height: 100%; }
  .s-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .s-card strong { font-family: 'Space Grotesk', sans-serif; font-size: 1rem; color: var(--text); }
  .s-card p { margin: 0; font-size: 0.8rem; color: var(--muted); }
  .verdict { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; font-weight: 700; margin-top: 0.25rem; }
  .s-card.nope .verdict { color: var(--green); }
  .s-card.rope .verdict { color: var(--highlight); }
  .tag { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; width: fit-content; font-weight: 700; }
  .tag.green { background: rgba(16,185,129,0.15); color: var(--green); }
  .tag.highlight { background: rgba(245,158,11,0.15); color: var(--highlight); }
</style>